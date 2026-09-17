# Production Migration Runbook

## Current State

The live database has 41 public application tables and 6 verified entries in
`drizzle.__drizzle_migrations`. The canonical repository contains 6 journaled
migrations, and the catalog hardening migration is applied. `pg_trgm` and the
catalog integrity/search indexes were verified on the live database.

Production uses `lib/db/scripts/migrate-live.mjs`. It validates every applied
migration hash and applies only pending journaled migrations in a transaction.
Do not run ad hoc SQL against production except for an approved incident or
reconciliation procedure.

## Reconciliation Procedure

1. Take a verified database backup and record its restore test result.
2. Run `pnpm --filter @workspace/db run audit:migrations` and save the JSON output.
3. Run `pnpm --filter @workspace/db run migrate:live` and require `MIGRATIONS_CURRENT` or successful `MIGRATION_APPLIED` output.
4. Restore the backup into an isolated staging database and run the same migrator there.
5. Verify application startup, health checks, authentication, billing, and bot flows in staging.
6. Promote the verified image and migration chain during a maintenance window.
7. Confirm the migrator completes before the API starts, then run post-deploy smoke tests.

## Deployment Invariant

Production deployment must satisfy all of these conditions:

- Every migration SQL file is represented in the Drizzle journal.
- A non-empty database has matching Drizzle migration ledger entries.
- Migrations complete successfully before the API container starts.
- Seed is idempotent and runs only after migrations.

The guard is deliberately conservative. A failed deployment is safer than applying an unknown migration chain to an existing production schema.
