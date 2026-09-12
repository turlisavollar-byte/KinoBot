import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";

// Load .env from the project root
config({
  path: resolve(process.cwd(), ".env"),
});

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

async function setupPermissions() {
  try {
    console.log("🔍 Checking database tables and data...\n");

    // Check if roles table exists
    const rolesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'roles'
      );
    `);
    console.log(`Roles table exists: ${rolesCheck.rows[0].exists}`);

    // Check if permissions table exists
    const permissionsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'permissions'
      );
    `);
    console.log(`Permissions table exists: ${permissionsCheck.rows[0].exists}`);

    // Check if role_permissions table exists
    const rolePermissionsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'role_permissions'
      );
    `);
    console.log(`Role_permissions table exists: ${rolePermissionsCheck.rows[0].exists}\n`);

    // Check current roles
    const roles = await pool.query('SELECT * FROM roles ORDER BY level DESC');
    console.log("📋 Current roles:");
    console.table(roles.rows);

    // Check current permissions
    const permissions = await pool.query('SELECT * FROM permissions ORDER BY category, name');
    console.log("\n📋 Current permissions:");
    console.table(permissions.rows);

    // Check role_permissions
    const rolePermissions = await pool.query(`
      SELECT r.name as role_name, p.name as permission_name 
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      ORDER BY r.name, p.name
    `);
    console.log("\n📋 Current role-permissions mapping:");
    console.table(rolePermissions.rows);

    // Check admin users
    const adminUsers = await pool.query('SELECT id, email, name, role, is_active FROM admin_users');
    console.log("\n📋 Current admin users:");
    console.table(adminUsers.rows);

    console.log("\n✅ Database check completed");

  } catch (error) {
    console.error("❌ Error checking database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupPermissions().catch(console.error);