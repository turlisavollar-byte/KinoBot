import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreatePlanUseCase,
  ListPlansUseCase,
  GetPlanUseCase,
  UpdatePlanUseCase,
  DeletePlanUseCase,
  CreateSubscriptionUseCase,
  ListSubscriptionsUseCase,
  GetSubscriptionUseCase,
  CancelSubscriptionUseCase,
  ExtendSubscriptionUseCase,
  CreateInvoiceUseCase,
  ListInvoicesUseCase,
  GetInvoiceUseCase,
  MarkInvoicePaidUseCase,
  CreatePaymentUseCase,
  ListPaymentsUseCase,
  GetPaymentUseCase,
  RefundPaymentUseCase,
  CreateClickPaymentUseCase,
  HandleClickWebhookUseCase,
  CreatePaymePaymentUseCase,
  HandlePaymeWebhookUseCase,
  CreateUzumPaymentUseCase,
  HandleUzumWebhookUseCase,
  CreatePaynetPaymentUseCase,
  HandlePaynetWebhookUseCase,
  CreateAnorPaymentUseCase,
  HandleAnorWebhookUseCase,
  CreateNBUPaymentUseCase,
  HandleNBUWebhookUseCase,
  CreateUzcardPaymentUseCase,
  HandleUzcardWebhookUseCase,
  CreateOctoPaymentUseCase,
  HandleOctoWebhookUseCase,
  CreatePlanSchema,
  UpdatePlanSchema,
  ListPlansQuerySchema,
  CreateSubscriptionSchema,
  CancelSubscriptionSchema,
  ExtendSubscriptionSchema,
  ListSubscriptionsQuerySchema,
  CreateInvoiceSchema,
  ListInvoicesQuerySchema,
  CreatePaymentSchema,
  ListPaymentsQuerySchema,
  CreateClickPaymentSchema,
  CreatePaymePaymentSchema,
  CreateUzumPaymentSchema,
  CreatePaynetPaymentSchema,
  CreateAnorPaymentSchema,
  CreateNBUPaymentSchema,
  CreateUzcardPaymentSchema,
  CreateOctoPaymentSchema,
} from "../application";
import type { IBillingPlanRepository } from "../domain";
import { createPagination, PaginatedResult } from "@/shared/types";
import { AppError } from "@/shared/errors";

function uuidRegex() {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

@injectable()
export class BillingController {
  constructor(
    @inject(CreatePlanUseCase)
    private readonly createPlanUC: CreatePlanUseCase,
    @inject(ListPlansUseCase)
    private readonly listPlansUC: ListPlansUseCase,
    @inject(GetPlanUseCase)
    private readonly getPlanUC: GetPlanUseCase,
    @inject(UpdatePlanUseCase)
    private readonly updatePlanUC: UpdatePlanUseCase,
    @inject(DeletePlanUseCase)
    private readonly deletePlanUC: DeletePlanUseCase,
    @inject(CreateSubscriptionUseCase)
    private readonly createSubUC: CreateSubscriptionUseCase,
    @inject(ListSubscriptionsUseCase)
    private readonly listSubsUC: ListSubscriptionsUseCase,
    @inject(GetSubscriptionUseCase)
    private readonly getSubUC: GetSubscriptionUseCase,
    @inject(CancelSubscriptionUseCase)
    private readonly cancelSubUC: CancelSubscriptionUseCase,
    @inject(ExtendSubscriptionUseCase)
    private readonly extendSubUC: ExtendSubscriptionUseCase,
    @inject(CreateInvoiceUseCase)
    private readonly createInvoiceUC: CreateInvoiceUseCase,
    @inject("IBillingPlanRepository")
    private readonly planRepo: IBillingPlanRepository,
    @inject(ListInvoicesUseCase)
    private readonly listInvoicesUC: ListInvoicesUseCase,
    @inject(GetInvoiceUseCase)
    private readonly getInvoiceUC: GetInvoiceUseCase,
    @inject(MarkInvoicePaidUseCase)
    private readonly markInvoicePaidUC: MarkInvoicePaidUseCase,
    @inject(CreatePaymentUseCase)
    private readonly createPaymentUC: CreatePaymentUseCase,
    @inject(ListPaymentsUseCase)
    private readonly listPaymentsUC: ListPaymentsUseCase,
    @inject(GetPaymentUseCase)
    private readonly getPaymentUC: GetPaymentUseCase,
    @inject(RefundPaymentUseCase)
    private readonly refundPaymentUC: RefundPaymentUseCase,
    @inject(CreateClickPaymentUseCase)
    private readonly createClickPaymentUC: CreateClickPaymentUseCase,
    @inject(HandleClickWebhookUseCase)
    private readonly handleClickWebhookUC: HandleClickWebhookUseCase,
    @inject(CreatePaymePaymentUseCase)
    private readonly createPaymePaymentUC: CreatePaymePaymentUseCase,
    @inject(HandlePaymeWebhookUseCase)
    private readonly handlePaymeWebhookUC: HandlePaymeWebhookUseCase,
    @inject(CreateUzumPaymentUseCase)
    private readonly createUzumPaymentUC: CreateUzumPaymentUseCase,
    @inject(HandleUzumWebhookUseCase)
    private readonly handleUzumWebhookUC: HandleUzumWebhookUseCase,
    @inject(CreatePaynetPaymentUseCase)
    private readonly createPaynetPaymentUC: CreatePaynetPaymentUseCase,
    @inject(HandlePaynetWebhookUseCase)
    private readonly handlePaynetWebhookUC: HandlePaynetWebhookUseCase,
    @inject(CreateAnorPaymentUseCase)
    private readonly createAnorPaymentUC: CreateAnorPaymentUseCase,
    @inject(HandleAnorWebhookUseCase)
    private readonly handleAnorWebhookUC: HandleAnorWebhookUseCase,
    @inject(CreateNBUPaymentUseCase)
    private readonly createNBUPaymentUC: CreateNBUPaymentUseCase,
    @inject(HandleNBUWebhookUseCase)
    private readonly handleNBUWebhookUC: HandleNBUWebhookUseCase,
    @inject(CreateUzcardPaymentUseCase)
    private readonly createUzcardPaymentUC: CreateUzcardPaymentUseCase,
    @inject(HandleUzcardWebhookUseCase)
    private readonly handleUzcardWebhookUC: HandleUzcardWebhookUseCase,
    @inject(CreateOctoPaymentUseCase)
    private readonly createOctoPaymentUC: CreateOctoPaymentUseCase,
    @inject(HandleOctoWebhookUseCase)
    private readonly handleOctoWebhookUC: HandleOctoWebhookUseCase,
  ) {}

  // ===== Plans =====
  async createPlan(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreatePlanSchema.parse(req.body);
      const plan = await this.createPlanUC.execute(dto);
      res.status(201).json({ success: true, data: this.planResponse(plan) });
    } catch (err) {
      next(err);
    }
  }

  async listPlans(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const query = ListPlansQuerySchema.parse(req.query);
      const pagination = createPagination(
        Number(query.page) || 1,
        Number(query.limit) || 20,
      );
      const result = await this.listPlansUC.execute(
        pagination,
        query.active_only === "true",
      );
      res.json({
        success: true,
        data: result.data.map((p: any) => this.planResponse(p)),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getPlan(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = routeParam(req.params.id);
      const plan = await this.getPlanUC.execute(id);
      res.json({ success: true, data: this.planResponse(plan) });
    } catch (err) {
      next(err);
    }
  }

  async updatePlan(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = routeParam(req.params.id);
      const dto = UpdatePlanSchema.parse(req.body);
      const plan = await this.updatePlanUC.execute(id, dto);
      res.json({ success: true, data: this.planResponse(plan) });
    } catch (err) {
      next(err);
    }
  }

  async deletePlan(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = routeParam(req.params.id);
      await this.deletePlanUC.execute(id);
      res.status(204).json({ success: true, message: "Plan deleted" });
    } catch (err) {
      next(err);
    }
  }

  // ===== Subscriptions =====
  async createSubscription(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreateSubscriptionSchema.parse(req.body);
      const sub = await this.createSubUC.execute({
        ...dto,
        userId: this.canManageBilling(req) ? dto.userId : this.actorId(req),
      });
      res.status(201).json({ success: true, data: await this.subResponse(sub) });
    } catch (err) {
      next(err);
    }
  }

  async listSubscriptions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const query = ListSubscriptionsQuerySchema.parse(req.query);
      const pagination = createPagination(
        Number(query.page) || 1,
        Number(query.limit) || 20,
      );
      const requestedUserId = routeParam(req.params.userId) || query.userId;
      const userId = this.resolveListUserId(req, requestedUserId);
      const result = await this.listSubsUC.execute(userId, pagination);
      const data = await Promise.all(result.data.map((s: any) => this.subResponse(s)));
      res.json({
        data,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSubscription(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = routeParam(req.params.id);
      const sub = await this.getSubUC.execute(id);
      this.assertResourceAccess(req, sub.userId);
      res.json({ success: true, data: await this.subResponse(sub) });
    } catch (err) {
      next(err);
    }
  }

  async cancelSubscription(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = routeParam(req.params.id);
      const sub = await this.getSubUC.execute(id);
      this.assertResourceAccess(req, sub.userId);
      const dto = CancelSubscriptionSchema.parse({ id, ...req.body });
      const canceledSub = await this.cancelSubUC.execute(dto);
      res.json(await this.subResponse(canceledSub));
    } catch (err) {
      next(err);
    }
  }

  async extendSubscription(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = routeParam(req.params.id);
      const sub = await this.getSubUC.execute(id);
      this.assertResourceAccess(req, sub.userId);
      const dto = ExtendSubscriptionSchema.parse({ id, ...req.body });
      const extendedSub = await this.extendSubUC.execute(dto);
      res.json(await this.subResponse(extendedSub));
    } catch (err) {
      next(err);
    }
  }

  // ===== Invoices =====
  async createInvoice(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreateInvoiceSchema.parse(req.body);
      const idempotencyKey = req.headers["idempotency-key"];
      const invoice = await this.createInvoiceUC.execute(
        {
          ...dto,
          userId: this.canManageBilling(req) ? dto.userId : this.actorId(req),
        },
        Array.isArray(idempotencyKey) ? idempotencyKey[0] : idempotencyKey,
      );
      res
        .status(201)
        .json({ success: true, data: this.invoiceResponse(invoice) });
    } catch (err) {
      next(err);
    }
  }

  async listInvoices(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const query = ListInvoicesQuerySchema.parse(req.query);
      const pagination = createPagination(
        Number(query.page) || 1,
        Number(query.limit) || 20,
      );
      const requestedUserId = routeParam(req.params.userId) || query.userId;
      const userId = this.resolveListUserId(req, requestedUserId);
      const result = await this.listInvoicesUC.execute(userId, pagination);
      res.json({
        success: true,
        data: result.data.map((i: any) => this.invoiceResponse(i)),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getInvoice(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = routeParam(req.params.id);
      const invoice = await this.getInvoiceUC.execute(id);
      this.assertResourceAccess(req, invoice.userId);
      res.json({ success: true, data: this.invoiceResponse(invoice) });
    } catch (err) {
      next(err);
    }
  }

  async markInvoicePaid(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = routeParam(req.params.id);
      const invoice = await this.getInvoiceUC.execute(id);
      this.assertResourceAccess(req, invoice.userId, true);
      await this.markInvoicePaidUC.execute(id);
      res.json({ success: true, message: "Invoice marked as paid" });
    } catch (err) {
      next(err);
    }
  }

  // ===== Payments =====
  async createPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreatePaymentSchema.parse(req.body);
      const invoice = await this.getInvoiceUC.execute(dto.invoiceId);
      this.assertResourceAccess(req, invoice.userId);
      const payment = await this.createPaymentUC.execute(dto);
      res
        .status(201)
        .json({ success: true, data: this.paymentResponse(payment) });
    } catch (err) {
      next(err);
    }
  }

  async listPayments(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const query = ListPaymentsQuerySchema.parse(req.query);
      const pagination = createPagination(
        Number(query.page) || 1,
        Number(query.limit) || 20,
      );
      const requestedUserId = routeParam(req.params.userId) || query.userId;
      const userId = this.resolveListUserId(req, requestedUserId);
      const result = await this.listPaymentsUC.execute(userId, pagination);
      res.json({
        success: true,
        data: result.data.map((p: any) => this.paymentResponse(p)),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = routeParam(req.params.id);
      const payment = await this.getPaymentUC.execute(id);
      this.assertResourceAccess(req, payment.userId);
      res.json({ success: true, data: this.paymentResponse(payment) });
    } catch (err) {
      next(err);
    }
  }

  async refundPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = routeParam(req.params.id);
      const payment = await this.getPaymentUC.execute(id);
      this.assertResourceAccess(req, payment.userId, true);
      await this.refundPaymentUC.execute(id);
      res.json({ success: true, message: "Payment refunded" });
    } catch (err) {
      next(err);
    }
  }

  // ===== Click =====
  async createClickPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreateClickPaymentSchema.parse(req.body);
      await this.assertInvoiceAccess(req, dto.invoiceId);
      const result = await this.createClickPaymentUC.execute(dto);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async clickWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await this.handleClickWebhookUC.execute(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // ===== Payme =====
  async createPaymePayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreatePaymePaymentSchema.parse(req.body);
      await this.assertInvoiceAccess(req, dto.invoiceId);
      const result = await this.createPaymePaymentUC.execute(dto);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async paymeWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const authHeader = req.headers["authorization"];
      const result = await this.handlePaymeWebhookUC.execute(
        authHeader,
        req.body,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // ===== Uzum =====
  async createUzumPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreateUzumPaymentSchema.parse(req.body);
      await this.assertInvoiceAccess(req, dto.invoiceId);
      const result = await this.createUzumPaymentUC.execute(dto);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async uzumWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await this.handleUzumWebhookUC.execute(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // ===== Paynet =====
  async createPaynetPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreatePaynetPaymentSchema.parse(req.body);
      await this.assertInvoiceAccess(req, dto.invoiceId);
      const result = await this.createPaynetPaymentUC.execute(dto);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async paynetWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await this.handlePaynetWebhookUC.execute(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // ===== Anor =====
  async createAnorPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreateAnorPaymentSchema.parse(req.body);
      await this.assertInvoiceAccess(req, dto.invoiceId);
      const result = await this.createAnorPaymentUC.execute(dto);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async anorWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await this.handleAnorWebhookUC.execute(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // ===== NBU =====
  async createNBUPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreateNBUPaymentSchema.parse(req.body);
      await this.assertInvoiceAccess(req, dto.invoiceId);
      const result = await this.createNBUPaymentUC.execute(dto);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async nbuWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await this.handleNBUWebhookUC.execute(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // ===== Uzcard/Humo =====
  async createUzcardPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreateUzcardPaymentSchema.parse(req.body);
      await this.assertInvoiceAccess(req, dto.invoiceId);
      const result = await this.createUzcardPaymentUC.execute(dto);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async uzcardWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await this.handleUzcardWebhookUC.execute(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // ===== Octo =====
  async createOctoPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto = CreateOctoPaymentSchema.parse(req.body);
      await this.assertInvoiceAccess(req, dto.invoiceId);
      const result = await this.createOctoPaymentUC.execute(dto);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async octoWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await this.handleOctoWebhookUC.execute(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  private actorId(req: Request): string {
    const actorId = req.user?.id;
    if (!actorId) throw AppError.unauthorized();
    return actorId;
  }

  private canReadAllBilling(req: Request): boolean {
    const permissions = req.user?.permissions ?? [];
    return permissions.includes("read:billing") || this.canManageBilling(req);
  }

  private canManageBilling(req: Request): boolean {
    const permissions = req.user?.permissions ?? [];
    const role = String(req.user?.role ?? "").toLowerCase();
    return (
      permissions.includes("manage:billing") ||
      role === "admin" ||
      role === "superadmin"
    );
  }

  private resolveListUserId(req: Request, requestedUserId?: string): string {
    const actorId = this.actorId(req);
    if (!requestedUserId) return this.canReadAllBilling(req) ? "" : actorId;
    if (requestedUserId === actorId || this.canReadAllBilling(req))
      return requestedUserId;
    throw AppError.forbidden("permission");
  }

  private assertResourceAccess(
    req: Request,
    ownerId: string,
    managerOnly = false,
  ): void {
    const actorId = this.actorId(req);
    if (actorId === ownerId && !managerOnly) return;
    if (managerOnly ? this.canManageBilling(req) : this.canReadAllBilling(req))
      return;
    throw AppError.forbidden("permission");
  }

  private async assertInvoiceAccess(
    req: Request,
    invoiceId: string,
  ): Promise<void> {
    const invoice = await this.getInvoiceUC.execute(invoiceId);
    this.assertResourceAccess(req, invoice.userId);
  }

  // ===== Response mappers =====
  private planResponse(plan: any) {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceCents: plan.priceCents,
      currency: plan.currency,
      interval: plan.interval,
      isActive: plan.isActive,
      metadata: plan.metadata,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private async subResponse(sub: any): Promise<any> {
    const plan = await this.planRepo.findById(sub.planId);
    return {
      id: sub.id,
      userId: sub.userId,
      planId: sub.planId,
      planName: plan?.name || "Unknown",
      status: sub.status,
      startDate: sub.currentPeriodStart,
      endDate: sub.currentPeriodEnd,
      autoRenew: !sub.cancelAtPeriodEnd,
      cancelledAt: sub.canceledAt,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }

  private invoiceResponse(invoice: any) {
    return {
      id: invoice.id,
      userId: invoice.userId,
      subscriptionId: invoice.subscriptionId,
      amountCents: invoice.amountCents,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      lineItems: invoice.lineItems,
      metadata: invoice.metadata,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  private paymentResponse(payment: any) {
    // Convert amountCents to amount for dashboard compatibility
    const amount = payment.amountCents / 100;

    // Map status values for dashboard compatibility
    let status = payment.status;
    if (payment.status === "completed") status = "success";
    if (payment.status === "cancelled") status = "failed";

    return {
      id: payment.id,
      userId: payment.userId,
      invoiceId: payment.invoiceId,
      amount, // Convert cents to main currency unit
      currency: payment.currency,
      status, // Map completed->success, cancelled->failed
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      failureReason: payment.failureReason,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
