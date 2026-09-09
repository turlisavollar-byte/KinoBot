export type InvoiceStatus = "open" | "paid" | "void" | "uncollectible";

export interface LineItem {
  description: string;
  quantity: number;
  unitAmountCents: number;
}

export interface InvoiceProps {
  id: string;
  idempotencyKey: string | null;
  userId: string;
  subscriptionId: string | null;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date | null;
  paidAt: Date | null;
  lineItems: LineItem[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class Invoice {
  private _id: string;
  private _idempotencyKey: string | null;
  private _userId: string;
  private _subscriptionId: string | null;
  private _amountCents: number;
  private _currency: string;
  private _status: InvoiceStatus;
  private _dueDate: Date | null;
  private _paidAt: Date | null;
  private _lineItems: LineItem[];
  private _metadata: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: InvoiceProps) {
    this._id = props.id;
    this._idempotencyKey = props.idempotencyKey;
    this._userId = props.userId;
    this._subscriptionId = props.subscriptionId;
    this._amountCents = props.amountCents;
    this._currency = props.currency;
    this._status = props.status;
    this._dueDate = props.dueDate;
    this._paidAt = props.paidAt;
    this._lineItems = props.lineItems;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(params: {
    userId: string;
    subscriptionId?: string;
    lineItems: LineItem[];
    currency?: string;
    dueDate?: Date;
    metadata?: Record<string, unknown>;
    idempotencyKey?: string;
  }): Invoice {
    if (!params.userId) throw new Error("userId is required");
    if (!params.lineItems || params.lineItems.length === 0) {
      throw new Error("At least one line item is required");
    }

    for (const item of params.lineItems) {
      if (!item.description.trim())
        throw new Error("Line item description is required");
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
        throw new Error("Line item quantity must be a positive integer");
      }
      if (
        !Number.isSafeInteger(item.unitAmountCents) ||
        item.unitAmountCents < 0
      ) {
        throw new Error("Line item amount must be a non-negative integer");
      }
    }

    const currency = (params.currency || "usd").trim().toLowerCase();
    if (!/^[a-z]{3}$/.test(currency))
      throw new Error("currency must be a 3-letter code");
    if (params.dueDate && Number.isNaN(params.dueDate.getTime())) {
      throw new Error("dueDate must be a valid date");
    }

    const amountCents = params.lineItems.reduce(
      (sum, item) => sum + item.unitAmountCents * item.quantity,
      0,
    );
    if (!Number.isSafeInteger(amountCents))
      throw new Error("Invoice amount is too large");

    const now = new Date();
    return new Invoice({
      id: crypto.randomUUID(),
      idempotencyKey: params.idempotencyKey || null,
      userId: params.userId,
      subscriptionId: params.subscriptionId || null,
      amountCents,
      currency,
      status: "open",
      dueDate: params.dueDate || null,
      paidAt: null,
      lineItems: params.lineItems.map((item) => ({ ...item })),
      metadata: { ...(params.metadata || {}) },
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: InvoiceProps): Invoice {
    return new Invoice(props);
  }

  get id(): string {
    return this._id;
  }
  get idempotencyKey(): string | null {
    return this._idempotencyKey;
  }
  get userId(): string {
    return this._userId;
  }
  get subscriptionId(): string | null {
    return this._subscriptionId;
  }
  get amountCents(): number {
    return this._amountCents;
  }
  get currency(): string {
    return this._currency;
  }
  get status(): InvoiceStatus {
    return this._status;
  }
  get dueDate(): Date | null {
    return this._dueDate;
  }
  get paidAt(): Date | null {
    return this._paidAt;
  }
  get lineItems(): LineItem[] {
    return this._lineItems.map((item) => ({ ...item }));
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

  markPaid(): void {
    if (this._status === "paid") return;
    if (this._status === "void") throw new Error("Cannot pay a void invoice");
    this._status = "paid";
    this._paidAt = new Date();
    this._updatedAt = new Date();
  }

  void(): void {
    if (this._status === "paid") throw new Error("Cannot void a paid invoice");
    this._status = "void";
    this._updatedAt = new Date();
  }

  markUncollectible(): void {
    this._status = "uncollectible";
    this._updatedAt = new Date();
  }

  isOpen(): boolean {
    return this._status === "open";
  }

  isPaid(): boolean {
    return this._status === "paid";
  }

  toProps(): InvoiceProps {
    return {
      id: this._id,
      idempotencyKey: this._idempotencyKey,
      userId: this._userId,
      subscriptionId: this._subscriptionId,
      amountCents: this._amountCents,
      currency: this._currency,
      status: this._status,
      dueDate: this._dueDate,
      paidAt: this._paidAt,
      lineItems: this._lineItems,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
