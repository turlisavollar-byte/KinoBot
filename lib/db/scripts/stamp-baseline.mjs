import crypto from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const migrationsDir = resolve(
  process.cwd(),
  process.env.MIGRATIONS_DIR || "drizzle-canonical",
);
const databaseUrl = process.env.DATABASE_URL;
const apply = process.env.APPLY_BASELINE_STAMP === "1";

if (!databaseUrl) throw new Error("DATABASE_URL is required");

const journal = JSON.parse(
  await readFile(resolve(migrationsDir, "meta/_journal.json"), "utf8"),
);
const migrationFiles = (await readdir(migrationsDir))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const journalFiles = journal.entries.map(({ tag }) => `${tag}.sql`);
const unjournaledFiles = migrationFiles.filter(
  (file) => !journalFiles.includes(file),
);
if (unjournaledFiles.length > 0) {
  throw new Error(
    `Unjournaled migration files: ${unjournaledFiles.join(", ")}`,
  );
}

const migrations = await Promise.all(
  journal.entries.map(async (entry) => {
    const file = `${entry.tag}.sql`;
    const query = await readFile(resolve(migrationsDir, file));
    return {
      file,
      hash: crypto.createHash("sha256").update(query).digest("hex"),
      createdAt: entry.when,
    };
  }),
);

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  const [{ rows: tables }, { rows: ledgerTable }] = await Promise.all([
    client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    ),
    client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'",
    ),
  ]);

  const publicTableNames = new Set(tables.map(({ table_name }) => table_name));
  const requiredTables = [
    "users",
    "billing_invoices",
    "billing_payments",
    "billing_plans",
    "billing_subscriptions",
    "video_codes",
    "devices",
  ];
  const missingTables = requiredTables.filter(
    (table) => !publicTableNames.has(table),
  );

  const existingLedger = ledgerTable.length
    ? (
        await client.query(
          "SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id",
        )
      ).rows
    : [];

  const report = {
    mode: apply ? "apply" : "dry-run",
    publicTableCount: publicTableNames.size,
    missingRequiredTables: missingTables,
    existingLedgerRows: existingLedger.length,
    migrations: migrations.map(({ file, hash }) => ({ file, hash })),
  };
  console.log(JSON.stringify(report, null, 2));

  if (missingTables.length > 0) {
    throw new Error(
      `Refusing baseline stamp: missing required tables: ${missingTables.join(", ")}`,
    );
  }
  if (!ledgerTable.length) {
    throw new Error(
      "Refusing baseline stamp: drizzle.__drizzle_migrations does not exist.",
    );
  }
  if (existingLedger.length > 0) {
    throw new Error(
      "Refusing baseline stamp: migration ledger is not empty. Use normal migrations instead.",
    );
  }
  if (!apply) {
    console.log("DRY_RUN_ONLY: no database changes were made.");
  } else {
    await client.query("BEGIN");
    for (const migration of migrations) {
      await client.query(
        "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
        [migration.hash, migration.createdAt],
      );
    }
    await client.query("COMMIT");
    console.log(
      `BASELINE_STAMPED: ${migrations.length} migration rows inserted.`,
    );
  }
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // The transaction may not have started.
  }
  throw error;
} finally {
  await client.end();
}
