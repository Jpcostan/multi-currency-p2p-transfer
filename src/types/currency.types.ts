/**
 * Currency Type Definitions
 *
 * Core types for multi-currency support including fiat (USD, EUR)
 * and cryptocurrency (BTC, ETH).
 */

/**
 * Supported currency codes.
 * - USD: US Dollar
 * - EUR: Euro
 * - BTC: Bitcoin
 * - ETH: Ethereum
 */
export type Currency = 'USD' | 'EUR' | 'BTC' | 'ETH';

/**
 * Array of all supported currencies for iteration/validation.
 */
export const SUPPORTED_CURRENCIES: readonly Currency[] = [
  'USD',
  'EUR',
  'BTC',
  'ETH',
] as const;

/**
 * Currency precision configuration.
 * Defines the smallest unit multiplier for each currency.
 *
 * - USD/EUR: 100 (cents)
 * - BTC: 100,000,000 (satoshis)
 * - ETH: Uses string for BigInt conversion (wei = 10^18)
 */
export const CURRENCY_PRECISION: Record<Currency, number | bigint> = {
  USD: 100,                    // 1 USD = 100 cents
  EUR: 100,                    // 1 EUR = 100 cents
  BTC: 100_000_000,            // 1 BTC = 100,000,000 satoshis
  ETH: BigInt('1000000000000000000'), // 1 ETH = 10^18 wei
};

/**
 * Display precision (decimal places) for each currency.
 * Used when formatting amounts for user display.
 */
export const CURRENCY_DISPLAY_DECIMALS: Record<Currency, number> = {
  USD: 2,
  EUR: 2,
  BTC: 8,
  ETH: 18,
};

/**
 * Currency category for business logic differentiation.
 */
export type CurrencyType = 'fiat' | 'crypto';

/**
 * Mapping of currencies to their category.
 */
export const CURRENCY_TYPE: Record<Currency, CurrencyType> = {
  USD: 'fiat',
  EUR: 'fiat',
  BTC: 'crypto',
  ETH: 'crypto',
};

/**
 * Currency symbols for display purposes.
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '\u20AC', // Euro sign
  BTC: '\u20BF', // Bitcoin sign
  ETH: '\u039E', // Greek capital Xi (commonly used for ETH)
};

/**
 * Check if a string is a valid currency code.
 */
export function isValidCurrency(value: string): value is Currency {
  return SUPPORTED_CURRENCIES.includes(value as Currency);
}
