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

async function fixAdminRole() {
  try {
    console.log("Fixing admin user role...");
    
    // Update the role to superadmin
    const result = await pool.query(`
      UPDATE admin_users 
      SET role = 'superadmin' 
      WHERE email = $1
      RETURNING id, email, name, role, is_active
    `, ['superadmin@stream.uz']);
    
    if (result.rows.length === 0) {
      console.log("❌ Admin user not found");
    } else {
      console.log("✅ Admin user role updated:");
      console.table(result.rows);
    }
    
  } catch (error) {
    console.error("Error fixing admin role:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixAdminRole().catch(console.error);
