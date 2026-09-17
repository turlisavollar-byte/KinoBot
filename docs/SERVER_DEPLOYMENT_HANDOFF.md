# Production Server Handoff

This checklist is completed when the production server is available. Do not put secrets in Git or chat.

## Server Inputs

- [ ] Server OS and version
- [ ] Public IPv4 address
- [ ] SSH host, port, and deployment user
- [ ] Docker Engine and Compose versions
- [ ] DNS A/AAAA records for the public domain
- [ ] Firewall ports: 80 and 443 open; SSH restricted
- [ ] Persistent disk location and available space
- [ ] Backup storage location and retention policy

## Application Inputs

- [ ] `DATABASE_URL` for production
- [ ] `STAGING_DATABASE_URL` for restore validation
- [ ] `REDIS_URL` or approved internal Redis configuration
- [ ] `CORS_ORIGINS` with exact HTTPS origins, never `*`
- [ ] `PUBLIC_DOMAIN`
- [ ] `JWT_ACCESS_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `SESSION_SECRET`
- [ ] `ADMIN_TELEGRAM_IDS`
- [ ] `SUPER_ADMIN_EMAIL` and one-time bootstrap password
- [ ] Telegram bot token/configuration

## P2P Provider Inputs

Keep `P2P_ENABLED=false` until all fields are verified with the provider specialist.

- [ ] `P2P_ENABLED=true` approval
- [ ] Merchant or project ID
- [ ] API base URL
- [ ] Checkout base URL
- [ ] Secret/signing key
- [ ] Webhook URL and HTTP method
- [ ] Webhook signature algorithm and canonicalization rules
- [ ] Test and production credentials distinction
- [ ] Success, failure, retry, and idempotency behavior
- [ ] Refund and reconciliation procedure
- [ ] Provider test transaction completed

## TLS Inputs

- [ ] Certificate for the actual production domain
- [ ] Private key stored outside Git with restricted permissions
- [ ] Certificate chain installed as `nginx/ssl/cert.pem`
- [ ] Private key installed as `nginx/ssl/key.pem`
- [ ] Renewal automation configured
- [ ] `openssl s_client` verification completed

The current self-signed certificate is local smoke-test material only and must not be used for public production traffic.

## Deployment Sequence

1. Copy the production environment values into the server secret store.
2. Install the real TLS certificate and verify file permissions.
3. Run the environment and Compose preflight checks.
4. Create and verify a production backup.
5. Run the staging restore validation using `STAGING_DATABASE_URL`.
6. Build the API and dashboard images.
7. Run `db-migrator`, then `db-seed`, then start API, dashboard, and Nginx.
8. Verify HTTP to HTTPS redirect and `/api/health` through the public domain.
9. Run the authenticated route matrix with a non-customer admin account.
10. Enable P2P only after the provider test transaction and webhook verification pass.

## Release Acceptance

- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] Automated tests pass
- [ ] `pnpm --filter @workspace/db run migrate:live`
- [ ] `pnpm --filter @workspace/db run assert:migrations`
- [ ] Route matrix returns `ROUTE_MATRIX_OK`
- [ ] Backup restore report is stored
- [ ] Public HTTPS health check returns 200
- [ ] P2P payment and webhook test pass
