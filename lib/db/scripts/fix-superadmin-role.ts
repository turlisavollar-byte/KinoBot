import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";

// Load .env from the parent directory
config({
  path: resolve(process.cwd(), "../../.env"),
});

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

async function fixSuperadminRole() {
  try {
    console.log("Fixing superadmin user role...");

    // Update the superadmin user role
    const result = await pool.query(
      'UPDATE admin_users SET role = $1 WHERE email = $2 RETURNING id, email, name, role, is_active',
      ['superadmin', 'superadmin@stream.uz']
    );

    if (result.rows.length === 0) {
      console.log("❌ User not found with email: superadmin@stream.uz");
    } else {
      console.log("✅ Superadmin user role updated:");
      console.table(result.rows);
    }

    // Check all admin users after update
    console.log("\nAll admin users after update:");
    const allUsers = await pool.query(
      'SELECT id, email, name, role, is_active, created_at FROM admin_users LIMIT 10'
    );
    console.table(allUsers.rows);

  } catch (error) {
    console.error("Error fixing superadmin role:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixSuperadminRole().catch(console.error);
