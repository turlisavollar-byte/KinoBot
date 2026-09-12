import type { Request, Response, NextFunction } from "express";
import { AppError } from "@/shared/errors/AppError";
import type { z } from "zod/v4";

type SafeParseable = {
  safeParse(data: unknown): { success: true; data: unknown } | { success: false; error: { issues: Array<{ path: (string | number | symbol)[]; message: string }> } };
};

type ZodSchema = z.ZodType<any, any, any>;

type Target = "body" | "query" | "params";

type ValidationConfig = {
  body?: SafeParseable | ZodSchema;
  query?: SafeParseable | ZodSchema;
  params?: SafeParseable | ZodSchema;
};

export function validate(config: ValidationConfig): (req: Request, _res: Response, next: NextFunction) => void;
export function validate(schema: SafeParseable | ZodSchema, target?: Target): (req: Request, _res: Response, next: NextFunction) => void;
export function validate(
  configOrSchema: ValidationConfig | SafeParseable | ZodSchema,
  target?: Target,
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Handle object config format: { body: schema, query: schema, params: schema }
    if (typeof configOrSchema === 'object' && !('safeParse' in configOrSchema) && !('parse' in configOrSchema)) {
      const config = configOrSchema;

      for (const [key, schema] of Object.entries(config)) {
        if (schema) {
          const result = (schema as SafeParseable).safeParse(req[key as Target]);
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
