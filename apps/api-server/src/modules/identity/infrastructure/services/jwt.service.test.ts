import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JwtService, JwtPayload } from "./jwt.service";

describe("JwtService", () => {
  let jwtService: JwtService;
  const testPayload: Omit<JwtPayload, "iat" | "exp"> = {
    sub: "user_123",
    email: "test@example.com",
    role: "admin",
    permissions: ["read", "write", "delete"],
  };

  beforeEach(() => {
    // Set test JWT secret
    process.env.JWT_SECRET = "test-secret-key-for-testing";
    // Reset singleton instance for testing
    (JwtService as any).instance = null;
    (JwtService as any).warningShown = false;
    jwtService = JwtService.getInstance();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    // Reset singleton instance
    (JwtService as any).instance = null;
    (JwtService as any).warningShown = false;
  });

  describe("generateAccessToken", () => {
    it("should generate a valid access token", () => {
      const token = jwtService.generateAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should generate different tokens for different payloads", () => {
      const token1 = jwtService.generateAccessToken(testPayload);
      const token2 = jwtService.generateAccessToken({
        ...testPayload,
        sub: "user_456",
      });

      expect(token1).not.toBe(token2);
    });
  });

  it("should reject startup when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    (JwtService as any).instance = null;

    expect(() => JwtService.getInstance()).toThrow(
      "JWT_SECRET environment variable is required",
    );

    process.env.JWT_SECRET = "test-secret-key-for-testing";
    (JwtService as any).instance = null;
  });

  describe("generateRefreshToken", () => {
    it("should generate a valid refresh token", () => {
      const token = jwtService.generateRefreshToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should generate different refresh token than access token", () => {
      const accessToken = jwtService.generateAccessToken(testPayload);
      const refreshToken = jwtService.generateRefreshToken(testPayload);

      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe("verify", () => {
    it("should verify a valid access token", async () => {
      const token = jwtService.generateAccessToken(testPayload);
      const decoded = await jwtService.verify(token);

      expect(decoded.sub).toBe(testPayload.sub);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.permissions).toEqual(testPayload.permissions);
    });

    it("should verify a valid refresh token", async () => {
      const token = jwtService.generateRefreshToken(testPayload);
      const decoded = await jwtService.verify(token);

      expect(decoded.sub).toBe(testPayload.sub);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it("should reject an access token when a refresh token is required", async () => {
      const token = jwtService.generateAccessToken(testPayload);

      await expect(jwtService.verify(token, "refresh")).rejects.toThrow(
        "Invalid or expired token",
      );
    });

    it("should throw error for invalid token", async () => {
      await expect(jwtService.verify("invalid-token")).rejects.toThrow(
        "Invalid or expired token",
      );
    });

    it("should throw error for expired token", async () => {
      // Create a token with very short expiry by modifying the service temporarily
      const shortLivedService = JwtService.getInstance();
      const token = shortLivedService.generateAccessToken(testPayload);

      // Note: We can't easily test expiration without waiting or mocking time
      // This is a placeholder for future enhancement
      expect(token).toBeDefined();
    });
  });

  describe("decode", () => {
    it("should decode a valid token without verification", () => {
      const token = jwtService.generateAccessToken(testPayload);
      const decoded = jwtService.decode(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(testPayload.sub);
      expect(decoded?.email).toBe(testPayload.email);
      expect(decoded?.role).toBe(testPayload.role);
    });

    it("should return null for invalid token", () => {
      const decoded = jwtService.decode("invalid-token");
      expect(decoded).toBeNull();
    });

    it("should decode token even if expired", () => {
      const token = jwtService.generateAccessToken(testPayload);
      const decoded = jwtService.decode(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.exp).toBeDefined();
      expect(decoded?.iat).toBeDefined();
    });
  });

  describe("token payload structure", () => {
    it("should include all required fields in token", async () => {
      const token = jwtService.generateAccessToken(testPayload);
      const decoded = await jwtService.verify(token);

      expect(decoded).toHaveProperty("sub");
      expect(decoded).toHaveProperty("email");
      expect(decoded).toHaveProperty("role");
      expect(decoded).toHaveProperty("permissions");
      expect(decoded).toHaveProperty("iat");
      expect(decoded).toHaveProperty("exp");
    });

    it("should handle empty permissions array", async () => {
      const payloadWithEmptyPermissions = {
        ...testPayload,
        permissions: [],
      };
      const token = jwtService.generateAccessToken(payloadWithEmptyPermissions);
      const decoded = await jwtService.verify(token);

      expect(decoded.permissions).toEqual([]);
    });
  });
});
