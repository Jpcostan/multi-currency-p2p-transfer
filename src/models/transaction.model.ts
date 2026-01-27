/**
 * Transaction Domain Model
 *
 * Represents a financial transaction (deposit, transfer, or payment).
 * Transactions are immutable records of all balance changes.
 */

import { z } from 'zod';
import { Currency, SUPPORTED_CURRENCIES } from '@/types/currency.types';
import {
  TransactionStatus,
  TransactionType,
  TransactionDirection,
  TransactionRecord,
} from '@/types/transaction.types';
import { fromBaseUnits } from '@/utils/currency';

/**
 * Transaction entity as stored in the database.
 * Amounts are stored as bigint (smallest currency unit).
 */
export interface Transaction {
  id: number;
  senderId: number;
  receiverId: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: bigint;
  toAmount: bigint;
  conversionRate: string;
  status: TransactionStatus;
  type: TransactionType;
  createdAt: Date;
}

/**
 * Raw transaction row from SQLite database.
 */
export interface TransactionRow {
  id: number;
  sender_id: number;
  receiver_id: number;
  from_currency: string;
  to_currency: string;
  from_amount: number | bigint;
  to_amount: number | bigint;
  conversion_rate: string;
  status: string;
  type: string;
  created_at: string;
}

/**
 * Data required to create a new transaction.
 */
export interface CreateTransactionInput {
  senderId: number;
  receiverId: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: bigint;
  toAmount: bigint;
  conversionRate: string;
  type: TransactionType;
  status?: TransactionStatus;
}

/**
 * Data for deposit operations.
 */
export interface DepositInput {
  currency: Currency;
  amount: number;
}

/**
 * Data for transfer operations.
 */
export interface TransferInput {
  recipientIdentifier: string; // Can be email or username
  fromCurrency: Currency;
  toCurrency: Currency;
  amount: number;
}

/**
 * Transaction DTO for API responses.
 */
export interface TransactionDTO {
  id: number;
  senderId: number;
  receiverId: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
  toAmount: number;
  conversionRate: number;
  status: TransactionStatus;
  type: TransactionType;
  createdAt: string;
}

/**
 * Zod schema for validating deposit request input.
 */
export const depositSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` }),
  }),

  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1_000_000_000, 'Amount exceeds maximum allowed'),
});

/**
 * Zod schema for validating transfer request input.
 */
export const transferSchema = z.object({
  recipientIdentifier: z
    .string()
    .min(1, 'Recipient email or username is required')
    .transform((val) => val.toLowerCase().trim()),

  fromCurrency: z.enum(SUPPORTED_CURRENCIES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` }),
  }),

  toCurrency: z.enum(SUPPORTED_CURRENCIES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` }),
  }),

  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1_000_000_000, 'Amount exceeds maximum allowed'),
});

/**
 * Zod schema for validating conversion preview request.
 */
export const conversionPreviewSchema = z.object({
  fromCurrency: z.enum(SUPPORTED_CURRENCIES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` }),
  }),

  toCurrency: z.enum(SUPPORTED_CURRENCIES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` }),
  }),

  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1_000_000_000, 'Amount exceeds maximum allowed'),
});

/**
 * Convert a database row to a Transaction entity.
 *
 * @param row - Raw database row
 * @returns Transaction entity with proper types
 */
export function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    fromCurrency: row.from_currency as Currency,
    toCurrency: row.to_currency as Currency,
    fromAmount: BigInt(row.from_amount),
    toAmount: BigInt(row.to_amount),
    conversionRate: row.conversion_rate,
    status: row.status as TransactionStatus,
    type: row.type as TransactionType,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Convert a Transaction entity to a DTO for API responses.
 *
 * @param transaction - Transaction entity
 * @returns Transaction DTO with amounts in display units
 */
export function transactionToDTO(transaction: Transaction): TransactionDTO {
  return {
    id: transaction.id,
    senderId: transaction.senderId,
    receiverId: transaction.receiverId,
    fromCurrency: transaction.fromCurrency,
    toCurrency: transaction.toCurrency,
    fromAmount: fromBaseUnits(transaction.fromAmount, transaction.fromCurrency),
    toAmount: fromBaseUnits(transaction.toAmount, transaction.toCurrency),
    conversionRate: parseFloat(transaction.conversionRate),
    status: transaction.status,
    type: transaction.type,
    createdAt: transaction.createdAt.toISOString(),
  };
}

/**
 * Convert a Transaction entity to a public record for API responses.
 *
 * @param transaction - Transaction entity
 * @param viewingUserId - ID of the user viewing this transaction
 * @param counterpartyUsername - Username of the other party (or null for deposits)
 * @returns Transaction record formatted for display
 */
export function transactionToRecord(
  transaction: Transaction,
  viewingUserId: number,
  counterpartyUsername: string | null
): TransactionRecord {
  // Determine direction relative to viewing user
  const direction: TransactionDirection =
    transaction.senderId === viewingUserId ? 'outgoing' : 'incoming';

  return {
    id: transaction.id,
    type: transaction.type,
    direction,
    counterparty: counterpartyUsername,
    fromCurrency: transaction.fromCurrency,
    toCurrency: transaction.toCurrency,
    fromAmount: fromBaseUnits(transaction.fromAmount, transaction.fromCurrency),
    toAmount: fromBaseUnits(transaction.toAmount, transaction.toCurrency),
    conversionRate: parseFloat(transaction.conversionRate),
    status: transaction.status,
    timestamp: transaction.createdAt.toISOString(),
  };
}
