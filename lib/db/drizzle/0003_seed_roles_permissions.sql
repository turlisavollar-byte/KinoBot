-- Seed initial roles and permissions based on ROLE_PERMISSIONS
-- Safe to run idempotently: uses ON CONFLICT DO NOTHING

-- Insert roles
INSERT INTO roles (id, name, description, level, is_system, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'superadmin', 'Super Administrator with full access', 10, true, now(), now()),
  (gen_random_uuid(), 'admin', 'Administrator with most access', 8, true, now(), now()),
  (gen_random_uuid(), 'manager', 'Manager with content and user access', 6, false, now(), now()),
  (gen_random_uuid(), 'moderator', 'Moderator with moderation access', 5, false, now(), now()),
  (gen_random_uuid(), 'user', 'Standard user with base access', 4, false, now(), now()),
  (gen_random_uuid(), 'viewer', 'Viewer with read-only access', 2, false, now(), now())
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint

-- Insert permissions (explicit list)
INSERT INTO permissions (id, name, description, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'read:own:profile', 'read:own:profile permission', now(), now()),
  (gen_random_uuid(), 'update:own:profile', 'update:own:profile permission', now(), now()),
  (gen_random_uuid(), 'delete:own:account', 'delete:own:account permission', now(), now()),
  (gen_random_uuid(), 'read:own:sessions', 'read:own:sessions permission', now(), now()),
  (gen_random_uuid(), 'revoke:own:sessions', 'revoke:own:sessions permission', now(), now()),
  (gen_random_uuid(), 'read:sessions', 'read:sessions permission', now(), now()),
  (gen_random_uuid(), 'revoke:sessions', 'revoke:sessions permission', now(), now()),
  (gen_random_uuid(), 'read:users', 'read:users permission', now(), now()),
  (gen_random_uuid(), 'create:users', 'create:users permission', now(), now()),
  (gen_random_uuid(), 'update:users', 'update:users permission', now(), now()),
  (gen_random_uuid(), 'delete:users', 'delete:users permission', now(), now()),
  (gen_random_uuid(), 'read:any:profile', 'read:any:profile permission', now(), now()),
  (gen_random_uuid(), 'update:any:profile', 'update:any:profile permission', now(), now()),
  (gen_random_uuid(), 'lock:users', 'lock:users permission', now(), now()),
  (gen_random_uuid(), 'unlock:users', 'unlock:users permission', now(), now()),
  (gen_random_uuid(), 'read:audit_logs', 'read:audit_logs permission', now(), now()),
  (gen_random_uuid(), 'export:audit_logs', 'export:audit_logs permission', now(), now()),
  (gen_random_uuid(), 'manage:audit_logs', 'manage:audit_logs permission', now(), now()),
  (gen_random_uuid(), 'manage:roles', 'manage:roles permission', now(), now()),
  (gen_random_uuid(), 'manage:permissions', 'manage:permissions permission', now(), now()),
  (gen_random_uuid(), 'manage:system', 'manage:system permission', now(), now()),
  (gen_random_uuid(), 'view:analytics', 'view:analytics permission', now(), now()),
  (gen_random_uuid(), 'read:content', 'read:content permission', now(), now()),
  (gen_random_uuid(), 'create:content', 'create:content permission', now(), now()),
  (gen_random_uuid(), 'update:content', 'update:content permission', now(), now()),
  (gen_random_uuid(), 'delete:content', 'delete:content permission', now(), now()),
  (gen_random_uuid(), 'read:subscriptions', 'read:subscriptions permission', now(), now()),
  (gen_random_uuid(), 'manage:subscriptions', 'manage:subscriptions permission', now(), now()),
  (gen_random_uuid(), 'read:billing', 'read:billing permission', now(), now()),
  (gen_random_uuid(), 'manage:billing', 'manage:billing permission', now(), now()),
  (gen_random_uuid(), 'read:telegram', 'read:telegram permission', now(), now()),
  (gen_random_uuid(), 'manage:telegram', 'manage:telegram permission', now(), now()),
  (gen_random_uuid(), 'read:notifications', 'read:notifications permission', now(), now()),
  (gen_random_uuid(), 'manage:notifications', 'manage:notifications permission', now(), now()),
  (gen_random_uuid(), 'send:notifications', 'send:notifications permission', now(), now())
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint

-- Populate role_permissions by joining names to ids
-- Superadmin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Admin: specified permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name IN (
  'read:own:profile','update:own:profile','read:own:sessions','revoke:own:sessions',
  'read:sessions','revoke:sessions','read:users','create:users','update:users',
  'delete:users','read:any:profile','update:any:profile','lock:users','unlock:users',
  'read:audit_logs','export:audit_logs','manage:audit_logs','manage:roles','manage:system',
  'view:analytics','read:content','create:content','update:content','delete:content',
  'read:subscriptions','manage:subscriptions','read:billing','manage:billing',
  'read:telegram','manage:telegram','read:notifications','manage:notifications','send:notifications'
)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'manager' AND p.name IN (
  'read:own:profile','update:own:profile','read:own:sessions','revoke:own:sessions',
  'read:users','update:users','read:any:profile','lock:users','unlock:users',
  'read:audit_logs','view:analytics','read:content','create:content','update:content',
  'read:subscriptions','manage:subscriptions','read:billing','read:telegram','read:notifications','send:notifications'
)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Moderator
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'moderator' AND p.name IN (
  'read:own:profile','update:own:profile','read:own:sessions','revoke:own:sessions',
  'read:users','read:content','update:content','read:subscriptions','read:telegram'
)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- User
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN (
  'read:own:profile','read:own:sessions','read:content'
)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Viewer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer' AND p.name IN (
  'read:own:profile','read:own:sessions','read:content'
)
ON CONFLICT DO NOTHING;
