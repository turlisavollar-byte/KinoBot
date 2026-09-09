// modules/analytics/domain/value-objects/metric.vo.ts

export class Metric {
  constructor(
    public readonly name: string,
    public readonly value: number,
    public readonly previousValue?: number,
    public readonly unit?: string,
    public readonly timestamp?: Date,
  ) {}

  get change(): number {
    if (this.previousValue === undefined) return 0;
    if (this.previousValue === 0) return 0;
    return ((this.value - this.previousValue) / this.previousValue) * 100;
  }

  get isPositive(): boolean {
    return this.change > 0;
  }

  get isNegative(): boolean {
    return this.change < 0;
  }

  get trend(): 'up' | 'down' | 'stable' {
    if (Math.abs(this.change) < 1) return 'stable';
    return this.change > 0 ? 'up' : 'down';
  }

  format(): string {
    if (this.unit === 'percentage') {
      return `${this.value.toFixed(1)}%`;
    }
    if (this.unit === 'currency') {
      return `$${this.value.toFixed(2)}`;
    }
    return this.value.toLocaleString();
  }
}