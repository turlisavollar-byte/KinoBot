import { randomUUID } from "node:crypto";
import pg from "pg";

const APP_ROLE = process.env.AUDIT_APP_ROLE || "kinobot_user";
const ARCHIVER_ROLE = process.env.AUDIT_ARCHIVER_ROLE || "audit_archiver";
const OWNER_ROLE = process.env.AUDIT_OWNER_ROLE || "audit_owner";
const ADMIN_USER = process.env.AUDIT_TEST_ADMIN_USER || "postgres";
const expectedDatabase = process.env.AUDIT_TEST_EXPECTED_DATABASE || "kinobot";
// Destructive role-separation checks must never run against production.
const IS_PRODUCTION = expectedDatabase === "kinobot";
if (IS_PRODUCTION) {
  throw new Error(
    `Production database '${expectedDatabase}' is refused; set AUDIT_TEST_EXPECTED_DATABASE to the staging database name`,
  );
}

const connectionStrings = {
  app: process.env.AUDIT_TEST_DATABASE_URL_APP || process.env.DATABASE_URL,
  archiver:
    process.env.AUDIT_TEST_DATABASE_URL_ARCHIVER ||
    process.env.DATABASE_URL_ARCHIVER,
  admin: process.env.AUDIT_TEST_DATABASE_URL_ADMIN,
};

for (const [role, connectionString] of Object.entries(connectionStrings)) {
  if (!connectionString) {
    throw new Error(
      `AUDIT_TEST_DATABASE_URL_${role.toUpperCase()} is required`,
    );
  }
}

const clients = Object.fromEntries(
  Object.entries(connectionStrings).map(([role, connectionString]) => [
    role,
    new pg.Client({ connectionString, connectionTimeoutMillis: 5000 }),
  ]),
);
const ownerUrl = new URL(connectionStrings.app);
ownerUrl.username = OWNER_ROLE;
ownerUrl.password = "";
const ownerClient = new pg.Client({
  connectionString: ownerUrl.toString(),
  connectionTimeoutMillis: 5000,
});

const ids = {
  logs: Object.fromEntries(
    Object.keys(clients).map((role) => [
      role,
      `audit_role_test_${randomUUID()}`,
    ]),
  ),
  tag: `audit_role_tag_test_${randomUUID()}`,
};
const connected = new Set();
let testFailed = false;

async function connect(client, role) {
  await client.connect();
  connected.add(client);
  const identity = await client.query(
    "SELECT current_user AS role, current_database() AS database",
  );
  if (identity.rows[0]?.role !== role) {
    throw new Error(
      `Expected database role ${role}, got ${identity.rows[0]?.role}`,
    );
  }
  if (identity.rows[0]?.database !== expectedDatabase) {
    throw new Error(
      `Refusing database ${identity.rows[0]?.database}; expected staging database ${expectedDatabase}`,
    );
  }
}

async function expectDenied(client, sql, values = []) {
  try {
    await client.query(sql, values);
  } catch (error) {
    if (error.code === "42501") return;
    throw error;
  }
  throw new Error(`Expected permission denied (42501): ${sql}`);
}

async function insertAuditLog(client, id) {
  await client.query(
    `INSERT INTO public.audit_logs (id, actor_type, action, target_type)
     VALUES ($1, 'SYSTEM', 'role_separation_test', 'role_separation_test')`,
    [id],
  );
}

try {
  await connect(clients.admin, ADMIN_USER);
  const adminRole = await clients.admin.query(
    "SELECT rolsuper FROM pg_roles WHERE rolname = current_user",
  );
  if (adminRole.rows[0]?.rolsuper !== true) {
    throw new Error(
      "AUDIT_TEST_DATABASE_URL_ADMIN must connect as a superuser",
    );
  }

  await Promise.all([
    connect(clients.app, APP_ROLE),
    connect(clients.archiver, ARCHIVER_ROLE),
  ]);

  const ownerState = await clients.admin.query(
    `
    SELECT role.rolcanlogin, auth.rolpassword,
      EXISTS (
        SELECT 1 FROM pg_auth_members membership
        WHERE membership.roleid = role.oid OR membership.member = role.oid
      ) AS has_memberships,
      (SELECT tableowner FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'audit_logs') AS logs_owner,
      (SELECT tableowner FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'audit_log_tags') AS tags_owner
    FROM pg_roles role
    LEFT JOIN pg_authid auth ON auth.oid = role.oid
    WHERE role.rolname = $1
  `,
    [OWNER_ROLE],
  );
  const owner = ownerState.rows[0];
  if (
    !owner ||
    owner.rolcanlogin !== false ||
    owner.rolpassword !== null ||
    owner.has_memberships !== false ||
    owner.logs_owner !== OWNER_ROLE ||
    owner.tags_owner !== OWNER_ROLE
  ) {
    throw new Error(`${OWNER_ROLE} catalog state is incorrect`);
  }
  console.log(
    `CHECK 1/5: ${OWNER_ROLE} is NOLOGIN, has no password/memberships, and owns both tables`,
  );

  const appId = ids.logs.app;
  await insertAuditLog(clients.app, appId);
  const appRead = await clients.app.query(
    "SELECT id FROM public.audit_logs WHERE id = $1",
    [appId],
  );
  if (appRead.rowCount !== 1)
    throw new Error(`${APP_ROLE} could not read its audit row`);

  await clients.app.query(
    `INSERT INTO public.audit_log_tags (id, audit_log_id, tag)
     VALUES ($1, $2, 'role_separation_test')`,
    [ids.tag, appId],
  );
  const appTagRead = await clients.app.query(
    "SELECT id FROM public.audit_log_tags WHERE id = $1",
    [ids.tag],
  );
  if (appTagRead.rowCount !== 1)
    throw new Error(`${APP_ROLE} could not read its audit tag`);

  await expectDenied(
    clients.app,
    "UPDATE public.audit_logs SET action = 'forbidden' WHERE id = $1",
    [appId],
  );
  await expectDenied(
    clients.app,
    "DELETE FROM public.audit_logs WHERE id = $1",
    [appId],
  );
  await expectDenied(
    clients.app,
    "UPDATE public.audit_log_tags SET tag = 'forbidden' WHERE id = $1",
    [ids.tag],
  );
  await expectDenied(
    clients.app,
    "DELETE FROM public.audit_log_tags WHERE id = $1",
    [ids.tag],
  );
  console.log(
    `CHECK 2/5: ${APP_ROLE} can INSERT/SELECT audit rows and tags; UPDATE/DELETE are denied`,
  );

  const archiverId = ids.logs.archiver;
  await insertAuditLog(clients.admin, archiverId);
  const archiverRead = await clients.archiver.query(
    "SELECT id FROM public.audit_logs WHERE id = $1",
    [archiverId],
  );
  if (archiverRead.rowCount !== 1)
    throw new Error(`${ARCHIVER_ROLE} could not SELECT audit_logs`);
  const archiverUpdate = await clients.archiver.query(
    "UPDATE public.audit_logs SET action = 'role_separation_archived' WHERE id = $1",
    [archiverId],
  );
  if (archiverUpdate.rowCount !== 1)
    throw new Error(`${ARCHIVER_ROLE} could not UPDATE audit_logs`);
  const archiverDelete = await clients.archiver.query(
    "DELETE FROM public.audit_logs WHERE id = $1",
    [archiverId],
  );
  if (archiverDelete.rowCount !== 1)
    throw new Error(`${ARCHIVER_ROLE} could not DELETE audit_logs`);
  await expectDenied(
    clients.archiver,
    "INSERT INTO public.audit_logs (id, actor_type, action, target_type) VALUES ($1, 'SYSTEM', 'forbidden', 'test')",
    [ids.logs.admin],
  );
  console.log(
    `CHECK 3/5: ${ARCHIVER_ROLE} can SELECT/UPDATE/DELETE audit_logs, but cannot INSERT`,
  );

  const adminId = ids.logs.admin;
  await insertAuditLog(clients.admin, adminId);
  const adminUpdate = await clients.admin.query(
    "UPDATE public.audit_logs SET action = 'role_separation_admin' WHERE id = $1",
    [adminId],
  );
  if (adminUpdate.rowCount !== 1)
    throw new Error("postgres could not UPDATE audit_logs");
  const adminDelete = await clients.admin.query(
    "DELETE FROM public.audit_logs WHERE id = $1",
    [adminId],
  );
  if (adminDelete.rowCount !== 1)
    throw new Error(`${ADMIN_USER} could not DELETE audit_logs`);
  console.log(`CHECK 4/5: ${ADMIN_USER} can INSERT/UPDATE/DELETE audit_logs`);

  try {
    await ownerClient.connect();
    connected.add(ownerClient);
  } catch (error) {
    if (error.code !== "28000" && error.code !== "28P01") {
      throw new Error(
        `${OWNER_ROLE} login failed for an unexpected reason: ${error.message}`,
      );
    }
    console.log(`CHECK 5/5: direct ${OWNER_ROLE} login is rejected (NOLOGIN)`);
  }
  if (connected.has(ownerClient)) {
    throw new Error(`${OWNER_ROLE} unexpectedly accepted a direct login`);
  }

  console.log("AUDIT_ROLE_SEPARATION_OK");
} catch (error) {
  testFailed = true;
  throw error;
} finally {
  let cleanupError;
  if (connected.has(clients.admin)) {
    try {
      await clients.admin.query(
        "DELETE FROM public.audit_log_tags WHERE id = $1 OR audit_log_id = ANY($2::text[])",
        [ids.tag, Object.values(ids.logs)],
      );
      await clients.admin.query(
        "DELETE FROM public.audit_logs WHERE id = ANY($1::text[])",
        [Object.values(ids.logs)],
      );
    } catch (error) {
      cleanupError = error;
    }
  }

  await Promise.all(
    [...connected].map((client) =>
      client.end().catch((error) => {
        cleanupError ??= error;
      }),
    ),
  );

  if (cleanupError) {
    console.error("Smoke-test cleanup failed:", cleanupError.message);
    if (!testFailed) throw cleanupError;
  }
}
