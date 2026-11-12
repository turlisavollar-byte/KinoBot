export type ExternalIdentityProvider = "telegram" | "google_oidc";

export interface VerifiedExternalIdentityProof {
  provider: ExternalIdentityProvider;
  subject: string;
  issuer?: string;
  verifiedAt: Date;
}

export type ExternalIdentityProofState = "verified" | "legacy-unknown";

export class ExternalIdentity {
  private constructor(
    readonly userId: string,
    readonly provider: ExternalIdentityProvider,
    readonly subject: string,
    readonly issuer: string | null,
    readonly verifiedAt: Date | null,
    readonly proofState: ExternalIdentityProofState,
    readonly revokedAt: Date | null,
  ) {}

  static fromVerifiedProof(
    userId: string,
    proof: VerifiedExternalIdentityProof,
  ): ExternalIdentity {
    const issuer = proof.issuer?.trim() || null;
    if (
      !userId.trim() ||
      !proof.subject.trim() ||
      Number.isNaN(proof.verifiedAt.getTime()) ||
      (proof.provider === "google_oidc" && !issuer)
    ) {
      throw new Error("A valid verified external identity is required");
    }

    return new ExternalIdentity(
      userId,
      proof.provider,
      proof.subject.trim(),
      issuer,
      proof.verifiedAt,
      "verified",
      null,
    );
  }

  static fromLegacyTelegram(userId: string, subject: string): ExternalIdentity {
    return new ExternalIdentity(
      userId,
      "telegram",
      subject,
      null,
      null,
      "legacy-unknown",
      null,
    );
  }

  revoke(at = new Date()): ExternalIdentity {
    if (this.revokedAt) {
      return this;
    }
    if (Number.isNaN(at.getTime())) {
      throw new Error("Revocation time must be valid");
    }

    return new ExternalIdentity(
      this.userId,
      this.provider,
      this.subject,
      this.issuer,
      this.verifiedAt,
      this.proofState,
      at,
    );
  }

  get isActive(): boolean {
    return this.revokedAt === null;
  }
}
