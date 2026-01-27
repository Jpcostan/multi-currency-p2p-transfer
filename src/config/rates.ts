/**
 * Currency Conversion Rates Configuration
 *
 * Hardcoded exchange rates for the P2P payment system.
 * In a production system, these would come from an external API
 * (e.g., CoinGecko, Open Exchange Rates).
 *
 * Rate format: CONVERSION_RATES['FROM_TO'] = rate
 * Meaning: 1 FROM = rate TO
 */

import { Currency, isValidCurrency } from '@/types/currency.types';

/**
 * Static conversion rates between all supported currency pairs.
 *
 * Rates are approximate and for demonstration purposes:
 * - BTC @ ~$25,000
 * - ETH @ ~$3,333
 * - EUR/USD @ ~1.10
 */
export const CONVERSION_RATES: Record<string, number> = {
  // === Fiat to Crypto ===
  USD_BTC: 0.00004,     // 1 USD = 0.00004 BTC ($25,000/BTC)
  USD_ETH: 0.0003,      // 1 USD = 0.0003 ETH ($3,333/ETH)
  EUR_BTC: 0.000044,    // 1 EUR = 0.000044 BTC
  EUR_ETH: 0.00033,     // 1 EUR = 0.00033 ETH

  // === Fiat to Fiat ===
  USD_EUR: 0.91,        // 1 USD = 0.91 EUR
  EUR_USD: 1.10,        // 1 EUR = 1.10 USD

  // === Crypto to Fiat ===
  BTC_USD: 25000,       // 1 BTC = $25,000
  BTC_EUR: 22727,       // 1 BTC = 22,727 EUR
  ETH_USD: 3333,        // 1 ETH = $3,333
  ETH_EUR: 3030,        // 1 ETH = 3,030 EUR

  // === Crypto to Crypto ===
  BTC_ETH: 7.5,         // 1 BTC = 7.5 ETH
  ETH_BTC: 0.133,       // 1 ETH = 0.133 BTC

  // === Identity (same currency) ===
  USD_USD: 1,
  EUR_EUR: 1,
  BTC_BTC: 1,
  ETH_ETH: 1,
};

/**
 * Get the conversion rate between two currencies.
 *
 * @param from - Source currency code
 * @param to - Target currency code
 * @returns The conversion rate (1 from = rate to)
 * @throws Error if the currency pair is not supported
 *
 * @example
 * const rate = getConversionRate('USD', 'BTC');
 * // rate = 0.00004 (1 USD = 0.00004 BTC)
 */
export function getConversionRate(from: Currency, to: Currency): number {
  const key = `${from}_${to}`;
  const rate = CONVERSION_RATES[key];

  if (rate === undefined) {
    throw new Error(`Conversion rate not found for ${from} to ${to}`);
  }

  return rate;
}

/**
 * Convert an amount from one currency to another.
 *
 * @param amount - Amount in source currency (user-facing value)
 * @param from - Source currency code
 * @param to - Target currency code
 * @returns Converted amount in target currency (user-facing value)
 *
 * @example
 * const btcAmount = convertCurrency(100, 'USD', 'BTC');
 * // btcAmount = 0.004 (100 USD = 0.004 BTC)
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  const rate = getConversionRate(from, to);
  return amount * rate;
}

/**
 * Get the inverse rate for a currency pair.
 * Useful for displaying "1 BTC = $25,000" alongside "1 USD = 0.00004 BTC".
 *
 * @param from - Source currency code
 * @param to - Target currency code
 * @returns The inverse rate (1 to = inverseRate from)
 */
export function getInverseRate(from: Currency, to: Currency): number {
  const rate = getConversionRate(from, to);
  return 1 / rate;
}

/**
 * Validate that a currency pair conversion is supported.
 *
 * @param from - Source currency code
 * @param to - Target currency code
 * @returns true if the conversion is supported
 */
export function isConversionSupported(from: string, to: string): boolean {
  if (!isValidCurrency(from) || !isValidCurrency(to)) {
    return false;
  }
  const key = `${from}_${to}`;
  return key in CONVERSION_RATES;
}
