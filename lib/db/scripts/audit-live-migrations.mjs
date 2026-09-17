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

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  const migrationTable = await client.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'",
  );
  const migrationRows = migrationTable.rowCount
    ? await client.query(
        "SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id",
      )
    : { rows: [] };
  const migrationFiles = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const journal = JSON.parse(
    await readFile(resolve(migrationsDir, "meta/_journal.json"), "utf8"),
  );

  console.log(
    JSON.stringify(
      {
        database: {
          publicTables: tables.rows.map(({ table_name }) => table_name),
          appliedMigrations: migrationRows.rows,
        },
        repository: {
          migrationFiles,
          journalEntries: journal.entries.map(({ idx, tag }) => ({ idx, tag })),
        },
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
