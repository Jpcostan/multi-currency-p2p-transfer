/**
 * Transaction Type Definitions
 *
 * Types related to financial transactions, transfers, and deposits.
 */

import { Currency } from './currency.types';

/**
 * Transaction status values.
 * - pending: Transaction initiated but not completed
 * - completed: Transaction successfully processed
 * - failed: Transaction failed (insufficient funds, etc.)
 */
export type TransactionStatus = 'pending' | 'completed' | 'failed';

/**
 * Transaction type values.
 * - deposit: User adding funds to their account
 * - transfer: P2P transfer between users
 * - payment: Alias for transfer (same logic)
 */
export type TransactionType = 'deposit' | 'transfer' | 'payment';

/**
 * Direction of transaction relative to the viewing user.
 */
export type TransactionDirection = 'incoming' | 'outgoing';

/**
 * Request payload for creating a transfer.
 */
export interface TransferRequest {
  /** Recipient's email address */
  recipientEmail: string;
  /** Currency to send from */
  fromCurrency: Currency;
  /** Currency recipient will receive */
  toCurrency: Currency;
  /** Amount in source currency (user-facing, e.g., 100.00) */
  amount: number;
}

/**
 * Request payload for making a deposit.
 */
export interface DepositRequest {
  /** Currency to deposit */
  currency: Currency;
  /** Amount to deposit (user-facing, e.g., 1000.00) */
  amount: number;
}

/**
 * Request payload for previewing a conversion.
 */
export interface ConversionPreviewRequest {
  /** Source currency */
  fromCurrency: Currency;
  /** Target currency */
  toCurrency: Currency;
  /** Amount in source currency */
  amount: number;
}

/**
 * Response for conversion preview.
 */
export interface ConversionPreviewResponse {
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
  toAmount: number;
  rate: number;
  inverseRate: number;
}

/**
 * Response for successful transfer.
 */
export interface TransferResponse {
  transactionId: number;
  sender: string;
  recipient: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
  toAmount: number;
  conversionRate: number;
  timestamp: string;
}

/**
 * Response for successful deposit.
 */
export interface DepositResponse {
  transactionId: number;
  currency: Currency;
  amount: number;
  newBalance: number;
}

/**
 * Transaction record for history display.
 */
export interface TransactionRecord {
  id: number;
  type: TransactionType;
  direction: TransactionDirection;
  counterparty: string | null;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
  toAmount: number;
  conversionRate: number;
  status: TransactionStatus;
  timestamp: string;
}

/**
 * Internal transaction data (database representation).
 * Amounts stored as integers (base units).
 */
export interface TransactionData {
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
