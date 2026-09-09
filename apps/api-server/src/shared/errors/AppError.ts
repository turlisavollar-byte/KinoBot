import { type ErrorCode, ErrorCodes } from "@/shared/errors/errorCodes";

export interface ErrorMetadata {
  [key: string]: unknown;
  userId?: string;
  contentId?: string;
  subscriptionId?: string;
  paymentId?: string;
  deviceId?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly originalError?: Error;
  public readonly metadata?: ErrorMetadata;
  public readonly retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR,
    isOperational = true,
    originalError?: Error,
    metadata?: ErrorMetadata,
    retryable = false,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.originalError = originalError;
    this.metadata = metadata;
    this.retryable = retryable;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      timestamp: this.timestamp,
      metadata: this.metadata,
      retryable: this.retryable,
    };
  }

  static validation(message: string, metadata?: ErrorMetadata): AppError {
    return new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, true, undefined, metadata);
  }

  static notFound(entity: string, id?: string, metadata?: ErrorMetadata): AppError {
    const msg = id ? `${entity} with id "${id}" not found` : `${entity} not found`;
    const codeMap: Record<string, ErrorCode> = {
      User: ErrorCodes.USER_NOT_FOUND,
      Movie: ErrorCodes.MOVIE_NOT_FOUND,
      Series: ErrorCodes.SERIES_NOT_FOUND,
      Episode: ErrorCodes.EPISODE_NOT_FOUND,
      Season: ErrorCodes.SEASON_NOT_FOUND,
      Subscription: ErrorCodes.SUBSCRIPTION_NOT_FOUND,
      Payment: ErrorCodes.PAYMENT_NOT_FOUND,
      Device: ErrorCodes.DEVICE_NOT_FOUND,
      Genre: ErrorCodes.GENRE_NOT_FOUND,
      Actor: ErrorCodes.ACTOR_NOT_FOUND,
    };
    return new AppError(msg, 404, codeMap[entity] ?? ErrorCodes.NOT_FOUND, true, undefined, metadata);
  }

  static forbidden(reason: string, metadata?: ErrorMetadata): AppError {
    const codeMap: Record<string, ErrorCode> = {
      subscription: ErrorCodes.SUBSCRIPTION_REQUIRED,
      permission: ErrorCodes.INSUFFICIENT_PERMISSIONS,
      device: ErrorCodes.DEVICE_LIMIT_EXCEEDED,
      geo: ErrorCodes.GEO_RESTRICTION,
      age: ErrorCodes.AGE_RESTRICTION,
    };
    const code = codeMap[reason.toLowerCase()] ?? ErrorCodes.FORBIDDEN;
    return new AppError(`Access denied: ${reason}`, 403, code, true, undefined, metadata);
  }

  static unauthorized(reason = "Authentication required", metadata?: ErrorMetadata): AppError {
    const codeMap: Record<string, ErrorCode> = {
      expired: ErrorCodes.TOKEN_EXPIRED,
      invalid: ErrorCodes.INVALID_TOKEN,
      missing: ErrorCodes.TOKEN_MISSING,
      locked: ErrorCodes.ACCOUNT_LOCKED,
      revoked: ErrorCodes.TOKEN_REVOKED,
    };
    const lower = reason.toLowerCase();
    let code: ErrorCode = ErrorCodes.UNAUTHORIZED;
    for (const [key, val] of Object.entries(codeMap)) {
      if (lower.includes(key)) { code = val; break; }
    }
    return new AppError(reason, 401, code, true, undefined, metadata);
  }

  static conflict(field: string, value: string, metadata?: ErrorMetadata): AppError {
    const codeMap: Record<string, ErrorCode> = {
      email: ErrorCodes.EMAIL_ALREADY_EXISTS,
      phone: ErrorCodes.PHONE_ALREADY_EXISTS,
      username: ErrorCodes.USERNAME_ALREADY_EXISTS,
    };
    return new AppError(
      `${field} '${value}' already exists`,
      409,
      codeMap[field] ?? ErrorCodes.CONFLICT,
      true,
      undefined,
      metadata,
    );
  }

  static business(
    message: string,
    code: ErrorCode = ErrorCodes.BUSINESS_RULE_VIOLATION,
    metadata?: ErrorMetadata,
  ): AppError {
    return new AppError(message, 422, code, true, undefined, metadata);
  }

  static internal(message: string, originalError?: Error, metadata?: ErrorMetadata): AppError {
    return new AppError(message, 500, ErrorCodes.INTERNAL_SERVER_ERROR, false, originalError, metadata);
  }

  static rateLimit(metadata?: ErrorMetadata): AppError {
    return new AppError("Too many requests", 429, ErrorCodes.TOO_MANY_REQUESTS, true, undefined, metadata);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, true, undefined, metadata);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404, ErrorCodes.NOT_FOUND);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, 422, ErrorCodes.BUSINESS_RULE_VIOLATION, true, undefined, metadata);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error, metadata?: ErrorMetadata) {
    super(message, 500, ErrorCodes.DATABASE_ERROR, false, originalError, metadata);
  }
}
