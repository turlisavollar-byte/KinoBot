# Audit Database Security

## 1. Purpose

Audit records are append-only for the application role. Retention operations are
performed by a separate role. Table ownership is held by a role that cannot log
in, so the runtime application account cannot change grants or bypass table
privileges by owning the tables.

## 2. Role Responsibilities

| Role             | Login | Responsibility and audit-table privileges                                                              |
| ---------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| `audit_owner`    | No    | Owns `public.audit_logs` and `public.audit_log_tags`; never used for a connection.                     |
| `kinobot_user`   | Yes   | Application runtime; `SELECT` and `INSERT` on both audit tables. No `UPDATE`, `DELETE`, or `TRUNCATE`. |
| `audit_archiver` | Yes   | Retention worker; `SELECT`, `UPDATE`, and `DELETE` on `audit_logs`; no audit-tag privileges.           |
| `postgres`       | Yes   | Migrations and database administration.                                                                |

The migration grants `CONNECT` on this database to `audit_archiver` and the
necessary `USAGE` on the `public` schema. The archiver password is set separately
with `psql`'s interactive `\password audit_archiver` command; it is not stored
in migration SQL or Git.

## 3. Why Ownership Is Separate

PostgreSQL table owners inherently retain owner privileges. A `REVOKE UPDATE` or
`REVOKE DELETE` does not remove those privileges from the owner. Therefore,
`kinobot_user` must not own the audit tables. The `audit_owner` role is
`NOLOGIN`, has no password or role memberships, and is used only as the object
owner.

Never grant `LOGIN` to `audit_owner`, set a password for it, or grant it as a
membership to an application or operator login role.

### Audit Payload Redaction

`AuditService.log()` sanitizes the DTO before fallback handling, validation,
diff generation, database insertion, or DTO logging. This covers audit writes
from the middleware, shared audit utility, and direct service callers. Nested
objects and arrays are traversed immutably; sensitive values are replaced with
`[REDACTED]`. The current key patterns include password/passphrase, token,
authorization, cookie, secret, API/private/signing/encryption keys,
credentials, session ID, JWT, bearer, CSRF/XSRF, and signature names. The exact
key `auth` is also redacted. Raw credentials must not be placed in free-text
fields because key-based redaction cannot reliably discover secrets embedded
inside arbitrary strings.

Sanitization applies to new writes only. Historical audit rows are not
rewritten. Review them with the approved read-only key/path scanner; do not
select secret values into terminal output or update historical records without
a separate approved remediation and backup plan.

## 4. Environment Configuration

The current application and live migration scripts use `DATABASE_URL` only;
they do not yet consume `DATABASE_URL_ADMIN`, `DATABASE_URL_APP`, or
`DATABASE_URL_ARCHIVER`.

Keep the long-running API's `DATABASE_URL` set to the `kinobot_user` connection
string. Immediately before a migration, temporarily change `DATABASE_URL` in
the protected server `.env` to the `postgres` connection string because the
migrator requires administrative permissions. After the migration succeeds,
restore the `kinobot_user` URL before restarting the API. Do not put real
credentials in this document, `.env.example`, command history, or Git.

## 5. Migration and Password Setup

Take and verify a database backup before migration. Confirm the migration
ledger is current through 0007, and then run the 0008 migration as `postgres`:

```bash
pnpm --filter @workspace/db run assert:migrations
pnpm --filter @workspace/db run migrate:live
```

The migrator reads `DATABASE_URL` from the repository-root `.env`. Once the
migration succeeds, set the archiver password interactively:

```text
psql -h 127.0.0.1 -p 5432 -U postgres -d kinobot
\password audit_archiver
\q
```

Do not run the production migration until the pending migration list and
backup have been verified.

### Retention Runtime

Retention is disabled unless `AUDIT_RETENTION_ENABLED=true`. Keep it unset or
set to `false` in production until the retention behavior has passed staging
verification. The controller returns HTTP 503 with `RETENTION_DISABLED`, and
the service independently rejects the operation as a second fail-closed guard.

Variant B runs a separate, lazily created `audit_archiver` connection pool in
the API process. Configure `DATABASE_URL_ARCHIVER` only in the protected server
environment; it must connect as `audit_archiver`, and its URL is never logged.
The pool is limited to two connections and is closed during orderly shutdown.
Because this places a privileged credential in the API process, the longer-term
isolation option is a separate retention worker.

The current archive operation only sets the database `archived_at` marker and
retention metadata; it does not copy records to S3 or a file archive. The
approved policy archives records at 90 days and permanently deletes records at
365 days. Require `deleteAfterDays >= archiveAfterDays`. The archive update and
delete run sequentially in one transaction using the archiver connection. Do
not enable the production flag until staging checks confirm both operations.

## 6. Deployment Verification and Deferred Smoke Test

There is currently no staging database available. The staging-only mutation
smoke-test code and package command are present in Commit 2, but the test has
not been run against staging. Do not add `AUDIT_TEST_*` values to the
production `.env`.

After applying 0008 in production, verify role attributes and table ownership
using this read-only catalog query as `postgres`:

```sql
SELECT role.rolname, role.rolcanlogin, role.rolsuper,
       role.rolcreatedb, role.rolcreaterole,
       (auth.rolpassword IS NULL) AS password_is_null,
       (SELECT tableowner FROM information_schema.tables
	WHERE table_schema = 'public' AND table_name = 'audit_logs') AS audit_logs_owner,
       (SELECT tableowner FROM information_schema.tables
	WHERE table_schema = 'public' AND table_name = 'audit_log_tags') AS audit_log_tags_owner
FROM pg_roles role
JOIN pg_authid auth ON auth.oid = role.oid
WHERE role.rolname IN ('audit_owner', 'audit_archiver', 'kinobot_user')
ORDER BY role.rolname;
```

Verify effective table privileges, including inherited grants, without
modifying records:

```sql
WITH role_tables(role_name, table_name) AS (
	VALUES
		('kinobot_user', 'audit_logs'),
		('kinobot_user', 'audit_log_tags'),
		('audit_archiver', 'audit_logs'),
		('audit_archiver', 'audit_log_tags')
),
privileges(privilege_name) AS (
	VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
				 ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
)
SELECT role_tables.role_name, role_tables.table_name,
			 privileges.privilege_name,
			 has_table_privilege(
				 role_tables.role_name,
				 format('public.%I', role_tables.table_name),
				 privileges.privilege_name
			 ) AS allowed
FROM role_tables
CROSS JOIN privileges
ORDER BY role_tables.role_name, role_tables.table_name,
				 privileges.privilege_name;
```

Verify `audit_owner` has no role memberships:

```sql
SELECT member_role.rolname AS member_of
FROM pg_auth_members membership
JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
JOIN pg_roles member_role ON member_role.oid = membership.member
WHERE granted_role.rolname = 'audit_owner'
	 OR member_role.rolname = 'audit_owner';
```

Verify the foreign-key constraint triggers still exist; 0008 must not remove
these internal triggers:

```sql
SELECT relation.relname AS table_name, trigger.tgname AS trigger_name
FROM pg_trigger trigger
JOIN pg_class relation ON relation.oid = trigger.tgrelid
JOIN pg_namespace schema ON schema.oid = relation.relnamespace
WHERE schema.nspname = 'public'
	AND relation.relname IN ('audit_logs', 'audit_log_tags')
	AND trigger.tgname LIKE 'RI_ConstraintTrigger_%'
ORDER BY relation.relname, trigger.tgname;
```

Expected results: `audit_owner` is `NOLOGIN` and owns both audit tables;
`kinobot_user` has only `SELECT` and `INSERT` on both; `audit_archiver` has
`SELECT`, `UPDATE`, and `DELETE` on `audit_logs`, and no audit-tag privileges.
The effective privilege matrix should show no `TRUNCATE`, `REFERENCES`, or
`TRIGGER` for either runtime role.
`audit_owner.password_is_null` is true, and the membership query returns no
rows. The FK trigger query should show the pre-existing constraint triggers.
These four catalog checks verify configured state, not runtime query behavior.
Do not run test `INSERT`, `UPDATE`, or `DELETE` statements against production.

After the API restart, trigger an ordinary application action that emits an
audit event, then verify it with a read-only `SELECT`. The role mutation smoke
test must be added in Commit 2 and run against a dedicated staging database;
it has not been run as part of this production-first rollout.

## 7. Rollback

If the migration fails, the live migrator runs the pending migration in a
transaction and rolls it back. Do not manually edit the migration ledger or
rerun partial SQL. Fix the cause and retry after validating the migration chain.

If 0008 succeeded but the application must be rolled back, stop the API, take a
fresh backup, and run the following as `postgres` after reviewing the current
grants:

```sql
GRANT CREATE ON SCHEMA public TO kinobot_user;
ALTER TABLE public.audit_logs OWNER TO kinobot_user;
ALTER TABLE public.audit_log_tags OWNER TO kinobot_user;
REVOKE CREATE ON SCHEMA public FROM kinobot_user;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.audit_logs FROM audit_archiver;
```

Leave `audit_owner` present and `NOLOGIN`; do not use `DROP ROLE` or `CASCADE`
for routine rollback. The rollback changes ownership and grants, not audit rows.
It does not reverse the earlier severity migration 0007.

## 8. Future Migration Warning

Future DDL that changes either audit table must run with an administrative
migration role and must preserve `audit_owner` as the table owner. Never run
schema migrations using `kinobot_user`, and do not use `drizzle-kit push` on
production. Review every new audit-table grant, trigger, foreign key, and
retention change against the role policy above.
