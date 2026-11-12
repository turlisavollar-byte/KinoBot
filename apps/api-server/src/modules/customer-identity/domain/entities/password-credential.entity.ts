export type PasswordHashFormat = "bcrypt" | "legacy-sha256" | "unknown";

export class PasswordCredential {
  private constructor(
    readonly userId: string,
    readonly hash: string,
    readonly format: PasswordHashFormat,
  ) {}

  static create(userId: string, hash: string): PasswordCredential {
    if (!userId.trim() || !hash) {
      throw new Error("Password credential owner and hash are required");
    }

    const format: PasswordHashFormat = /^\$2[aby]\$/.test(hash)
      ? "bcrypt"
      : /^[a-f0-9]{64}$/i.test(hash)
        ? "legacy-sha256"
        : "unknown";
    return new PasswordCredential(userId, hash, format);
  }

  static fromLegacy(
    userId: string,
    hash: string | null,
  ): PasswordCredential | null {
    return hash ? PasswordCredential.create(userId, hash) : null;
  }

  replaceHash(hash: string): PasswordCredential {
    return PasswordCredential.create(this.userId, hash);
  }
}
