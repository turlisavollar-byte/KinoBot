// modules/user/domain/entities/user.entity.ts

import { UserStatusVO, UserRoleVO } from "../value-objects/user-status.vo";
import { Email } from "../value-objects/email.vo";
import { Phone } from "../value-objects/phone.vo";

export type UserRole =
  "superadmin" | "admin" | "manager" | "moderator" | "user" | "viewer";

export interface UserProps {
  id: string;
  telegramId: string;
  email?: Email;
  phone?: Phone;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  status: UserStatusVO;
  role: UserRoleVO;
  isActive: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  lastLoginAt?: Date;
  referralCode?: string;
  referredBy?: string;
  referralRewardTier?: number;
  acquisitionSource?: string;
  dailyCodeLimit?: number | null;
  dailyCodeUsed?: number;
  dailyCodeResetAt?: Date;
  weeklyCodeLimit?: number | null;
  weeklyCodeUsed?: number;
  weeklyCodeResetAt?: Date;
  monthlyCodeLimit?: number | null;
  monthlyCodeUsed?: number;
  monthlyCodeResetAt?: Date;
  trialExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(
    props: Omit<UserProps, "id" | "createdAt" | "updatedAt">,
  ): User {
    return new User({
      ...props,
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static createWithDefaults(
    props: Omit<
      UserProps,
      "id" | "createdAt" | "updatedAt" | "status" | "isActive" | "isBlocked"
    > &
      Partial<Pick<UserProps, "role">>,
  ): User {
    return new User({
      ...props,
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: UserStatusVO.fromString("active"),
      role: props.role || UserRoleVO.fromString("user"),
      isActive: true,
      isBlocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }
  get telegramId(): string {
    return this.props.telegramId;
  }
  get email(): Email | undefined {
    return this.props.email;
  }
  get phone(): Phone | undefined {
    return this.props.phone;
  }
  get username(): string | undefined {
    return this.props.username;
  }
  get firstName(): string | undefined {
    return this.props.firstName;
  }
  get lastName(): string | undefined {
    return this.props.lastName;
  }
  get fullName(): string {
    return (
      [this.firstName, this.lastName].filter(Boolean).join(" ") ||
      this.username ||
      "Unknown"
    );
  }
  get languageCode(): string {
    return this.props.languageCode || "en";
  }
  get status(): UserStatusVO {
    return this.props.status;
  }
  get role(): UserRoleVO {
    return this.props.role;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get isBlocked(): boolean {
    return this.props.isBlocked;
  }
  get blockedReason(): string | undefined {
    return this.props.blockedReason;
  }
  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }
  get referralCode(): string | undefined {
    return this.props.referralCode;
  }
  get referredBy(): string | undefined {
    return this.props.referredBy;
  }
  get referralRewardTier(): number {
    return this.props.referralRewardTier ?? 0;
  }
  get acquisitionSource(): string | undefined {
    return this.props.acquisitionSource;
  }
  get dailyCodeLimit(): number | null | undefined {
    return this.props.dailyCodeLimit;
  }
  get dailyCodeUsed(): number {
    return this.props.dailyCodeUsed ?? 0;
  }
  get weeklyCodeLimit(): number | null | undefined {
    return this.props.weeklyCodeLimit;
  }
  get weeklyCodeUsed(): number {
    return this.props.weeklyCodeUsed ?? 0;
  }
  get monthlyCodeLimit(): number | null | undefined {
    return this.props.monthlyCodeLimit;
  }
  get monthlyCodeUsed(): number {
    return this.props.monthlyCodeUsed ?? 0;
  }
  get trialExpiresAt(): Date | undefined {
    return this.props.trialExpiresAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get isDeleted(): boolean {
    return !!this.props.deletedAt;
  }

  // Methods
  activate(): void {
    this.props.isActive = true;
    this.props.status = UserStatusVO.fromString("active");
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.status = UserStatusVO.fromString("inactive");
    this.props.updatedAt = new Date();
  }

  block(reason?: string): void {
    this.props.isBlocked = true;
    this.props.blockedReason = reason;
    this.props.isActive = false;
    this.props.status = UserStatusVO.fromString("blocked");
    this.props.updatedAt = new Date();
  }

  unblock(): void {
    this.props.isBlocked = false;
    this.props.blockedReason = undefined;
    this.props.isActive = true;
    this.props.status = UserStatusVO.fromString("active");
    this.props.updatedAt = new Date();
  }

  suspend(): void {
    this.props.isActive = false;
    this.props.status = UserStatusVO.fromString("suspended");
    this.props.updatedAt = new Date();
  }

  changeStatus(newStatus: string): void {
    this.props.status = UserStatusVO.fromString(newStatus);
    this.props.updatedAt = new Date();
  }

  updateProfile(
    data: Partial<
      Pick<UserProps, "username" | "firstName" | "lastName" | "languageCode">
    >,
  ): void {
    if (data.username !== undefined) this.props.username = data.username;
    if (data.firstName !== undefined) this.props.firstName = data.firstName;
    if (data.lastName !== undefined) this.props.lastName = data.lastName;
    if (data.languageCode !== undefined)
      this.props.languageCode = data.languageCode;
    this.props.updatedAt = new Date();
  }

  updateEmail(email: Email): void {
    this.props.email = email;
    this.props.updatedAt = new Date();
  }

  updateAccessRules(data: {
    dailyCodeLimit?: number | null;
    referralRewardTier?: number;
    weeklyCodeLimit?: number | null;
    monthlyCodeLimit?: number | null;
  }): void {
    if (data.dailyCodeLimit !== undefined) {
      if (
        data.dailyCodeLimit !== this.props.dailyCodeLimit ||
        (data.dailyCodeLimit !== null &&
          this.dailyCodeUsed > data.dailyCodeLimit)
      ) {
        this.props.dailyCodeUsed = 0;
        this.props.dailyCodeResetAt = new Date();
      }
      this.props.dailyCodeLimit = data.dailyCodeLimit;
    }
    if (data.referralRewardTier !== undefined) {
      this.props.referralRewardTier = data.referralRewardTier;
    }
    if (data.weeklyCodeLimit !== undefined) {
      if (
        data.weeklyCodeLimit !== this.props.weeklyCodeLimit ||
        (data.weeklyCodeLimit !== null &&
          this.weeklyCodeUsed > data.weeklyCodeLimit)
      ) {
        this.props.weeklyCodeUsed = 0;
        this.props.weeklyCodeResetAt = new Date();
      }
      this.props.weeklyCodeLimit = data.weeklyCodeLimit;
    }
    if (data.monthlyCodeLimit !== undefined) {
      if (
        data.monthlyCodeLimit !== this.props.monthlyCodeLimit ||
        (data.monthlyCodeLimit !== null &&
          this.monthlyCodeUsed > data.monthlyCodeLimit)
      ) {
        this.props.monthlyCodeUsed = 0;
        this.props.monthlyCodeResetAt = new Date();
      }
      this.props.monthlyCodeLimit = data.monthlyCodeLimit;
    }
    this.props.updatedAt = new Date();
  }

  updatePhone(phone: Phone): void {
    this.props.phone = phone;
    this.props.updatedAt = new Date();
  }

  updateRole(role: string | UserRoleVO): void {
    this.props.role =
      typeof role === "string" ? UserRoleVO.fromString(role) : role;
    this.props.updatedAt = new Date();
  }

  recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
  }

  softDelete(): void {
    this.props.deletedAt = new Date();
    this.props.isActive = false;
    this.props.status = UserStatusVO.fromString("deleted");
    this.props.updatedAt = new Date();
  }

  restore(): void {
    this.props.deletedAt = undefined;
    this.props.isActive = true;
    this.props.status = UserStatusVO.fromString("active");
    this.props.updatedAt = new Date();
  }

  canManage(user: User): boolean {
    return this.role.canManage(user.role);
  }

  hasPermission(permission: string): boolean {
    return this.role.hasPermission(permission);
  }

  canLogin(): boolean {
    return this.status.canLogin() && this.isActive && !this.isBlocked;
  }

  toJSON(): UserProps {
    return { ...this.props };
  }

  toPublicData() {
    return {
      id: this.id,
      telegramId: this.telegramId,
      email: this.email?.value,
      phone: this.phone?.value,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      languageCode: this.languageCode,
      status: this.status.toString(),
      role: this.role.toString(),
      isActive: this.isActive,
      isBlocked: this.isBlocked,
      blockedReason: this.blockedReason,
      lastLoginAt: this.lastLoginAt?.toISOString(),
      referralCode: this.referralCode,
      referredBy: this.referredBy,
      referralRewardTier: this.referralRewardTier,
      acquisitionSource: this.acquisitionSource,
      dailyCodeLimit: this.dailyCodeLimit,
      dailyCodeUsed: this.dailyCodeUsed,
      weeklyCodeLimit: this.weeklyCodeLimit,
      weeklyCodeUsed: this.weeklyCodeUsed,
      weeklyCodeResetAt: this.props.weeklyCodeResetAt,
      monthlyCodeLimit: this.monthlyCodeLimit,
      monthlyCodeUsed: this.monthlyCodeUsed,
      monthlyCodeResetAt: this.props.monthlyCodeResetAt,
      trialExpiresAt: this.trialExpiresAt,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
