# v1.1.0 Release Checklist

Release branch: `feature/actor-card-mvp`
Base tag: `v1.0.1` (`239612a`)
Release commit: record the final approved commit before tagging.
Release date: 2026-10-10

## Release Summary

v1.1.0 includes production audit logging and retention controls, scoped RBAC and administrator management, first-login password change, actor profiles and film-cast relationships, dashboard improvements, notification audience selection, API/schema updates, and the StreamX landing application. See [`CHANGELOG.md`](../CHANGELOG.md) for the feature summary.

Database migrations included in this release:

- `0006_actor_movie_video_relations`
- `0007_bright_switch` (normalized audit severity)
- `0008_audit_owner_separation`
- `0009_admin_must_change_password`

## Pre-deploy Checklist

- [ ] Confirm the release commit is on the approved branch and the working tree is clean.
- [ ] Confirm Chromium E2E, unit tests, typecheck, build, and Lighthouse CI results are green. Firefox/WebKit coverage is deferred to v1.1.1.
- [ ] Verify every migration is present in the Drizzle journal and reviewed against the target schema.
- [ ] Create a timestamped custom-format PostgreSQL backup using the production secret store's `DATABASE_URL`; do not put the URL or credentials in shell history, Git, or this document:

  ```bash
  pg_dump --format=custom --no-owner --file="$BACKUP_FILE" "$DATABASE_URL"
  pg_restore --list "$BACKUP_FILE" >/dev/null
  ```

- [ ] Store the backup in the approved protected backup location; record file size, timestamp, and checksum.
- [ ] Restore the backup to an isolated staging database and record the restore result.
- [ ] On staging, run the migration audit and live migrator commands below; verify the app starts and exercise authentication, admin RBAC, audit logging, catalog actor flows, Telegram/bot flows, and retention behavior.
- [ ] Confirm a maintenance window, operator access, monitoring, and an agreed rollback decision-maker.

## Deploy Steps

Run commands from the deployed repository root on the production host. Keep credentials in the configured secret store; do not paste secrets into chat or commit them.

1. Fetch and check out the approved release commit (record its full SHA); do not deploy a moving branch tip without recording the exact commit.
2. Install the lockfile-pinned dependencies and build:

   ```bash
   corepack pnpm@9.15.0 install --frozen-lockfile
   corepack pnpm@9.15.0 run build
   ```

3. Audit migration state, apply only journaled pending migrations, then assert the result:

   ```bash
   corepack pnpm@9.15.0 --filter @workspace/db run audit:migrations
   corepack pnpm@9.15.0 --filter @workspace/db run migrate:live
   corepack pnpm@9.15.0 --filter @workspace/db run assert:migrations
   ```

   Require the migration audit to match the expected database and `migrate:live` to report `MIGRATIONS_CURRENT` or successful `MIGRATION_APPLIED`. Stop on hash mismatch, unknown migration state, or any failed command. Do not substitute `drizzle-kit push` or ad hoc SQL.

4. After migration success, restart the production PM2 API process with its environment refreshed:

   ```bash
   pm2 restart kinobot-api --update-env
   pm2 status kinobot-api
   ```

5. Record the deployed commit SHA, migration output, restart result, and maintenance-window timestamps.

## Post-deploy Verification

- [ ] `GET /api/health` returns HTTP 200 through the configured public API origin.
- [ ] `GET /api/health/ready` and `/api/health/live` return HTTP 200.
- [ ] Authenticate with an approved test/admin account; verify first-login password change where applicable.
- [ ] Verify role-based navigation and API scope enforcement using accounts with different roles; confirm a lower-scope account cannot access another scope.
- [ ] Create a controlled audit event and verify severity normalization and secret redaction; do not use real credentials in test payloads.
- [ ] Run the approved audit-role separation test if the production test window and credentials permit it.
- [ ] Verify retention configuration and authorized manual execution; confirm archived/deleted counts and audit events. Do not claim scheduled retention: production documentation says there is no authenticated scheduler/CRON integration yet.
- [ ] Smoke-test catalog actor/profile and cast attach/detach flows, admin account management, and Telegram integration without disrupting customer-facing bots.
- [ ] Confirm API/dashboard logs and monitoring show no new errors for the agreed observation period.
- [ ] Record verification results and retain sanitized logs with the release record.

## Rollback Plan

### Application rollback

- [ ] Stop promotion and record the failure, current release SHA, and migration state.
- [ ] Check out the last known-good application commit, rebuild from its lockfile, and restart `kinobot-api` with `pm2 restart kinobot-api --update-env`.
- [ ] Verify health endpoints and the critical authentication/API flows.

### Database recovery

- [ ] The repository provides a forward-only journaled migrator; no verified down-migration scripts for migrations `0006`–`0009` were found. Do not improvise reverse SQL or run `drizzle-kit push` as rollback.
- [ ] If the previous application is incompatible with the migrated schema, stop writes and use the approved database recovery procedure with the pre-deploy backup, after explicit incident approval.
- [ ] A full `pg_restore --clean` can destroy current database objects/data. Perform recovery only against the confirmed target database and only after a second operator verifies the target and backup.
- [ ] Restore to a separate recovery database first where feasible, validate it, then follow the approved production cutover procedure.
- [ ] Restore the previous application environment/configuration from its protected backup if it changed.
- [ ] Re-run health, authentication, RBAC, and data-integrity checks; document the outcome.

## Manual Owner Actions

- [ ] **Domain/DNS:** `streamx.uz` is still subject to CCTLD/registrar activation. The domain owner must confirm activation and configure DNS at the registrar. Do not change nameservers or mail records as part of this application release.
- [ ] **Vercel:** set the production `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, contact/social settings, and demo URLs in the `streamx-landing` project. Use actual approved demo URLs; do not leave synthetic test URLs.
- [ ] **Analytics:** add the real GA4 Measurement ID and Yandex Metrica counter ID only if the owner has approved tracking and the privacy requirements are met.
- [ ] **Contact delivery:** configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in the server-side secret store; never use `NEXT_PUBLIC_` variables for these secrets.
- [ ] **Distributed rate limit:** configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the landing deployment if cross-instance rate limiting is required. Without them, the application falls back to per-instance memory and the limit is not globally shared.
- [ ] Verify email, Telegram bot, admin demo, and contact destinations with the responsible owner before public announcement.

## Release Sign-off

- [ ] Release commit SHA recorded
- [ ] Backup and staging restore evidence recorded
- [ ] Migration audit/apply/assert outputs reviewed
- [ ] Post-deploy checks completed
- [ ] Rollback operator and backup location confirmed
- [ ] Release owner approved public announcement
