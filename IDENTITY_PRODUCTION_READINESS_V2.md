# IDENTITY PHASE 11-4 — V2 Production Readiness

## Executive summary

- **Branch:** `feature/identity-fix`
- **Reviewed commit:** `6f9cb15928f7266f921bd63119fa9591a23cee3b`
- **Scope:** Phase 11-3 identity blocker implementation, the bot lifecycle test mock fix, and local disposable migration/rollback validation.
- **Verdict:** **⚠️ Not a production deployment approval.** All six Phase 11-3 implementation checks pass in the available local evidence. Google OIDC, production-data validation, and several database integration/concurrency checks remain outside this evidence.
- Production V1 and old V2 staging were not accessed. The local migration test rolled back all DDL and data changes.

## Phase 11-3 blocker re-readiness

| #   | Blocker                         | Status          | Evidence and limits                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Wire `user_identities`          | ✅ Scoped flows | Registration inserts an `email_password` identity; login looks up the canonical identity before falling back to `users.email`; Telegram lookup and link use `user_identities` while retaining `users.telegram_id` compatibility. **Google OIDC is not implemented by these customer flows.**                                                                                                           |
| 2   | Enforce suspended status        | ✅              | Web auth and refresh require `status = active`, `is_active`, and not blocked; deleted users are excluded by the query. A shared lifecycle predicate has focused tests.                                                                                                                                                                                                                                 |
| 3   | Customer identity audit         | ✅              | Web routes emit `REGISTER`, `LOGIN`, `LOGIN_FAILED`, `LINK`, and `LOGOUT` through the audit service. Audit metadata does not include credentials or email. Audit-write failures are logged; route-level audit persistence was not integration-tested here.                                                                                                                                             |
| 4   | Shared/redacted auth rate limit | ✅              | Auth limits use atomic Redis `INCR`/TTL counters shared across instances; email is hashed in the key. Production fails closed with 503 if Redis is absent, unavailable, or not ready. Dev/test may use the warned in-process fallback. Local Redis responded successfully.                                                                                                                             |
| 5   | Legacy SHA-256 rehash           | ✅              | Successful legacy verification rehashes to bcrypt using a conditional update that checks the prior hash and active account state. A focused login test passes; the retirement and dormant-account plan is documented in [IDENTITY_LEGACY_PASSWORD_REHASH_PLAN.md](./IDENTITY_LEGACY_PASSWORD_REHASH_PLAN.md). Removing legacy verification still requires an authorized inventory and cutoff decision. |
| 6   | Migration and rollback          | ✅ Local test   | `pnpm test:migration:customer-identity` passed against the disposable local PostgreSQL database. The harness verifies schema constraints and rollback, then rolls back the outer transaction. Its fixture starts with a synthetic `users(id)` table; this is not evidence of an applied migration on production or a full V2 database.                                                                 |

## Bot lifecycle test fix

The test mock for `@workspace/db` now includes the `telegramMediaTable` fields referenced by the media pipeline. The pipeline is mocked at its boundary so the bot lifecycle unit test remains isolated when `REDIS_URL` is configured.

- Bot lifecycle test: **✅**
- Full API test suite: **86 test files passed, 2 skipped; 363 tests passed, 3 skipped; 0 failed.**
- API typecheck: **✅**

The skipped tests include database integration and end-to-end coverage; no coverage percentage was measured.

## Readiness notes

- Registration/login/link use email and Telegram identity rows, but Google OIDC verification/login is still unsupported.
- Redis behavior is covered by focused unit tests and a local Redis availability check; production Redis topology and operational alerting were not tested.
- The migration harness proves migration and rollback behavior against a minimal disposable schema. PostgreSQL repository integration, true concurrent identity linking, and query-plan/performance checks remain outstanding.
- Session-family/reuse behavior and a recent step-up requirement for linking remain separate security decisions.
- No production or staging database was queried or changed. The only DB test was local and transaction-rolled-back.

## Conclusion

**Six Phase 11-3 blockers: ✅ in local code/test evidence. Overall production-ready: ⚠️.** Do not interpret the passing local suite as deployment approval. Before deployment, complete the remaining provider/security decisions and validate against an approved, fully migrated disposable V2 database, including repository and concurrency tests.

## AGENT XULOSA

- **Nima qildim:** bot lifecycle test DB mockiga `telegramMediaTable` qo‘shildi va Telegram media pipeline test chegarasida mock qilindi; to‘liq API suite, typecheck va local migration/rollback qayta tekshirildi; readiness hisobot yozildi.
- **Nima qoldi:** Google OIDC, production-datasiz sanitized legacy inventory, to‘liq V2 DB integration/concurrency dalillari va qolgan session/step-up qarorlari.
- **Tavsiya:** Phase 12 deploy oldidan bu ochiq ishlarni egasi bilan tasdiqlab, production bo‘lmagan to‘liq migratsiyalangan disposable V2 bazada tekshiring.
