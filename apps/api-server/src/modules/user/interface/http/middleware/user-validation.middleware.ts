// modules/user/interface/http/middleware/user-validation.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Logger } from '@/shared/utils/logger';

const logger = Logger.getInstance('UserValidationMiddleware');

export function validateUserInput(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Attach validated data to request
      (req as any).validated = validated;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('User input validation failed', {
          errors: error.errors,
          path: req.path,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      next(error);
    }
  };
}