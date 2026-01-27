/**
 * Input Sanitization Middleware
 *
 * Sanitizes request body, query, and params to prevent XSS attacks.
 * Strips HTML tags and encodes special characters.
 */

import { Request, Response, NextFunction } from 'express';
import xss, { IFilterXSSOptions } from 'xss';

/**
 * XSS filter options - allow no tags, encode everything
 */
const xssOptions: IFilterXSSOptions = {
  whiteList: {}, // No allowed tags
  stripIgnoreTag: true, // Strip all tags
  stripIgnoreTagBody: ['script', 'style'], // Remove script/style content entirely
};

/**
 * Recursively sanitize a value.
 * - Strings: sanitize with XSS filter
 * - Objects: recursively sanitize all properties
 * - Arrays: sanitize each element
 * - Other types: return as-is
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return xss(value, xssOptions);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Middleware to sanitize request inputs against XSS attacks.
 *
 * Sanitizes:
 * - req.body
 * - req.query
 * - req.params
 *
 * @example
 * // In app.ts, after body parsing:
 * app.use(sanitizeInput);
 */
export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query) as typeof req.query;
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params) as typeof req.params;
  }

  next();
}

/**
 * Sanitize a single string value.
 * Useful for sanitizing individual values in controllers/services.
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 *
 * @example
 * const safeName = sanitizeString(userInput);
 */
export function sanitizeString(input: string): string {
  return xss(input, xssOptions);
}
