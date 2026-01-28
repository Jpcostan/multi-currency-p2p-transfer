/**
 * Balance Domain Model
 *
 * Represents a user's balance in a specific currency.
 * All amounts are stored as integers in the smallest currency unit
 * (cents for fiat, satoshis for BTC, wei for ETH).
 */

import { z } from 'zod';
import { Currency, SUPPORTED_CURRENCIES, toCurrency } from '@/types/currency.types';
import { fromBaseUnits } from '@/utils/currency';

/**
 * Balance entity as stored in the database.
 * Amount is stored as bigint (smallest currency unit).
 */
export interface Balance {
  id: number;
  userId: number;
  currency: Currency;
  amount: bigint;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Balance data for public API responses.
 * Amount is converted to user-friendly decimal format.
 */
export interface BalanceDTO {
  currency: Currency;
  amount: number;
  formatted: string;
}

/**
 * Raw balance row from SQLite database.
 */
export interface BalanceRow {
  id: number;
  user_id: number;
  currency: string;
  amount: number | bigint;
  created_at: string;
  updated_at: string;
}

/**
 * Data required to update a balance.
 */
export interface UpdateBalanceInput {
  userId: number;
  currency: Currency;
  amount: bigint;
}

/**
 * Zod schema for validating deposit input.
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
 * Convert a database row to a Balance entity.
 *
 * @param row - Raw database row
 * @returns Balance entity with proper types
 */
export function rowToBalance(row: BalanceRow): Balance {
  return {
    id: row.id,
    userId: row.user_id,
    currency: toCurrency(row.currency),
    amount: BigInt(row.amount),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert a Balance entity to a public DTO.
 * Converts the internal bigint amount to a user-friendly decimal.
 *
 * @param balance - Balance entity
 * @returns Public balance data with formatted amount
 */
export function balanceToDTO(balance: Balance): BalanceDTO {
  const amount = fromBaseUnits(balance.amount, balance.currency);

  return {
    currency: balance.currency,
    amount,
    formatted: formatBalanceDisplay(amount, balance.currency),
  };
}

/**
 * Format a balance amount for display.
 *
 * @param amount - Amount in user-facing units
 * @param currency - Currency code
 * @returns Formatted string (e.g., "$100.50", "0.00100000 BTC")
 */
function formatBalanceDisplay(amount: number, currency: Currency): string {
  const symbols: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    BTC: 'BTC',
    ETH: 'ETH',
  };

  const decimals: Record<Currency, number> = {
    USD: 2,
    EUR: 2,
    GBP: 2,
    BTC: 8,
    ETH: 8, // Display 8 decimals for ETH (not full 18)
  };

  const formatted = amount.toFixed(decimals[currency]);

  if (currency === 'USD') {
    return `$${formatted}`;
  } else if (currency === 'EUR') {
    return `€${formatted}`;
  } else {
    return `${formatted} ${symbols[currency]}`;
  }
}

/**
 * Get all supported currencies for initializing user balances.
 *
 * @returns Array of all supported currency codes
 */
export function getAllCurrencies(): Currency[] {
  return [...SUPPORTED_CURRENCIES];
}
