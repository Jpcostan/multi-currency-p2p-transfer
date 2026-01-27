/**
 * Transaction Controller
 *
 * Handles transaction-related endpoints including transfers,
 * transaction history, and conversion previews.
 */

import { Request, Response, NextFunction } from 'express';
import { getTransactionService } from '@/services/transaction.service';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';
import { Currency } from '@/types/currency.types';
import { TransactionType } from '@/types/transaction.types';
import { logger } from '@/utils/logger';

/**
 * POST /api/transfer
 *
 * Transfer funds to another user with optional currency conversion.
 * Requires authentication.
 *
 * Request body:
 * - recipientIdentifier: string (email or username)
 * - fromCurrency: Currency code
 * - toCurrency: Currency code
 * - amount: number (positive)
 *
 * Response:
 * - 201: { transaction, sender, recipient }
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Recipient not found
 * - 422: Insufficient balance or business rule violation
 */
export function transfer(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const senderId = (req as AuthenticatedRequest).user.userId;

    const transactionService = getTransactionService();
    const result = transactionService.transfer(senderId, {
      recipientIdentifier: req.body.recipientIdentifier || req.body.recipient,
      fromCurrency: req.body.fromCurrency?.toUpperCase() as Currency,
      toCurrency: req.body.toCurrency?.toUpperCase() as Currency,
      amount: req.body.amount,
    });

    logger.info('Transfer completed via API', {
      senderId,
      recipientUsername: result.recipient.username,
      fromCurrency: req.body.fromCurrency,
      toCurrency: req.body.toCurrency,
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

/**
 * GET /api/transactions
 *
 * Get transaction history for the authenticated user.
 * Requires authentication.
 *
 * Query params:
 * - limit: number (default 20)
 * - offset: number (default 0)
 * - type: TransactionType filter (optional)
 *
 * Response:
 * - 200: { transactions, pagination }
 * - 401: Not authenticated
 */
export function getTransactionHistory(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as TransactionType | undefined;

    const transactionService = getTransactionService();
    const result = transactionService.getTransactionHistory(userId, {
      limit,
      offset,
      type,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transactions/:id
 *
 * Get a specific transaction by ID.
 * Requires authentication. User must be sender or receiver.
 *
 * Params:
 * - id: Transaction ID
 *
 * Response:
 * - 200: { transaction }
 * - 401: Not authenticated
 * - 404: Transaction not found
 * - 422: Not authorized to view transaction
 */
export function getTransaction(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    const transactionId = parseInt(req.params.id as string);

    if (isNaN(transactionId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid transaction ID',
        },
      });
      return;
    }

    const transactionService = getTransactionService();
    const transaction = transactionService.getTransaction(transactionId, userId);

    res.status(200).json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/convert/preview
 *
 * Preview a currency conversion without executing it.
 * Requires authentication.
 *
 * Query params:
 * - from: Source currency code
 * - to: Target currency code
 * - amount: Amount to convert
 *
 * Response:
 * - 200: { conversion preview }
 * - 400: Validation error
 * - 401: Not authenticated
 */
export function previewConversion(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const fromCurrency = (req.query.from as string)?.toUpperCase() as Currency;
    const toCurrency = (req.query.to as string)?.toUpperCase() as Currency;
    const amount = parseFloat(req.query.amount as string);

    if (isNaN(amount)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid amount',
        },
      });
      return;
    }

    const transactionService = getTransactionService();
    const preview = transactionService.previewConversion(fromCurrency, toCurrency, amount);

    res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/rates
 *
 * Get current conversion rate between two currencies.
 * Public endpoint (no authentication required).
 *
 * Query params:
 * - from: Source currency code
 * - to: Target currency code
 *
 * Response:
 * - 200: { from, to, rate }
 * - 400: Validation error
 */
export function getConversionRate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const fromCurrency = (req.query.from as string)?.toUpperCase() as Currency;
    const toCurrency = (req.query.to as string)?.toUpperCase() as Currency;

    const transactionService = getTransactionService();
    const rate = transactionService.getConversionRate(fromCurrency, toCurrency);

    res.status(200).json({
      success: true,
      data: {
        from: fromCurrency,
        to: toCurrency,
        rate,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transactions/stats
 *
 * Get transaction statistics for the authenticated user.
 * Requires authentication.
 *
 * Response:
 * - 200: { deposit: number, transfer: number, payment: number }
 * - 401: Not authenticated
 */
export function getTransactionStats(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;

    const transactionService = getTransactionService();
    const stats = transactionService.getTransactionStats(userId);

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
}
