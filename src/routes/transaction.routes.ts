/**
 * Transaction Routes
 *
 * Routes for transfers, transaction history, and conversion previews.
 */

import { Router } from 'express';
import {
  transfer,
  getTransactionHistory,
  getTransaction,
  previewConversion,
  getTransactionStats,
} from '@/controllers/transaction.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();

/**
 * GET /api/rates
 * Get conversion rate (public, no auth required)
 * Mounted at /api/rates in index.ts
 */

/**
 * GET /api/convert/preview
 * Preview a conversion (requires auth)
 */
router.get('/convert/preview', authMiddleware, previewConversion);

/**
 * POST /api/transfer
 * Transfer funds to another user (requires auth)
 */
router.post('/transfer', authMiddleware, transfer);

/**
 * GET /api/transactions
 * Get transaction history (requires auth)
 */
router.get('/transactions', authMiddleware, getTransactionHistory);

/**
 * GET /api/transactions/stats
 * Get transaction statistics (requires auth)
 * Note: This must come before /:id to avoid conflict
 */
router.get('/transactions/stats', authMiddleware, getTransactionStats);

/**
 * GET /api/transactions/:id
 * Get a specific transaction (requires auth)
 */
router.get('/transactions/:id', authMiddleware, getTransaction);

export default router;
