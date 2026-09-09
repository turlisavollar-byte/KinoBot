import { config } from "dotenv";
import { Pool } from "pg";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });

console.log("DATABASE_URL=", process.env.DATABASE_URL?.slice(0, 70) + "...");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query(
      `select table_schema, table_name, column_name, data_type, is_nullable, column_default
       from information_schema.columns
       where table_name = $1
       order by table_schema, table_name, ordinal_position`,
      ["users"],
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
