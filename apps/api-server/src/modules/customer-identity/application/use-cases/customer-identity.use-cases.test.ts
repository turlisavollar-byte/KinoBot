import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PasswordService } from "@/modules/identity/infrastructure/services/password.service";
import {
  AccountUnavailableError,
  CurrentAccountProofRequiredError,
  EmailAlreadyExistsError,
  ExternalIdentityAlreadyOwnedError,
  ExternalIdentityConflictError,
  InvalidCredentialsError,
  InvalidExternalIdentityProofError,
} from "../errors/customer-identity.errors";
import type {
  CustomerIdentityRecord,
  CustomerIdentityTransaction,
  CustomerIdentityUnitOfWork,
} from "../ports/customer-identity.unit-of-work";
import { EmailIdentity } from "../../domain/entities/email-identity.entity";
import { ExternalIdentity } from "../../domain/entities/external-identity.entity";
import { GlobalUser } from "../../domain/entities/global-user.entity";
import { PasswordCredential } from "../../domain/entities/password-credential.entity";
import { LinkExternalIdentityUseCase } from "./link-external-identity.use-case";
import { LoginCustomerUseCase } from "./login-customer.use-case";
import { RegisterCustomerUseCase } from "./register-customer.use-case";

class MemoryUnitOfWork implements CustomerIdentityUnitOfWork {
  records = new Map<string, CustomerIdentityRecord>();
  activeSessions = new Set<string>();
  failRegistrationAfterUserInsert = false;
  private transactionQueue: Promise<void> = Promise.resolve();

  async transaction<T>(
    work: (transaction: CustomerIdentityTransaction) => Promise<T>,
  ): Promise<T> {
    let release = () => {};
    const previous = this.transactionQueue;
    this.transactionQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    const stagedRecords = new Map(this.records);
    const stagedSessions = new Set(this.activeSessions);
    try {
      const result = await work(
        this.createTransaction(stagedRecords, stagedSessions),
      );
      this.records = stagedRecords;
      this.activeSessions = stagedSessions;
      return result;
    } finally {
      release();
    }
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
  ): Promise<boolean> {
    return this.transaction((transaction) =>
      transaction.recordSuccessfulLogin(userId, passwordHash, at),
    );
  }

  attachExternalIdentity(identity: ExternalIdentity): Promise<void> {
    return this.transaction((transaction) =>
      transaction.attachExternalIdentity(identity),
    );
  }

  private createTransaction(
    records: Map<string, CustomerIdentityRecord>,
    sessions: Set<string>,
  ): CustomerIdentityTransaction {
    return {
      findById: async (userId) => records.get(userId) ?? null,
      findByEmail: async (email) =>
        [...records.values()].find(
          (record) =>
            record.emailIdentity?.email === email.trim().toLowerCase() &&
            record.user.status !== "deleted",
        ) ?? null,
      findExternalIdentity: async (identity) =>
        [...records.values()]
          .map((record) => record.externalIdentity)
          .find(
            (external) =>
              external?.provider === identity.provider &&
              external.subject === identity.subject &&
              external.issuer === identity.issuer,
          ) ?? null,
      hasActiveWebSession: async (userId, sessionId) =>
        sessions.has(`${userId}:${sessionId}`),
      createRegisteredCustomer: async (record) => {
        records.set(record.user.id, record);
        if (this.failRegistrationAfterUserInsert) {
          throw new Error("profile persistence failed");
        }
        return record;
      },
      recordSuccessfulLogin: async (userId, passwordHash) => {
        const record = records.get(userId);
        return Boolean(
          record?.user.canAuthenticate &&
          record.passwordCredential?.hash === passwordHash,
        );
      },
      attachExternalIdentity: async (identity) => {
        const owned = [...records.values()].some(
          (record) =>
            record.externalIdentity?.provider === identity.provider &&
            record.externalIdentity.subject === identity.subject &&
            record.externalIdentity.issuer === identity.issuer,
        );
        if (owned) {
          throw {
            code: "23505",
            constraint: "users_telegram_id_unique",
          };
        }
        const owner = records.get(identity.userId);
        if (!owner) {
          throw new Error("User not found");
        }
        records.set(identity.userId, {
          ...owner,
          externalIdentity: identity,
        });
      },
    };
  }
}

function customerRecord(
  userId: string,
  options: {
    status?: "active" | "suspended" | "deleted";
    email?: string;
    passwordHash?: string;
    externalIdentity?: ExternalIdentity | null;
  } = {},
): CustomerIdentityRecord {
  const status = options.status ?? "active";
  const user =
    status === "active"
      ? GlobalUser.create(userId)
      : GlobalUser.fromLegacy({
          id: userId,
          status,
          isActive: false,
          isBlocked: status === "suspended",
          deletedAt: status === "deleted" ? new Date() : null,
        });

  return {
    user,
    displayName: "Test User",
    emailIdentity: options.email
      ? EmailIdentity.create(userId, options.email, "unknown")
      : null,
    externalIdentity: options.externalIdentity ?? null,
    passwordCredential: options.passwordHash
      ? PasswordCredential.create(userId, options.passwordHash)
      : null,
  };
}

describe("customer identity domain", () => {
  it("preserves canonical legacy IDs and fails closed on legacy lifecycle state", () => {
    const active = GlobalUser.fromLegacy({
      id: "legacy-id",
      status: "active",
      isActive: true,
      isBlocked: false,
      deletedAt: null,
    });
    const suspended = GlobalUser.fromLegacy({
      id: "legacy-id",
      status: "active",
      isActive: true,
      isBlocked: true,
      deletedAt: null,
    });

    expect(active.id).toBe("legacy-id");
    expect(active.canAuthenticate).toBe(true);
    expect(suspended.canAuthenticate).toBe(false);
    expect(suspended.reactivate().canAuthenticate).toBe(true);
    expect(active.suspend().canAuthenticate).toBe(false);
    expect(active.delete().status).toBe("deleted");
  });

  it("represents legacy email verification and Telegram provenance as unknown", () => {
    const legacyEmail = EmailIdentity.fromLegacy(
      "user-1",
      " Person@Example.com ",
    );
    expect(legacyEmail).toMatchObject({
      email: "person@example.com",
      verificationState: "unknown",
    });
    expect(legacyEmail?.markVerified().verificationState).toBe("verified");
    expect(
      legacyEmail?.changeAddress("new@example.com").verificationState,
    ).toBe("unverified");
    expect(
      ExternalIdentity.fromLegacyTelegram("user-1", "123").proofState,
    ).toBe("legacy-unknown");
  });

  it("keeps credential ownership separate and recognizes the existing SHA-256 format", () => {
    const credential = PasswordCredential.create("user-1", "a".repeat(64));
    expect(credential).toMatchObject({
      userId: "user-1",
      format: "legacy-sha256",
    });
  });
});

describe("customer identity use cases", () => {
  it("registers through one transaction and persists an unverified email identity", async () => {
    const unitOfWork = new MemoryUnitOfWork();
    const passwordVerifier = {
      hash: vi.fn().mockResolvedValue("$2b$hash"),
      verify: vi.fn(),
    };
    const register = new RegisterCustomerUseCase(unitOfWork, passwordVerifier);

    const result = await register.execute({
      email: " Person@Example.com ",
      name: "Person Example",
      password: "A-long-password",
    });

    expect(result.user.canAuthenticate).toBe(true);
    expect(result.emailIdentity).toMatchObject({
      email: "person@example.com",
      verificationState: "unverified",
    });
    expect(unitOfWork.records.get(result.user.id)).toBe(result);
    expect(passwordVerifier.hash).toHaveBeenCalledWith("A-long-password");
  });

  it("rolls back registration when a dependent profile write fails", async () => {
    const unitOfWork = new MemoryUnitOfWork();
    unitOfWork.failRegistrationAfterUserInsert = true;
    const register = new RegisterCustomerUseCase(unitOfWork, {
      hash: async () => "$2b$hash",
      verify: async () => false,
    });

    await expect(
      register.execute({
        email: "person@example.com",
        name: "Person Example",
        password: "A-long-password",
      }),
    ).rejects.toThrow("profile persistence failed");
    expect(unitOfWork.records.size).toBe(0);
  });

  it("rejects duplicate email registration including concurrent attempts", async () => {
    const unitOfWork = new MemoryUnitOfWork();
    const register = new RegisterCustomerUseCase(unitOfWork, {
      hash: async () => "$2b$hash",
      verify: async () => false,
    });
    const input = {
      email: "person@example.com",
      name: "Person",
      password: "A-long-password",
    };

    await register.execute(input);
    await expect(register.execute(input)).rejects.toBeInstanceOf(
      EmailAlreadyExistsError,
    );

    const concurrent = await Promise.allSettled([
      register.execute({
        ...input,
        email: "other@example.com",
      }),
      register.execute({
        ...input,
        email: "other@example.com",
      }),
    ]);
    expect(
      concurrent.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      concurrent.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
  });

  it("logs in with a legacy customer hash without changing its stored bytes", async () => {
    const unitOfWork = new MemoryUnitOfWork();
    const password = "LegacyPassword1!";
    const legacyHash = createHash("sha256")
      .update(`${password}stream_platform_salt_2024`)
      .digest("hex");
    const record = customerRecord("legacy-customer", {
      email: "legacy@example.com",
      passwordHash: legacyHash,
    });
    unitOfWork.records.set(record.user.id, record);

    const login = new LoginCustomerUseCase(unitOfWork, new PasswordService());
    const result = await login.execute({
      email: " LEGACY@example.com ",
      password,
    });

    expect(result.user.id).toBe("legacy-customer");
    expect(result.passwordCredential?.hash).toBe(legacyHash);
  });

  it("rejects login for unavailable accounts and incorrect credentials", async () => {
    const unitOfWork = new MemoryUnitOfWork();
    const hash = "$2b$hash";
    const suspended = customerRecord("suspended", {
      status: "suspended",
      email: "suspended@example.com",
      passwordHash: hash,
    });
    unitOfWork.records.set(suspended.user.id, suspended);
    const verifier = { hash: vi.fn(), verify: vi.fn().mockResolvedValue(true) };
    const login = new LoginCustomerUseCase(unitOfWork, verifier);

    await expect(
      login.execute({ email: "suspended@example.com", password: "secret" }),
    ).rejects.toBeInstanceOf(AccountUnavailableError);
    await expect(
      login.execute({ email: "missing@example.com", password: "secret" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("links a fresh Telegram proof only to an active account with a live session", async () => {
    const unitOfWork = new MemoryUnitOfWork();
    const record = customerRecord("user-1");
    unitOfWork.records.set(record.user.id, record);
    unitOfWork.activeSessions.add("user-1:session-1");
    const verifier = {
      verify: vi.fn().mockResolvedValue({
        provider: "telegram" as const,
        subject: "telegram-123",
        verifiedAt: new Date(),
      }),
    };
    const link = new LinkExternalIdentityUseCase(unitOfWork, verifier);

    await link.execute({
      userId: "user-1",
      sessionId: "session-1",
      proof: {},
    });

    expect(unitOfWork.records.get("user-1")?.externalIdentity).toMatchObject({
      provider: "telegram",
      subject: "telegram-123",
      proofState: "verified",
    });
  });

  it("rejects missing current-account proof before provider verification", async () => {
    const verifier = { verify: vi.fn() };
    const link = new LinkExternalIdentityUseCase(
      new MemoryUnitOfWork(),
      verifier,
    );

    await expect(
      link.execute({ userId: "user-1", sessionId: "", proof: {} }),
    ).rejects.toBeInstanceOf(CurrentAccountProofRequiredError);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it("rejects invalid provider proof and identities owned by another user", async () => {
    const invalidVerifier = {
      verify: vi
        .fn()
        .mockRejectedValue(new InvalidExternalIdentityProofError()),
    };
    const invalidProofLink = new LinkExternalIdentityUseCase(
      new MemoryUnitOfWork(),
      invalidVerifier,
    );
    await expect(
      invalidProofLink.execute({
        userId: "target",
        sessionId: "session",
        proof: {},
      }),
    ).rejects.toBeInstanceOf(InvalidExternalIdentityProofError);

    const unitOfWork = new MemoryUnitOfWork();
    unitOfWork.records.set(
      "owner",
      customerRecord("owner", {
        externalIdentity: ExternalIdentity.fromLegacyTelegram(
          "owner",
          "telegram-123",
        ),
      }),
    );
    unitOfWork.records.set("target", customerRecord("target"));
    unitOfWork.activeSessions.add("target:session");
    const verifier = {
      verify: vi.fn().mockResolvedValue({
        provider: "telegram" as const,
        subject: "telegram-123",
        verifiedAt: new Date(),
      }),
    };
    const link = new LinkExternalIdentityUseCase(unitOfWork, verifier);

    await expect(
      link.execute({
        userId: "target",
        sessionId: "session",
        proof: {},
      }),
    ).rejects.toBeInstanceOf(ExternalIdentityAlreadyOwnedError);
    expect(unitOfWork.records.get("target")?.externalIdentity).toBeNull();
  });

  it("rejects replacing a linked Telegram identity and serializes concurrent ownership claims", async () => {
    const unitOfWork = new MemoryUnitOfWork();
    const userOne = customerRecord("user-1", {
      externalIdentity: ExternalIdentity.fromLegacyTelegram(
        "user-1",
        "telegram-old",
      ),
    });
    const userTwo = customerRecord("user-2");
    unitOfWork.records.set(userOne.user.id, userOne);
    unitOfWork.records.set(userTwo.user.id, userTwo);
    unitOfWork.activeSessions.add("user-2:session-2");
    const verifier = {
      verify: vi.fn().mockResolvedValue({
        provider: "telegram" as const,
        subject: "telegram-new",
        verifiedAt: new Date(),
      }),
    };
    const link = new LinkExternalIdentityUseCase(unitOfWork, verifier);

    await expect(
      link.execute({
        userId: "user-1",
        sessionId: "session-1",
        proof: {},
      }),
    ).rejects.toBeInstanceOf(CurrentAccountProofRequiredError);
    unitOfWork.activeSessions.add("user-1:session-1");
    await expect(
      link.execute({
        userId: "user-1",
        sessionId: "session-1",
        proof: {},
      }),
    ).rejects.toBeInstanceOf(ExternalIdentityConflictError);

    const userThree = customerRecord("user-3");
    unitOfWork.records.set(userThree.user.id, userThree);
    unitOfWork.activeSessions.add("user-3:session-3");
    const concurrent = await Promise.allSettled([
      link.execute({
        userId: "user-2",
        sessionId: "session-2",
        proof: {},
      }),
      link.execute({
        userId: "user-3",
        sessionId: "session-3",
        proof: {},
      }),
    ]);
    expect(
      concurrent.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      concurrent.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
  });
});
