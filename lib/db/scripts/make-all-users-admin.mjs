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

async function makeAllUsersAdmin() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("🔧 Making all users admin...");
    
    // Get all users
    const userResult = await client.query(
      'SELECT id, email, role FROM admin_users ORDER BY created_at ASC'
    );
    
    if (userResult.rows.length === 0) {
      console.log("❌ No users found.");
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`Found ${userResult.rows.length} users:`);
    
    for (const user of userResult.rows) {
      console.log(`- ${user.email} (current role: ${user.role})`);
      
      // Update user to admin role
      const result = await client.query(
        'UPDATE admin_users SET role = $1 WHERE id = $2 RETURNING email, role',
        ['admin', user.id]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ ${result.rows[0].email} updated to ${result.rows[0].role} role`);
      }
    }
    
    await client.query('COMMIT');
    console.log("✅ All users updated to admin role");
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

makeAllUsersAdmin().catch(console.error);