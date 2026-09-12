import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined. Check the root .env file.");
}

const url = new URL(databaseUrl);
const client = new Client({
  host: url.hostname,
  port: Number(url.port || 5432),
  database: url.pathname.replace(/^\/+/, ""),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const before = await client.query(
    "SELECT COUNT(*)::int AS missing_count FROM admin_users WHERE role_id IS NULL;",
  );
  const sample = await client.query(
    "SELECT id, email, role, role_id FROM admin_users WHERE role_id IS NULL ORDER BY created_at NULLS LAST LIMIT 10;",
  );

  console.log(
    JSON.stringify({ before: before.rows[0], sample: sample.rows }, null, 2),
  );

  if (Number(before.rows[0].missing_count) > 0) {
    await client.query(`
      UPDATE admin_users
      SET role_id = CASE
        WHEN email = 'superadmin@stream.uz' THEN (SELECT id FROM roles WHERE name = 'superadmin' LIMIT 1)
        WHEN email = 'admin@stream.uz' THEN (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
        WHEN email = 'admin@example.com' THEN (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
        WHEN role = 'superadmin' THEN (SELECT id FROM roles WHERE name = 'superadmin' LIMIT 1)
        WHEN role = 'admin' THEN (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
        WHEN role = 'manager' THEN (SELECT id FROM roles WHERE name = 'manager' LIMIT 1)
        WHEN role = 'moderator' THEN (SELECT id FROM roles WHERE name = 'moderator' LIMIT 1)
        ELSE (SELECT id FROM roles WHERE name = 'user' LIMIT 1)
      END
      WHERE role_id IS NULL;
    `);

    const after = await client.query(
      "SELECT COUNT(*)::int AS missing_count FROM admin_users WHERE role_id IS NULL;",
    );
    const leftover = await client.query(
      "SELECT id, email, role, role_id FROM admin_users WHERE role_id IS NULL ORDER BY created_at NULLS LAST LIMIT 10;",
    );

    console.log(
      JSON.stringify(
        { after: after.rows[0], leftover: leftover.rows },
        null,
        2,
      ),
    );
  }
} finally {
  await client.end();
}
