require("dotenv").config({
  path: "C:/Users/user/Downloads/Enterprise-Core/Enterprise-Core/.env",
});
const { Client } = require("pg");
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query(
    "SELECT id, email, role, is_active, password_hash FROM admin_users WHERE email ILIKE '%@stream.uz' ORDER BY email",
  );
  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
