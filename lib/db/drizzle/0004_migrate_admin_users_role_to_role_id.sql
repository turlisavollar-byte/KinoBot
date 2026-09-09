-- Add role_id column to admin_users and populate from roles.name
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role_id text;
--> statement-breakpoint

-- Populate role_id by matching roles.name to admin_users.role
UPDATE admin_users
SET role_id = r.id
FROM roles r
WHERE r.name = admin_users.role;
--> statement-breakpoint

-- For any remaining null role_id, set to 'user' role id
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'user' LIMIT 1)
WHERE role_id IS NULL;
--> statement-breakpoint

-- Make role_id NOT NULL
ALTER TABLE admin_users ALTER COLUMN role_id SET NOT NULL;
--> statement-breakpoint

-- Add foreign key constraint
ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS admin_users_role_id_idx ON admin_users (role_id);
