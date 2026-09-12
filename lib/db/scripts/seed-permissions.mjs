import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";
import { randomUUID } from "node:crypto";

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

// Define comprehensive permissions for the system
const PERMISSIONS = [
  // User management
  { name: "read:users", description: "View user accounts", category: "users", resource: "users", action: "read" },
  { name: "create:users", description: "Create new user accounts", category: "users", resource: "users", action: "create" },
  { name: "update:users", description: "Update user accounts", category: "users", resource: "users", action: "update" },
  { name: "delete:users", description: "Delete user accounts", category: "users", resource: "users", action: "delete" },
  { name: "block:users", description: "Block/unblock user accounts", category: "users", resource: "users", action: "block" },
  
  // Admin user management
  { name: "read:admin_users", description: "View admin accounts", category: "admin", resource: "admin_users", action: "read" },
  { name: "create:admin_users", description: "Create new admin accounts", category: "admin", resource: "admin_users", action: "create" },
  { name: "update:admin_users", description: "Update admin accounts", category: "admin", resource: "admin_users", action: "update" },
  { name: "delete:admin_users", description: "Delete admin accounts", category: "admin", resource: "admin_users", action: "delete" },
  
  // Content management
  { name: "read:content", description: "View movies, series, genres, actors", category: "content", resource: "content", action: "read" },
  { name: "create:content", description: "Create movies, series, genres, actors", category: "content", resource: "content", action: "create" },
  { name: "update:content", description: "Update movies, series, genres, actors", category: "content", resource: "content", action: "update" },
  { name: "delete:content", description: "Delete movies, series, genres, actors", category: "content", resource: "content", action: "delete" },
  { name: "publish:content", description: "Publish/unpublish content", category: "content", resource: "content", action: "publish" },
  
  // Video codes
  { name: "read:video_codes", description: "View video codes", category: "video", resource: "video_codes", action: "read" },
  { name: "create:video_codes", description: "Create video codes", category: "video", resource: "video_codes", action: "create" },
  { name: "update:video_codes", description: "Update video codes", category: "video", resource: "video_codes", action: "update" },
  { name: "delete:video_codes", description: "Delete video codes", category: "video", resource: "video_codes", action: "delete" },
  { name: "activate:video_codes", description: "Activate/deactivate video codes", category: "video", resource: "video_codes", action: "activate" },
  
  // Analytics
  { name: "view:analytics", description: "View analytics and statistics", category: "analytics", resource: "analytics", action: "view" },
  { name: "export:analytics", description: "Export analytics data", category: "analytics", resource: "analytics", action: "export" },
  
  // Subscriptions
  { name: "read:subscriptions", description: "View subscriptions", category: "billing", resource: "subscriptions", action: "read" },
  { name: "create:subscriptions", description: "Create subscriptions", category: "billing", resource: "subscriptions", action: "create" },
  { name: "update:subscriptions", description: "Update subscriptions", category: "billing", resource: "subscriptions", action: "update" },
  { name: "delete:subscriptions", description: "Delete subscriptions", category: "billing", resource: "subscriptions", action: "delete" },
  { name: "manage:plans", description: "Manage subscription plans", category: "billing", resource: "plans", action: "manage" },
  
  // Payments
  { name: "read:payments", description: "View payment history", category: "billing", resource: "payments", action: "read" },
  { name: "refund:payments", description: "Process refunds", category: "billing", resource: "payments", action: "refund" },
  
  // Telegram
  { name: "manage:telegram", description: "Manage Telegram bot configuration", category: "telegram", resource: "telegram", action: "manage" },
  { name: "manage:channels", description: "Manage Telegram storage channels", category: "telegram", resource: "channels", action: "manage" },
  
  // Notifications
  { name: "read:notifications", description: "View notification templates", category: "notifications", resource: "notifications", action: "read" },
  { name: "create:notifications", description: "Create notification templates", category: "notifications", resource: "notifications", action: "create" },
  { name: "update:notifications", description: "Update notification templates", category: "notifications", resource: "notifications", action: "update" },
  { name: "delete:notifications", description: "Delete notification templates", category: "notifications", resource: "notifications", action: "delete" },
  { name: "send:notifications", description: "Send broadcast notifications", category: "notifications", resource: "notifications", action: "send" },
  
  // System
  { name: "view:health", description: "View system health", category: "system", resource: "health", action: "view" },
  { name: "manage:features", description: "Manage feature flags", category: "system", resource: "features", action: "manage" },
  { name: "view:audit_logs", description: "View audit logs", category: "system", resource: "audit_logs", action: "view" },
  { name: "manage:security", description: "Manage security settings", category: "system", resource: "security", action: "manage" },
  { name: "manage:sessions", description: "Manage user sessions", category: "system", resource: "sessions", action: "manage" },
  
  // Own profile (basic permissions for all authenticated users)
  { name: "read:own:profile", description: "View own profile", category: "profile", resource: "own_profile", action: "read" },
  { name: "update:own:profile", description: "Update own profile", category: "profile", resource: "own_profile", action: "update" },
  { name: "read:own:sessions", description: "View own sessions", category: "profile", resource: "own_sessions", action: "read" },
  { name: "revoke:own:sessions", description: "Revoke own sessions", category: "profile", resource: "own_sessions", action: "revoke" },
];

// Define roles with their permission sets
const ROLES = [
  {
    name: "superadmin",
    description: "Full system access",
    level: 100,
    isSystem: true,
    permissions: PERMISSIONS.map(p => p.name) // All permissions
  },
  {
    name: "admin",
    description: "Administrative access",
    level: 50,
    isSystem: true,
    permissions: [
      // User management
      "read:users", "create:users", "update:users", "block:users",
      // Content management
      "read:content", "create:content", "update:content", "publish:content",
      // Video codes
      "read:video_codes", "create:video_codes", "update:video_codes", "activate:video_codes",
      // Analytics
      "view:analytics", "export:analytics",
      // Subscriptions
      "read:subscriptions", "create:subscriptions", "update:subscriptions", "manage:plans",
      // Payments
      "read:payments",
      // Telegram
      "manage:telegram", "manage:channels",
      // Notifications
      "read:notifications", "create:notifications", "update:notifications", "send:notifications",
      // System
      "view:health", "manage:features", "view:audit_logs",
      // Own profile
      "read:own:profile", "update:own:profile", "read:own:sessions", "revoke:own:sessions",
    ]
  },
  {
    name: "moderator",
    description: "Content moderation access",
    level: 25,
    isSystem: true,
    permissions: [
      // Content management
      "read:content", "update:content", "publish:content",
      // Video codes
      "read:video_codes", "activate:video_codes",
      // Analytics
      "view:analytics",
      // Own profile
      "read:own:profile", "update:own:profile", "read:own:sessions", "revoke:own:sessions",
    ]
  },
  {
    name: "user",
    description: "Basic user access",
    level: 0,
    isSystem: true,
    permissions: [
      // Own profile
      "read:own:profile", "update:own:profile", "read:own:sessions", "revoke:own:sessions",
    ]
  }
];

async function seedPermissions() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("🌱 Starting permissions and roles seeding...\n");
    
    // Create permissions
    console.log("📝 Creating permissions...");
    for (const perm of PERMISSIONS) {
      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO permissions (id, name, description, category, resource, action) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (name) DO UPDATE SET 
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           resource = EXCLUDED.resource,
           action = EXCLUDED.action
         RETURNING id, name`,
        [id, perm.name, perm.description, perm.category, perm.resource, perm.action]
      );
      console.log(`  ✅ ${perm.name}`);
    }
    
    // Create roles and assign permissions
    console.log("\n👥 Creating roles and assigning permissions...");
    for (const role of ROLES) {
      // Create or update role
      const roleId = randomUUID();
      const roleResult = await client.query(
        `INSERT INTO roles (id, name, description, level, is_system) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (name) DO UPDATE SET 
           description = EXCLUDED.description,
           level = EXCLUDED.level,
           is_system = EXCLUDED.is_system
         RETURNING id, name`,
        [roleId, role.name, role.description, role.level, role.isSystem]
      );
      
      const currentRoleId = roleResult.rows[0].id;
      console.log(`  ✅ Role: ${role.name} (ID: ${currentRoleId})`);
      
      // Delete existing role permissions for this role
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [currentRoleId]);
      
      // Assign permissions to role
      for (const permName of role.permissions) {
        const permResult = await client.query(
          'SELECT id FROM permissions WHERE name = $1',
          [permName]
        );
        
        if (permResult.rows.length > 0) {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [currentRoleId, permResult.rows[0].id]
          );
        }
      }
      
      console.log(`     → Assigned ${role.permissions.length} permissions`);
    }
    
    // Update admin users to use proper role reference
    console.log("\n👤 Updating admin users to use proper roles...");
    const adminUsersResult = await client.query('SELECT id, email, role FROM admin_users');
    
    // Role mapping for old role names to new ones
    const roleMapping = {
      'viewer': 'admin',
      'manager': 'admin',
      'superadmin': 'superadmin',
      'admin': 'admin',
      'moderator': 'moderator',
      'user': 'user'
    };
    
    // Specific mapping for superadmin email
    const emailRoleMapping = {
      'superadmin@stream.uz': 'superadmin',
    };
    
    for (const adminUser of adminUsersResult.rows) {
      // Use email-specific mapping first, then fall back to role name mapping
      const mappedRole = emailRoleMapping[adminUser.email] || roleMapping[adminUser.role] || adminUser.role;
      
      // Find the role ID based on the role name
      const roleResult = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        [mappedRole]
      );
      
      if (roleResult.rows.length > 0) {
        // Update admin user with correct role name and ID
        await client.query(
          'UPDATE admin_users SET role = $1 WHERE id = $2',
          [mappedRole, adminUser.id]
        );
        console.log(`  ✅ ${adminUser.email} → ${mappedRole} (Role ID: ${roleResult.rows[0].id})`);
      } else {
        console.log(`  ⚠️  ${adminUser.email} → Role '${mappedRole}' not found in roles table`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log("\n✅ Permissions and roles seeding completed successfully!");
    
    // Show summary
    console.log("\n📊 Summary:");
    const permCount = await client.query('SELECT COUNT(*) as count FROM permissions');
    const roleCount = await client.query('SELECT COUNT(*) as count FROM roles');
    const rolePermCount = await client.query('SELECT COUNT(*) as count FROM role_permissions');
    
    console.log(`  Permissions: ${permCount.rows[0].count}`);
    console.log(`  Roles: ${roleCount.rows[0].count}`);
    console.log(`  Role-Permissions: ${rolePermCount.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error seeding permissions:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedPermissions().catch(console.error);