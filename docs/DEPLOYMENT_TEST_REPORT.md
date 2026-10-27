# KinoBot v1.1.0 - Deploy Test Report

## Evidence and Scope

Server measurements and runtime outcomes in this report were supplied by the
operator. They have not been independently queried from this workspace. Code
findings below were checked against the current `feature/actor-card-mvp`
checkout. No production server, database, Docker build, or migration was run
while preparing this report.

## Server

- Provider/instance: AWS EC2 `t3.small` (operator-reported)
- OS: Ubuntu 24.04 LTS (operator-reported)
- CPU/memory: 2 vCPU, 1.9 GB RAM, 2 GB swap (operator-reported)
- Disk: 29 GB total, 26 GB free at test time (operator-reported)
- Domain: `3-27-225-225.sslip.io` (operator-reported)
- TLS: Let's Encrypt, expiry reported as 2027-01-25
- Docker: 29.9.2 (operator-reported)
- Node.js: 22 (operator-reported)

## Reported Deploy Results

- First deploy: approximately 4 minutes
- Repeat deploy: approximately 2 minutes
- Idempotency: reported confirmed
- Database/application state: 6 roles, 41 tables, 10 genres, 4 plans, 1 admin

These timings reflect the reported test server and are not a production SLA.

### Latest v1.1.1 Baseline Supplied by Operator

- Branch/tag: `feature/actor-card-mvp` / annotated `v1.1.1`; HEAD reported as
  `23d4bb7`, synchronized with `origin/feature/actor-card-mvp`.
- Server: AWS `c7i-flex.large`, Ubuntu 24.04.5 LTS, 3.7 GB RAM plus 2 GB swap.
- Domain: `3-25-119-10.sslip.io`; TLS expiry reported as 2027-01-25.
- `install.sh`: 104 seconds; `deploy.sh`: 293 seconds; total reported 6:37.
- v1.1.1 12/12 fixes, dashboard, bot, login, and health status were reported
  confirmed by the operator. They are not independent v2 test results.

## Findings and Resolutions

1. **API log `EACCES` - confirmed from filesystem ownership model.** The API runs
   as UID/GID 1001 and bind-mounts `./logs/api` to `/app/logs`. Installer now
   assigns the host directory to `1001:1001`.
2. **RBAC migration missing from canonical chain - confirmed.** Legacy
   `lib/db/drizzle/0003_seed_roles_permissions.sql` was not part of the canonical
   journal. Added canonical `0011_seed_roles_permissions.sql`, registered it in
   `_journal.json`, and made Compose run the idempotent TypeScript RBAC seeder
   before optional admin bootstrap.
3. **`@workspace/db` unavailable to the runtime seeder - confirmed packaging
   gap.** The production API image did not copy `lib/db/package.json` or the
   RBAC seeder's API constants. Dockerfile now copies those files and creates
   `/app/node_modules/@workspace/db` pointing to the packaged workspace.
4. **PostgreSQL password repeated four times - not reproduced in current
   installer.** Current source prompted once. Added a silent confirmation prompt
   and equality check so a typo cannot generate mismatched DB URLs.
5. **`.git` copy and tracked file mode changes - confirmed.** Installer now
   excludes `.git/`, and removes `chmod +x` on tracked scripts (which are Git
   mode `100644`). Run scripts with `bash`. ZIP/installer copies exclude TLS
   PEMs rather than the whole SSL directory. The deployer accepts the staged
   source tree without Git metadata and accepts a new ZIP for later updates.
6. **Optional admin bootstrap suppressing role initialization - partially
   confirmed.** `seed.ts` and `bootstrap-super-admin.ts` return when no bootstrap
   credentials are configured; that behavior is appropriate for optional admin
   creation but must not gate RBAC setup. Compose now runs role/permission seed
   independently before `seed.ts`, and migration 0011 creates base roles.
7. **Health permission missing with empty roles - confirmed for migration 0010.** Its role cross join inserts zero mappings when roles are absent.
   Migration 0011 creates roles and links `view:health` to admin and superadmin;
   the following RBAC seed also reconciles role permissions.
8. **Admin missing `view:health` - current permission constant already grants
   it.** `ROLE_PERMISSIONS.admin` includes `VIEW_HEALTH`; old migration 0010
   linked only existing admin/superadmin rows. New migration and RBAC seed
   ensure the mapping on clean installs.
9. **`nginx/ssl/README.md` missing in copied release - copy exclusion confirmed;
   Git deletion not present locally.** README is tracked. Installer/deploy ZIP
   sync now preserve the directory contents except TLS `.pem` files.
10. **Redis `vm.overcommit_memory` warning - installer gap confirmed.** Installer
    now sets it immediately and persists it in
    `/etc/sysctl.d/99-kinobot-redis.conf`.
11. **Audit roles created only during 0008 - sequencing risk reduced.** 0008
    already creates these roles idempotently, but now privileged `db-init`
    provisions `audit_owner` and `audit_archiver` before migration. Migration
    0008 remains fail-closed; permission/ownership errors must stop deployment,
    not be converted to success notices.
12. **Installer prompts were not persisted in `.env` - confirmed.** The
    `envsubst` variable list included bootstrap values but the template used
    literal `ADMIN_TELEGRAM_IDS` and blank `SUPER_ADMIN_*` lines. The template
    now references all four prompted variables, `SUPER_ADMIN_NAME` is prompted
    with a `Developer` default, and the installer prints `sudo bash` for the
    non-executable tracked deploy script.

## Follow-up Recommendations

- Run a clean test deployment on the reported Ubuntu image using a fresh
  PostgreSQL volume and verify a restorable backup before exercising migrations.
- Confirm role and permission counts, `view:health` for admin/superadmin, and
  the expected 41-table schema after deploy.
- Test a repeat deploy and confirm it preserves `.env`, TLS files, SSL README,
  PostgreSQL volume, Redis volume, and uploads.
- Verify `/api/healthz`, dashboard login, the dashboard bot-start action, and
  API log writes as container UID 1001.
- Keep an encrypted off-host copy of backups and document restore time/result.

## Static Validation

- `bash -n scripts/install.sh`: passed.
- `bash -n scripts/deploy.sh`: passed.
- `docker compose --env-file .env.example -f docker-compose.prod.yml config -q`:
  passed using dummy interpolation values; no service was started.
- Canonical migration journal: 12 entries match 12 SQL files; no missing or
  unjournaled migrations.
- `git diff --check`: passed.
- Docker image build, database migration, and live deploy: not run.

## v2 Integration Status (2026-10-27)

Work is on `feature/v2-web-integration`, branched from the frozen v1.1.1 tag.
Only the Web subtree was imported from `feature/web`; the current `apps/landing`
was preserved. The reported v1.1.1 server results above are operator-provided
and do not constitute a v2 deployment test.

Implemented in this workspace:

- Public routes: LandingPage `/`, Dashboard `/admin/`, cinema `/web/`, API `/api`.
- Docker Compose Web and LandingPage services with Next.js standalone output,
  internal health checks, shared Nginx routing, and the existing PostgreSQL,
  Redis, API, bot, and dashboard services.
- Web-only JWT audience, separate from administrator tokens; customer
  registration/login/me use the shared `users` and `user_profiles` tables.
- Canonical `0012_web_customer_auth.sql` adds the Web password hash and allows
  accounts without Telegram IDs; the application TypeScript contract remains
  non-null for existing Telegram code, while the Web insert explicitly writes
  SQL NULL.
- API-backed published movie/series catalog, profile, favorites/watchlist,
  watch progress, public plans, current subscription, and premium stream ticket.
- Premium/family entitlement is checked in api-server on every stream-ticket
  request. A five-minute S3 presigned URL is returned only for S3-backed
  published movies. Telegram `file_id` is not exposed.
- Supabase client SDK and old Supabase migration assets were removed from the
  imported Web app. v3 tenant IDs/RLS/tenant routing were not implemented.

Static checks performed:

- `pnpm --filter @workspace/api-server typecheck`: passed.
- `pnpm --filter @workspace/web typecheck`: passed.
- `pnpm --filter @workspace/web build`: passed, Next.js standalone build.
- `pnpm --filter @workspace/landing build`: passed, Next.js standalone build.
- `pnpm --filter @workspace/dashboard build` with `BASE_PATH=/admin/`: passed.
- `docker compose ... config -q`: passed with dummy interpolation values; no
  services were started.
- JWT audience regression tests: 16 passed.
- Live Docker image build, migration 0012, clean-server deploy, browser login,
  real premium stream, and repeat deploy: not run.

Known v2 release gates:

- Most current video rows use Telegram file IDs; Web streaming requires S3
  ingest, bucket/key metadata, S3 credentials, and browser-compatible media
  CORS/range behavior. Telegram-only titles correctly return
  `STREAM_UNAVAILABLE`.
- Password reset/change and self-service purchase/cancellation are not enabled
  by the Web API. Production purchase must use verified provider webhooks to
  create active subscription rows; direct client tier selection is disabled.
- `pnpm install --frozen-lockfile` was attempted after the Web workspace was
  added but stalled at 194/195 packages in this Windows environment. The
  already available binaries allowed Web/landing/dashboard builds and type
  checks above; a clean Linux install/build remains a release gate.
- No production server or database was contacted, and no migration was run.
- The v1.1.1 branch/tag was not modified; this work remains on
  `feature/v2-web-integration`.

## v2 Enterprise Hardening Update

- Web accounts may omit Telegram identity. Canonical migration 0012 adds
  `password_hash`, makes `users.telegram_id` nullable, and adds a
  case-insensitive unique email index after a duplicate-case preflight. Existing
  Telegram provisioning still requires a Telegram ID; user DTOs now represent
  it as optional/null.
- Canonical migration 0013 adds `web_refresh_sessions`. Web refresh tokens are
  stored only as SHA-256 hashes, rotated atomically, and revoked on logout.
  Access and refresh JWTs contain `audience=web` and the session ID; protected
  Web requests check the active session row. Admin JWT defaults remain
  `audience=admin`.
- Registration normalizes email and maps unique-constraint races to HTTP 409.
  Telegram broadcasts filter out Web-only accounts with no Telegram ID.
- Deploy preflight now requires a trusted public certificate and probes public
  `/api/healthz`, `/admin/health`, `/web/`, and `/` routes. It no longer uses
  `curl --insecure` for deployment acceptance.
- API typecheck and Web typecheck pass after the latest shared-schema changes.
  JWT audience/session regression suite: 17 passed. Web and LandingPage
  production builds passed; Dashboard `/admin/` production build passed.
- Docker Compose config parsing and migration journal parity passed; journal
  contains 14 SQL files and 14 entries through 0013. No image build, database
  migration, clean-server deployment, payment flow, S3 playback, or production
  traffic test has been performed.

Remaining release gates: test migrations 0012-0013 against a restored copy of
the actual v1.1.1 DB; confirm the case-insensitive email preflight on that data;
run a clean Linux `pnpm install --frozen-lockfile` and Docker build; validate
refresh replay rejection, logout revocation, S3 URL expiry/CORS/range playback,
and the payment-provider webhook before enabling paid checkout.
