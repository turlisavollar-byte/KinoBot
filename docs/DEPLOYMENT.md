# Server A Deployment Runbook

This runbook describes the current Server A layout: Ubuntu host `kinobot`, repository at `/opt/KinoBot`, API managed by PM2 as `kinobot-api`, system PostgreSQL, and Nginx serving the Dashboard's static build. Never place credentials or tokens in commands, logs, or this document.

## Preconditions

- Confirm the approved release branch and commit locally; do not deploy an unreviewed working tree.
- Confirm SSH access with the configured `kinobot` alias.
- Schedule a maintenance window: restarting `kinobot-api` interrupts API and Telegram bot traffic briefly.
- Confirm `/opt` has enough free space and the current source paths exist.

## Backups

Create and verify both backups before replacing files or applying a migration:

```sh
ssh kinobot 'cd /opt && TS=$(date +%Y%m%d-%H%M%S) && sudo tar -czf /opt/KinoBot-backup-$TS.tar.gz --exclude=node_modules --exclude=.git --exclude=dist KinoBot/ && sudo chmod 600 /opt/KinoBot-backup-$TS.tar.gz && sudo tar -tzf /opt/KinoBot-backup-$TS.tar.gz >/dev/null'
ssh kinobot 'TS=$(date +%Y%m%d-%H%M%S) && sudo -u postgres pg_dump kinobot > /tmp/kinobot-db-$TS.sql && test -s /tmp/kinobot-db-$TS.sql && sudo mv /tmp/kinobot-db-$TS.sql /opt/kinobot-db-$TS.sql && sudo chmod 600 /opt/kinobot-db-$TS.sql'
```

Verify file size and dump header/table/data sections before continuing. Keep backup permissions restricted.

## Transfer and migration

1. Transfer only reviewed release files to `/tmp` on Server A, then compare them with the destination source before replacing files.
2. Do not overwrite an already-correct users pagination file unnecessarily.
3. Check that `system_settings` does not already exist before applying migration `0012_cute_kree.sql`.
4. Apply the migration transactionally and stop on SQL errors:

```sh
ssh kinobot 'sudo -u postgres psql -d kinobot -1 -v ON_ERROR_STOP=1 -f /opt/KinoBot/lib/db/drizzle-canonical/0012_cute_kree.sql'
```

5. Verify the table columns, `trial_duration_days` default row, `kinobot_user` privileges, and migration state. Do not rerun a migration blindly.

## Build and restart

The host uses Node 22 and Corepack; the workspace pins pnpm 9.15.0. Build each application only after its source and dependencies are verified:

```sh
ssh kinobot 'cd /opt/KinoBot && corepack pnpm --dir apps/api-server build'
ssh kinobot 'cd /opt/KinoBot && corepack pnpm --dir apps/dashboard build'
```

Check API output under `apps/api-server/dist/` and Dashboard output under `apps/dashboard/dist/public/`. Then restart only the API process:

```sh
ssh kinobot 'pm2 restart kinobot-api'
```

Nginx serves the static Dashboard files; it normally does not require a restart after a successful static build. Do not restart PostgreSQL or Redis for this release.

## Post-deploy checks

```sh
ssh kinobot 'pm2 list'
ssh kinobot 'curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/healthz'
ssh kinobot 'curl -s -o /dev/null -w "%{http_code}" http://localhost/'
```

Expected: `kinobot-api` is online and both HTTP checks return `200`. Verify the settings endpoint using an authorized test account; unauthenticated `401` is expected without a token. Review API startup logs for errors and manually verify Dashboard settings load/save.

## Rollback

If the build fails before restart, do not restart the service. If the API fails after restart, restore the backed-up application source, rebuild the affected application, restart only the affected process, and rerun health checks. Preserve the failed build logs for diagnosis.

Migration `0012` creates an additive settings table. Do not drop that table or restore the whole database as an automatic rollback: settings may have changed after deployment. Database restoration is a separate, approved recovery procedure with a maintenance window and an explicit data-loss review.
