import crypto from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
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
const migrationFiles = new Set(
  (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")),
);
const migrations = [];

for (const entry of journal.entries) {
  const file = `${entry.tag}.sql`;
  if (!migrationFiles.has(file)) {
    throw new Error(`Migration file is missing: ${file}`);
  }
  const sql = await readFile(resolve(migrationsDir, file), "utf8");
  migrations.push({
    file,
    sql,
    hash: crypto.createHash("sha256").update(sql).digest("hex"),
    createdAt: entry.when,
  });
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const applied = (
    await client.query(
      "SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id",
    )
  ).rows;

  if (applied.length > migrations.length) {
    throw new Error(
      `Live migration ledger has ${applied.length} rows but repository has only ${migrations.length} migrations`,
    );
  }

  for (let index = 0; index < applied.length; index += 1) {
    const expected = migrations[index];
    const actual = applied[index];
    if (actual.hash.toLowerCase() !== expected.hash) {
      throw new Error(
        `Migration hash mismatch at ${expected.file}: live=${actual.hash}, repository=${expected.hash}`,
      );
    }
  }

  const pending = migrations.slice(applied.length);
  if (pending.length === 0) {
    console.log(`MIGRATIONS_CURRENT: ${migrations.length} migrations applied.`);
  } else {
    await client.query("BEGIN");
    try {
      for (const migration of pending) {
        const statements = migration.sql
          .split(/--> statement-breakpoint\s*/g)
          .map((statement) => statement.trim())
          .filter(Boolean);
        for (const statement of statements) {
          await client.query(statement);
        }
        await client.query(
          "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
          [migration.hash, migration.createdAt],
        );
        console.log(`MIGRATION_APPLIED: ${migration.file}`);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
