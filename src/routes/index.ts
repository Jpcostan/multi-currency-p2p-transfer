/**
 * Route Configuration
 *
 * Central routing configuration that mounts all API routes.
 */

import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import balanceRoutes from './balance.routes';
import transactionRoutes from './transaction.routes';
import { deposit } from '@/controllers/balance.controller';
import { getConversionRate } from '@/controllers/transaction.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();

/**
 * Health check routes (no auth required)
 * GET /health - Full health check
 * GET /health/live - Liveness probe
 * GET /health/ready - Readiness probe
 */
router.use('/health', healthRoutes);

/**
 * Authentication routes
 * POST /api/auth/register - Register new user
 * POST /api/auth/login - Login and get JWT
 * GET /api/auth/me - Get current user profile
 */
router.use('/api/auth', authRoutes);

/**
 * Balance routes (all require auth)
 * GET /api/balances - Get all balances
 * GET /api/balances/:currency - Get balance for currency
 */
router.use('/api/balances', balanceRoutes);

/**
 * Deposit route (requires auth)
 * POST /api/deposit - Deposit funds
 */
router.post('/api/deposit', authMiddleware, deposit);

/**
 * Transaction routes
 * POST /api/transfer - Transfer funds
 * GET /api/transactions - Transaction history
 * GET /api/transactions/stats - Transaction statistics
 * GET /api/transactions/:id - Get transaction by ID
 * GET /api/convert/preview - Preview conversion
 */
router.use('/api', transactionRoutes);

/**
 * Conversion rate route (public, no auth)
 * GET /api/rates?from=USD&to=EUR - Get conversion rate
 */
router.get('/api/rates', getConversionRate);

export default router;
