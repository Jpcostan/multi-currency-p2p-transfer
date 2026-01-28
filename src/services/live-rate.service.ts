/**
 * Live Rate Service
 *
 * Fetches real-time exchange rates from CoinGecko API.
 * Includes caching to avoid rate limiting and fallback to hardcoded rates.
 */

import { Currency } from '@/types/currency.types';
import { CONVERSION_RATES } from '@/config/rates';
import { logger } from '@/utils/logger';

// CoinGecko API endpoint (free, no API key required)
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Currency mappings for CoinGecko
const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
};

const FIAT_CODES: Record<string, string> = {
  USD: 'usd',
  EUR: 'eur',
  GBP: 'gbp',
};

// Cache structure
interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

let rateCache: CachedRates | null = null;

/**
 * Fetch prices from CoinGecko API
 */
async function fetchFromCoinGecko(): Promise<Record<string, Record<string, number>>> {
  const cryptoIds = Object.values(CRYPTO_IDS).join(',');
  const fiatCodes = Object.values(FIAT_CODES).join(',');

  const url = `${COINGECKO_API}?ids=${cryptoIds}&vs_currencies=${fiatCodes}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<Record<string, Record<string, number>>>;
}

/**
 * Build rate lookup table from CoinGecko response
 */
function buildRateTable(data: Record<string, Record<string, number>>): Record<string, number> {
  const rates: Record<string, number> = {};

  // Crypto to Fiat rates
  for (const [cryptoCode, cryptoId] of Object.entries(CRYPTO_IDS)) {
    const cryptoPrices = data[cryptoId];
    if (!cryptoPrices) continue;

    for (const [fiatCode, fiatId] of Object.entries(FIAT_CODES)) {
      const price = cryptoPrices[fiatId];
      if (price) {
        // 1 BTC = X USD
        rates[`${cryptoCode}_${fiatCode}`] = price;
        // 1 USD = 1/X BTC
        rates[`${fiatCode}_${cryptoCode}`] = 1 / price;
      }
    }
  }

  // Crypto to Crypto rates (BTC <-> ETH)
  const bitcoinData = data['bitcoin'];
  const ethereumData = data['ethereum'];
  const btcUsd = bitcoinData?.['usd'];
  const ethUsd = ethereumData?.['usd'];
  if (btcUsd && ethUsd) {
    rates['BTC_ETH'] = btcUsd / ethUsd; // 1 BTC = X ETH
    rates['ETH_BTC'] = ethUsd / btcUsd; // 1 ETH = X BTC
  }

  // Fiat to Fiat rates (derived from crypto prices)
  // Using BTC as the reference currency for fiat conversion
  const btcEur = bitcoinData?.['eur'];
  const btcGbp = bitcoinData?.['gbp'];

  if (btcUsd && btcEur) {
    rates['USD_EUR'] = btcEur / btcUsd;
    rates['EUR_USD'] = btcUsd / btcEur;
  }

  if (btcUsd && btcGbp) {
    rates['USD_GBP'] = btcGbp / btcUsd;
    rates['GBP_USD'] = btcUsd / btcGbp;
  }

  if (btcEur && btcGbp) {
    rates['EUR_GBP'] = btcGbp / btcEur;
    rates['GBP_EUR'] = btcEur / btcGbp;
  }

  // Identity rates
  rates['USD_USD'] = 1;
  rates['EUR_EUR'] = 1;
  rates['GBP_GBP'] = 1;
  rates['BTC_BTC'] = 1;
  rates['ETH_ETH'] = 1;

  return rates;
}

/**
 * Check if cache is valid
 */
function isCacheValid(): boolean {
  if (!rateCache) return false;
  return Date.now() - rateCache.timestamp < CACHE_TTL_MS;
}

/**
 * Get live conversion rate between two currencies.
 * Uses CoinGecko API with caching and fallback to hardcoded rates.
 *
 * @param from - Source currency code
 * @param to - Target currency code
 * @returns Object with rate, source, and cached status
 */
export async function getLiveConversionRate(
  from: Currency,
  to: Currency
): Promise<{ rate: number; source: 'coingecko' | 'hardcoded'; cached: boolean }> {
  const key = `${from}_${to}`;

  // Check cache first
  if (isCacheValid() && rateCache?.rates[key] !== undefined) {
    return {
      rate: rateCache.rates[key],
      source: 'coingecko',
      cached: true,
    };
  }

  // Fetch fresh rates from CoinGecko
  try {
    logger.info('Fetching live rates from CoinGecko');
    const data = await fetchFromCoinGecko();
    const rates = buildRateTable(data);

    // Update cache
    rateCache = {
      rates,
      timestamp: Date.now(),
    };

    const rate = rates[key];
    if (rate !== undefined) {
      logger.info('Live rate fetched successfully', { from, to, rate });
      return {
        rate,
        source: 'coingecko',
        cached: false,
      };
    }

    // Rate not found in live data, fall back to hardcoded
    logger.warn('Rate not found in CoinGecko response, using hardcoded', { from, to });
    return {
      rate: CONVERSION_RATES[key] || 1,
      source: 'hardcoded',
      cached: false,
    };
  } catch (error) {
    // API error, fall back to hardcoded rates
    logger.error('CoinGecko API error, falling back to hardcoded rates', {
      error: error instanceof Error ? error.message : 'Unknown error',
      from,
      to,
    });

    return {
      rate: CONVERSION_RATES[key] || 1,
      source: 'hardcoded',
      cached: false,
    };
  }
}

/**
 * Convert an amount using live rates.
 *
 * @param amount - Amount in source currency
 * @param from - Source currency code
 * @param to - Target currency code
 * @returns Converted amount and rate info
 */
export async function convertWithLiveRate(
  amount: number,
  from: Currency,
  to: Currency
): Promise<{ convertedAmount: number; rate: number; source: 'coingecko' | 'hardcoded' }> {
  const { rate, source } = await getLiveConversionRate(from, to);
  return {
    convertedAmount: amount * rate,
    rate,
    source,
  };
}

/**
 * Clear the rate cache (useful for testing)
 */
export function clearRateCache(): void {
  rateCache = null;
}

/**
 * Get cache status (useful for debugging)
 */
export function getCacheStatus(): { valid: boolean; age: number | null } {
  if (!rateCache) {
    return { valid: false, age: null };
  }
  return {
    valid: isCacheValid(),
    age: Date.now() - rateCache.timestamp,
  };
}
