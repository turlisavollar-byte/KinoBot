#!/usr/bin/env bash
set -Eeuo pipefail

readonly ROOT=/opt/kinobot-v2-staging
readonly BACKUP_ROOT="$ROOT/backups/daily"
readonly PROJECT=kinobot-v2-staging
readonly COMPOSE_FILE="$ROOT/docker-compose.staging.yml"
readonly ENV_FILE="$ROOT/.env.staging"
readonly TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
readonly WORK_DIR="$BACKUP_ROOT/.${TIMESTAMP}.partial"
readonly FINAL_DIR="$BACKUP_ROOT/$TIMESTAMP"
readonly MIN_FREE_BYTES=$((2 * 1024 * 1024 * 1024))

umask 077
exec 9>/run/lock/kinobot-v2-staging-backup.lock
flock -n 9 || {
  echo "A staging backup is already running" >&2
  exit 1
}

[[ -f "$ENV_FILE" && -f "$COMPOSE_FILE" ]] || {
  echo "Staging configuration is missing" >&2
  exit 1
}

mkdir -p "$BACKUP_ROOT"
available_bytes="$(df -B1 --output=avail "$BACKUP_ROOT" | tail -n 1 | tr -d ' ')"
db_bytes="$(docker compose --env-file "$ENV_FILE" -p "$PROJECT" -f "$COMPOSE_FILE" exec -T --interactive=false postgres psql -U postgres -d kinobot_staging -At -c "SELECT pg_database_size('kinobot_staging')")"
minio_volume_path="$(docker volume inspect --format '{{.Mountpoint}}' kinobot-v2-staging_minio_data)"
minio_bytes="$(du -sb "$minio_volume_path" | cut -f 1)"
required_bytes=$((7 * (db_bytes + minio_bytes) + MIN_FREE_BYTES))

if (( available_bytes < required_bytes )); then
  echo "Insufficient free space for seven staging snapshots and reserve" >&2
  exit 1
fi

[[ ! -e "$WORK_DIR" && ! -e "$FINAL_DIR" ]] || {
  echo "A backup directory already exists for $TIMESTAMP" >&2
  exit 1
}
mkdir -m 700 "$WORK_DIR"
mkdir -m 700 "$WORK_DIR/minio"

cleanup_partial() {
  local status=$?
  if (( status != 0 )) && [[ -d "$WORK_DIR" && ! -L "$WORK_DIR" ]]; then
    rm -rf -- "$WORK_DIR"
  fi
  exit "$status"
}
trap cleanup_partial EXIT

docker compose --env-file "$ENV_FILE" -p "$PROJECT" -f "$COMPOSE_FILE" \
  exec -T --interactive=false postgres \
  pg_dump -U postgres -d kinobot_staging --format=custom --no-owner --no-acl \
  > "$WORK_DIR/database.dump"

[[ -s "$WORK_DIR/database.dump" ]] || {
  echo "Staging database dump is empty" >&2
  exit 1
}
[[ "$(head -c 5 "$WORK_DIR/database.dump")" == "PGDMP" ]] || {
  echo "Staging database dump has an invalid format" >&2
  exit 1
}

docker compose --env-file "$ENV_FILE" -p "$PROJECT" -f "$COMPOSE_FILE" \
  run --rm --no-deps --no-TTY --interactive=false \
  --volume "$WORK_DIR/minio:/backup" \
  --entrypoint /bin/sh minio-init -ec \
  'mc alias set staging http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
   mc mirror --overwrite "staging/$VIDEO_BUCKET" /backup'

read -r minio_objects minio_backup_bytes < <(
  python3 - "$WORK_DIR/minio" <<'PY'
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
files = [entry for entry in root.rglob("*") if entry.is_file()]
print(len(files), sum(entry.stat().st_size for entry in files))
PY
)
dump_bytes="$(wc -c < "$WORK_DIR/database.dump" | tr -d ' ')"
minio_bucket="$(python3 - "$ENV_FILE" <<'PY'
import re
import sys

for line in open(sys.argv[1], encoding="utf-8"):
    if line.startswith("VIDEO_BUCKET="):
        value = line.split("=", 1)[1].strip().strip("\"'")
        if re.fullmatch(r"[a-z0-9][a-z0-9._-]*", value):
            print(value)
            break
        raise SystemExit("Invalid staging MinIO bucket name")
else:
    raise SystemExit("VIDEO_BUCKET is missing from staging configuration")
PY
)"

cat > "$WORK_DIR/manifest.txt" <<EOF
scope=$PROJECT
created_utc=$TIMESTAMP
database_file=database.dump
database_bytes=$dump_bytes
minio_bucket=$minio_bucket
minio_objects=$minio_objects
minio_bytes=$minio_backup_bytes
retention_days=7
EOF
chmod 600 "$WORK_DIR/database.dump" "$WORK_DIR/manifest.txt"
chmod 700 "$WORK_DIR/minio"
mv "$WORK_DIR" "$FINAL_DIR"

python3 - "$BACKUP_ROOT" "$TIMESTAMP" <<'PY'
import pathlib
import re
import shutil
import sys
import time

root = pathlib.Path(sys.argv[1]).resolve(strict=True)
current = sys.argv[2]
cutoff = time.time() - 7 * 24 * 60 * 60
pattern = re.compile(r"\d{8}T\d{6}Z")

for entry in root.iterdir():
    if entry.name == current or not pattern.fullmatch(entry.name):
        continue
    if entry.is_symlink() or not entry.is_dir():
        continue
    resolved = entry.resolve(strict=True)
    if resolved.parent != root or resolved.stat().st_mtime >= cutoff:
        continue
    shutil.rmtree(resolved)
    print(f"Removed expired staging snapshot: {entry.name}")
PY

echo "BACKUP_OK=$FINAL_DIR"
echo "DATABASE_BYTES=$dump_bytes"
echo "MINIO_OBJECTS=$minio_objects"
echo "MINIO_BYTES=$minio_backup_bytes"
