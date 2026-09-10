import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  tokenType?: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export class JwtService {
  private static instance: JwtService;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTokenExpiry = 3600; // 1 hour
  private readonly refreshTokenExpiry = 604800; // 7 days
  private static warningShown = false;

  private constructor() {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET || accessSecret;
    const isProduction = process.env.NODE_ENV === "production";
    const isLocalEnvironment =
      !process.env.NODE_ENV ||
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test";

    if (!accessSecret) {
      throw new Error(
        "JWT_SECRET environment variable is required. Please set a strong, cryptographically secure secret (minimum 32 characters).",
      );
    }

    if (isProduction && accessSecret.length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters long for security. Please use a stronger secret.",
      );
    }

    if (
      !JwtService.warningShown &&
      (accessSecret.includes("change") ||
        accessSecret.includes("secret") ||
        accessSecret === "your-secret-key-change-in-production" ||
        (isLocalEnvironment && accessSecret.length < 32))
    ) {
      console.warn(
        "SECURITY WARNING: JWT_SECRET is using a short or default value. For production, use a strong random secret with at least 32 characters.",
      );
      JwtService.warningShown = true;
    }

    if (!refreshSecret) {
      throw new Error(
        "JWT_REFRESH_SECRET environment variable is required. Please set a strong, cryptographically secure secret (minimum 32 characters).",
      );
    }

    if (isProduction && refreshSecret.length < 32) {
      throw new Error(
        "JWT_REFRESH_SECRET must be at least 32 characters long for security. Please use a stronger secret.",
      );
    }

    if (
      !JwtService.warningShown &&
      (refreshSecret.includes("change") ||
        refreshSecret.includes("secret") ||
        refreshSecret === "your-secret-key-change-in-production" ||
        (isLocalEnvironment && refreshSecret.length < 32))
    ) {
      console.warn(
        "SECURITY WARNING: JWT_REFRESH_SECRET is using a short or default value. For production, use a strong random secret with at least 32 characters.",
      );
      JwtService.warningShown = true;
    }

    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
  }

  static getInstance(): JwtService {
    if (!JwtService.instance) {
      JwtService.instance = new JwtService();
    }
    return JwtService.instance;
  }

  generateAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
    return jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        tokenType: "access",
      },
      this.accessSecret,
      { expiresIn: this.accessTokenExpiry },
    );
  }

  generateRefreshToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
    return jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        tokenType: "refresh",
      },
      this.refreshSecret,
      { expiresIn: this.refreshTokenExpiry },
    );
  }

  async verify(
    token: string,
    expectedTokenType?: "access" | "refresh",
  ): Promise<JwtPayload> {
    try {
      const secret = expectedTokenType === "refresh" ? this.refreshSecret : this.accessSecret;
      const decoded = jwt.verify(token, secret) as JwtPayload;
      if (expectedTokenType && decoded.tokenType !== expectedTokenType) {
        throw new Error("Unexpected token type");
      }
      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        tokenType: decoded.tokenType,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  decode(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded) return null;
      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        tokenType: decoded.tokenType,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch {
      return null;
    }
  }
}
