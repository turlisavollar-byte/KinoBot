-- Backfill legacy admin_users.role_id values for users created before the RBAC migration.
UPDATE admin_users
SET role_id = CASE
  WHEN role = 'superadmin' THEN (SELECT id FROM roles WHERE name = 'superadmin' LIMIT 1)
  WHEN role = 'admin' THEN (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
  WHEN role = 'manager' THEN (SELECT id FROM roles WHERE name = 'manager' LIMIT 1)
  WHEN role = 'moderator' THEN (SELECT id FROM roles WHERE name = 'moderator' LIMIT 1)
  WHEN role = 'viewer' THEN (SELECT id FROM roles WHERE name = 'viewer' LIMIT 1)
  ELSE (SELECT id FROM roles WHERE name = 'user' LIMIT 1)
END
WHERE role_id IS NULL;

-- Optional integrity guard: ensure no legacy rows remain unresolved after backfill.
-- ALTER TABLE admin_users ALTER COLUMN role_id SET NOT NULL;
