# Production Deployment Plan — v2.0.0

## Scope and approval

This is a plan, not deployment authorization. No production host, production
database, object storage, or credentials were accessed while preparing it.
Production deployment requires a separately approved change window, named
operator, target confirmation, and an independent reviewer. Never use staging
credentials or staging rollback state for production.

The v2.0.0 GitHub release points to `main` commit
`c7428a01b625cf7314bf870913110bed529a8d2b`. Verify the approved release and
commit before scheduling a production change; do not assume the release tag
deploys anything.

## Go/no-go gates

Proceed only when all gates are recorded as passed:

- The exact release commit has passing CI for lint, typechecks, tests, and
  builds. Review any skipped tests and document accepted risks.
- Staging is running the same release commit and has passed health, login,
  catalog, movie upload at representative sizes, database/S3 consistency, and
  rollback verification.
- Database migration audit is clean. Every migration is journaled, hashes
  match, and the migration sequence has been tested against a production-like
  staging backup.
- A fresh database backup exists, is non-empty, passes `pg_restore --list`,
  and has been restored into an isolated validation database. Record the
  restore result and retention location.
- Operators have reviewed required environment variables, TLS/DNS, firewall,
  storage credentials, disk/memory headroom, and provider-specific payment
  settings. Do not copy secrets into tickets, logs, or this repository.
- A maintenance window, user-impact notice, on-call contact, and abort
  criteria are agreed. Keep an independent reviewer available throughout.

The existing public launch gate still requires a current backup-restore
validation log. Do not waive it implicitly.

## Pre-deployment inventory

1. Confirm the production target from the approved change record using an
   independent channel. Do not infer the target from staging configuration.
2. Record current release/commit, Compose service/container health, disk and
   memory headroom, DNS/TLS expiry, and current database migration ledger.
3. Confirm the deployment method, permissions, backup location, restore
   operator, and rollback artifact access. The production procedure must not
   depend on staging-only GitHub environments or SSM instance IDs.
4. Verify the release artifact/image provenance and all configuration
   differences from staging. Keep `.env`, private keys, and provider tokens
   outside Git and CI artifacts.

## Deployment sequence

Use the reviewed production deployment mechanism and its documented
maintenance-window procedure; do not run ad hoc shell commands copied from
staging workflows.

1. Announce the start and freeze unrelated production changes.
2. Create and validate a fresh pre-migration PostgreSQL backup; record its
   checksum, location, and restore-validation result.
3. Run the migration audit against the exact release. Stop on unknown,
   unhashed, or unapplied-state inconsistencies.
4. Build/pull the approved application images. Verify configuration without
   printing environment values.
5. Apply journaled migrations once, with the migration role, before starting
   application services. Do not restore or mutate the database as part of an
   application-only rollback.
6. Roll out the API and dependent services in the approved order, then Nginx.
   Preserve PostgreSQL, Redis, and upload volumes. Do not prune volumes.
7. Run authenticated smoke tests for health, admin access, Web access,
   catalog reads, movie media handling, and critical bot/payment integrations.
   Verify database writes and object storage using non-sensitive test data.
8. Monitor error rate, health, resource usage, queue depth, and user-facing
   reports through the agreed observation window. Record the final release
   SHA and operator approvals.

## Abort and rollback

Stop rollout and page the reviewer/on-call operator if health checks fail,
error rates regress, migrations fail, backup validation is missing, or
database/object-storage consistency cannot be established.

- If application health fails before migrations, restore the previous
  application images/configuration and verify health; do not alter database
  state.
- If a migration has completed, do not blindly roll back application and
  schema independently. Follow the migration-specific recovery plan and use
  the verified backup only with explicit incident approval.
- Preserve logs and deployment state needed for diagnosis. Do not delete
  database/object-storage data or run broad cleanup commands.
- Keep the incident open until health, data consistency, and the selected
  recovery point are confirmed by a second operator.

## Post-deployment evidence

Attach the approved release/commit, CI link, migration audit, backup and
restore-validation evidence, smoke-test results, monitoring window, rollback
readiness, and operator/reviewer sign-off to the change record. Record any
deviation and obtain explicit approval before public announcement.

## Related runbooks

- [Production deployment reference](./PRODUCTION_DEPLOYMENT_RUNBOOK.md)
- [Production migration runbook](./DEPLOYMENT_MIGRATION_RUNBOOK.md)
- [Public launch gate](./PUBLIC_LAUNCH_GATE.md)
