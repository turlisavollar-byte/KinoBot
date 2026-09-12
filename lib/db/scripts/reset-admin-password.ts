import { config } from "dotenv";
import { resolve } from "node:path";
import bcrypt from "bcrypt";
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

async function resetAdminPassword() {
  try {
    const newPassword = "admin123"; // Temporary password for testing
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    console.log("Resetting admin password...");
    
    const result = await pool.query(`
      UPDATE admin_users 
      SET password_hash = $1 
      WHERE email = $2
      RETURNING id, email, name, role, is_active
    `, [passwordHash, 'superadmin@stream.uz']);
    
    if (result.rows.length === 0) {
      console.log("❌ Admin user not found");
    } else {
      console.log("✅ Admin password reset successfully:");
      console.table(result.rows);
      console.log("\n🔑 New password: admin123");
      console.log("⚠️  Please change this password immediately after login!");
    }
    
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

resetAdminPassword().catch(console.error);
