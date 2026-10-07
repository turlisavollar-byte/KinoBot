import { randomUUID } from "node:crypto";
import pg from "pg";

const expectedDatabase =
  process.env.AUDIT_TEST_EXPECTED_DATABASE || "kinobot_staging";
if (expectedDatabase === "kinobot" || expectedDatabase !== "kinobot_staging") {
  throw new Error(
    `Refusing retention test for database '${expectedDatabase}'; expected isolated staging database 'kinobot_staging'`,
  );
}

const appUrl =
  process.env.AUDIT_TEST_DATABASE_URL_APP || process.env.DATABASE_URL;
const archiverUrl =
  process.env.AUDIT_TEST_DATABASE_URL_ARCHIVER ||
  process.env.DATABASE_URL_ARCHIVER;
const appRole = process.env.AUDIT_APP_ROLE || "kinobot_user";
const archiverRole = process.env.AUDIT_ARCHIVER_ROLE || "audit_archiver";

if (!appUrl || !archiverUrl) {
  throw new Error(
    "AUDIT_TEST_DATABASE_URL_APP/DATABASE_URL and AUDIT_TEST_DATABASE_URL_ARCHIVER/DATABASE_URL_ARCHIVER are required",
  );
}

function assertStagingConnection(connectionString, expectedRole) {
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.slice(1));
  const username = decodeURIComponent(url.username);
  if (database !== expectedDatabase || database === "kinobot") {
    throw new Error(
      `Refusing connection to database '${database}'; expected '${expectedDatabase}'`,
    );
  }
  if (username !== expectedRole) {
    throw new Error(`Expected role '${expectedRole}', got '${username}'`);
  }
}

assertStagingConnection(appUrl, appRole);
assertStagingConnection(archiverUrl, archiverRole);

const app = new pg.Client({
  connectionString: appUrl,
  connectionTimeoutMillis: 5000,
});
const archiver = new pg.Client({
  connectionString: archiverUrl,
  connectionTimeoutMillis: 5000,
});
const ids = {
  archive: `retention_test_${randomUUID()}`,
  delete: `retention_test_${randomUUID()}`,
};
let appConnected = false;
let archiverConnected = false;
let failed = false;

async function connectAs(client, expectedRole) {
  await client.connect();
  const identity = await client.query(
    "SELECT current_user AS role, current_database() AS database",
  );
  if (
    identity.rows[0]?.role !== expectedRole ||
    identity.rows[0]?.database !== expectedDatabase
  ) {
    throw new Error(
      `Connection identity mismatch: role=${identity.rows[0]?.role}, database=${identity.rows[0]?.database}`,
    );
  }
}

async function expectPermissionDenied(client, sql, values) {
  try {
    await client.query(sql, values);
  } catch (error) {
    if (error.code === "42501") return;
    throw error;
  }
  throw new Error(
    "Expected permission denied (42501), but the operation succeeded",
  );
}

try {
  await connectAs(app, appRole);
  appConnected = true;
  await connectAs(archiver, archiverRole);
  archiverConnected = true;
  console.log(`Connected to isolated staging database '${expectedDatabase}'`);

  const before = await archiver.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE archived_at IS NOT NULL)::int AS archived
     FROM public.audit_logs`,
  );
  console.log(
    `Before: total=${before.rows[0].total}, archived=${before.rows[0].archived}`,
  );

  await app.query(
    `INSERT INTO public.audit_logs
       (id, actor_id, actor_type, actor_email, action, target_type, created_at, severity, metadata)
     VALUES
       ($1, 'retention-test', 'SYSTEM', 'retention-test@example.invalid', 'RETENTION_TEST', 'RETENTION_TEST', NOW() - INTERVAL '100 days', 'info'::audit_severity, '{"synthetic":true,"retention_test":true}'::jsonb),
       ($2, 'retention-test', 'SYSTEM', 'retention-test@example.invalid', 'RETENTION_TEST', 'RETENTION_TEST', NOW() - INTERVAL '370 days', 'warning'::audit_severity, '{"synthetic":true,"retention_test":true}'::jsonb)`,
    [ids.archive, ids.delete],
  );

  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const cutoff365 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const archived = await archiver.query(
    `UPDATE public.audit_logs
     SET archived_at = NOW()
     WHERE id = $1 AND created_at < $2 AND archived_at IS NULL
     RETURNING id`,
    [ids.archive, cutoff90],
  );
  if (archived.rowCount !== 1) {
    throw new Error(
      `Expected to archive one test row; archived ${archived.rowCount}`,
    );
  }
  console.log(`Archive: ${archived.rowCount} test row (older than 90 days)`);

  const archiveState = await archiver.query(
    "SELECT archived_at IS NOT NULL AS archived FROM public.audit_logs WHERE id = $1",
    [ids.archive],
  );
  if (archiveState.rows[0]?.archived !== true) {
    throw new Error("archived_at was not set for the 90-day test row");
  }

  await expectPermissionDenied(
    app,
    "UPDATE public.audit_logs SET severity = 'critical'::audit_severity WHERE id = $1",
    [ids.archive],
  );
  console.log("App UPDATE: denied with 42501");

  await expectPermissionDenied(
    app,
    "DELETE FROM public.audit_logs WHERE id = $1",
    [ids.archive],
  );
  console.log("App DELETE: denied with 42501");

  const deleted = await archiver.query(
    `DELETE FROM public.audit_logs
     WHERE id = $1 AND created_at < $2
     RETURNING id`,
    [ids.delete, cutoff365],
  );
  if (deleted.rowCount !== 1) {
    throw new Error(
      `Expected to delete one test row; deleted ${deleted.rowCount}`,
    );
  }
  console.log(`Delete: ${deleted.rowCount} test row (older than 365 days)`);

  const archiverUpdate = await archiver.query(
    "UPDATE public.audit_logs SET archived_at = archived_at WHERE id = $1 RETURNING id",
    [ids.archive],
  );
  if (archiverUpdate.rowCount !== 1) {
    throw new Error("Archiver UPDATE permission check failed");
  }
  console.log("Archiver UPDATE: OK");

  const archiverDelete = await archiver.query(
    "DELETE FROM public.audit_logs WHERE id = $1 RETURNING id",
    [`${ids.archive}_nonexistent`],
  );
  console.log(`Archiver DELETE: OK (${archiverDelete.rowCount} rows affected)`);

  const after = await archiver.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE archived_at IS NOT NULL)::int AS archived
     FROM public.audit_logs`,
  );
  console.log(
    `After: total=${after.rows[0].total}, archived=${after.rows[0].archived}, deleted=${deleted.rowCount}`,
  );
  console.log("All staging retention permission and cutoff checks passed.");
} catch (error) {
  failed = true;
  throw error;
} finally {
  let cleanupError;
  if (archiverConnected) {
    try {
      await archiver.query(
        "DELETE FROM public.audit_logs WHERE id = ANY($1::text[])",
        [Object.values(ids)],
      );
    } catch (error) {
      cleanupError = error;
    }
  }

  await Promise.all(
    [
      appConnected ? app.end() : Promise.resolve(),
      archiverConnected ? archiver.end() : Promise.resolve(),
    ].map((result) =>
      result.catch((error) => {
        cleanupError ??= error;
      }),
    ),
  );

  if (cleanupError) {
    console.error(
      `Staging retention test cleanup failed: ${cleanupError.message}`,
    );
    if (!failed) throw cleanupError;
  }
}
