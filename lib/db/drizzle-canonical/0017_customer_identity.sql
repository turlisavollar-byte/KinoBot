CREATE TABLE "user_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"issuer" text,
	"subject" text NOT NULL,
	"verified_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identities_provider_check" CHECK ("user_identities"."provider" IN ('telegram', 'email_password', 'google_oidc')),
	CONSTRAINT "user_identities_issuer_check" CHECK (("user_identities"."provider" = 'google_oidc' AND "user_identities"."issuer" IS NOT NULL AND btrim("user_identities"."issuer") <> '')
        OR ("user_identities"."provider" <> 'google_oidc' AND "user_identities"."issuer" IS NULL)),
	CONSTRAINT "user_identities_subject_nonempty_check" CHECK (length(btrim("user_identities"."subject")) > 0),
	CONSTRAINT "user_identities_email_subject_canonical_check" CHECK ("user_identities"."provider" <> 'email_password' OR "user_identities"."subject" = lower(btrim("user_identities"."subject")))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "merged_into" text;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_identities_user_id_idx" ON "user_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_identities_active_provider_subject_uidx" ON "user_identities" USING btree ("provider","subject") WHERE "user_identities"."revoked_at" IS NULL AND "user_identities"."provider" <> 'google_oidc';--> statement-breakpoint
CREATE UNIQUE INDEX "user_identities_active_google_subject_uidx" ON "user_identities" USING btree ("provider","issuer","subject") WHERE "user_identities"."revoked_at" IS NULL AND "user_identities"."provider" = 'google_oidc';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_merged_into_users_id_fk" FOREIGN KEY ("merged_into") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_merged_into_idx" ON "users" USING btree ("merged_into") WHERE "users"."merged_into" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_merged_into_not_self_check" CHECK ("users"."merged_into" IS NULL OR "users"."merged_into" <> "users"."id");