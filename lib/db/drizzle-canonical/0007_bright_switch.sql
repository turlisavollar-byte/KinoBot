CREATE TYPE "public"."audit_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "severity" "audit_severity" DEFAULT 'info' NOT NULL;--> statement-breakpoint
UPDATE "audit_logs"
SET "severity" = CASE UPPER(COALESCE("metadata"->>'severity', 'LOW'))
	WHEN 'CRITICAL' THEN 'critical'::"public"."audit_severity"
	WHEN 'HIGH' THEN 'warning'::"public"."audit_severity"
	WHEN 'MEDIUM' THEN 'warning'::"public"."audit_severity"
	ELSE 'info'::"public"."audit_severity"
END;--> statement-breakpoint
CREATE INDEX "audit_logs_severity_created_at_idx" ON "audit_logs" USING btree ("severity","created_at" DESC NULLS LAST);