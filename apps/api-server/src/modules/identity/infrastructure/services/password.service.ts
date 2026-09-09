import bcrypt from "bcrypt";
import crypto from "node:crypto";

const LEGACY_SALT = "stream_platform_salt_2024";

export class PasswordService {
  private readonly saltRounds = 10;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!hash) {
      return false;
    }

    try {
      const isValid = await bcrypt.compare(password, hash);
      if (isValid) {
        return true;
      }
    } catch {
      // bcrypt.compare can throw for non-bcrypt hashes; fall through to legacy SHA-256 compatibility.
    }

    return this.verifyLegacy(password, hash);
  }

  verifyLegacy(password: string, hash: string): boolean {
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return false;
    }

    const legacyHash = crypto
      .createHash("sha256")
      .update(password + LEGACY_SALT)
      .digest();
    const storedHash = Buffer.from(hash, "hex");

    return crypto.timingSafeEqual(legacyHash, storedHash);
  }

  async generateRandomPassword(length: number = 16): Promise<string> {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(crypto.randomInt(chars.length));
    }
    return password;
  }

  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*]/.test(password)) {
      errors.push(
        "Password must contain at least one special character (!@#$%^&*)",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
