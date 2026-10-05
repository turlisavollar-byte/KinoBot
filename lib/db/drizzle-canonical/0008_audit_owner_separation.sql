DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'audit_archiver'
  ) THEN
    CREATE ROLE audit_archiver LOGIN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'audit_owner'
  ) THEN
    CREATE ROLE audit_owner NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint

ALTER ROLE audit_archiver
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
--> statement-breakpoint

ALTER ROLE audit_owner
  NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD NULL;
--> statement-breakpoint

DO $$
DECLARE
  member_role record;
  granted_role record;
BEGIN
  FOR member_role IN
    SELECT member.rolname
    FROM pg_auth_members membership
    JOIN pg_roles granted ON granted.oid = membership.roleid
    JOIN pg_roles member ON member.oid = membership.member
    WHERE granted.rolname = 'audit_owner'
  LOOP
    EXECUTE format('REVOKE audit_owner FROM %I', member_role.rolname);
  END LOOP;

  FOR granted_role IN
    SELECT granted.rolname
    FROM pg_auth_members membership
    JOIN pg_roles member ON member.oid = membership.member
    JOIN pg_roles granted ON granted.oid = membership.roleid
    WHERE member.rolname = 'audit_owner'
  LOOP
    EXECUTE format('REVOKE %I FROM audit_owner', granted_role.rolname);
  END LOOP;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO audit_archiver',
    current_database()
  );
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO kinobot_user;
GRANT USAGE ON SCHEMA public TO audit_archiver;
GRANT USAGE, CREATE ON SCHEMA public TO audit_owner;
--> statement-breakpoint

ALTER TABLE public.audit_logs OWNER TO audit_owner;
--> statement-breakpoint

ALTER TABLE public.audit_log_tags OWNER TO audit_owner;
--> statement-breakpoint

REVOKE CREATE ON SCHEMA public FROM audit_owner;
--> statement-breakpoint

REVOKE ALL PRIVILEGES ON TABLE public.audit_logs FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.audit_logs FROM kinobot_user;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO kinobot_user;
--> statement-breakpoint

REVOKE ALL PRIVILEGES ON TABLE public.audit_logs FROM audit_archiver;
GRANT SELECT, UPDATE, DELETE ON TABLE public.audit_logs TO audit_archiver;
--> statement-breakpoint

REVOKE ALL PRIVILEGES ON TABLE public.audit_log_tags FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.audit_log_tags FROM kinobot_user;
GRANT SELECT, INSERT ON TABLE public.audit_log_tags TO kinobot_user;
--> statement-breakpoint

REVOKE ALL PRIVILEGES ON TABLE public.audit_log_tags FROM audit_archiver;
--> statement-breakpoint

DROP TRIGGER IF EXISTS audit_owner_guard ON public.audit_logs;
DROP TRIGGER IF EXISTS audit_owner_guard ON public.audit_log_tags;