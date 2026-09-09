export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type PaymentProvider =
  | "manual"
  | "stripe"
  | "paypal"
  | "click"
  | "payme"
  | "uzum"
  | "paynet"
  | "anor"
  | "nbu"
  | "uzcard"
  | "octo"
  | "p2p";

export interface PaymentProps {
  id: string;
  userId: string;
  invoiceId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class Payment {
  private _id: string;
  private _userId: string;
  private _invoiceId: string;
  private _amountCents: number;
  private _currency: string;
  private _status: PaymentStatus;
  private _provider: PaymentProvider;
  private _providerPaymentId: string | null;
  private _failureReason: string | null;
  private _metadata: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: PaymentProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._invoiceId = props.invoiceId;
    this._amountCents = props.amountCents;
    this._currency = props.currency;
    this._status = props.status;
    this._provider = props.provider;
    this._providerPaymentId = props.providerPaymentId;
    this._failureReason = props.failureReason;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(params: {
    userId: string;
    invoiceId: string;
    amountCents: number;
    currency?: string;
    provider?: PaymentProvider;
    providerPaymentId?: string;
    metadata?: Record<string, unknown>;
  }): Payment {
    if (!params.userId) throw new Error("userId is required");
    if (!params.invoiceId) throw new Error("invoiceId is required");
    if (params.amountCents < 0) throw new Error("amountCents must be >= 0");
    if (!Number.isSafeInteger(params.amountCents)) {
      throw new Error("amountCents must be a safe integer");
    }

    const currency = (params.currency || "usd").trim().toLowerCase();
    if (!/^[a-z]{3}$/.test(currency))
      throw new Error("currency must be a 3-letter code");

    const now = new Date();
    return new Payment({
      id: crypto.randomUUID(),
      userId: params.userId,
      invoiceId: params.invoiceId,
      amountCents: params.amountCents,
      currency,
      status: "pending",
      provider: params.provider || "manual",
      providerPaymentId: params.providerPaymentId || null,
      failureReason: null,
      metadata: { ...(params.metadata || {}) },
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: PaymentProps): Payment {
    return new Payment(props);
  }

  get id(): string {
    return this._id;
  }
  get userId(): string {
    return this._userId;
  }
  get invoiceId(): string {
    return this._invoiceId;
  }
  get amountCents(): number {
    return this._amountCents;
  }
  get currency(): string {
    return this._currency;
  }
  get status(): PaymentStatus {
    return this._status;
  }
  get provider(): PaymentProvider {
    return this._provider;
  }
  get providerPaymentId(): string | null {
    return this._providerPaymentId;
  }
  get failureReason(): string | null {
    return this._failureReason;
  }
  get metadata(): Record<string, unknown> {
    return { ...this._metadata };
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  markSucceeded(providerPaymentId?: string): void {
    if (this._status === "succeeded") return;
    this._status = "succeeded";
    if (providerPaymentId) this._providerPaymentId = providerPaymentId;
    this._failureReason = null;
    this._updatedAt = new Date();
  }

  markFailed(reason: string): void {
    this._status = "failed";
    this._failureReason = reason;
    this._updatedAt = new Date();
  }

  refund(): void {
    if (this._status !== "succeeded") {
      throw new Error("Can only refund a succeeded payment");
    }
    this._status = "refunded";
    this._updatedAt = new Date();
  }

  isSucceeded(): boolean {
    return this._status === "succeeded";
  }

  toProps(): PaymentProps {
    return {
      id: this._id,
      userId: this._userId,
      invoiceId: this._invoiceId,
      amountCents: this._amountCents,
      currency: this._currency,
      status: this._status,
      provider: this._provider,
      providerPaymentId: this._providerPaymentId,
      failureReason: this._failureReason,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
