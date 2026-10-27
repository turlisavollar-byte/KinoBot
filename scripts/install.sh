#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR=/opt/kinobot
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

[[ "$EUID" -eq 0 ]] || fail 'Run with sudo: sudo bash scripts/install.sh'
[[ -f "$SOURCE_DIR/.env.example" ]] || fail 'Run this script from a complete KinoBot source archive.'
[[ -f /etc/os-release ]] || fail 'This installer supports Debian/Ubuntu only.'
# shellcheck disable=SC1091
. /etc/os-release
[[ "$ID" == ubuntu || "$ID" == debian ]] || fail "Unsupported OS: $ID (Debian or Ubuntu required)."

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg git unzip rsync openssl gettext-base certbot

install -m 0755 -d /etc/apt/keyrings
curl -fsSL "https://download.docker.com/linux/$ID/gpg" | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/%s %s stable\n' \
  "$(dpkg --print-architecture)" "$ID" "$VERSION_CODENAME" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install --global pnpm@9.15.0
systemctl enable --now docker
docker compose version >/dev/null
node --version | grep -Eq '^v22\.' || fail 'Node.js 22 installation did not succeed.'

mkdir -p "$APP_DIR"
if [[ "$SOURCE_DIR" != "$APP_DIR" ]]; then
  rsync -a \
    --exclude='.env' \
    --exclude='node_modules/' \
    --exclude='apps/*/dist/' \
    --exclude='apps/landing/.next/' \
    --exclude='apps/landing/test-results/' \
    --exclude='apps/landing/playwright-report/' \
    --exclude='logs/' \
    --exclude='backups/' \
    --exclude='nginx/ssl/' \
    "$SOURCE_DIR/" "$APP_DIR/"
fi

mkdir -p "$APP_DIR/logs/nginx" "$APP_DIR/logs/api" "$APP_DIR/backups" "$APP_DIR/nginx/ssl"
chmod 700 "$APP_DIR/backups" "$APP_DIR/nginx/ssl"
chmod +x "$APP_DIR/scripts/install.sh" "$APP_DIR/scripts/deploy.sh"

if [[ ! -f "$APP_DIR/.env" ]]; then
  read -r -p 'Production domain (DNS must point to this server): ' APP_DOMAIN
  [[ "$APP_DOMAIN" =~ ^[A-Za-z0-9.-]+$ && "$APP_DOMAIN" == *.* ]] || fail 'Enter a valid DNS hostname.'

  read -r -s -p 'PostgreSQL admin password (16+ letters/digits): ' POSTGRES_PASSWORD
  printf '\n'
  [[ "$POSTGRES_PASSWORD" =~ ^[A-Za-z0-9]{16,}$ ]] || fail 'Use at least 16 letters/digits so database URLs can be safely constructed.'

  read -r -s -p 'JWT access secret (blank generates a random secret): ' JWT_ACCESS_SECRET
  printf '\n'
  if [[ -z "$JWT_ACCESS_SECRET" ]]; then
    JWT_ACCESS_SECRET="$(openssl rand -hex 32)"
  fi
  [[ "$JWT_ACCESS_SECRET" =~ ^[A-Za-z0-9_-]{32,}$ ]] || fail 'JWT access secret must be at least 32 letters, digits, underscores, or hyphens.'

  POSTGRES_DB=kinobot
  POSTGRES_USER=postgres
  APP_DB_USER=kinobot_user
  APP_DB_PASSWORD="$(openssl rand -hex 32)"
  DATABASE_URL="postgresql://${APP_DB_USER}:${APP_DB_PASSWORD}@postgres:5432/${POSTGRES_DB}"
  MIGRATION_DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"
  JWT_REFRESH_SECRET="$(openssl rand -hex 32)"
  SESSION_SECRET="$(openssl rand -hex 32)"
  CORS_ORIGINS="https://${APP_DOMAIN}"
  TLS_CERT_FILE="/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem"
  TLS_KEY_FILE="/etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem"
  TELEGRAM_POLLING_ENABLED=true
  export APP_DOMAIN POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD APP_DB_USER APP_DB_PASSWORD
  export DATABASE_URL MIGRATION_DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET SESSION_SECRET
  export CORS_ORIGINS TLS_CERT_FILE TLS_KEY_FILE TELEGRAM_POLLING_ENABLED

  envsubst '${APP_DOMAIN} ${POSTGRES_DB} ${POSTGRES_USER} ${POSTGRES_PASSWORD} ${APP_DB_USER} ${APP_DB_PASSWORD} ${DATABASE_URL} ${MIGRATION_DATABASE_URL} ${JWT_ACCESS_SECRET} ${JWT_REFRESH_SECRET} ${SESSION_SECRET} ${CORS_ORIGINS} ${TLS_CERT_FILE} ${TLS_KEY_FILE} ${TELEGRAM_POLLING_ENABLED}' \
    < "$APP_DIR/.env.example" > "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
else
  printf 'Keeping existing %s/.env unchanged.\n' "$APP_DIR"
  APP_DOMAIN="$(sed -n 's/^PUBLIC_DOMAIN=//p' "$APP_DIR/.env" | head -n 1 | tr -d '\r"')"
  [[ -n "$APP_DOMAIN" ]] || fail 'PUBLIC_DOMAIN is missing from existing .env.'
fi

if [[ ! -s "/etc/letsencrypt/live/$APP_DOMAIN/fullchain.pem" || ! -s "/etc/letsencrypt/live/$APP_DOMAIN/privkey.pem" ]]; then
  read -r -p 'ACME certificate email: ' ACME_EMAIL
  [[ "$ACME_EMAIL" == *@*.* ]] || fail 'A valid ACME email address is required.'
  certbot certonly --standalone --non-interactive --agree-tos -m "$ACME_EMAIL" -d "$APP_DOMAIN"
fi

if [[ -n "${SUDO_USER:-}" ]]; then
  usermod -aG docker "$SUDO_USER"
fi

printf '\nKinoBot server setup is ready at %s.\n' "$APP_DIR"
printf 'Next: review %s/.env, configure ADMIN_TELEGRAM_IDS and payment credentials, then run:\n' "$APP_DIR"
printf '  cd %s && sudo ./scripts/deploy.sh\n' "$APP_DIR"
printf 'DNS and ports 80/443 must be reachable for TLS issuance; re-login is needed for docker-group access.\n'
