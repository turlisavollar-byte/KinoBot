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

async function checkAdminUser() {
  try {
    console.log("Checking admin_users table...");
    
    const result = await pool.query(`
      SELECT id, email, name, role, is_active, created_at 
      FROM admin_users 
      WHERE email = $1
    `, ['superadmin@stream.uz']);
    
    if (result.rows.length === 0) {
      console.log("❌ Admin user not found with email: superadmin@stream.uz");
      
      // Check all admin users
      const allUsers = await pool.query(`
        SELECT id, email, name, role, is_active, created_at 
        FROM admin_users 
        LIMIT 10
      `);
      
      console.log("All admin users in database:");
      console.table(allUsers.rows);
    } else {
      console.log("✅ Admin user found:");
      console.table(result.rows);
    }
    
    // Check admin_sessions table structure
    console.log("\nChecking admin_sessions table structure...");
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admin_sessions'
      ORDER BY ordinal_position
    `);
    
    console.log("admin_sessions columns:");
    console.table(columns.rows);
    
  } catch (error) {
    console.error("Error checking admin user:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkAdminUser().catch(console.error);
