/**
 * Balance Repository Unit Tests
 */

import Database from 'better-sqlite3';
import { BalanceRepository } from '@/repositories/balance.repository';
import {
  createTestDatabase,
  TEST_USERS,
  seedUser,
  seedBalance,
  seedAllBalances,
} from '../../fixtures/test-helpers';
import { NotFoundError, InsufficientBalanceError } from '@/utils/errors';

describe('BalanceRepository', () => {
  let db: Database.Database;
  let repository: BalanceRepository;
  let aliceId: number;
  let bobId: number;

  beforeEach(() => {
    db = createTestDatabase();
    repository = new BalanceRepository(db);

    // Seed test users
    aliceId = seedUser(db, TEST_USERS.alice);
    bobId = seedUser(db, TEST_USERS.bob);
  });

  afterEach(() => {
    db.close();
  });

  describe('initializeForUser', () => {
    it('should create balance records for all currencies', () => {
      repository.initializeForUser(aliceId);

      const balances = repository.findAllByUserId(aliceId);

      expect(balances).toHaveLength(5);
      expect(balances.map((b) => b.currency).sort()).toEqual(['BTC', 'ETH', 'EUR', 'GBP', 'USD']);
      expect(balances.every((b) => b.amount === 0n)).toBe(true);
    });
  });

  describe('findAllByUserId', () => {
    it('should return all balances for a user', () => {
      seedAllBalances(db, aliceId);

      const balances = repository.findAllByUserId(aliceId);

      expect(balances).toHaveLength(5);
    });

    it('should return empty array for user with no balances', () => {
      const balances = repository.findAllByUserId(aliceId);

      expect(balances).toHaveLength(0);
    });
  });

  describe('findByUserAndCurrency', () => {
    it('should find a specific currency balance', () => {
      seedBalance(db, aliceId, 'USD', 10000n);

      const balance = repository.findByUserAndCurrency(aliceId, 'USD');

      expect(balance).not.toBeNull();
      expect(balance?.currency).toBe('USD');
      expect(balance?.amount).toBe(10000n);
    });

    it('should return null for non-existent balance', () => {
      const balance = repository.findByUserAndCurrency(aliceId, 'USD');

      expect(balance).toBeNull();
    });
  });

  describe('getByUserAndCurrency', () => {
    it('should return balance for existing record', () => {
      seedBalance(db, aliceId, 'USD', 10000n);

      const balance = repository.getByUserAndCurrency(aliceId, 'USD');

      expect(balance.amount).toBe(10000n);
    });

    it('should throw NotFoundError for non-existent balance', () => {
      expect(() => {
        repository.getByUserAndCurrency(aliceId, 'USD');
      }).toThrow(NotFoundError);
    });
  });

  describe('credit', () => {
    beforeEach(() => {
      seedBalance(db, aliceId, 'USD', 10000n);
    });

    it('should add amount to balance', () => {
      const balance = repository.credit(aliceId, 'USD', 5000n);

      expect(balance.amount).toBe(15000n);
    });

    it('should throw error for non-positive amount', () => {
      expect(() => {
        repository.credit(aliceId, 'USD', 0n);
      }).toThrow('Credit amount must be positive');

      expect(() => {
        repository.credit(aliceId, 'USD', -1000n);
      }).toThrow('Credit amount must be positive');
    });

    it('should throw NotFoundError for non-existent balance', () => {
      expect(() => {
        repository.credit(aliceId, 'BTC', 1000n);
      }).toThrow(NotFoundError);
    });
  });

  describe('debit', () => {
    beforeEach(() => {
      seedBalance(db, aliceId, 'USD', 10000n);
    });

    it('should subtract amount from balance', () => {
      const balance = repository.debit(aliceId, 'USD', 3000n);

      expect(balance.amount).toBe(7000n);
    });

    it('should allow debiting exact balance', () => {
      const balance = repository.debit(aliceId, 'USD', 10000n);

      expect(balance.amount).toBe(0n);
    });

    it('should throw InsufficientBalanceError when balance too low', () => {
      expect(() => {
        repository.debit(aliceId, 'USD', 15000n);
      }).toThrow(InsufficientBalanceError);
    });

    it('should throw error for non-positive amount', () => {
      expect(() => {
        repository.debit(aliceId, 'USD', 0n);
      }).toThrow('Debit amount must be positive');
    });
  });

  describe('setAmount', () => {
    beforeEach(() => {
      seedBalance(db, aliceId, 'USD', 10000n);
    });

    it('should set balance to specific amount', () => {
      const balance = repository.setAmount(aliceId, 'USD', 50000n);

      expect(balance.amount).toBe(50000n);
    });

    it('should allow setting to zero', () => {
      const balance = repository.setAmount(aliceId, 'USD', 0n);

      expect(balance.amount).toBe(0n);
    });

    it('should throw error for negative amount', () => {
      expect(() => {
        repository.setAmount(aliceId, 'USD', -1000n);
      }).toThrow('Balance cannot be negative');
    });
  });

  describe('upsert', () => {
    it('should create balance if not exists', () => {
      const balance = repository.upsert(aliceId, 'USD', 10000n);

      expect(balance.amount).toBe(10000n);
    });

    it('should update balance if exists', () => {
      seedBalance(db, aliceId, 'USD', 5000n);

      const balance = repository.upsert(aliceId, 'USD', 10000n);

      expect(balance.amount).toBe(10000n);
    });
  });

  describe('hasSufficientBalance', () => {
    beforeEach(() => {
      seedBalance(db, aliceId, 'USD', 10000n);
    });

    it('should return true when balance is sufficient', () => {
      expect(repository.hasSufficientBalance(aliceId, 'USD', 5000n)).toBe(true);
    });

    it('should return true when balance equals required', () => {
      expect(repository.hasSufficientBalance(aliceId, 'USD', 10000n)).toBe(true);
    });

    it('should return false when balance is insufficient', () => {
      expect(repository.hasSufficientBalance(aliceId, 'USD', 15000n)).toBe(false);
    });

    it('should return false for non-existent balance', () => {
      expect(repository.hasSufficientBalance(aliceId, 'BTC', 1n)).toBe(false);
    });
  });

  describe('getTotalByCurrency', () => {
    it('should return total across all users', () => {
      seedBalance(db, aliceId, 'USD', 10000n);
      seedBalance(db, bobId, 'USD', 20000n);

      const total = repository.getTotalByCurrency('USD');

      expect(total).toBe(30000n);
    });

    it('should return 0 for currency with no balances', () => {
      const total = repository.getTotalByCurrency('BTC');

      expect(total).toBe(0n);
    });
  });
});
