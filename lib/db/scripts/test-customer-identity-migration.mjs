import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import { resolve } from "node:path";
import pg from "pg";

const connectionString = process.env.IDENTITY_SCHEMA_TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Set IDENTITY_SCHEMA_TEST_DATABASE_URL to a disposable local PostgreSQL database.",
  );
}

const databaseUrl = new URL(connectionString);
if (!["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname)) {
  throw new Error(
    "Migration test only permits a loopback PostgreSQL connection.",
  );
}
const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
if (!/^(identity|kinobot)[_-].*(test|migration)/i.test(databaseName)) {
  throw new Error(
    "Test database name must clearly identify a disposable identity/migration test database.",
  );
}

const { Client } = pg;
const client = new Client({
  connectionString,
  connectionTimeoutMillis: 5000,
});
const migrationPath = resolve(
  process.cwd(),
  "drizzle-canonical/0017_customer_identity.sql",
);
const rollbackPath = resolve(
  process.cwd(),
  "drizzle-canonical/0017_customer_identity.down.sql",
);
let transactionOpen = false;

async function expectSqlState(work, expectedCode, label) {
  const savepoint = `expected_error_${randomUUID().replaceAll("-", "")}`;
  await client.query(`SAVEPOINT "${savepoint}"`);
  try {
    await work();
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT "${savepoint}"`);
    await client.query(`RELEASE SAVEPOINT "${savepoint}"`);
    if (error.code === expectedCode) {
      return;
    }
    throw new Error(`${label}: expected SQLSTATE ${expectedCode}`, {
      cause: error,
    });
  }
  await client.query(`RELEASE SAVEPOINT "${savepoint}"`);
  throw new Error(`${label}: expected SQLSTATE ${expectedCode}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPrivateAddress(address) {
  const version = isIP(address);
  if (version === 4) {
    const [first, second] = address.split(".").map(Number);
    return (
      first === 10 ||
      first === 127 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd")
    );
  }
  return false;
}

try {
  await client.connect();
  const endpoint = await client.query(
    "SELECT host(inet_server_addr()) AS server_address, host(inet_client_addr()) AS client_address, current_database() AS database, to_regclass('public.users') AS users_table",
  );
  const { server_address: serverAddress, client_address: clientAddress } =
    endpoint.rows[0];
  if (
    !isPrivateAddress(serverAddress) ||
    !isPrivateAddress(clientAddress)
  ) {
    throw new Error(
      "Connected PostgreSQL server did not report loopback or private container-network addresses.",
    );
  }
  assert(
    endpoint.rows[0].database === databaseName,
    "Connected database does not match the disposable test database in the URL.",
  );
  assert(
    endpoint.rows[0].users_table === null,
    "Disposable test database must not already contain public.users.",
  );

  await client.query("BEGIN");
  transactionOpen = true;
  await client.query("SET LOCAL search_path TO public");
  await client.query("CREATE TABLE public.users (id text PRIMARY KEY)");

  const migration = (await readFile(migrationPath, "utf8")).replace(
    /^--> statement-breakpoint\s*$/gm,
    "",
  );
  await client.query(migration);

  const identityTable = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_identities'`,
  );
  assert(identityTable.rowCount === 1, "user_identities was not created");

  const identityColumns = await client.query(
    `SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_identities'`,
  );
  const columnMap = new Map(
    identityColumns.rows.map((column) => [column.column_name, column]),
  );
  for (const column of [
    "id",
    "user_id",
    "provider",
    "issuer",
    "subject",
    "verified_at",
    "revoked_at",
    "created_at",
  ]) {
    assert(columnMap.has(column), `Missing user_identities.${column}`);
  }
  assert(
    columnMap.get("user_id").is_nullable === "NO" &&
      columnMap.get("subject").is_nullable === "NO" &&
      columnMap.get("created_at").is_nullable === "NO",
    "Required identity columns must be NOT NULL",
  );
  assert(
    columnMap.get("verified_at").data_type === "timestamp with time zone",
    "verified_at must be timestamptz",
  );

  const mergedColumn = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
        AND column_name = 'merged_into'`,
  );
  assert(mergedColumn.rowCount === 1, "users.merged_into was not created");

  await client.query("INSERT INTO users (id) VALUES ('source'), ('target')");
  await client.query(
    `INSERT INTO user_identities (id, user_id, provider, subject)
      VALUES ('tg-1', 'source', 'telegram', 'telegram-subject')`,
  );
  await expectSqlState(
    () =>
      client.query(
        `INSERT INTO user_identities (id, user_id, provider, subject)
          VALUES ('tg-duplicate', 'target', 'telegram', 'telegram-subject')`,
      ),
    "23505",
    "Active Telegram identity uniqueness",
  );
  await expectSqlState(
    () =>
      client.query(
        `INSERT INTO user_identities (id, user_id, provider, subject)
          VALUES ('invalid-provider', 'source', 'unknown', 'subject')`,
      ),
    "23514",
    "Provider allowlist",
  );
  await expectSqlState(
    () =>
      client.query(
        `INSERT INTO user_identities (id, user_id, provider, subject, issuer)
          VALUES ('missing-issuer', 'source', 'google_oidc', 'google-subject', NULL)`,
      ),
    "23514",
    "Google issuer requirement",
  );
  await expectSqlState(
    () =>
      client.query(
        `INSERT INTO user_identities (id, user_id, provider, subject)
          VALUES ('noncanonical-email', 'source', 'email_password', 'MixedCase@example.com')`,
      ),
    "23514",
    "Email subject canonicalization",
  );
  await client.query(
    `INSERT INTO user_identities (id, user_id, provider, issuer, subject)
      VALUES
        ('google-issuer-a', 'source', 'google_oidc', 'https://issuer-a', 'same-subject'),
        ('google-issuer-b', 'target', 'google_oidc', 'https://issuer-b', 'same-subject')`,
  );
  await expectSqlState(
    () =>
      client.query(
        `INSERT INTO user_identities (id, user_id, provider, issuer, subject)
          VALUES ('google-duplicate', 'target', 'google_oidc', 'https://issuer-a', 'same-subject')`,
      ),
    "23505",
    "Google issuer-scoped uniqueness",
  );
  await client.query(
    `UPDATE user_identities SET revoked_at = now() WHERE id = 'tg-1';
     INSERT INTO user_identities (id, user_id, provider, subject)
       VALUES ('tg-relinked', 'target', 'telegram', 'telegram-subject')`,
  );
  await expectSqlState(
    () => client.query("UPDATE users SET merged_into = id WHERE id = 'source'"),
    "23514",
    "Self-merge check",
  );
  await expectSqlState(
    () =>
      client.query(
        "UPDATE users SET merged_into = 'missing-user' WHERE id = 'source'",
      ),
    "23503",
    "Merged target foreign key",
  );
  await client.query(
    "UPDATE users SET merged_into = 'target' WHERE id = 'source'",
  );

  const rollback = (await readFile(rollbackPath, "utf8")).replace(
    /^--> statement-breakpoint\s*$/gm,
    "",
  );
  await expectSqlState(
    () => client.query(rollback),
    "55000",
    "Rollback protection for populated identity data",
  );
  await client.query(
    "DELETE FROM public.user_identities; UPDATE public.users SET merged_into = NULL",
  );
  await client.query(rollback);

  const remainingIdentityTable = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_identities'`,
  );
  const remainingMergedColumn = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
        AND column_name = 'merged_into'`,
  );
  assert(
    remainingIdentityTable.rowCount === 0 &&
      remainingMergedColumn.rowCount === 0,
    "Rollback did not remove the identity table and users.merged_into",
  );

  await client.query("ROLLBACK");
  transactionOpen = false;
  console.log(
    `Customer identity migration and rollback checks passed on local disposable database '${databaseName}'; all changes were rolled back.`,
  );
} finally {
  if (transactionOpen) {
    await client.query("ROLLBACK");
  }
  await client.end();
}
