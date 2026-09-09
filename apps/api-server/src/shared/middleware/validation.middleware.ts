import type { Request, Response, NextFunction } from "express";
import { AppError } from "@/shared/errors/AppError";

type SafeParseable = {
  safeParse(data: unknown): { success: true; data: unknown } | { success: false; error: { issues: Array<{ path: (string | number)[]; message: string }> } };
};

type Target = "body" | "query" | "params";

type ValidationConfig = {
  body?: SafeParseable;
  query?: SafeParseable;
  params?: SafeParseable;
};

export function validate(config: ValidationConfig): (req: Request, _res: Response, next: NextFunction) => void;
export function validate(schema: SafeParseable, target?: Target): (req: Request, _res: Response, next: NextFunction) => void;
export function validate(
  configOrSchema: ValidationConfig | SafeParseable,
  target?: Target,
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Handle object config format: { body: schema, query: schema, params: schema }
    if (typeof configOrSchema === 'object' && !('safeParse' in configOrSchema)) {
      const config = configOrSchema;

      for (const [key, schema] of Object.entries(config)) {
        if (schema) {
          const result = schema.safeParse(req[key as Target]);
          if (!result.success) {
            const message = result.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ");
            next(AppError.validation(message));
            return;
          }
          // Use Object.defineProperty for read-only properties like req.query
          if (key === 'query') {
            Object.defineProperty(req, key, {
              value: result.data,
              writable: true,
              configurable: true,
            });
          } else {
            req[key as Target] = result.data;
          }
        }
      }
      next();
      return;
    }

    // Handle single schema format: validate(schema, target)
    const schema = configOrSchema as SafeParseable;
    const validationTarget = target || "body";
    const result = schema.safeParse(req[validationTarget]);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      next(AppError.validation(message));
      return;
    }
    // Use Object.defineProperty for read-only properties like req.query
    if (validationTarget === 'query') {
      Object.defineProperty(req, validationTarget, {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } else {
      req[validationTarget] = result.data;
    }
    next();
  };
}
