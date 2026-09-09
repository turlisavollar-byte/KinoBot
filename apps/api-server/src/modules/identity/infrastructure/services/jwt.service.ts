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
  private readonly secret: string;
  private readonly accessTokenExpiry = 3600; // 1 hour
  private readonly refreshTokenExpiry = 604800; // 7 days
  private static warningShown = false;

  private constructor() {
    const secret = process.env.JWT_SECRET;
    const isProduction = process.env.NODE_ENV === "production";
    const isLocalEnvironment =
      !process.env.NODE_ENV ||
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test";

    if (!secret) {
      throw new Error(
        "JWT_SECRET environment variable is required. Please set a strong, cryptographically secure secret (minimum 32 characters).",
      );
    }

    if (isProduction && secret.length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters long for security. Please use a stronger secret.",
      );
    }

    if (
      !JwtService.warningShown &&
      (secret.includes("change") ||
        secret.includes("secret") ||
        secret === "your-secret-key-change-in-production" ||
        (isLocalEnvironment && secret.length < 32))
    ) {
      console.warn(
        "SECURITY WARNING: JWT_SECRET is using a short or default value. For production, use a strong random secret with at least 32 characters.",
      );
      JwtService.warningShown = true;
    }

    this.secret = secret;
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
      this.secret,
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
      this.secret,
      { expiresIn: this.refreshTokenExpiry },
    );
  }

  async verify(
    token: string,
    expectedTokenType?: "access" | "refresh",
  ): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, this.secret) as JwtPayload;
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
