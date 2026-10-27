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
