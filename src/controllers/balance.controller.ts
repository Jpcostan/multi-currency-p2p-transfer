/**
 * Balance Controller
 *
 * Handles balance-related endpoints including viewing balances
 * and depositing funds.
 */

import { Request, Response, NextFunction } from 'express';
import { getBalanceService } from '@/services/balance.service';
import { getTransactionService } from '@/services/transaction.service';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';
import { Currency } from '@/types/currency.types';
import { logger } from '@/utils/logger';

/**
 * GET /api/balances
 *
 * Get all balances for the authenticated user.
 * Requires authentication.
 *
 * Response:
 * - 200: { balances: BalanceSummary[] }
 * - 401: Not authenticated
 */
export function getAllBalances(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;

    const balanceService = getBalanceService();
    const result = balanceService.getAllBalances(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/balances/:currency
 *
 * Get balance for a specific currency.
 * Requires authentication.
 *
 * Params:
 * - currency: Currency code (USD, EUR, BTC, ETH)
 *
 * Response:
 * - 200: { balance: BalanceSummary }
 * - 400: Invalid currency
 * - 401: Not authenticated
 */
export function getBalance(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    const currency = (req.params.currency as string).toUpperCase() as Currency;

    const balanceService = getBalanceService();
    const balance = balanceService.getBalance(userId, currency);

    res.status(200).json({
      success: true,
      data: { balance },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/deposit
 *
 * Deposit funds into the authenticated user's account.
 * Requires authentication.
 *
 * Request body:
 * - currency: Currency code (USD, EUR, BTC, ETH)
 * - amount: number (positive)
 *
 * Response:
 * - 201: { transaction, newBalance }
 * - 400: Validation error
 * - 401: Not authenticated
 */
export function deposit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;

    const transactionService = getTransactionService();
    const result = transactionService.deposit(userId, {
      currency: req.body.currency?.toUpperCase() as Currency,
      amount: req.body.amount,
    });

    logger.info('Deposit completed via API', {
      userId,
      currency: req.body.currency,
      amount: req.body.amount,
      transactionId: result.transaction.id,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
