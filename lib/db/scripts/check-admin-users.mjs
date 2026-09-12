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

async function checkAdminUsers() {
  const client = await pool.connect();
  
  try {
    console.log("🔍 Checking admin_users table...");
    
    const result = await client.query(
      'SELECT id, email, name, role, is_active, created_at FROM admin_users ORDER BY created_at ASC'
    );
    
    if (result.rows.length === 0) {
      console.log("❌ No admin users found in database.");
    } else {
      console.log(`✅ Found ${result.rows.length} admin users:`);
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.name}) - Role: ${user.role}, Active: ${user.is_active}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkAdminUsers().catch(console.error);