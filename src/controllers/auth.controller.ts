/**
 * Authentication Controller
 *
 * Handles user registration and login endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { getUserService } from '@/services/user.service';
import { CreateUserInput, LoginInput } from '@/models/user.model';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';
import { logger } from '@/utils/logger';

/**
 * POST /api/auth/register
 *
 * Register a new user account.
 *
 * Request body:
 * - email: string (valid email)
 * - username: string (3-30 chars, alphanumeric + underscore)
 * - password: string (8+ chars, mixed case + number)
 *
 * Response:
 * - 201: { user, token }
 * - 400: Validation error
 * - 409: Email/username already exists
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input: CreateUserInput = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
    };

    const userService = getUserService();
    const result = await userService.register(input);

    logger.info('User registered via API', { userId: result.user.id });

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 *
 * Authenticate a user and return a JWT token.
 *
 * Request body:
 * - identifier: string (email or username)
 * - password: string
 *
 * Response:
 * - 200: { user, token }
 * - 400: Validation error
 * - 401: Invalid credentials
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input: LoginInput = {
      identifier: req.body.identifier || req.body.email, // Support both
      password: req.body.password,
    };

    const userService = getUserService();
    const result = await userService.login(input);

    logger.info('User logged in via API', { userId: result.user.id });

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 *
 * Get the current authenticated user's profile.
 * Requires authentication.
 *
 * Response:
 * - 200: { user }
 * - 401: Not authenticated
 */
export function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // User is attached by auth middleware
    const userId = (req as AuthenticatedRequest).user.userId;

    const userService = getUserService();
    const user = userService.getUserById(userId);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}
