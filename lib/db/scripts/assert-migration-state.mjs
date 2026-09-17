import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const migrationsDir = resolve(
  process.cwd(),
  process.env.MIGRATIONS_DIR || "drizzle-canonical",
);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const journal = JSON.parse(
  await readFile(resolve(migrationsDir, "meta/_journal.json"), "utf8"),
);
const migrationFiles = (await readdir(migrationsDir))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const journalTags = new Set(journal.entries.map(({ tag }) => `${tag}.sql`));
const unjournaledFiles = migrationFiles.filter(
  (file) => !journalTags.has(file),
);

if (unjournaledFiles.length > 0) {
  throw new Error(
    [
      "Refusing deployment: migration files are not represented in meta/_journal.json.",
      `Unjournaled files: ${unjournaledFiles.join(", ")}`,
      "Reconcile and verify the migration chain before deploying.",
    ].join(" "),
  );
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  const [{ rows: migrationTable }, { rows: publicTables }] = await Promise.all([
    client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'",
    ),
    client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    ),
  ]);
  const migrationRows = migrationTable.length
    ? (
        await client.query(
          "SELECT id FROM drizzle.__drizzle_migrations ORDER BY id",
        )
      ).rows
    : [];

  if (migrationRows.length === 0 && publicTables.length > 0) {
    throw new Error(
      [
        "Refusing deployment: the database has public tables but no Drizzle migration ledger entries.",
        "Create and verify a production baseline before running migrations.",
      ].join(" "),
    );
  }

  console.log(
    `Migration state accepted: ${migrationRows.length} ledger entries, ${publicTables.length} public tables.`,
  );
} finally {
  await client.end();
}
