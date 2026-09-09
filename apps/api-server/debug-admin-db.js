require("dotenv").config({ path: "../../.env" });
const { Client } = require("pg");

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(
    "SELECT id, email, role, is_active, password_hash FROM admin_users WHERE email ILIKE '%@stream.uz' ORDER BY email",
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
