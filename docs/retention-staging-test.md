# Retention Staging Test — Natijalar

## Sana

2026-10-07

## Muhit

- Local Docker PostgreSQL 18.6
- Database: `kinobot_staging`
- Port: `5433`
- Test script: `lib/db/scripts/test-retention-staging.mjs`
- Roles: `kinobot_user`, `audit_archiver`, `audit_owner`
- Applied migrations: `0000`–`0009` (10 total)

The staging container, its dedicated volume, and `.env.staging.local` were
removed after the test. Production and the separate StreamOps containers were
not modified.

## Maqsad

Validate 90/365-day archive/delete SQL behavior and audit-table permission
separation using a temporary, isolated staging database before considering any
production retention change.

## Test usuli

The test script refuses databases other than `kinobot_staging` and verifies the
configured app and archiver roles before connecting. It creates two uniquely
identified test rows: one 100 days old and one 370 days old. It then archives
the first, deletes the second, verifies that the app role cannot update/delete,
and confirms that the archiver role can perform its required operations.

The script's `finally` cleanup deletes only those two unique test row IDs. It
does not delete the pre-existing synthetic fixture rows.

## Test natijalari

| Tekshiruv                   | Natija                                                       |
| --------------------------- | ------------------------------------------------------------ |
| Archive, 100-day test row   | ✅ 1 row archived; `archived_at` set                         |
| Delete, 370-day test row    | ✅ 1 test row deleted                                        |
| App `UPDATE`                | ✅ Denied with PostgreSQL `42501`                            |
| App `DELETE`                | ✅ Denied with PostgreSQL `42501`                            |
| Archiver `UPDATE`           | ✅ Allowed                                                   |
| Archiver `DELETE`           | ✅ Allowed; nonexistent-row permission probe affected 0 rows |
| Test-row cleanup            | ✅ No `retention_test_%` rows remained                       |
| Existing synthetic fixtures | ✅ 236 remained                                              |

The post-cleanup verification reported 236 total synthetic audit rows, 0
retention-test rows, and 0 archived rows. The archived test row was intentionally
removed by the test cleanup after its `archived_at` value had been verified.

## Xulosa va cheklovlar

The staging test passed for the explicit archive/delete statements and role
permissions. It did not exercise a scheduled retention worker, production API
retention endpoint, or cron job. Therefore it does not by itself authorize
enabling `AUDIT_RETENTION_ENABLED` in production.

Before production enablement:

1. Verify the production backup and restore procedure.
2. Review the production retention trigger/endpoint and its authorization.
3. Plan a monitored, approved rollout and verify its audit results.
4. Keep `AUDIT_RETENTION_ENABLED=false` until that review and approval are
   complete.

## Tozalash

- Temporary `kinobot-staging-db` container removed.
- Dedicated `kinobot-staging-data` Docker volume removed.
- Local `.env.staging.local` removed.
- StreamOps containers and production were not touched.
