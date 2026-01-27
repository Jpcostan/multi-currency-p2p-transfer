/**
 * Balance Repository
 *
 * Data access layer for balance operations.
 * Handles all database interactions for the balances table.
 *
 * CRITICAL: All balance modifications should occur within transactions
 * to ensure atomicity and prevent race conditions.
 */

import Database from 'better-sqlite3';
import { getDatabase } from '@/config/database';
import { Balance, BalanceRow, rowToBalance, getAllCurrencies } from '@/models/balance.model';
import { Currency } from '@/types/currency.types';
import { logger } from '@/utils/logger';
import { NotFoundError, InsufficientBalanceError } from '@/utils/errors';

/**
 * Repository for balance data access operations.
 */
export class BalanceRepository {
  private _db?: Database.Database;

  constructor(database?: Database.Database) {
    this._db = database;
  }

  /**
   * Get the database instance.
   * If not explicitly provided, uses the singleton from getDatabase().
   */
  private get db(): Database.Database {
    return this._db || getDatabase();
  }

  /**
   * Initialize all currency balances for a new user.
   * Creates a balance record for each supported currency with amount 0.
   *
   * @param userId - ID of the user to initialize balances for
   */
  initializeForUser(userId: number): void {
    const currencies = getAllCurrencies();
    const stmt = this.db.prepare(`
      INSERT INTO balances (user_id, currency, amount)
      VALUES (?, ?, 0)
    `);

    for (const currency of currencies) {
      stmt.run(userId, currency);
    }

    logger.info('Balances initialized for user', { userId, currencies });
  }

  /**
   * Get all balances for a user.
   *
   * @param userId - User ID
   * @returns Array of balance records
   */
  findAllByUserId(userId: number): Balance[] {
    const stmt = this.db.prepare(`
      SELECT id, user_id, currency, amount, created_at, updated_at
      FROM balances
      WHERE user_id = ?
      ORDER BY currency
    `);

    const rows = stmt.all(userId) as BalanceRow[];
    return rows.map(rowToBalance);
  }

  /**
   * Get a specific currency balance for a user.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @returns Balance if found, null otherwise
   */
  findByUserAndCurrency(userId: number, currency: Currency): Balance | null {
    const stmt = this.db.prepare(`
      SELECT id, user_id, currency, amount, created_at, updated_at
      FROM balances
      WHERE user_id = ? AND currency = ?
    `);

    const row = stmt.get(userId, currency) as BalanceRow | undefined;

    if (!row) {
      return null;
    }

    return rowToBalance(row);
  }

  /**
   * Get a specific currency balance, throwing if not found.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @returns Balance
   * @throws NotFoundError if balance doesn't exist
   */
  getByUserAndCurrency(userId: number, currency: Currency): Balance {
    const balance = this.findByUserAndCurrency(userId, currency);

    if (!balance) {
      throw new NotFoundError(`Balance for ${currency}`, userId);
    }

    return balance;
  }

  /**
   * Add amount to a user's balance.
   * Used for deposits and receiving transfers.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @param amount - Amount to add (in base units)
   * @returns Updated balance
   * @throws NotFoundError if balance doesn't exist
   */
  credit(userId: number, currency: Currency, amount: bigint): Balance {
    if (amount <= 0n) {
      throw new Error('Credit amount must be positive');
    }

    const stmt = this.db.prepare(`
      UPDATE balances
      SET amount = amount + ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND currency = ?
    `);

    const result = stmt.run(amount.toString(), userId, currency);

    if (result.changes === 0) {
      throw new NotFoundError(`Balance for ${currency}`, userId);
    }

    logger.debug('Balance credited', { userId, currency, amount: amount.toString() });

    return this.getByUserAndCurrency(userId, currency);
  }

  /**
   * Subtract amount from a user's balance.
   * Used for sending transfers.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @param amount - Amount to subtract (in base units)
   * @returns Updated balance
   * @throws NotFoundError if balance doesn't exist
   * @throws InsufficientBalanceError if balance is too low
   */
  debit(userId: number, currency: Currency, amount: bigint): Balance {
    if (amount <= 0n) {
      throw new Error('Debit amount must be positive');
    }

    // First check current balance
    const currentBalance = this.getByUserAndCurrency(userId, currency);

    if (currentBalance.amount < amount) {
      throw new InsufficientBalanceError(
        currency,
        Number(amount),
        Number(currentBalance.amount)
      );
    }

    const stmt = this.db.prepare(`
      UPDATE balances
      SET amount = amount - ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND currency = ? AND amount >= ?
    `);

    const result = stmt.run(
      amount.toString(),
      userId,
      currency,
      amount.toString()
    );

    // Double-check the update happened (race condition protection)
    if (result.changes === 0) {
      throw new InsufficientBalanceError(
        currency,
        Number(amount),
        Number(currentBalance.amount)
      );
    }

    logger.debug('Balance debited', { userId, currency, amount: amount.toString() });

    return this.getByUserAndCurrency(userId, currency);
  }

  /**
   * Set a balance to a specific amount.
   * Used primarily for testing or admin corrections.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @param amount - New balance amount (in base units)
   * @returns Updated balance
   */
  setAmount(userId: number, currency: Currency, amount: bigint): Balance {
    if (amount < 0n) {
      throw new Error('Balance cannot be negative');
    }

    const stmt = this.db.prepare(`
      UPDATE balances
      SET amount = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND currency = ?
    `);

    const result = stmt.run(amount.toString(), userId, currency);

    if (result.changes === 0) {
      throw new NotFoundError(`Balance for ${currency}`, userId);
    }

    return this.getByUserAndCurrency(userId, currency);
  }

  /**
   * Create or update a balance record (upsert).
   * If balance exists, updates it; otherwise creates it.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @param amount - Balance amount (in base units)
   * @returns The balance record
   */
  upsert(userId: number, currency: Currency, amount: bigint): Balance {
    const stmt = this.db.prepare(`
      INSERT INTO balances (user_id, currency, amount)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, currency)
      DO UPDATE SET amount = excluded.amount, updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(userId, currency, amount.toString());

    return this.getByUserAndCurrency(userId, currency);
  }

  /**
   * Check if user has sufficient balance for a transaction.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @param requiredAmount - Required amount (in base units)
   * @returns true if balance is sufficient
   */
  hasSufficientBalance(userId: number, currency: Currency, requiredAmount: bigint): boolean {
    const balance = this.findByUserAndCurrency(userId, currency);

    if (!balance) {
      return false;
    }

    return balance.amount >= requiredAmount;
  }

  /**
   * Get total balance across all users for a currency.
   * Useful for system-wide metrics.
   *
   * @param currency - Currency code
   * @returns Total balance in base units
   */
  getTotalByCurrency(currency: Currency): bigint {
    const stmt = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM balances
      WHERE currency = ?
    `);

    const result = stmt.get(currency) as { total: number | bigint };
    return BigInt(result.total);
  }
}

/**
 * Singleton instance for convenience.
 */
let instance: BalanceRepository | null = null;

export function getBalanceRepository(): BalanceRepository {
  if (!instance) {
    instance = new BalanceRepository();
  }
  return instance;
}

/**
 * Reset singleton (for testing).
 */
export function resetBalanceRepository(): void {
  instance = null;
}
