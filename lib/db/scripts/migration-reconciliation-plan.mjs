import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const migrationsDir = resolve(
  process.cwd(),
  process.env.MIGRATIONS_DIR || "drizzle-canonical",
);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const journal = JSON.parse(
  await readFile(resolve(migrationsDir, "meta/_journal.json"), "utf8"),
);
const files = (await readdir(migrationsDir))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const journalTags = new Set(journal.entries.map(({ tag }) => `${tag}.sql`));
const prefixGroups = new Map();
for (const file of files) {
  const prefix = file.match(/^\d+/)?.[0] ?? "unknown";
  const group = prefixGroups.get(prefix) ?? [];
  group.push(file);
  prefixGroups.set(prefix, group);
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
          "SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id",
        )
      ).rows
    : [];

  const blockers = [
    ...files
      .filter((file) => !journalTags.has(file))
      .map((file) => `Unjournaled migration: ${file}`),
    ...[...prefixGroups.entries()]
      .filter(([, group]) => group.length > 1)
      .map(
        ([prefix, group]) =>
          `Duplicate numeric prefix ${prefix}: ${group.join(", ")}`,
      ),
    ...(migrationRows.length === 0 && publicTables.length > 0
      ? ["Live database has public tables but no Drizzle ledger rows"]
      : []),
  ];

  const plan = {
    generatedAt: new Date().toISOString(),
    status: blockers.length === 0 ? "verified" : "manual-review-required",
    blockers,
    journal: journal.entries.map(({ idx, tag }) => ({
      idx,
      file: `${tag}.sql`,
    })),
    migrationFiles: files,
    live: {
      publicTableCount: publicTables.length,
      migrationLedgerRowCount: migrationRows.length,
      migrationRows,
    },
    nextSteps:
      blockers.length === 0
        ? [
            "Keep the verified canonical migration directory as the only production migration source.",
            "Take and verify a production backup before the first production migration run.",
            "Deploy through db-migrator, db-seed, then api-server.",
          ]
        : [
            "Take and verify a production backup.",
            "Restore the backup into an isolated staging database.",
            "Generate and review a live-schema baseline or a fully ordered migration chain.",
            "Verify the baseline and all later migrations on staging.",
            "Only then update the production migration ledger and remove the deployment block.",
          ],
  };

  console.log(JSON.stringify(plan, null, 2));
} finally {
  await client.end();
}
