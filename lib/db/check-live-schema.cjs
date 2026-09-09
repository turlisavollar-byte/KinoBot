const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.resolve(process.cwd(), "../../.env");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const url = env.DATABASE_URL;
console.log("HAS_DB_URL=" + !!url);
if (!url) process.exit(0);

(async () => {
  const client = new Client({ connectionString: url });
  await client.connect();

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('billing_invoices','billing_payments','billing_outbox','__drizzle_migrations') ORDER BY table_name",
  );
  console.log("TABLES=" + JSON.stringify(tables.rows.map((r) => r.table_name)));

  for (const table of [
    "billing_invoices",
    "billing_payments",
    "billing_outbox",
  ]) {
    const cols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY column_name",
      [table],
    );
    console.log(
      table + "=" + JSON.stringify(cols.rows.map((r) => r.column_name)),
    );
  }

  const mj = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='__drizzle_migrations'",
  );
  console.log("DRIZZLE_MIGRATIONS_EXISTS=" + (mj.rowCount > 0));
  if (mj.rowCount > 0) {
    const rows = await client.query(
      'SELECT * FROM "__drizzle_migrations" ORDER BY id',
    );
    console.log("MIGRATION_ROWS=" + JSON.stringify(rows.rows));
  }

  const schemaList = await client.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('public','drizzle') ORDER BY schema_name",
  );
  console.log(
    "SCHEMAS=" + JSON.stringify(schemaList.rows.map((r) => r.schema_name)),
  );

  const drizzleTables = await client.query(
    "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema='drizzle' ORDER BY table_name",
  );
  console.log("DRIZZLE_SCHEMA_TABLES=" + JSON.stringify(drizzleTables.rows));

  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
