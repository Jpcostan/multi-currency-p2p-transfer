/**
 * Rates Configuration Tests
 */

import {
  CONVERSION_RATES,
  getConversionRate,
  convertCurrency,
  getInverseRate,
  isConversionSupported,
} from '@/config/rates';

describe('Rates Configuration', () => {
  describe('CONVERSION_RATES', () => {
    it('should have all same-currency rates equal to 1', () => {
      expect(CONVERSION_RATES['USD_USD']).toBe(1);
      expect(CONVERSION_RATES['EUR_EUR']).toBe(1);
      expect(CONVERSION_RATES['BTC_BTC']).toBe(1);
      expect(CONVERSION_RATES['ETH_ETH']).toBe(1);
    });

    it('should have inverse relationships approximately correct', () => {
      // USD/EUR pair
      const usdToEur = CONVERSION_RATES['USD_EUR']!;
      const eurToUsd = CONVERSION_RATES['EUR_USD']!;
      expect(usdToEur * eurToUsd).toBeCloseTo(1, 1);

      // BTC/ETH pair
      const btcToEth = CONVERSION_RATES['BTC_ETH']!;
      const ethToBtc = CONVERSION_RATES['ETH_BTC']!;
      expect(btcToEth * ethToBtc).toBeCloseTo(1, 1);
    });
  });

  describe('getConversionRate', () => {
    it('should return correct rate for USD to EUR', () => {
      const rate = getConversionRate('USD', 'EUR');
      expect(rate).toBe(0.91);
    });

    it('should return correct rate for EUR to USD', () => {
      const rate = getConversionRate('EUR', 'USD');
      expect(rate).toBe(1.10);
    });

    it('should return correct rate for USD to BTC', () => {
      const rate = getConversionRate('USD', 'BTC');
      expect(rate).toBe(0.00004);
    });

    it('should return correct rate for BTC to USD', () => {
      const rate = getConversionRate('BTC', 'USD');
      expect(rate).toBe(25000);
    });

    it('should return 1 for same currency', () => {
      expect(getConversionRate('USD', 'USD')).toBe(1);
      expect(getConversionRate('BTC', 'BTC')).toBe(1);
    });

    it('should throw error for unsupported conversion', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getConversionRate('USD' as any, 'XYZ' as any);
      }).toThrow();
    });
  });

  describe('convertCurrency', () => {
    it('should convert USD to EUR correctly', () => {
      const result = convertCurrency(100, 'USD', 'EUR');
      expect(result).toBe(91); // 100 * 0.91
    });

    it('should convert BTC to USD correctly', () => {
      const result = convertCurrency(1, 'BTC', 'USD');
      expect(result).toBe(25000);
    });

    it('should return same amount for same currency', () => {
      const result = convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
    });
  });

  describe('getInverseRate', () => {
    it('should return inverse rate for USD to EUR', () => {
      const inverseRate = getInverseRate('USD', 'EUR');
      expect(inverseRate).toBeCloseTo(1 / 0.91, 2);
    });

    it('should return inverse rate for BTC to USD', () => {
      const inverseRate = getInverseRate('BTC', 'USD');
      expect(inverseRate).toBeCloseTo(1 / 25000, 8);
    });
  });

  describe('isConversionSupported', () => {
    it('should return true for supported conversions', () => {
      expect(isConversionSupported('USD', 'EUR')).toBe(true);
      expect(isConversionSupported('BTC', 'ETH')).toBe(true);
      expect(isConversionSupported('USD', 'USD')).toBe(true);
    });

    it('should return false for unsupported conversions', () => {
      expect(isConversionSupported('USD', 'XYZ')).toBe(false);
    });

    it('should return false for invalid currency codes', () => {
      expect(isConversionSupported('INVALID', 'USD')).toBe(false);
      expect(isConversionSupported('USD', 'INVALID')).toBe(false);
    });
  });
});
