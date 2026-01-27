/**
 * Error Handling Middleware
 *
 * Global error handler that catches all errors and returns
 * consistent API error responses.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '@/utils/logger';
import { isAppError } from '@/utils/errors';
import { ApiErrorResponse } from '@/types/common.types';

/**
 * Format Zod validation errors into a readable structure.
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.errors) {
    const path = issue.path.join('.') || 'value';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Global error handling middleware.
 *
 * Catches all errors thrown in route handlers and middleware,
 * logs them appropriately, and returns consistent error responses.
 *
 * Error types handled:
 * - AppError (custom application errors)
 * - ZodError (validation errors)
 * - Generic Error (unexpected errors)
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  const logContext = {
    method: req.method,
    path: req.path,
    body: req.body,
    error: err.message,
    stack: err.stack,
  };

  // Handle known application errors
  if (isAppError(err)) {
    // Log at appropriate level based on status code
    if (err.statusCode >= 500) {
      logger.error('Application error', logContext);
    } else {
      logger.warn('Client error', { ...logContext, code: err.code });
    }

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    logger.warn('Validation error', { ...logContext, issues: err.errors });

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { fields: formatZodErrors(err) },
      },
    };

    res.status(400).json(response);
    return;
  }

  // Handle unexpected errors (don't expose internal details)
  logger.error('Unexpected error', logContext);

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'An unexpected error occurred',
    },
  };

  res.status(500).json(response);
};

/**
 * 404 Not Found handler for unmatched routes.
 */
export const notFoundHandler = (
  req: Request,
  res: Response
): void => {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  };

  res.status(404).json(response);
};

/**
 * Async route handler wrapper.
 * Catches promise rejections and passes them to the error handler.
 *
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.getAll();
 *   res.json({ success: true, data: users });
 * }));
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
