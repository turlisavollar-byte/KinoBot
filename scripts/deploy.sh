#!/usr/bin/env bash

set -Eeuo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-feature/v2-web-integration}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:8080/api/healthz}"
DASHBOARD_HEALTH_URL="${DASHBOARD_HEALTH_URL:-http://127.0.0.1:3000/health}"
ZIP_FILE="${1:-${ZIP_FILE:-}}"

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  if command -v docker >/dev/null 2>&1 && [[ -f .env && -f "$COMPOSE_FILE" ]]; then
    docker compose --env-file .env -f "$COMPOSE_FILE" logs --tail=100 2>&1 || true
  fi
  exit 1
}

on_error() {
  status=$?
  trap - ERR
  printf '\nDeployment failed (exit %s). Recent Compose logs:\n' "$status" >&2
  docker compose --env-file .env -f "$COMPOSE_FILE" logs --tail=100 2>&1 || true
  exit "$status"
}
trap on_error ERR

require_env() {
  local key="$1"
  grep -Eq "^[[:space:]]*${key}=.+" .env || fail "Set ${key} in .env"
}

cd "$APP_DIR"
[[ -f .env ]] || fail 'Missing .env. Run scripts/install.sh first.'
[[ -f "$COMPOSE_FILE" ]] || fail "Compose file not found: $COMPOSE_FILE"
command -v docker >/dev/null || fail 'Docker is not installed.'
command -v pnpm >/dev/null || fail 'pnpm is not installed. Run scripts/install.sh first.'
command -v curl >/dev/null || fail 'curl is not installed.'
command -v unzip >/dev/null || fail 'unzip is not installed.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose plugin is unavailable.'
docker info >/dev/null 2>&1 || fail 'Docker daemon is not running or accessible.'

for key in DATABASE_URL MIGRATION_DATABASE_URL ADMIN_TELEGRAM_IDS JWT_ACCESS_SECRET JWT_REFRESH_SECRET SESSION_SECRET CORS_ORIGINS TLS_CERT_FILE TLS_KEY_FILE; do
  require_env "$key"
done
admin_ids="$(sed -n 's/^ADMIN_TELEGRAM_IDS=//p' .env | tail -n 1 | tr -d '\r"')"
[[ "$admin_ids" != REPLACE_* ]] || fail 'Set ADMIN_TELEGRAM_IDS to real numeric Telegram IDs before deploying.'
[[ "$admin_ids" =~ ^[0-9]+(,[0-9]+)*$ ]] || fail 'ADMIN_TELEGRAM_IDS must be comma-separated numeric Telegram IDs.'

if [[ -n "$ZIP_FILE" ]]; then
  [[ -f "$ZIP_FILE" ]] || fail "ZIP archive not found: $ZIP_FILE"
  ZIP_FILE="$(realpath "$ZIP_FILE")"
  ZIP_TEMP="$(mktemp -d)"
  trap 'rm -rf "${ZIP_TEMP:-}"' EXIT
  unzip -q "$ZIP_FILE" -d "$ZIP_TEMP"
  SOURCE_ROOT="$(find "$ZIP_TEMP" -mindepth 1 -maxdepth 4 -type f -name pnpm-workspace.yaml -printf '%h\n' | head -n 1)"
  [[ -n "$SOURCE_ROOT" ]] || fail 'ZIP must contain the KinoBot workspace root (pnpm-workspace.yaml).'
  rsync -a --delete \
    --exclude='.env' --exclude='.git/' --exclude='node_modules/' \
    --exclude='backups/' --exclude='logs/' --exclude='nginx/ssl/*.pem' \
    --exclude='nginx/ssl/README.md' \
    --exclude='apps/*/dist/' --exclude='apps/landing/.next/' --exclude='apps/web/.next/' \
    "$SOURCE_ROOT/" "$APP_DIR/"
  rm -rf "$ZIP_TEMP"
  trap on_error ERR
elif [[ -d .git ]]; then
  current_branch="$(git branch --show-current)"
  [[ "$current_branch" == "$DEPLOY_BRANCH" ]] || fail "Expected branch $DEPLOY_BRANCH, found $current_branch."
  [[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail 'Tracked working-tree changes exist; refusing to overwrite them.'
  git pull --ff-only origin "$DEPLOY_BRANCH"
elif [[ -f pnpm-workspace.yaml ]]; then
  printf 'Using the staged source tree at %s. Pass a new ZIP path to update it.\n' "$APP_DIR"
else
  fail 'Run from a Git checkout or pass a source ZIP path: ./scripts/deploy.sh /path/to/release.zip'
fi

cors_origins="$(sed -n 's/^[[:space:]]*CORS_ORIGINS=//p' .env | tail -n 1 | tr -d '\r"' | sed "s/'//g")"
[[ -n "$cors_origins" ]] || fail 'CORS_ORIGINS is empty.'
[[ "$cors_origins" != *'*'* ]] || fail "CORS_ORIGINS must list exact HTTPS origins; '*' is forbidden."
IFS=',' read -r -a origins <<< "$cors_origins"
for origin in "${origins[@]}"; do
  origin="$(printf '%s' "$origin" | xargs)"
  [[ "$origin" =~ ^https://[^[:space:]]+$ ]] || fail "Invalid production CORS origin: $origin"
done

tls_cert="$(sed -n 's/^TLS_CERT_FILE=//p' .env | tail -n 1 | tr -d '\r"')"
tls_key="$(sed -n 's/^TLS_KEY_FILE=//p' .env | tail -n 1 | tr -d '\r"')"
public_domain="$(sed -n 's/^PUBLIC_DOMAIN=//p' .env | tail -n 1 | tr -d '\r"')"
[[ -s "$tls_cert" && -s "$tls_key" ]] || fail 'TLS certificate/key are missing; run scripts/install.sh or provision TLS_CERT_FILE/TLS_KEY_FILE.'
[[ -n "$public_domain" ]] || fail 'PUBLIC_DOMAIN is missing from .env.'
openssl x509 -in "$tls_cert" -noout >/dev/null 2>&1 || fail 'TLS_CERT_FILE is not a valid certificate.'

docker compose --env-file .env -f "$COMPOSE_FILE" config -q
pnpm install --frozen-lockfile
pnpm build
docker compose --env-file .env -f "$COMPOSE_FILE" build

mkdir -p backups
chmod 700 backups
docker compose --env-file .env -f "$COMPOSE_FILE" up -d --wait --wait-timeout 180 postgres redis
docker compose --env-file .env -f "$COMPOSE_FILE" run --rm db-init
docker compose --env-file .env -f "$COMPOSE_FILE" run --rm db-backup
docker compose --env-file .env -f "$COMPOSE_FILE" up --no-deps --force-recreate --exit-code-from db-migrator db-migrator
docker compose --env-file .env -f "$COMPOSE_FILE" up --no-deps --force-recreate --exit-code-from db-seed db-seed
docker compose --env-file .env -f "$COMPOSE_FILE" up -d --wait --wait-timeout 300 api-server dashboard web landing nginx

for attempt in $(seq 1 30); do
  if curl --fail --silent "$API_HEALTH_URL" >/dev/null \
    && curl --fail --silent "$DASHBOARD_HEALTH_URL" >/dev/null \
    && curl --fail --silent "https://${public_domain}/api/healthz" >/dev/null \
    && curl --fail --silent "https://${public_domain}/admin/health" >/dev/null \
    && curl --fail --silent "https://${public_domain}/web/" >/dev/null \
    && curl --fail --silent "https://${public_domain}/" >/dev/null; then
    printf 'API, dashboard, Web, and LandingPage health checks passed.\n'
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    fail "Health checks timed out: $API_HEALTH_URL and $DASHBOARD_HEALTH_URL"
  fi
  sleep 2
done

printf 'Deployment healthy. Backups: %s/backups\n' "$APP_DIR"
printf 'Review logs with: docker compose -f %s logs --tail=100\n' "$COMPOSE_FILE"
