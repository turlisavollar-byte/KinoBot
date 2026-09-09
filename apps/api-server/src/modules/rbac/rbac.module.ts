import type { Express } from "express";
import { logger } from "../../lib/logger";
import rbacRouter from "./routes/rbac.route";

export function initRbacModule(app: Express): void {
  app.use("/api", rbacRouter);
  logger.info({ prefix: "/api/rbac" }, "RBAC module initialized");
}
