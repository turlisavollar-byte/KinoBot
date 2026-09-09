export type BillingInterval = "monthly" | "yearly" | "one_time";

export interface BillingPlanProps {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: BillingInterval;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class BillingPlan {
  private _id: string;
  private _name: string;
  private _description: string | null;
  private _priceCents: number;
  private _currency: string;
  private _interval: BillingInterval;
  private _isActive: boolean;
  private _metadata: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: BillingPlanProps) {
    this._id = props.id;
    this._name = props.name;
    this._description = props.description;
    this._priceCents = props.priceCents;
    this._currency = props.currency;
    this._interval = props.interval;
    this._isActive = props.isActive;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(params: {
    name: string;
    description?: string;
    priceCents: number;
    currency?: string;
    interval: BillingInterval;
    metadata?: Record<string, unknown>;
  }): BillingPlan {
    if (!params.name.trim()) throw new Error("name is required");
    if (params.priceCents < 0) throw new Error("priceCents must be >= 0");
    if (!Number.isSafeInteger(params.priceCents)) {
      throw new Error("priceCents must be a safe integer");
    }

    const currency = (params.currency || "usd").trim().toLowerCase();
    if (!/^[a-z]{3}$/.test(currency))
      throw new Error("currency must be a 3-letter code");

    const now = new Date();
    return new BillingPlan({
      id: crypto.randomUUID(),
      name: params.name.trim(),
      description: params.description || null,
      priceCents: params.priceCents,
      currency,
      interval: params.interval,
      isActive: true,
      metadata: { ...(params.metadata || {}) },
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: BillingPlanProps): BillingPlan {
    return new BillingPlan(props);
  }

  get id(): string {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get description(): string | null {
    return this._description;
  }
  get priceCents(): number {
    return this._priceCents;
  }
  get currency(): string {
    return this._currency;
  }
  get interval(): BillingInterval {
    return this._interval;
  }
  get isActive(): boolean {
    return this._isActive;
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

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  updatePrice(priceCents: number): void {
    if (priceCents < 0) throw new Error("priceCents must be >= 0");
    if (!Number.isSafeInteger(priceCents)) {
      throw new Error("priceCents must be a safe integer");
    }
    this._priceCents = priceCents;
    this._updatedAt = new Date();
  }

  rename(name: string): void {
    if (!name.trim()) throw new Error("name is required");
    this._name = name.trim();
    this._updatedAt = new Date();
  }

  updateDescription(description: string | null): void {
    this._description = description?.trim() || null;
    this._updatedAt = new Date();
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    this._metadata = { ...metadata };
    this._updatedAt = new Date();
  }

  toProps(): BillingPlanProps {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      priceCents: this._priceCents,
      currency: this._currency,
      interval: this._interval,
      isActive: this._isActive,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
