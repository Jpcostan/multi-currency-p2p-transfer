/**
 * Balance Service Unit Tests
 */

import Database from 'better-sqlite3';
import { BalanceService } from '@/services/balance.service';
import { BalanceRepository } from '@/repositories/balance.repository';
import { UserRepository } from '@/repositories/user.repository';
import {
  createTestDatabase,
  TEST_USERS,
  seedUser,
  seedBalance,
} from '../../fixtures/test-helpers';
import { Balance } from '@/models/balance.model';
import { NotFoundError, ValidationError, InsufficientBalanceError } from '@/utils/errors';

describe('BalanceService', () => {
  let db: Database.Database;
  let balanceRepository: BalanceRepository;
  let userRepository: UserRepository;
  let service: BalanceService;
  let aliceId: number;
  let bobId: number;

  beforeEach(() => {
    db = createTestDatabase();
    balanceRepository = new BalanceRepository(db);
    userRepository = new UserRepository(db);
    service = new BalanceService(balanceRepository, userRepository);

    // Seed test users
    aliceId = seedUser(db, TEST_USERS.alice);
    bobId = seedUser(db, TEST_USERS.bob);

    // Initialize balances for alice
    seedBalance(db, aliceId, 'USD', 100000n); // $1000
    seedBalance(db, aliceId, 'EUR', 50000n); // €500
    seedBalance(db, aliceId, 'BTC', 10000000n); // 0.1 BTC
    seedBalance(db, aliceId, 'ETH', 2000000000000000000n); // 2 ETH
  });

  afterEach(() => {
    db.close();
  });

  describe('getAllBalances', () => {
    it('should return all balances for a user', () => {
      const result = service.getAllBalances(aliceId);

      expect(result.userId).toBe(aliceId);
      expect(result.balances.length).toBe(4);
      expect(result.totalBalances).toBe(4);
    });

    it('should include currency and formatted amount', () => {
      const result = service.getAllBalances(aliceId);

      const usdBalance = result.balances.find((b) => b.currency === 'USD');
      expect(usdBalance).toBeDefined();
      expect(usdBalance?.amount).toBe(1000);
      expect(usdBalance?.formatted).toBe('$1000.00');
      expect(usdBalance?.amountInBaseUnits).toBe('100000');
    });

    it('should throw NotFoundError for non-existent user', () => {
      expect(() => {
        service.getAllBalances(999);
      }).toThrow(NotFoundError);
    });

    it('should return empty balances for user with no balances', () => {
      const result = service.getAllBalances(bobId);

      expect(result.balances.length).toBe(0);
    });
  });

  describe('getBalance', () => {
    it('should return balance for specific currency', () => {
      const result = service.getBalance(aliceId, 'USD');

      expect(result.currency).toBe('USD');
      expect(result.amount).toBe(1000);
      expect(result.formatted).toBe('$1000.00');
    });

    it('should return BTC balance with correct precision', () => {
      const result = service.getBalance(aliceId, 'BTC');

      expect(result.currency).toBe('BTC');
      expect(result.amount).toBe(0.1);
      expect(result.formatted).toBe('0.10000000 ₿');
    });

    it('should return ETH balance with correct precision', () => {
      const result = service.getBalance(aliceId, 'ETH');

      expect(result.currency).toBe('ETH');
      expect(result.amount).toBe(2);
    });

    it('should initialize and return zero for missing balance', () => {
      const result = service.getBalance(bobId, 'USD');

      expect(result.currency).toBe('USD');
      expect(result.amount).toBe(0);
      expect(result.amountInBaseUnits).toBe('0');
    });

    it('should throw NotFoundError for non-existent user', () => {
      expect(() => {
        service.getBalance(999, 'USD');
      }).toThrow(NotFoundError);
    });

    it('should throw ValidationError for unsupported currency', () => {
      expect(() => {
        service.getBalance(aliceId, 'INVALID' as 'USD');
      }).toThrow(ValidationError);
    });
  });

  describe('getBalanceEntity', () => {
    it('should return raw balance entity', () => {
      const result = service.getBalanceEntity(aliceId, 'USD');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(aliceId);
      expect(result?.currency).toBe('USD');
      expect(result?.amount).toBe(100000n);
    });

    it('should return null for non-existent balance', () => {
      const result = service.getBalanceEntity(bobId, 'USD');

      expect(result).toBeNull();
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true when balance is sufficient', () => {
      const result = service.hasSufficientBalance(aliceId, 'USD', 50000n);

      expect(result).toBe(true);
    });

    it('should return true when balance equals required amount', () => {
      const result = service.hasSufficientBalance(aliceId, 'USD', 100000n);

      expect(result).toBe(true);
    });

    it('should return false when balance is insufficient', () => {
      const result = service.hasSufficientBalance(aliceId, 'USD', 200000n);

      expect(result).toBe(false);
    });

    it('should return false for non-existent balance', () => {
      const result = service.hasSufficientBalance(bobId, 'USD', 100n);

      expect(result).toBe(false);
    });
  });

  describe('initializeBalances', () => {
    it('should create zero balances for all currencies', () => {
      service.initializeBalances(bobId);

      const balances = balanceRepository.findAllByUserId(bobId);
      expect(balances.length).toBe(4);
      balances.forEach((balance: Balance) => {
        expect(balance.amount).toBe(0n);
      });
    });

    it('should throw if balances already exist (unique constraint)', () => {
      // Alice already has balances
      expect(() => {
        service.initializeBalances(aliceId);
      }).toThrow();
    });
  });

  describe('credit', () => {
    it('should credit amount to balance', () => {
      const result = service.credit(aliceId, 'USD', 50000n);

      expect(result.amount).toBe(150000n); // 100000 + 50000
    });

    it('should throw NotFoundError if balance does not exist', () => {
      expect(() => {
        service.credit(bobId, 'USD', 10000n);
      }).toThrow(NotFoundError);
    });
  });

  describe('debit', () => {
    it('should debit amount from balance', () => {
      const result = service.debit(aliceId, 'USD', 30000n);

      expect(result.amount).toBe(70000n); // 100000 - 30000
    });

    it('should throw InsufficientBalanceError when balance is too low', () => {
      expect(() => {
        service.debit(aliceId, 'USD', 200000n);
      }).toThrow(InsufficientBalanceError);
    });

    it('should throw NotFoundError for non-existent balance', () => {
      expect(() => {
        service.debit(bobId, 'USD', 100n);
      }).toThrow(NotFoundError);
    });

    it('should allow debiting exact balance', () => {
      const result = service.debit(aliceId, 'USD', 100000n);

      expect(result.amount).toBe(0n);
    });
  });
});
