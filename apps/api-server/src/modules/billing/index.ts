// modules/billing/index.ts

// ==================== DI Container ====================
import { container } from "tsyringe";

// ==================== Domain ====================
export * from "./domain";

// ==================== Application ====================
export * from "./application";

// ==================== Infrastructure ====================
import { DrizzleBillingPlanRepository } from "./infrastructure/DrizzleBillingPlanRepository";
import { DrizzleSubscriptionRepository } from "./infrastructure/DrizzleSubscriptionRepository";
import { DrizzleInvoiceRepository } from "./infrastructure/DrizzleInvoiceRepository";
import { DrizzlePaymentRepository } from "./infrastructure/DrizzlePaymentRepository";
import { IBillingPlanRepository } from "./domain/IBillingPlanRepository";
import { ISubscriptionRepository } from "./domain/ISubscriptionRepository";
import { IInvoiceRepository } from "./domain/IInvoiceRepository";
import { IPaymentRepository } from "./domain/IPaymentRepository";
import { DrizzleBillingOutboxProcessor } from "./infrastructure/DrizzleBillingOutboxProcessor";

// ==================== Presentation ====================
import { Router } from "express";
import { BillingController } from "./presentation/BillingController";
import { createBillingRouter as createBillingRoutes } from "./presentation/billingRoutes";
import { requireAuth, requireRole } from "@/shared/middleware";

export { BillingController };

// ==================== Use Cases ====================
import { CreatePlanUseCase } from "./application/CreatePlanUseCase";
import { ListPlansUseCase } from "./application/ListPlansUseCase";
import { GetPlanUseCase } from "./application/GetPlanUseCase";
import { UpdatePlanUseCase } from "./application/UpdatePlanUseCase";
import { DeletePlanUseCase } from "./application/DeletePlanUseCase";
import { CreateSubscriptionUseCase } from "./application/CreateSubscriptionUseCase";
import { ListSubscriptionsUseCase } from "./application/ListSubscriptionsUseCase";
import { GetSubscriptionUseCase } from "./application/GetSubscriptionUseCase";
import { CancelSubscriptionUseCase } from "./application/CancelSubscriptionUseCase";
import { CreateInvoiceUseCase } from "./application/CreateInvoiceUseCase";
import { ListInvoicesUseCase } from "./application/ListInvoicesUseCase";
import { GetInvoiceUseCase } from "./application/GetInvoiceUseCase";
import { MarkInvoicePaidUseCase } from "./application/MarkInvoicePaidUseCase";
import { CreatePaymentUseCase } from "./application/CreatePaymentUseCase";
import { ListPaymentsUseCase } from "./application/ListPaymentsUseCase";
import { GetPaymentUseCase } from "./application/GetPaymentUseCase";
import { RefundPaymentUseCase } from "./application/RefundPaymentUseCase";
import { CreateClickPaymentUseCase } from "./application/CreateClickPaymentUseCase";
import { HandleClickWebhookUseCase } from "./application/HandleClickWebhookUseCase";
import { CreatePaymePaymentUseCase } from "./application/CreatePaymePaymentUseCase";
import { HandlePaymeWebhookUseCase } from "./application/HandlePaymeWebhookUseCase";
import { CreateUzumPaymentUseCase } from "./application/CreateUzumPaymentUseCase";
import { HandleUzumWebhookUseCase } from "./application/HandleUzumWebhookUseCase";
import { CreatePaynetPaymentUseCase } from "./application/CreatePaynetPaymentUseCase";
import { HandlePaynetWebhookUseCase } from "./application/HandlePaynetWebhookUseCase";
import { CreateAnorPaymentUseCase } from "./application/CreateAnorPaymentUseCase";
import { HandleAnorWebhookUseCase } from "./application/HandleAnorWebhookUseCase";
import { CreateNBUPaymentUseCase } from "./application/CreateNBUPaymentUseCase";
import { HandleNBUWebhookUseCase } from "./application/HandleNBUWebhookUseCase";
import { CreateUzcardPaymentUseCase } from "./application/CreateUzcardPaymentUseCase";
import { HandleUzcardWebhookUseCase } from "./application/HandleUzcardWebhookUseCase";
import { CreateOctoPaymentUseCase } from "./application/CreateOctoPaymentUseCase";
import { HandleOctoWebhookUseCase } from "./application/HandleOctoWebhookUseCase";

// ==================== Payment Provider Services ====================
import { ClickService } from "./infrastructure/ClickService";
import { PaymeService } from "./infrastructure/PaymeService";
import { UzumService } from "./infrastructure/UzumService";
import { PaynetService } from "./infrastructure/PaynetService";
import { AnorService } from "./infrastructure/AnorService";
import { NBUService } from "./infrastructure/NBUService";
import { UzcardService } from "./infrastructure/UzcardService";
import { OctoService } from "./infrastructure/OctoService";

// ==================== Logger ====================
import { Logger } from "@/shared/utils/logger";

const logger = Logger.getInstance("BillingModule");

let initialized = false;
let outboxTimer: NodeJS.Timeout | undefined;

// ==================== Register Dependencies ====================
function registerDependencies() {
  if (initialized) return;

  logger.info("Registering billing dependencies...");

  // Repositories
  container.registerSingleton<IBillingPlanRepository>(
    "IBillingPlanRepository",
    DrizzleBillingPlanRepository,
  );

  container.registerSingleton<ISubscriptionRepository>(
    "ISubscriptionRepository",
    DrizzleSubscriptionRepository,
  );

  container.registerSingleton<IInvoiceRepository>(
    "IInvoiceRepository",
    DrizzleInvoiceRepository,
  );

  container.registerSingleton<IPaymentRepository>(
    "IPaymentRepository",
    DrizzlePaymentRepository,
  );

  logger.info("Billing repositories registered");

  // Payment Provider Services
  container.registerSingleton(ClickService);
  container.registerSingleton(PaymeService);
  container.registerSingleton(UzumService);
  container.registerSingleton(PaynetService);
  container.registerSingleton(AnorService);
  container.registerSingleton(NBUService);
  container.registerSingleton(UzcardService);
  container.registerSingleton(OctoService);
  container.registerSingleton(DrizzleBillingOutboxProcessor);

  logger.info("Billing payment services registered");

  // Use Cases - Plans
  container.registerSingleton(CreatePlanUseCase);
  container.registerSingleton(ListPlansUseCase);
  container.registerSingleton(GetPlanUseCase);
  container.registerSingleton(UpdatePlanUseCase);
  container.registerSingleton(DeletePlanUseCase);

  // Use Cases - Subscriptions
  container.registerSingleton(CreateSubscriptionUseCase);
  container.registerSingleton(ListSubscriptionsUseCase);
  container.registerSingleton(GetSubscriptionUseCase);
  container.registerSingleton(CancelSubscriptionUseCase);

  // Use Cases - Invoices
  container.registerSingleton(CreateInvoiceUseCase);
  container.registerSingleton(ListInvoicesUseCase);
  container.registerSingleton(GetInvoiceUseCase);
  container.registerSingleton(MarkInvoicePaidUseCase);

  // Use Cases - Payments
  container.registerSingleton(CreatePaymentUseCase);
  container.registerSingleton(ListPaymentsUseCase);
  container.registerSingleton(GetPaymentUseCase);
  container.registerSingleton(RefundPaymentUseCase);

  // Use Cases - Payment Providers
  container.registerSingleton(CreateClickPaymentUseCase);
  container.registerSingleton(HandleClickWebhookUseCase);
  container.registerSingleton(CreatePaymePaymentUseCase);
  container.registerSingleton(HandlePaymeWebhookUseCase);
  container.registerSingleton(CreateUzumPaymentUseCase);
  container.registerSingleton(HandleUzumWebhookUseCase);
  container.registerSingleton(CreatePaynetPaymentUseCase);
  container.registerSingleton(HandlePaynetWebhookUseCase);
  container.registerSingleton(CreateAnorPaymentUseCase);
  container.registerSingleton(HandleAnorWebhookUseCase);
  container.registerSingleton(CreateNBUPaymentUseCase);
  container.registerSingleton(HandleNBUWebhookUseCase);
  container.registerSingleton(CreateUzcardPaymentUseCase);
  container.registerSingleton(HandleUzcardWebhookUseCase);
  container.registerSingleton(CreateOctoPaymentUseCase);
  container.registerSingleton(HandleOctoWebhookUseCase);

  logger.info("Billing use cases registered");

  // Register Controller with string token
  container.registerSingleton(BillingController);

  initialized = true;
  logger.info("Billing module dependencies registered");
}

function createBillingRouter() {
  registerDependencies();

  const controller = container.resolve(BillingController);
  return createBillingRoutes(controller);
}

// ==================== Module Initialization ====================
export function initBillingModule(router: any): void {
  registerDependencies();

  const controller = container.resolve(BillingController);
  const billingRouter = createBillingRoutes(controller);

  // Mount billing routes at /billing (since main router is already at /api)
  router.use("/billing", billingRouter);

  if (!outboxTimer) {
    const processor = container.resolve(DrizzleBillingOutboxProcessor);
    outboxTimer = setInterval(() => {
      void processor.processBatch().catch((error) => {
        logger.error("Billing outbox processing failed", { error });
      });
    }, 10_000);
    outboxTimer.unref();
  }

  logger.info("Billing module initialized");
}

// ==================== Default Export ====================
export default {
  initBillingModule,
  billingRouter: createBillingRouter,
};
