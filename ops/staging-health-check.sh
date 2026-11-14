#!/usr/bin/env bash
set -Eeuo pipefail

readonly ROOT=/opt/kinobot-v2-staging
readonly ENV_FILE="$ROOT/.env.staging"
readonly STATE_DIR="$ROOT/monitor"
readonly STATE_FILE="$STATE_DIR/health-state"
readonly HEALTH_URL=https://staging.streamx.uz:8444/api/healthz
readonly PROJECT=kinobot-v2-staging
readonly COMPOSE_FILE="$ROOT/docker-compose.staging.yml"
readonly EXPECTED_SERVICES=(postgres redis minio api-server web nginx)

dotenv_value() {
  python3 - "$ENV_FILE" "$1" <<'PY'
import sys

key = sys.argv[2]
for line in open(sys.argv[1], encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    name, value = line.split("=", 1)
    if name == key:
        print(value.strip().strip("\"'"))
        break
PY
}

send_telegram() {
  local message=$1
  local chat_id
  local response

  for chat_id in "${ADMIN_CHAT_IDS[@]}"; do
    if ! response="$(
      curl --silent --fail --max-time 15 \
        --data-urlencode "chat_id=$chat_id" \
        --data-urlencode "text=$message" \
        --config - 2>/dev/null <<EOF
url = "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"
EOF
    )"; then
      return 1
    fi
    if ! printf '%s' "$response" | python3 -c 'import json,sys; raise SystemExit(0 if json.load(sys.stdin).get("ok") is True else 1)'; then
      return 1
    fi
  done
}

write_state() {
  local next_state=$1
  local tmp="$STATE_FILE.tmp.$$"
  printf '%s\n' "$next_state" > "$tmp"
  chmod 600 "$tmp"
  mv -f -- "$tmp" "$STATE_FILE"
}

[[ -r "$ENV_FILE" ]] || {
  echo "Staging environment file is unavailable" >&2
  exit 1
}

TELEGRAM_BOT_TOKEN="$(dotenv_value TELEGRAM_BOT_TOKEN)"
ADMIN_TELEGRAM_IDS="$(dotenv_value ADMIN_TELEGRAM_IDS)"
[[ -n "$TELEGRAM_BOT_TOKEN" && -n "$ADMIN_TELEGRAM_IDS" ]] || {
  echo "Staging Telegram alert settings are missing" >&2
  exit 1
}
mapfile -t ADMIN_CHAT_IDS < <(
  printf '%s' "$ADMIN_TELEGRAM_IDS" |
    python3 -c 'import re,sys; print("\n".join(filter(None, re.split(r"[,\s]+", sys.stdin.read()))))'
)
(( ${#ADMIN_CHAT_IDS[@]} > 0 )) || {
  echo "No staging Telegram alert recipients are configured" >&2
  exit 1
}

health_http="$(curl --silent --max-time 10 --output /dev/null --write-out '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)"
[[ "$health_http" =~ ^[0-9]{3}$ ]] || health_http=000

compose=(docker compose --env-file "$ENV_FILE" -p "$PROJECT" -f "$COMPOSE_FILE")
if running_services="$("${compose[@]}" ps --services --status running 2>/dev/null)"; then
  compose_ok=true
else
  running_services=
  compose_ok=false
fi

running_count=0
missing_services=()
for service in "${EXPECTED_SERVICES[@]}"; do
  if printf '%s\n' "$running_services" | grep -Fxq "$service"; then
    running_count=$((running_count + 1))
  else
    missing_services+=("$service")
  fi
done

previous_state=unknown
if [[ -r "$STATE_FILE" ]]; then
  IFS= read -r previous_state < "$STATE_FILE" || previous_state=unknown
fi

if [[ "$health_http" != 200 || "$compose_ok" != true || "$running_count" -ne "${#EXPECTED_SERVICES[@]}" ]]; then
  if [[ "$previous_state" != unhealthy ]]; then
    missing_text="$(IFS=,; printf '%s' "${missing_services[*]}")"
    message="Staging health alert: HTTP ${health_http}; ${running_count}/${#EXPECTED_SERVICES[@]} required containers running; missing=${missing_text:-none}."
    if ! send_telegram "$message"; then
      echo "Telegram alert delivery failed for staging health incident" >&2
      exit 1
    fi
    echo "STAGING_ALERT=sent"
  else
    echo "STAGING_ALERT=suppressed_duplicate"
  fi
  install -d -m 700 "$STATE_DIR"
  write_state unhealthy
  echo "STAGING_HEALTH=unhealthy HTTP=$health_http running=$running_count/${#EXPECTED_SERVICES[@]}"
  exit 1
fi

if [[ "$previous_state" == unhealthy ]]; then
  message="Staging health recovered: HTTP ${health_http}; all ${#EXPECTED_SERVICES[@]} required containers are running."
  if ! send_telegram "$message"; then
    echo "Telegram recovery alert delivery failed for staging" >&2
    exit 1
  fi
  echo "STAGING_ALERT=recovery_sent"
else
  echo "STAGING_ALERT=none"
fi

install -d -m 700 "$STATE_DIR"
write_state healthy
echo "STAGING_HEALTH=healthy HTTP=$health_http running=$running_count/${#EXPECTED_SERVICES[@]}"
