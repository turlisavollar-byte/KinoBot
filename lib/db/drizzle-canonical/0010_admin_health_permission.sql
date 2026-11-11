INSERT INTO permissions (id, name, description, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'view:health',
  'view:health permission',
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