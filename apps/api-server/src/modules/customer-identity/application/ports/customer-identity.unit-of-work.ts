import type { EmailIdentity } from "../../domain/entities/email-identity.entity";
import type { ExternalIdentity } from "../../domain/entities/external-identity.entity";
import type { GlobalUser } from "../../domain/entities/global-user.entity";
import type { PasswordCredential } from "../../domain/entities/password-credential.entity";

export interface CustomerIdentityRecord {
  user: GlobalUser;
  displayName: string;
  emailIdentity: EmailIdentity | null;
  externalIdentity: ExternalIdentity | null;
  passwordCredential: PasswordCredential | null;
}

export interface CustomerIdentityTransaction {
  findById(userId: string): Promise<CustomerIdentityRecord | null>;
  findByEmail(email: string): Promise<CustomerIdentityRecord | null>;
  findExternalIdentity(
    identity: Pick<ExternalIdentity, "provider" | "subject" | "issuer">,
  ): Promise<ExternalIdentity | null>;
  hasActiveWebSession(userId: string, sessionId: string): Promise<boolean>;
  createRegisteredCustomer(
    record: CustomerIdentityRecord,
  ): Promise<CustomerIdentityRecord>;
  recordSuccessfulLogin(
    userId: string,
    passwordHash: string,
    at: Date,
  ): Promise<boolean>;
  attachExternalIdentity(identity: ExternalIdentity): Promise<void>;
}

export interface CustomerIdentityUnitOfWork extends CustomerIdentityTransaction {
  transaction<T>(
    work: (transaction: CustomerIdentityTransaction) => Promise<T>,
  ): Promise<T>;
}

export interface PasswordVerifier {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface ExternalIdentityProofVerifier<TProof = unknown> {
  verify(proof: TProof): Promise<{
    provider: "telegram" | "google_oidc";
    subject: string;
    issuer?: string;
    verifiedAt: Date;
  }>;
}
