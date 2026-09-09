import { config } from "dotenv";
import { Pool } from "pg";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function columnExists(columnName) {
  const result = await pool.query(
    `select 1
     from information_schema.columns
     where table_schema='public' and table_name='users' and column_name=$1`,
    [columnName],
  );
  return result.rowCount > 0;
}

async function constraintExists(constraintName) {
  const result = await pool.query(
    `select 1
     from pg_constraint
     where conname = $1
       and conrelid = 'public.users'::regclass`,
    [constraintName],
  );
  return result.rowCount > 0;
}

async function main() {
  try {
    const columnsToAdd = [
      { name: "email", sql: `ALTER TABLE public.users ADD COLUMN email text` },
      {
        name: "language_code",
        sql: `ALTER TABLE public.users ADD COLUMN language_code text NOT NULL DEFAULT 'en'`,
      },
      {
        name: "status",
        sql: `ALTER TABLE public.users ADD COLUMN status text NOT NULL DEFAULT 'active'`,
      },
      {
        name: "role",
        sql: `ALTER TABLE public.users ADD COLUMN role text NOT NULL DEFAULT 'user'`,
      },
      {
        name: "last_login_at",
        sql: `ALTER TABLE public.users ADD COLUMN last_login_at timestamp with time zone`,
      },
    ];

    for (const column of columnsToAdd) {
      if (!(await columnExists(column.name))) {
        console.log(`Adding column ${column.name}`);
        await pool.query(column.sql);
      } else {
        console.log(`Column ${column.name} already exists`);
      }
    }

    if (!(await constraintExists("users_email_unique"))) {
      console.log("Adding unique constraint users_email_unique");
      await pool.query(
        `ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email)`,
      );
    } else {
      console.log("Constraint users_email_unique already exists");
    }

    const res = await pool.query(
      `select column_name from information_schema.columns where table_schema='public' and table_name='users' order by ordinal_position`,
    );
    console.log(
      "Updated public.users columns:",
      res.rows.map((r) => r.column_name),
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
