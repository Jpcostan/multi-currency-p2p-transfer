/**
 * Transaction Repository
 *
 * Data access layer for transaction operations.
 * Handles all database interactions for the transactions table.
 *
 * Transactions are immutable records - once created, they cannot be modified.
 */

import Database from 'better-sqlite3';
import { getDatabase } from '@/config/database';
import {
  Transaction,
  TransactionRow,
  rowToTransaction,
  CreateTransactionInput,
} from '@/models/transaction.model';
import { TransactionStatus, TransactionType } from '@/types/transaction.types';
import { logger } from '@/utils/logger';
import { NotFoundError } from '@/utils/errors';
import { PaginationParams } from '@/types/common.types';

/**
 * Options for querying transaction history.
 */
export interface TransactionQueryOptions extends Partial<PaginationParams> {
  /** Filter by transaction type */
  type?: TransactionType;
  /** Filter by transaction status */
  status?: TransactionStatus;
}

/**
 * Result of a paginated transaction query.
 */
export interface TransactionQueryResult {
  transactions: Transaction[];
  total: number;
}

/**
 * Repository for transaction data access operations.
 */
export class TransactionRepository {
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
   * Create a new transaction record.
   *
   * @param input - Transaction creation data
   * @returns The created transaction
   */
  create(input: CreateTransactionInput): Transaction {
    const {
      senderId,
      receiverId,
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      conversionRate,
      type,
      status = 'completed',
    } = input;

    const stmt = this.db.prepare(`
      INSERT INTO transactions (
        sender_id, receiver_id, from_currency, to_currency,
        from_amount, to_amount, conversion_rate, status, type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      senderId,
      receiverId,
      fromCurrency,
      toCurrency,
      fromAmount.toString(),
      toAmount.toString(),
      conversionRate,
      status,
      type
    );

    const transactionId = result.lastInsertRowid as number;

    logger.info('Transaction created', {
      transactionId,
      type,
      senderId,
      receiverId,
      fromCurrency,
      toCurrency,
      fromAmount: fromAmount.toString(),
      toAmount: toAmount.toString(),
    });

    return this.getById(transactionId);
  }

  /**
   * Find a transaction by ID.
   *
   * @param id - Transaction ID
   * @returns Transaction if found, null otherwise
   */
  findById(id: number): Transaction | null {
    const stmt = this.db.prepare(`
      SELECT id, sender_id, receiver_id, from_currency, to_currency,
             from_amount, to_amount, conversion_rate, status, type, created_at
      FROM transactions
      WHERE id = ?
    `);

    const row = stmt.get(id) as TransactionRow | undefined;

    if (!row) {
      return null;
    }

    return rowToTransaction(row);
  }

  /**
   * Get a transaction by ID, throwing if not found.
   *
   * @param id - Transaction ID
   * @returns Transaction
   * @throws NotFoundError if transaction doesn't exist
   */
  getById(id: number): Transaction {
    const transaction = this.findById(id);

    if (!transaction) {
      throw new NotFoundError('Transaction', id);
    }

    return transaction;
  }

  /**
   * Get all transactions for a user (as sender or receiver).
   *
   * @param userId - User ID
   * @param options - Query options (pagination, filters)
   * @returns Paginated transaction results
   */
  findByUserId(
    userId: number,
    options: TransactionQueryOptions = {}
  ): TransactionQueryResult {
    const { limit = 20, offset = 0, type, status } = options;

    // Build WHERE clause dynamically
    const conditions: string[] = ['(sender_id = ? OR receiver_id = ?)'];
    const params: (number | string)[] = [userId, userId];

    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM transactions
      WHERE ${whereClause}
    `);
    const countResult = countStmt.get(...params) as { total: number };

    // Get paginated results
    const stmt = this.db.prepare(`
      SELECT id, sender_id, receiver_id, from_currency, to_currency,
             from_amount, to_amount, conversion_rate, status, type, created_at
      FROM transactions
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...params, limit, offset) as TransactionRow[];

    return {
      transactions: rows.map(rowToTransaction),
      total: countResult.total,
    };
  }

  /**
   * Get transactions where user is the sender.
   *
   * @param senderId - Sender user ID
   * @param options - Query options
   * @returns Array of transactions
   */
  findBySenderId(
    senderId: number,
    options: TransactionQueryOptions = {}
  ): Transaction[] {
    const { limit = 20, offset = 0 } = options;

    const stmt = this.db.prepare(`
      SELECT id, sender_id, receiver_id, from_currency, to_currency,
             from_amount, to_amount, conversion_rate, status, type, created_at
      FROM transactions
      WHERE sender_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(senderId, limit, offset) as TransactionRow[];
    return rows.map(rowToTransaction);
  }

  /**
   * Get transactions where user is the receiver.
   *
   * @param receiverId - Receiver user ID
   * @param options - Query options
   * @returns Array of transactions
   */
  findByReceiverId(
    receiverId: number,
    options: TransactionQueryOptions = {}
  ): Transaction[] {
    const { limit = 20, offset = 0 } = options;

    const stmt = this.db.prepare(`
      SELECT id, sender_id, receiver_id, from_currency, to_currency,
             from_amount, to_amount, conversion_rate, status, type, created_at
      FROM transactions
      WHERE receiver_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(receiverId, limit, offset) as TransactionRow[];
    return rows.map(rowToTransaction);
  }

  /**
   * Get recent transactions (system-wide).
   * Useful for admin monitoring.
   *
   * @param limit - Maximum number of transactions to return
   * @returns Array of recent transactions
   */
  findRecent(limit = 10): Transaction[] {
    const stmt = this.db.prepare(`
      SELECT id, sender_id, receiver_id, from_currency, to_currency,
             from_amount, to_amount, conversion_rate, status, type, created_at
      FROM transactions
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as TransactionRow[];
    return rows.map(rowToTransaction);
  }

  /**
   * Count transactions by type for a user.
   *
   * @param userId - User ID
   * @returns Object with counts by transaction type
   */
  countByTypeForUser(userId: number): Record<TransactionType, number> {
    const stmt = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM transactions
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY type
    `);

    const rows = stmt.all(userId, userId) as Array<{ type: string; count: number }>;

    const counts: Record<TransactionType, number> = {
      deposit: 0,
      transfer: 0,
      payment: 0,
    };

    for (const row of rows) {
      counts[row.type as TransactionType] = row.count;
    }

    return counts;
  }

  /**
   * Get total transaction count.
   *
   * @returns Total number of transactions
   */
  count(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM transactions`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Get transactions between two specific users.
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @param options - Query options
   * @returns Array of transactions between the two users
   */
  findBetweenUsers(
    userId1: number,
    userId2: number,
    options: TransactionQueryOptions = {}
  ): Transaction[] {
    const { limit = 20, offset = 0 } = options;

    const stmt = this.db.prepare(`
      SELECT id, sender_id, receiver_id, from_currency, to_currency,
             from_amount, to_amount, conversion_rate, status, type, created_at
      FROM transactions
      WHERE (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(userId1, userId2, userId2, userId1, limit, offset) as TransactionRow[];
    return rows.map(rowToTransaction);
  }
}

/**
 * Singleton instance for convenience.
 */
let instance: TransactionRepository | null = null;

export function getTransactionRepository(): TransactionRepository {
  if (!instance) {
    instance = new TransactionRepository();
  }
  return instance;
}

/**
 * Reset singleton (for testing).
 */
export function resetTransactionRepository(): void {
  instance = null;
}
