/**
 * Authentication Routes
 *
 * Routes for user registration, login, and profile.
 */

import { Router } from 'express';
import { register, login, getProfile } from '@/controllers/auth.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Authenticate and get JWT token
 */
router.post('/login', login);

/**
 * GET /api/auth/me
 * Get current user profile (requires auth)
 */
router.get('/me', authMiddleware, getProfile);

export default router;
