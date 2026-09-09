// shared/utils/logger.ts - Enterprise-grade Logger

import { createRequire } from "node:module";
import winston from "winston";
import { format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { inspect } from "util";

const require = createRequire(import.meta.url);

// ==================== Types ====================

export type LogLevel = "error" | "warn" | "info" | "http" | "debug" | "trace";

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp?: string;
  context?: LogContext;
  error?: Error | unknown;
  [key: string]: unknown;
}

export interface LoggerOptions {
  level?: LogLevel;
  service?: string;
  environment?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableJson?: boolean;
  logDir?: string;
  maxSize?: string;
  maxFiles?: string;
  enableColor?: boolean;
  enableTimestamp?: boolean;
  enableCaller?: boolean;
  enablePerformance?: boolean;
}

// ==================== Custom Formats ====================

/**
 * Custom format for pretty printing objects
 */
const prettyPrint = format.printf(
  ({ level, message, timestamp, context, error, ...rest }) => {
    const parts: string[] = [];

    // Timestamp
    if (timestamp) {
      parts.push(`[${timestamp}]`);
    }

    // Level
    parts.push(`[${level.toUpperCase()}]`);

    // Service
    if (rest.service) {
      parts.push(`[${rest.service}]`);
    }

    // Message
    parts.push(String(message));

    // Context
    if (
      context &&
      typeof context === "object" &&
      Object.keys(context).length > 0
    ) {
      parts.push(
        `\n  Context: ${inspect(context, { depth: 5, colors: true, compact: false })}`,
      );
    }

    // Error
    if (error) {
      if (error instanceof Error) {
        parts.push(`\n  Error: ${error.message}`);
        if (error.stack) {
          parts.push(`\n  Stack: ${error.stack}`);
        }
      } else {
        parts.push(`\n  Error: ${inspect(error, { depth: 5, colors: true })}`);
      }
    }

    // Additional fields
    const additionalFields = { ...rest };
    delete additionalFields.service;
    delete additionalFields.timestamp;

    if (Object.keys(additionalFields).length > 0) {
      parts.push(
        `\n  ${inspect(additionalFields, { depth: 5, colors: true, compact: false })}`,
      );
    }

    return parts.join(" ");
  },
);

/**
 * Custom format for JSON logging
 */
const jsonFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(),
);

/**
 * Custom format for development environment
 */
const devFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  format.colorize({ all: true }),
  format.errors({ stack: true }),
  prettyPrint,
);

/**
 * Custom format for production environment
 */
const prodFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(),
);

// ==================== Logger Class ====================

export class Logger {
  private static instances: Map<string, Logger> = new Map();
  private static processHandlersRegistered = false;
  private winston: winston.Logger;
  private options: Required<
    Omit<
      LoggerOptions,
      "enableColor" | "enableTimestamp" | "enableCaller" | "enablePerformance"
    >
  > & {
    enableColor: boolean;
    enableTimestamp: boolean;
    enableCaller: boolean;
    enablePerformance: boolean;
  };
  private startTime: Map<string, number> = new Map();

  /**
   * Get or create logger instance
   */
  static getInstance(service?: string, options?: LoggerOptions): Logger {
    const key = service || "default";

    if (!Logger.instances.has(key)) {
      Logger.instances.set(key, new Logger(service, options));
    }

    return Logger.instances.get(key)!;
  }

  /**
   * Create new logger instance
   */
  constructor(service?: string, options: LoggerOptions = {}) {
    const environment =
      options.environment || process.env.NODE_ENV || "development";
    const isProduction = environment === "production";
    const isDevelopment = environment === "development";
    const isTest = environment === "test";

    // Set defaults
    this.options = {
      level: options.level || (isProduction ? "info" : "debug"),
      service: options.service || service || "application",
      environment,
      enableConsole: options.enableConsole ?? true,
      enableFile: options.enableFile ?? !isTest,
      enableJson: options.enableJson ?? isProduction,
      logDir: options.logDir || "logs",
      maxSize: options.maxSize || "20m",
      maxFiles: options.maxFiles || "30d",
      enableColor: options.enableColor ?? isDevelopment,
      enableTimestamp: options.enableTimestamp ?? true,
      enableCaller: options.enableCaller ?? !isProduction,
      enablePerformance: options.enablePerformance ?? false,
    };

    // Build transports
    const transportList: winston.transport[] = [];

    // Console transport
    if (this.options.enableConsole) {
      const consoleFormat = this.options.enableJson
        ? jsonFormat
        : isDevelopment
          ? devFormat
          : prodFormat;

      transportList.push(
        new transports.Console({
          level: this.options.level,
          format: consoleFormat,
          silent: isTest,
        }),
      );
    }

    // File transport (production only or explicitly enabled)
    if (this.options.enableFile && !isTest) {
      // Error logs
      transportList.push(
        new DailyRotateFile({
          level: "error",
          dirname: `${this.options.logDir}/error`,
          filename: "error-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: this.options.maxSize,
          maxFiles: this.options.maxFiles,
          format: jsonFormat,
        }),
      );

      // Combined logs
      transportList.push(
        new DailyRotateFile({
          level: "info",
          dirname: `${this.options.logDir}/combined`,
          filename: "combined-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: this.options.maxSize,
          maxFiles: this.options.maxFiles,
          format: jsonFormat,
        }),
      );

      // Debug logs (if debug level enabled)
      if (this.options.level === "debug" || this.options.level === "trace") {
        transportList.push(
          new DailyRotateFile({
            level: "debug",
            dirname: `${this.options.logDir}/debug`,
            filename: "debug-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            maxSize: this.options.maxSize,
            maxFiles: this.options.maxFiles,
            format: jsonFormat,
          }),
        );
      }

      // HTTP logs (for API requests)
      transportList.push(
        new DailyRotateFile({
          level: "http",
          dirname: `${this.options.logDir}/http`,
          filename: "http-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: this.options.maxSize,
          maxFiles: this.options.maxFiles,
          format: jsonFormat,
        }),
      );
    }

    // Create winston logger
    this.winston = winston.createLogger({
      level: this.options.level,
      levels: winston.config.npm.levels,
      format: this.options.enableJson ? jsonFormat : devFormat,
      transports: transportList,
      exitOnError: false,
      defaultMeta: {
        service: this.options.service,
        environment: this.options.environment,
        pid: process.pid,
        hostname: process.env.HOSTNAME || require("os").hostname(),
      },
    });

    // Raise the listener cap before attaching process-wide handlers.
    if (!isTest) {
      process.setMaxListeners(Math.max(process.getMaxListeners(), 30));
    }

    // Handle uncaught exceptions once per process to avoid duplicate listeners
    if (!isTest && !Logger.processHandlersRegistered) {
      this.winston.exceptions.handle(
        new DailyRotateFile({
          dirname: `${this.options.logDir}/exceptions`,
          filename: "exceptions-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: this.options.maxSize,
          maxFiles: this.options.maxFiles,
          format: jsonFormat,
        }),
      );

      process.on("unhandledRejection", (reason) => {
        this.winston.error("Unhandled Rejection", { error: reason });
      });

      Logger.processHandlersRegistered = true;
    }

    // Performance logging
    if (this.options.enablePerformance) {
      this.startTime.set("app_start", Date.now());
      this.info("Application started", {
        environment: this.options.environment,
        service: this.options.service,
        nodeVersion: process.version,
      });
    }
  }

  // ==================== Logging Methods ====================

  /**
   * Log error message
   */
  error(message: string, context?: LogContext, error?: unknown): void {
    this.log("error", message, context, error);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /**
   * Log HTTP request/response
   */
  http(message: string, context?: LogContext): void {
    this.log("http", message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  /**
   * Log trace message (most verbose)
   */
  trace(message: string, context?: LogContext): void {
    this.log("trace", message, context);
  }

  /**
   * Log with custom level
   */
  log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown,
  ): void {
    const entry: LogEntry = {
      level,
      message,
      context: this.sanitizeContext(context),
    };

    // Add error if provided
    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        entry.error = error;
      }
    }

    // Add caller information
    if (this.options.enableCaller) {
      const callerInfo = this.getCallerInfo();
      if (callerInfo) {
        entry.caller = callerInfo;
      }
    }

    // Add performance metrics if enabled
    if (this.options.enablePerformance) {
      const start = this.startTime.get("app_start");
      if (start) {
        entry.uptime = Date.now() - start;
      }
    }

    // Log to winston
    this.winston.log(level, entry);
  }

  /**
   * Log with timing (start)
   */
  startTimer(operation: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`Operation completed: ${operation}`, {
        operation,
        duration: `${duration}ms`,
        durationMs: duration,
      });
    };
  }

  /**
   * Measure and log function execution time
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T> | T,
    context?: LogContext,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`Function ${operation} completed`, {
        ...context,
        operation,
        duration: `${duration}ms`,
        durationMs: duration,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Function ${operation} failed`, {
        ...context,
        operation,
        duration: `${duration}ms`,
        durationMs: duration,
        error,
      });
      throw error;
    }
  }

  /**
   * Create child logger with context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.options.service, this.options);

    // Override log method to include context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (
      level: LogLevel,
      message: string,
      ctx?: LogContext,
      error?: unknown,
    ) => {
      originalLog(level, message, { ...context, ...ctx }, error);
    };

    return childLogger;
  }

  /**
   * Create request-scoped logger
   */
  request(req: any): Logger {
    const requestId =
      req.id ||
      (typeof req.headers?.get === "function"
        ? req.headers.get("x-request-id")
        : req.headers?.["x-request-id"]) ||
      this.generateRequestId();

    return this.child({
      requestId,
      method: req.method,
      url: req.url,
      ip:
        req.ip ||
        (typeof req.headers?.get === "function"
          ? req.headers.get("x-forwarded-for")
          : req.headers?.["x-forwarded-for"]),
    });
  }

  /**
   * Flush logs (ensure all logs are written)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.on("finish", resolve);
      this.winston.end();
    });
  }

  // ==================== Private Methods ====================

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sanitized: LogContext = {};
    const sensitiveKeys = [
      "password",
      "password_confirmation",
      "current_password",
      "new_password",
      "confirm_password",
      "secret",
      "token",
      "api_key",
      "apikey",
      "authorization",
      "cookie",
      "session",
      "credit_card",
      "cvv",
      "security_code",
    ];

    for (const [key, value] of Object.entries(context)) {
      // Skip sensitive keys
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = "[REDACTED]";
        continue;
      }

      // Check for nested sensitive data
      if (value && typeof value === "object") {
        sanitized[key] = this.sanitizeContext(value as LogContext);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get caller information
   */
  private getCallerInfo(): {
    file: string;
    line: number;
    function: string;
  } | null {
    const stack = new Error().stack;
    if (!stack) return null;

    const lines = stack.split("\n");
    // Skip first 4 lines (Error, getCallerInfo, log, the actual caller)
    for (let i = 4; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("node_modules") || line.includes("internal/")) {
        continue;
      }

      const match = line.match(/at\s+(?:(\S+)\s+)?\(?(.+):(\d+):(\d+)\)?/);
      if (match) {
        return {
          file: match[2],
          line: parseInt(match[3], 10),
          function: match[1] || "anonymous",
        };
      }
    }

    return null;
  }

  /**
   * Generate random request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = require("crypto").randomBytes(4).toString("hex");
    return `req_${timestamp}_${random}`;
  }

  // ==================== Static Methods ====================

  /**
   * Create a new logger instance
   */
  static create(service: string, options?: LoggerOptions): Logger {
    return new Logger(service, options);
  }

  /**
   * Get default logger instance
   */
  static default(): Logger {
    return Logger.getInstance();
  }

  /**
   * Set global log level
   */
  static setGlobalLevel(level: LogLevel): void {
    const logger = Logger.default();
    logger.winston.level = level;
  }

  /**
   * Get current log level
   */
  static getLevel(): string {
    return Logger.default().winston.level;
  }
}

// ==================== Quick Helpers ====================

/**
 * Quick logging function (uses default logger)
 */
export function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  Logger.default().log(level, message, context);
}

/**
 * Quick error logging
 */
export function logError(
  message: string,
  error?: unknown,
  context?: LogContext,
): void {
  Logger.default().error(message, context, error);
}

/**
 * Quick info logging
 */
export function logInfo(message: string, context?: LogContext): void {
  Logger.default().info(message, context);
}

/**
 * Quick debug logging
 */
export function logDebug(message: string, context?: LogContext): void {
  Logger.default().debug(message, context);
}

/**
 * Request logger middleware
 */
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const logger = Logger.default().request(req);
    const start = Date.now();

    // Log request
    logger.http("Incoming request", {
      method: req.method,
      url: req.url,
      query: req.query,
      headers: {
        host: req.headers.host,
        contentType: req.headers["content-type"],
        userAgent: req.headers["user-agent"],
      },
      body: req.body,
    });

    // Log response
    const originalSend = res.send.bind(res);
    res.send = function (data: any) {
      const duration = Date.now() - start;

      logger.http("Outgoing response", {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        durationMs: duration,
        contentLength: data?.length,
      });

      return originalSend(data);
    };

    // Log errors
    const originalError = res.error;
    res.error = function (err: any) {
      logger.error("Response error", {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        error: err,
      });
      return originalError ? originalError.call(res, err) : err;
    };

    next();
  };
}

// ==================== Export ====================

export default Logger;

// ==================== Package Dependencies ====================

// These should be added to package.json:
/*
{
  "dependencies": {
    "winston": "^3.11.0",
    "winston-daily-rotate-file": "^4.7.1"
  }
}
*/
