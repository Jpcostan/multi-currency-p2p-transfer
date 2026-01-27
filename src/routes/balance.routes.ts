/**
 * Balance Routes
 *
 * Routes for viewing balances and depositing funds.
 */

import { Router } from 'express';
import { getAllBalances, getBalance } from '@/controllers/balance.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();

// All balance routes require authentication
router.use(authMiddleware);

/**
 * GET /api/balances
 * Get all balances for the authenticated user
 */
router.get('/', getAllBalances);

/**
 * GET /api/balances/:currency
 * Get balance for a specific currency
 */
router.get('/:currency', getBalance);

/**
 * POST /api/deposit
 * Deposit funds into account
 * Note: This is mounted at /api/deposit, not /api/balances/deposit
 */
// Deposit is handled separately in index.ts

export default router;
