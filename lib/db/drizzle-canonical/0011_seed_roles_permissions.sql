INSERT INTO roles (id, name, description, level, is_system, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'superadmin', 'Super Administrator with full access', 100, true, now(), now()),
  (gen_random_uuid(), 'admin', 'Administrator with most access', 80, true, now(), now()),
  (gen_random_uuid(), 'manager', 'Manager with content and user access', 60, false, now(), now()),
  (gen_random_uuid(), 'moderator', 'Moderator with moderation access', 50, false, now(), now()),
  (gen_random_uuid(), 'user', 'Standard user with base access', 40, false, now(), now()),
  (gen_random_uuid(), 'viewer', 'Viewer with read-only access', 10, false, now(), now())
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint

INSERT INTO permissions (id, name, description, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'view:health',
  'View system health',
  now(),
  now()
)
ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name IN ('admin', 'superadmin')
  AND permissions.name = 'view:health'
ON CONFLICT DO NOTHING;