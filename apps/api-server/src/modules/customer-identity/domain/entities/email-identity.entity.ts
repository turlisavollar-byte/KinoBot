export type EmailVerificationState = "verified" | "unverified" | "unknown";

export class EmailIdentity {
  private constructor(
    readonly userId: string,
    readonly email: string,
    readonly verificationState: EmailVerificationState,
  ) {}

  static create(
    userId: string,
    email: string,
    verificationState: EmailVerificationState,
  ): EmailIdentity {
    const normalizedEmail = EmailIdentity.normalizeAddress(email);
    if (!userId.trim()) {
      throw new Error("A valid owner and email address are required");
    }

    return new EmailIdentity(userId, normalizedEmail, verificationState);
  }

  static normalizeAddress(email: string): string {
    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      throw new Error("A valid email address is required");
    }

    return normalizedEmail;
  }

  static fromLegacy(
    userId: string,
    email: string | null,
  ): EmailIdentity | null {
    if (email === null || !email.trim()) {
      return null;
    }

    return new EmailIdentity(userId, email.trim().toLowerCase(), "unknown");
  }

  markVerified(): EmailIdentity {
    return new EmailIdentity(this.userId, this.email, "verified");
  }

  changeAddress(email: string): EmailIdentity {
    return EmailIdentity.create(this.userId, email, "unverified");
  }
}
