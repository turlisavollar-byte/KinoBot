// modules/user/index.ts

// ==================== DI Container ====================
import { createRequire } from "node:module";
import { container } from "tsyringe";

const require = createRequire(import.meta.url);

// ==================== Domain ====================
export { User, type UserProps } from "./domain/entities/user.entity";
export {
  UserProfile,
  type UserProfileProps,
} from "./domain/entities/user-profile.entity";
export {
  UserStats,
  type UserStatsProps,
} from "./domain/entities/user-stats.entity";
export { Email } from "./domain/value-objects/email.vo";
export { Phone } from "./domain/value-objects/phone.vo";
export {
  UserStatusVO,
  UserRoleVO,
  type UserStatus,
  type UserRole,
} from "./domain/value-objects/user-status.vo";
export * from "./domain/events/user-created.event";
export * from "./domain/events/user-updated.event";
export * from "./domain/events/user-blocked.event";
export * from "./domain/events/user-deleted.event";
export * from "./domain/repositories/user.repository.interface";
export * from "./domain/repositories/user-profile.repository.interface";
export * from "./domain/repositories/user-stats.repository.interface";

// ==================== Application ====================
export * from "./application/use-cases/list-users.use-case";
export * from "./application/use-cases/get-user.use-case";
export * from "./application/use-cases/create-user.use-case";
export * from "./application/use-cases/update-user.use-case";
export * from "./application/use-cases/delete-user.use-case";
export * from "./application/use-cases/block-user.use-case";
export * from "./application/use-cases/search-users.use-case";
export * from "./application/use-cases/export-users.use-case";
export * from "./application/services/user-cache.service";
export * from "./application/services/user-event.service";
export * from "./application/dto/user-request.dto";
export * from "./application/dto/user-response.dto";

// ==================== Infrastructure ====================
import { DrizzleUserRepository } from "./infrastructure/repositories/drizzle-user.repository";
import { DrizzleUserProfileRepository } from "./infrastructure/repositories/drizzle-user-profile.repository";
import { DrizzleUserStatsRepository } from "./infrastructure/repositories/drizzle-user-stats.repository";
import { IUserRepository } from "./domain/repositories/user.repository.interface";
import { IUserProfileRepository } from "./domain/repositories/user-profile.repository.interface";
import { IUserStatsRepository } from "./domain/repositories/user-stats.repository.interface";
import { IUserProvisioningRepository } from "./domain/repositories/user-provisioning.repository.interface";
import { DrizzleUserProvisioningRepository } from "./infrastructure/repositories/drizzle-user-provisioning.repository";
import { userEventHandler } from "./infrastructure/events/user-event-handler";
import { getRedisUserCache } from "./infrastructure/cache/redis-user-cache";

// ==================== Interface ====================
import { Router } from "express";
import { UserController } from "./interface/http/controllers/user.controller";
import { requireAuth, requirePermission } from "@/shared/middleware";
import { Permission } from "@/shared/constants/permissions";
import { validate } from "@/shared/middleware";
import {
  ListUsersSchema,
  UpdateUserSchema,
  BlockUserSchema,
  ExportUsersSchema,
} from "./interface/http/validators/user.validator";

export { UserController };

// ==================== Services ====================
import { UserCacheService } from "./application/services/user-cache.service";
import { UserEventService } from "./application/services/user-event.service";

// ==================== Use Cases ====================
import { ListUsersUseCase } from "./application/use-cases/list-users.use-case";
import { GetUserUseCase } from "./application/use-cases/get-user.use-case";
import { CreateUserUseCase } from "./application/use-cases/create-user.use-case";
import { UpdateUserUseCase } from "./application/use-cases/update-user.use-case";
import { DeleteUserUseCase } from "./application/use-cases/delete-user.use-case";
import { BlockUserUseCase } from "./application/use-cases/block-user.use-case";
import { SearchUsersUseCase } from "./application/use-cases/search-users.use-case";
import { ExportUsersUseCase } from "./application/use-cases/export-users.use-case";

// ==================== Logger ====================
import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("UserModule");

let initialized = false;

// ==================== Register Dependencies ====================
function registerDependencies() {
  if (initialized) return;

  container.registerSingleton<IUserRepository>(
    "IUserRepository",
    DrizzleUserRepository,
  );

  container.registerSingleton<IUserProfileRepository>(
    "IUserProfileRepository",
    DrizzleUserProfileRepository,
  );

  container.registerSingleton<IUserStatsRepository>(
    "IUserStatsRepository",
    DrizzleUserStatsRepository,
  );

  container.registerSingleton<IUserProvisioningRepository>(
    "IUserProvisioningRepository",
    DrizzleUserProvisioningRepository,
  );

  container.registerSingleton<UserCacheService>(
    "UserCacheService",
    UserCacheService,
  );

  container.registerSingleton<UserEventService>(
    "UserEventService",
    UserEventService,
  );

  container.register("RedisUserCache", { useValue: getRedisUserCache() });

  container.registerSingleton("ListUsersUseCase", ListUsersUseCase);
  container.registerSingleton("GetUserUseCase", GetUserUseCase);
  container.registerSingleton("CreateUserUseCase", CreateUserUseCase);
  container.registerSingleton("UpdateUserUseCase", UpdateUserUseCase);
  container.registerSingleton("DeleteUserUseCase", DeleteUserUseCase);
  container.registerSingleton("BlockUserUseCase", BlockUserUseCase);
  container.registerSingleton("SearchUsersUseCase", SearchUsersUseCase);
  container.registerSingleton("ExportUsersUseCase", ExportUsersUseCase);

  initialized = true;
  logger.info("User module dependencies registered");
}

function createUserRouter() {
  registerDependencies();

  const router = Router();
  const controller = container.resolve(UserController);

  router.use(requireAuth);

  router.get("/me", controller.me.bind(controller));

  router.get(
    "/",
    requirePermission(Permission.READ_USERS),
    validate({ query: ListUsersSchema }),
    controller.list.bind(controller),
  );

  router.post(
    "/:id/subscription/grant",
    requirePermission(Permission.MANAGE_SUBSCRIPTIONS),
    controller.grantSubscription.bind(controller),
  );

  router.get(
    "/:id",
    requirePermission(Permission.READ_USERS),
    controller.get.bind(controller),
  );

  router.patch(
    "/:id",
    requirePermission(Permission.UPDATE_USERS),
    validate({ body: UpdateUserSchema }),
    controller.update.bind(controller),
  );

  router.post(
    "/:id/block",
    requirePermission(Permission.BLOCK_USERS),
    validate({ body: BlockUserSchema }),
    controller.block.bind(controller),
  );

  router.delete(
    "/:id",
    requirePermission(Permission.DELETE_USERS),
    controller.delete.bind(controller),
  );

  router.post(
    "/export",
    requirePermission(Permission.EXPORT_ANALYTICS),
    validate({ query: ExportUsersSchema }),
    controller.export.bind(controller),
  );

  return router;
}

// ==================== Module Initialization ====================
export function initUserModule(app: any): void {
  app.use("/api/users", createUserRouter());
  logger.info("User module initialized");
}

// ==================== Default Export ====================
export default {
  initUserModule,
  userRouter: createUserRouter,
};
