import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { AuthMiddleware } from "../middlewares/auth.middleware";

export function createAuthRoutes(
  authController: AuthController,
  authMiddleware: AuthMiddleware,
) {
  const router = Router();

  // Public routes (no authentication required)
  router.post("/login", authController.login.bind(authController));
  router.post("/register", authController.register.bind(authController));

  // Public route for token refresh (uses refresh token, not access token)
  router.post("/refresh", authController.refreshToken.bind(authController));

  // Protected routes (require authentication)
  router.post(
    "/logout",
    authMiddleware.requireAuth.bind(authMiddleware),
    authController.logout.bind(authController),
  );
  router.get(
    "/me",
    authMiddleware.requireAuth.bind(authMiddleware),
    authController.me.bind(authController),
  );

  return router;
}
