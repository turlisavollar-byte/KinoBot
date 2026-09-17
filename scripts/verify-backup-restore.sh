#!/usr/bin/env bash
set -euo pipefail

POSTGRES_DB="${POSTGRES_DB:-streamops}"
POSTGRES_USER="${POSTGRES_USER:-streamops}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RESTORE_SUFFIX="${RESTORE_SUFFIX:-_restore_validation}"
RESTORE_DB="${POSTGRES_DB}${RESTORE_SUFFIX}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/streamops-backup-${TIMESTAMP}.sql"
REPORT_FILE="${BACKUP_DIR}/restore-validation-${TIMESTAMP}.log"
COMPOSE_BIN="${COMPOSE_BIN:-docker compose}"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is required for backup/restore validation." >&2
  exit 1
fi

if ! docker ps >/dev/null 2>&1; then
  echo "❌ Docker daemon is not reachable. Start Docker before running backup/restore validation." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

run_compose() {
  if command -v docker >/dev/null 2>&1; then
    eval "$COMPOSE_BIN \"\$@\""
  else
    echo "❌ docker compose is not available" >&2
    exit 1
  fi
}

cleanup_restore_db() {
  if docker exec -T "$(docker compose ps -q postgres 2>/dev/null || true)" psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$RESTORE_DB';" 2>/dev/null | grep -q '1'; then
    docker exec -T "$(docker compose ps -q postgres 2>/dev/null || true)" dropdb -U "$POSTGRES_USER" --if-exists "$RESTORE_DB" >/dev/null 2>&1 || true
  fi
}

backup_database() {
  echo "📦 Creating verified production backup..."
  run_compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"
  echo "✅ Backup created: $BACKUP_FILE"
}

restore_database() {
  echo "🧪 Restoring backup into validation database: $RESTORE_DB"
  cleanup_restore_db
  docker compose exec -T postgres createdb -U "$POSTGRES_USER" "$RESTORE_DB"
  docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$RESTORE_DB" < "$BACKUP_FILE" >/dev/null
  echo "✅ Restore completed"
}

validate_restore() {
  TABLE_COUNT=$(docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -Atqc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
  MIGRATION_COUNT=$(docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -Atqc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '__drizzle_migrations';")

  echo "📊 Public tables in restored DB: $TABLE_COUNT" | tee "$REPORT_FILE"
  echo "📊 Drizzle migration table present: $MIGRATION_COUNT" | tee -a "$REPORT_FILE"

  if [ "$TABLE_COUNT" -lt 1 ]; then
    echo "❌ Restore validation failed: no public tables were restored." >&2
    exit 1
  fi

  echo "✅ Restore validation succeeded." | tee -a "$REPORT_FILE"
}

main() {
  echo "========================================="
  echo "Backup / Restore Validation"
  echo "========================================="
  echo "DB: $POSTGRES_DB"
  echo "User: $POSTGRES_USER"
  echo "Backup dir: $BACKUP_DIR"
  echo "Restore DB: $RESTORE_DB"
  echo "========================================="

  backup_database
  restore_database
  validate_restore

  echo "========================================="
  echo "Result log: $REPORT_FILE"
  echo "========================================="
}

main "$@"
