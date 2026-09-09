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
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: url });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    );
  `);

  const result = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2",
    ["public", "__drizzle_migrations"],
  );
  console.log("MIGRATIONS_TABLE_EXISTS=" + (result.rowCount > 0));

  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
