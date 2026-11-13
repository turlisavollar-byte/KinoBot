import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  db,
  userIdentitiesTable,
  userProfilesTable,
  usersTable,
  webRefreshSessionsTable,
} from "@workspace/db";
import {
  AccountUnavailableError,
  ExternalIdentityAlreadyOwnedError,
  ExternalIdentityConflictError,
  UnsupportedExternalIdentityProviderError,
} from "../../application/errors/customer-identity.errors";
import type {
  CustomerIdentityRecord,
  CustomerIdentityTransaction,
  CustomerIdentityUnitOfWork,
} from "../../application/ports/customer-identity.unit-of-work";
import { EmailIdentity } from "../../domain/entities/email-identity.entity";
import { ExternalIdentity } from "../../domain/entities/external-identity.entity";
import { GlobalUser } from "../../domain/entities/global-user.entity";
import { PasswordCredential } from "../../domain/entities/password-credential.entity";

type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DrizzleCustomerIdentityUnitOfWork implements CustomerIdentityUnitOfWork {
  async transaction<T>(
    work: (transaction: CustomerIdentityTransaction) => Promise<T>,
  ): Promise<T> {
    return db.transaction((transaction) =>
      work(new DrizzleCustomerIdentityTransaction(transaction)),
    );
  }

  findById(userId: string): Promise<CustomerIdentityRecord | null> {
    return this.transaction((transaction) => transaction.findById(userId));
  }

  findByEmail(email: string): Promise<CustomerIdentityRecord | null> {
    return this.transaction((transaction) => transaction.findByEmail(email));
  }

  findExternalIdentity(
    identity: Pick<ExternalIdentity, "provider" | "subject" | "issuer">,
  ): Promise<ExternalIdentity | null> {
    return this.transaction((transaction) =>
      transaction.findExternalIdentity(identity),
    );
  }

  hasActiveWebSession(userId: string, sessionId: string): Promise<boolean> {
    return this.transaction((transaction) =>
      transaction.hasActiveWebSession(userId, sessionId),
    );
  }

  createRegisteredCustomer(
    record: CustomerIdentityRecord,
  ): Promise<CustomerIdentityRecord> {
    return this.transaction((transaction) =>
      transaction.createRegisteredCustomer(record),
    );
  }

  recordSuccessfulLogin(
    userId: string,
    passwordHash: string,
    at: Date,
    replacementPasswordHash?: string,
  ): Promise<boolean> {
    return this.transaction((transaction) =>
      transaction.recordSuccessfulLogin(
        userId,
        passwordHash,
        at,
        replacementPasswordHash,
      ),
    );
  }

  attachExternalIdentity(identity: ExternalIdentity): Promise<void> {
    return this.transaction((transaction) =>
      transaction.attachExternalIdentity(identity),
    );
  }
}

class DrizzleCustomerIdentityTransaction implements CustomerIdentityTransaction {
  constructor(private readonly tx: DrizzleTransaction) {}

  async findById(userId: string): Promise<CustomerIdentityRecord | null> {
    const [row] = await this.tx
      .select({
        id: usersTable.id,
        email: usersTable.email,
        passwordHash: usersTable.passwordHash,
        status: usersTable.status,
        isActive: usersTable.isActive,
        isBlocked: usersTable.isBlocked,
        deletedAt: usersTable.deletedAt,
        telegramId: usersTable.telegramId,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        displayName: userProfilesTable.displayName,
      })
      .from(usersTable)
      .leftJoin(userProfilesTable, eq(userProfilesTable.userId, usersTable.id))
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!row) return null;

    const [externalRow] = await this.tx
      .select({
        provider: userIdentitiesTable.provider,
        subject: userIdentitiesTable.subject,
        issuer: userIdentitiesTable.issuer,
        verifiedAt: userIdentitiesTable.verifiedAt,
      })
      .from(userIdentitiesTable)
      .where(
        and(
          eq(userIdentitiesTable.userId, userId),
          eq(userIdentitiesTable.provider, "telegram"),
          isNull(userIdentitiesTable.revokedAt),
        ),
      )
      .limit(1);
    const record = mapRecord(row);

    return externalRow
      ? {
          ...record,
          externalIdentity: externalRow.verifiedAt
            ? ExternalIdentity.fromVerifiedProof(userId, {
                provider: "telegram",
                subject: externalRow.subject,
                verifiedAt: externalRow.verifiedAt,
              })
            : ExternalIdentity.fromLegacyTelegram(userId, externalRow.subject),
        }
      : record;
  }

  async findByEmail(email: string): Promise<CustomerIdentityRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const [identityRow] = await this.tx
      .select({
        id: usersTable.id,
        email: usersTable.email,
        passwordHash: usersTable.passwordHash,
        status: usersTable.status,
        isActive: usersTable.isActive,
        isBlocked: usersTable.isBlocked,
        deletedAt: usersTable.deletedAt,
        telegramId: usersTable.telegramId,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        displayName: userProfilesTable.displayName,
        emailIdentitySubject: userIdentitiesTable.subject,
        emailIdentityVerifiedAt: userIdentitiesTable.verifiedAt,
      })
      .from(userIdentitiesTable)
      .innerJoin(usersTable, eq(usersTable.id, userIdentitiesTable.userId))
      .leftJoin(userProfilesTable, eq(userProfilesTable.userId, usersTable.id))
      .where(
        and(
          eq(userIdentitiesTable.provider, "email_password"),
          eq(userIdentitiesTable.subject, normalizedEmail),
          isNull(userIdentitiesTable.revokedAt),
          isNull(usersTable.deletedAt),
        ),
      )
      .limit(1);

    if (identityRow) {
      return mapRecord(identityRow);
    }

    const [row] = await this.tx
      .select({
        id: usersTable.id,
        email: usersTable.email,
        passwordHash: usersTable.passwordHash,
        status: usersTable.status,
        isActive: usersTable.isActive,
        isBlocked: usersTable.isBlocked,
        deletedAt: usersTable.deletedAt,
        telegramId: usersTable.telegramId,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        displayName: userProfilesTable.displayName,
      })
      .from(usersTable)
      .leftJoin(userProfilesTable, eq(userProfilesTable.userId, usersTable.id))
      .where(
        and(
          sql`lower(${usersTable.email}) = ${normalizedEmail}`,
          isNull(usersTable.deletedAt),
        ),
      )
      .limit(1);

    return row ? mapRecord(row) : null;
  }

  async findExternalIdentity(
    identity: Pick<ExternalIdentity, "provider" | "subject" | "issuer">,
  ): Promise<ExternalIdentity | null> {
    if (identity.provider !== "telegram") {
      throw new UnsupportedExternalIdentityProviderError(identity.provider);
    }

    const [identityRow] = await this.tx
      .select({
        userId: userIdentitiesTable.userId,
        verifiedAt: userIdentitiesTable.verifiedAt,
      })
      .from(userIdentitiesTable)
      .where(
        and(
          eq(userIdentitiesTable.provider, identity.provider),
          eq(userIdentitiesTable.subject, identity.subject),
          identity.issuer
            ? eq(userIdentitiesTable.issuer, identity.issuer)
            : isNull(userIdentitiesTable.issuer),
          isNull(userIdentitiesTable.revokedAt),
        ),
      )
      .limit(1);

    if (identityRow) {
      return identityRow.verifiedAt
        ? ExternalIdentity.fromVerifiedProof(identityRow.userId, {
            provider: identity.provider,
            subject: identity.subject,
            ...(identity.issuer ? { issuer: identity.issuer } : {}),
            verifiedAt: identityRow.verifiedAt,
          })
        : ExternalIdentity.fromLegacyTelegram(
            identityRow.userId,
            identity.subject,
          );
    }

    const [row] = await this.tx
      .select({ userId: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.telegramId, identity.subject))
      .limit(1);

    return row
      ? ExternalIdentity.fromLegacyTelegram(row.userId, identity.subject)
      : null;
  }

  async hasActiveWebSession(
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    const now = new Date();
    const [session] = await this.tx
      .select({ id: webRefreshSessionsTable.id })
      .from(webRefreshSessionsTable)
      .innerJoin(usersTable, eq(usersTable.id, webRefreshSessionsTable.userId))
      .where(
        and(
          eq(webRefreshSessionsTable.id, sessionId),
          eq(webRefreshSessionsTable.userId, userId),
          isNull(webRefreshSessionsTable.revokedAt),
          gt(webRefreshSessionsTable.expiresAt, now),
          gt(webRefreshSessionsTable.absoluteExpiresAt, now),
          eq(usersTable.status, "active"),
          eq(usersTable.isActive, true),
          eq(usersTable.isBlocked, false),
          isNull(usersTable.deletedAt),
        ),
      )
      .limit(1);

    return Boolean(session);
  }

  async createRegisteredCustomer(
    record: CustomerIdentityRecord,
  ): Promise<CustomerIdentityRecord> {
    const email = record.emailIdentity;
    const credential = record.passwordCredential;
    if (!email || !credential || email.userId !== record.user.id) {
      throw new Error("Registration requires an owned email and credential");
    }

    const nameParts = record.displayName.trim().split(/\s+/, 2);
    const [created] = await this.tx
      .insert(usersTable)
      .values({
        id: record.user.id,
        email: email.email,
        passwordHash: credential.hash,
        firstName: nameParts[0],
        lastName: nameParts[1] ?? null,
        role: "user",
      })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        passwordHash: usersTable.passwordHash,
        status: usersTable.status,
        isActive: usersTable.isActive,
        isBlocked: usersTable.isBlocked,
        deletedAt: usersTable.deletedAt,
        telegramId: usersTable.telegramId,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      });

    await this.tx
      .insert(userProfilesTable)
      .values({ userId: created.id, displayName: record.displayName });
    await this.tx.insert(userIdentitiesTable).values({
      userId: created.id,
      provider: "email_password",
      subject: email.email,
    });
    if (!created.email || !created.passwordHash) {
      throw new Error(
        "Registered customer persistence returned incomplete credentials",
      );
    }

    return {
      user: GlobalUser.fromLegacy({
        id: created.id,
        status: created.status,
        isActive: created.isActive,
        isBlocked: created.isBlocked,
        deletedAt: created.deletedAt,
      }),
      displayName: record.displayName,
      emailIdentity: EmailIdentity.create(
        created.id,
        created.email,
        "unverified",
      ),
      externalIdentity: created.telegramId
        ? ExternalIdentity.fromLegacyTelegram(created.id, created.telegramId)
        : null,
      passwordCredential: PasswordCredential.create(
        created.id,
        created.passwordHash,
      ),
    };
  }

  async recordSuccessfulLogin(
    userId: string,
    passwordHash: string,
    at: Date,
    replacementPasswordHash?: string,
  ): Promise<boolean> {
    const [updated] = await this.tx
      .update(usersTable)
      .set({
        lastLoginAt: at,
        ...(replacementPasswordHash
          ? { passwordHash: replacementPasswordHash }
          : {}),
      })
      .where(
        and(
          eq(usersTable.id, userId),
          eq(usersTable.passwordHash, passwordHash),
          eq(usersTable.status, "active"),
          eq(usersTable.isActive, true),
          eq(usersTable.isBlocked, false),
          isNull(usersTable.deletedAt),
        ),
      )
      .returning({ id: usersTable.id });

    return Boolean(updated);
  }

  async attachExternalIdentity(identity: ExternalIdentity): Promise<void> {
    if (identity.provider !== "telegram") {
      throw new UnsupportedExternalIdentityProviderError(identity.provider);
    }

    try {
      await this.tx.insert(userIdentitiesTable).values({
        userId: identity.userId,
        provider: identity.provider,
        issuer: identity.issuer,
        subject: identity.subject,
        verifiedAt: identity.verifiedAt,
        revokedAt: identity.revokedAt,
      });

      const [updated] = await this.tx
        .update(usersTable)
        .set({ telegramId: identity.subject })
        .where(
          and(
            eq(usersTable.id, identity.userId),
            isNull(usersTable.telegramId),
            eq(usersTable.status, "active"),
            eq(usersTable.isActive, true),
            eq(usersTable.isBlocked, false),
            isNull(usersTable.deletedAt),
          ),
        )
        .returning({ id: usersTable.id });
      if (!updated) {
        const [current] = await this.tx
          .select({
            status: usersTable.status,
            isActive: usersTable.isActive,
            isBlocked: usersTable.isBlocked,
            deletedAt: usersTable.deletedAt,
            telegramId: usersTable.telegramId,
          })
          .from(usersTable)
          .where(eq(usersTable.id, identity.userId))
          .limit(1);
        if (
          !current ||
          current.status !== "active" ||
          !current.isActive ||
          current.isBlocked ||
          current.deletedAt
        ) {
          throw new AccountUnavailableError();
        }
        if (current.telegramId === identity.subject) {
          return;
        }
        throw new ExternalIdentityConflictError();
      }
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ExternalIdentityAlreadyOwnedError();
      }
      throw error;
    }
  }
}

function mapRecord(row: {
  id: string;
  email: string | null;
  passwordHash: string | null;
  status: string;
  isActive: boolean;
  isBlocked: boolean;
  deletedAt: Date | null;
  telegramId: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  emailIdentitySubject?: string;
  emailIdentityVerifiedAt?: Date | null;
}): CustomerIdentityRecord {
  const user = GlobalUser.fromLegacy({
    id: row.id,
    status: row.status,
    isActive: row.isActive,
    isBlocked: row.isBlocked,
    deletedAt: row.deletedAt,
  });
  const emailIdentity = row.emailIdentitySubject
    ? EmailIdentity.create(
        user.id,
        row.emailIdentitySubject,
        row.emailIdentityVerifiedAt ? "verified" : "unverified",
      )
    : EmailIdentity.fromLegacy(user.id, row.email);
  const passwordCredential = PasswordCredential.fromLegacy(
    user.id,
    row.passwordHash,
  );

  return {
    user,
    displayName:
      row.displayName ??
      [row.firstName, row.lastName].filter(Boolean).join(" "),
    emailIdentity,
    externalIdentity: row.telegramId
      ? ExternalIdentity.fromLegacyTelegram(user.id, row.telegramId)
      : null,
    passwordCredential,
  };
}

function isUniqueConstraintViolation(error: unknown): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "23505" ||
    !("constraint" in error) ||
    typeof error.constraint !== "string"
  ) {
    return false;
  }

  return /(?:users_telegram_id_(key|unique)|user_identities_active_provider_subject_uidx)/i.test(
    error.constraint,
  );
}
