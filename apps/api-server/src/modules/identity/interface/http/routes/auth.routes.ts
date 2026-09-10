import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { authRateLimit } from "@/shared/middleware";

export function createAuthRoutes(
  authController: AuthController,
  authMiddleware: AuthMiddleware,
) {
  const router = Router();

  // Public routes (no authentication required)
  router.post("/login", authRateLimit, authController.login.bind(authController));
  router.post("/register", authController.register.bind(authController));

  // Public route for token refresh (uses refresh token, not access token)
  router.post("/refresh", authController.refreshToken.bind(authController));

  // Protected routes (require authentication)
  router.post(
    "/logout",
    (req, res, next) => authMiddleware.requireAuth(req, res, next),
    authController.logout.bind(authController),
  );
  router.post(
    "/logout-all",
    (req, res, next) => authMiddleware.requireAuth(req, res, next),
    authController.logoutAll.bind(authController),
  );
  router.get(
    "/me",
    (req, res, next) => authMiddleware.requireAuth(req, res, next),
    authController.me.bind(authController),
  );
  router.post(
    "/send-verification-email",
    (req, res, next) => authMiddleware.requireAuth(req, res, next),
    authController.sendVerificationEmail.bind(authController),
  );
  router.post(
    "/verify-email",
    authController.verifyEmail.bind(authController),
  );
  
  // Password reset routes (public for requesting, protected for resetting)
  router.post(
    "/request-password-reset",
    authController.requestPasswordReset.bind(authController),
  );
  router.post(
    "/reset-password",
    authController.resetPassword.bind(authController),
  );

  return router;
}
