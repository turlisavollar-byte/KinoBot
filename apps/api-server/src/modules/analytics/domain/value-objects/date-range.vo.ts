// modules/analytics/domain/value-objects/date-range.vo.ts

export class DateRange {
  private constructor(
    public readonly start: Date,
    public readonly end: Date,
  ) {
    if (start > end) {
      throw new Error('Start date must be before end date');
    }
  }

  static create(start: Date, end: Date): DateRange {
    return new DateRange(start, end);
  }

  static fromDays(days: number): DateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return new DateRange(start, end);
  }

  static fromPeriod(period: '7d' | '30d' | '90d' | '1y'): DateRange {
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    }[period];
    return DateRange.fromDays(days);
  }

  get durationInDays(): number {
    return Math.ceil((this.end.getTime() - this.start.getTime()) / (1000 * 60 * 60 * 24));
  }

  contains(date: Date): boolean {
    return date >= this.start && date <= this.end;
  }

  toJSON(): { start: string; end: string } {
    return {
      start: this.start.toISOString(),
      end: this.end.toISOString(),
    };
  }
}