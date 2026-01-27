/**
 * Currency Utility Functions
 *
 * Handles conversion between user-facing amounts (e.g., 100.50 USD)
 * and database storage units (e.g., 10050 cents).
 *
 * CRITICAL: All financial calculations use integers to avoid
 * floating-point precision errors.
 */

import {
  Currency,
  CURRENCY_PRECISION,
  CURRENCY_DISPLAY_DECIMALS,
  CURRENCY_SYMBOLS,
} from '@/types/currency.types';

/**
 * Convert a user-facing amount to base units for storage.
 *
 * @param amount - User-facing amount (e.g., 100.50)
 * @param currency - Currency code
 * @returns Amount in base units as bigint (e.g., 10050n for cents)
 *
 * @example
 * toBaseUnits(100.50, 'USD')  // Returns 10050n (cents)
 * toBaseUnits(0.001, 'BTC')   // Returns 100000n (satoshis)
 * toBaseUnits(1.5, 'ETH')     // Returns 1500000000000000000n (wei)
 */
export function toBaseUnits(amount: number, currency: Currency): bigint {
  const precision = CURRENCY_PRECISION[currency];

  if (typeof precision === 'bigint') {
    // For ETH (wei), use BigInt arithmetic
    // Multiply by precision, handling decimal conversion carefully
    const decimals = CURRENCY_DISPLAY_DECIMALS[currency];
    const multiplier = Math.pow(10, decimals);
    const scaledAmount = BigInt(Math.round(amount * multiplier));
    const scaleFactor = precision / BigInt(multiplier);
    return scaledAmount * scaleFactor;
  }

  // For other currencies, standard integer conversion
  return BigInt(Math.round(amount * precision));
}

/**
 * Convert base units from storage to user-facing amount.
 *
 * @param baseUnits - Amount in base units (e.g., 10050n)
 * @param currency - Currency code
 * @returns User-facing amount (e.g., 100.50)
 *
 * @example
 * fromBaseUnits(10050n, 'USD')  // Returns 100.50
 * fromBaseUnits(100000n, 'BTC') // Returns 0.001
 */
export function fromBaseUnits(baseUnits: bigint, currency: Currency): number {
  const precision = CURRENCY_PRECISION[currency];

  if (typeof precision === 'bigint') {
    // For ETH (wei), convert carefully to avoid precision loss
    // This will lose precision for very small amounts
    return Number(baseUnits) / Number(precision);
  }

  return Number(baseUnits) / precision;
}

/**
 * Format an amount for display with proper decimal places.
 *
 * @param amount - User-facing amount
 * @param currency - Currency code
 * @param includeSymbol - Whether to include currency symbol
 * @returns Formatted string (e.g., "$100.50" or "0.00100000 BTC")
 *
 * @example
 * formatAmount(100.5, 'USD', true)   // Returns "$100.50"
 * formatAmount(0.001, 'BTC', false)  // Returns "0.00100000"
 */
export function formatAmount(
  amount: number,
  currency: Currency,
  includeSymbol = false
): string {
  const decimals = CURRENCY_DISPLAY_DECIMALS[currency];
  const formatted = amount.toFixed(decimals);

  if (includeSymbol) {
    const symbol = CURRENCY_SYMBOLS[currency];
    // Put symbol before for fiat, after for crypto
    if (currency === 'USD' || currency === 'EUR') {
      return `${symbol}${formatted}`;
    }
    return `${formatted} ${symbol}`;
  }

  return formatted;
}

/**
 * Validate that an amount is positive and finite.
 *
 * @param amount - Amount to validate
 * @returns true if amount is valid for transactions
 */
export function isValidAmount(amount: number): boolean {
  return (
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount > 0
  );
}

/**
 * Round an amount to the appropriate precision for a currency.
 *
 * @param amount - Amount to round
 * @param currency - Currency code
 * @returns Rounded amount
 */
export function roundToPrecision(amount: number, currency: Currency): number {
  const decimals = CURRENCY_DISPLAY_DECIMALS[currency];
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/**
 * Compare two base unit amounts safely.
 *
 * @param a - First amount
 * @param b - Second amount
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareBaseUnits(a: bigint, b: bigint): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check if balance is sufficient for a transaction.
 *
 * @param balance - Current balance in base units
 * @param required - Required amount in base units
 * @returns true if balance >= required
 */
export function hasSufficientBalance(balance: bigint, required: bigint): boolean {
  return balance >= required;
}
