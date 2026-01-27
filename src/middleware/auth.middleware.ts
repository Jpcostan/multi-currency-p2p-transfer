/**
 * Authentication Middleware
 *
 * JWT-based authentication middleware for protecting API routes.
 * Extracts and validates JWT tokens from Authorization header.
 */

import { Request, Response, NextFunction } from 'express';
import { getUserService, JWTPayload } from '@/services/user.service';
import { AuthenticationError } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * Extended Express Request with authenticated user data.
 */
export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

/**
 * Type guard to check if request is authenticated.
 */
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== undefined;
}

/**
 * Authentication middleware.
 *
 * Validates JWT token from Authorization header and attaches
 * user payload to request object.
 *
 * Expected header format: Authorization: Bearer <token>
 *
 * @throws AuthenticationError if token is missing or invalid
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('Authorization header is required');
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError('Invalid authorization format. Use: Bearer <token>');
    }

    const token = parts[1];
    if (!token) {
      throw new AuthenticationError('Token is required');
    }

    // Verify token and extract payload
    const userService = getUserService();
    const payload = userService.verifyToken(token);

    // Attach user to request
    (req as AuthenticatedRequest).user = payload;

    logger.debug('User authenticated', { userId: payload.userId });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware.
 *
 * Similar to authMiddleware but doesn't throw if token is missing.
 * Useful for routes that work with or without authentication.
 */
export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No auth header, continue without user
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format, continue without user
      return next();
    }

    const token = parts[1];
    if (!token) {
      return next();
    }

    // Try to verify token
    const userService = getUserService();
    const payload = userService.verifyToken(token);

    // Attach user to request
    (req as AuthenticatedRequest).user = payload;

    next();
  } catch {
    // Token invalid, continue without user
    next();
  }
}
