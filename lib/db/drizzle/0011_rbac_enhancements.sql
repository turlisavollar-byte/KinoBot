-- Add role_id foreign key to admin_users table
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role_id TEXT REFERENCES roles(id);

-- Add email verification columns
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT false;

-- Add password reset columns
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index on verification_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_verification_token ON admin_users(verification_token);

-- Create index on reset_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_reset_token ON admin_users(reset_token);

-- Migrate existing users: if role = 'superadmin', set role_id to superadmin role
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'superadmin' LIMIT 1)
WHERE role = 'superadmin' AND role_id IS NULL;

-- Migrate existing users: if role = 'admin', set role_id to admin role
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
WHERE role = 'admin' AND role_id IS NULL;

-- Migrate existing users: if role = 'manager', set role_id to manager role
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'manager' LIMIT 1)
WHERE role = 'manager' AND role_id IS NULL;

-- Migrate existing users: if role = 'moderator', set role_id to moderator role
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'moderator' LIMIT 1)
WHERE role = 'moderator' AND role_id IS NULL;

-- Migrate existing users: if role = 'user', set role_id to user role
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'user' LIMIT 1)
WHERE role = 'user' AND role_id IS NULL;

-- Migrate existing users: if role = 'viewer', set role_id to viewer role
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'viewer' LIMIT 1)
WHERE role = 'viewer' AND role_id IS NULL;

-- Set default role_id for users without role (set to user role)
UPDATE admin_users
SET role_id = (SELECT id FROM roles WHERE name = 'user' LIMIT 1)
WHERE role_id IS NULL;
