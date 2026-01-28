/**
 * Authentication Routes
 *
 * Routes for user registration, login, and profile.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getProfile } from '@/controllers/auth.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();

/**
 * Stricter rate limiter for auth endpoints to prevent brute force attacks.
 * - 10 attempts per 15 minutes for login/register
 * - Much stricter than the global 100 req/min limit
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', authRateLimiter, register);

/**
 * POST /api/auth/login
 * Authenticate and get JWT token
 */
router.post('/login', authRateLimiter, login);

/**
 * GET /api/auth/me
 * Get current user profile (requires auth)
 */
router.get('/me', authMiddleware, getProfile);

export default router;
