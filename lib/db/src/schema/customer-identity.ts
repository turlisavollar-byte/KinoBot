import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userIdentitiesTable = pgTable(
  "user_identities",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    issuer: text("issuer"),
    subject: text("subject").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "user_identities_provider_check",
      sql`${table.provider} IN ('telegram', 'email_password', 'google_oidc')`,
    ),
    check(
      "user_identities_issuer_check",
      sql`(${table.provider} = 'google_oidc' AND ${table.issuer} IS NOT NULL AND btrim(${table.issuer}) <> '')
        OR (${table.provider} <> 'google_oidc' AND ${table.issuer} IS NULL)`,
    ),
    check(
      "user_identities_subject_nonempty_check",
      sql`length(btrim(${table.subject})) > 0`,
    ),
    check(
      "user_identities_email_subject_canonical_check",
      sql`${table.provider} <> 'email_password' OR ${table.subject} = lower(btrim(${table.subject}))`,
    ),
    index("user_identities_user_id_idx").on(table.userId),
    uniqueIndex("user_identities_active_provider_subject_uidx")
      .on(table.provider, table.subject)
      .where(
        sql`${table.revokedAt} IS NULL AND ${table.provider} <> 'google_oidc'`,
      ),
    uniqueIndex("user_identities_active_google_subject_uidx")
      .on(table.provider, table.issuer, table.subject)
      .where(
        sql`${table.revokedAt} IS NULL AND ${table.provider} = 'google_oidc'`,
      ),
  ],
);
