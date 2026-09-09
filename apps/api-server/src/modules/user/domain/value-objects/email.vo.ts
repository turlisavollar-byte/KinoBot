// modules/user/domain/value-objects/email.vo.ts

export class Email {
  private constructor(public readonly value: string) {}

  static create(email: string): Email {
    const trimmed = email.trim().toLowerCase();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error('Invalid email format');
    }

    // Validate domain
    const domain = trimmed.split('@')[1];
    if (!domain || domain.length < 3) {
      throw new Error('Invalid email domain');
    }

    return new Email(trimmed);
  }

  get domain(): string {
    return this.value.split('@')[1];
  }

  get localPart(): string {
    return this.value.split('@')[0];
  }

  mask(): string {
    const [local, domain] = this.value.split('@');
    const masked = local.slice(0, 2) + '***' + local.slice(-1);
    return `${masked}@${domain}`;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}