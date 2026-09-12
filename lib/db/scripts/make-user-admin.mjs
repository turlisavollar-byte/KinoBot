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

async function makeUserAdmin() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("🔧 Making first user admin...");
    
    // Get first user
    const userResult = await client.query(
      'SELECT id, email, role FROM admin_users ORDER BY created_at ASC LIMIT 1'
    );
    
    if (userResult.rows.length === 0) {
      console.log("❌ No users found. Please register a user first.");
      await client.query('ROLLBACK');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`Found user: ${user.email} (current role: ${user.role})`);
    
    // Update user to admin role
    const result = await client.query(
      'UPDATE admin_users SET role = $1 WHERE id = $2 RETURNING email, role',
      ['admin', user.id]
    );
    
    if (result.rows.length > 0) {
      console.log(`✅ ${result.rows[0].email} updated to ${result.rows[0].role} role`);
    } else {
      console.log("❌ Failed to update user role");
    }
    
    await client.query('COMMIT');
    console.log("✅ User role update completed");
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

makeUserAdmin().catch(console.error);