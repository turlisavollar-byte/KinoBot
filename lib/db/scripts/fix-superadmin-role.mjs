import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";

// Load .env from the project root
config({
  path: resolve(process.cwd(), ".env"),
});

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

async function fixSuperadminRole() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("🔧 Fixing superadmin user role...");
    
    // Update superadmin user to have superadmin role
    const result = await client.query(
      'UPDATE admin_users SET role = $1 WHERE email = $2 RETURNING email, role',
      ['superadmin', 'superadmin@stream.uz']
    );
    
    if (result.rows.length > 0) {
      console.log(`✅ ${result.rows[0].email} updated to ${result.rows[0].role} role`);
    } else {
      console.log("❌ superadmin@stream.uz not found");
    }
    
    await client.query('COMMIT');
    console.log("✅ Role fix completed");
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSuperadminRole().catch(console.error);