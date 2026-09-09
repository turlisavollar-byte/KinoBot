import { DrizzleUserRepository } from "./infrastructure/repositories/drizzle-user.repository";
import { DrizzleSessionRepository } from "./infrastructure/repositories/drizzle-session.repository";
import { JwtService } from "./infrastructure/services/jwt.service";
import { PasswordService } from "./infrastructure/services/password.service";
import { AuthMiddleware } from "./interface/http/middlewares/auth.middleware";
import { AuthController } from "./interface/http/controllers/auth.controller";
import { createAuthRoutes } from "./interface/http/routes/auth.routes";

// Use Cases - Auth only
import { LoginUseCase } from "./application/use-cases/auth/login.use-case";
import { LogoutUseCase } from "./application/use-cases/auth/logout.use-case";
import { RefreshTokenUseCase } from "./application/use-cases/auth/refresh-token.use-case";
import { RegisterUseCase } from "./application/use-cases/auth/register.use-case";

// Lazy initialization to prevent blocking during module import
let userRepo: DrizzleUserRepository | null = null;
let jwtService: JwtService | null = null;
let passwordService: PasswordService | null = null;
let sessionRepo: DrizzleSessionRepository | null = null;
let authMiddleware: AuthMiddleware | null = null;
let authController: AuthController | null = null;
let authRouterInstance: any = null;

function initializeModule() {
  if (userRepo) return; // Already initialized

  // ── Infrastructure (Repositories & Services) ─────────────────────
  userRepo = new DrizzleUserRepository();
  jwtService = JwtService.getInstance();
  passwordService = new PasswordService();
  sessionRepo = new DrizzleSessionRepository();

  // ── Use Cases - Auth ─────────────────────────────────────────────
  const loginUC = new LoginUseCase(userRepo, passwordService, sessionRepo);
  const logoutUC = new LogoutUseCase(userRepo, sessionRepo);
  const refreshTokenUC = new RefreshTokenUseCase(userRepo, sessionRepo);
  const registerUC = new RegisterUseCase(userRepo, passwordService);

  // ── Middleware ───────────────────────────────────────────────────
  authMiddleware = new AuthMiddleware(jwtService, userRepo);

  // ── Controllers ───────────────────────────────────────────────────
  authController = new AuthController(
    loginUC,
    logoutUC,
    refreshTokenUC,
    jwtService,
    registerUC,
  );

  // ── Routes ───────────────────────────────────────────────────────
  authRouterInstance = createAuthRoutes(authController, authMiddleware);
}

// ── Routes (lazy initialization) ───────────────────────────────────────
export const authRouter = () => {
  initializeModule();
  return authRouterInstance;
};

// ── Exports for cross-module use ─────────────────────────────────
export function getUserRepo() {
  initializeModule();
  return userRepo;
}
export function getJwtService() {
  initializeModule();
  return jwtService;
}
export function getAuthMiddleware() {
  initializeModule();
  return authMiddleware;
}

export function getSessionRepo() {
  initializeModule();
  return sessionRepo;
}
