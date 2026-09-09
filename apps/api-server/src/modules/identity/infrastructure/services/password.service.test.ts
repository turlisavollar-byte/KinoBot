import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { PasswordService } from "./password.service";

const LEGACY_SALT = "stream_platform_salt_2024";

function legacyHash(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + LEGACY_SALT)
    .digest("hex");
}

describe("PasswordService", () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe("hash", () => {
    it("should hash a password successfully", async () => {
      const password = "TestPassword123!";
      const hash = await passwordService.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "TestPassword123!";
      const hash1 = await passwordService.hash(password);
      const hash2 = await passwordService.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verify", () => {
    it("should verify correct password", async () => {
      const password = "TestPassword123!";
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword123!";
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it("should verify legacy SHA-256 password hashes without throwing", async () => {
      const password = "admin123";
      const hash = legacyHash(password);

      await expect(passwordService.verify(password, hash)).resolves.toBe(true);
    });

    it("should verify both default admin credentials used across deployments", async () => {
      await expect(
        passwordService.verify("admin123", legacyHash("admin123")),
      ).resolves.toBe(true);
      await expect(
        passwordService.verify("SuperAdmin123!", legacyHash("SuperAdmin123!")),
      ).resolves.toBe(true);
    });
  });

  describe("generateRandomPassword", () => {
    it("should generate password with default length", async () => {
      const password = await passwordService.generateRandomPassword();

      expect(password).toBeDefined();
      expect(password.length).toBe(16);
    });

    it("should generate password with custom length", async () => {
      const length = 24;
      const password = await passwordService.generateRandomPassword(length);

      expect(password).toBeDefined();
      expect(password.length).toBe(length);
    });

    it("should generate different passwords each time", async () => {
      const password1 = await passwordService.generateRandomPassword();
      const password2 = await passwordService.generateRandomPassword();

      expect(password1).not.toBe(password2);
    });
  });

  describe("validatePasswordStrength", () => {
    it("should validate strong password", () => {
      const password = "StrongP@ssw0rd123";
      const result = passwordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password shorter than 8 characters", () => {
      const password = "Short1!";
      const result = passwordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 8 characters long",
      );
    });

    it("should reject password without uppercase letter", () => {
      const password = "lowercase123!";
      const result = passwordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter",
      );
    });

    it("should reject password without lowercase letter", () => {
      const password = "UPPERCASE123!";
      const result = passwordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one lowercase letter",
      );
    });

    it("should reject password without number", () => {
      const password = "NoNumbers!";
      const result = passwordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one number",
      );
    });

    it("should reject password without special character", () => {
      const password = "NoSpecial123";
      const result = passwordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character (!@#$%^&*)",
      );
    });

    it("should return multiple errors for weak password", () => {
      const password = "weak";
      const result = passwordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
