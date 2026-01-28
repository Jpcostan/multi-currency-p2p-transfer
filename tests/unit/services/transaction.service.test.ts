/**
 * Transaction Service Unit Tests
 */

import Database from 'better-sqlite3';
import { TransactionService } from '@/services/transaction.service';
import { TransactionRepository } from '@/repositories/transaction.repository';
import { BalanceRepository } from '@/repositories/balance.repository';
import { UserRepository } from '@/repositories/user.repository';
import {
  createTestDatabase,
  TEST_USERS,
  seedUser,
  seedBalance,
} from '../../fixtures/test-helpers';
import {
  ValidationError,
  NotFoundError,
  InsufficientBalanceError,
  BusinessRuleError,
} from '@/utils/errors';

// Mock the live rate service to use hardcoded rates (avoid network calls in tests)
jest.mock('@/services/live-rate.service', () => {
  // Inline hardcoded rates for testing (matching src/config/rates.ts)
  const RATES: Record<string, number> = {
    USD_USD: 1, EUR_EUR: 1, GBP_GBP: 1, BTC_BTC: 1, ETH_ETH: 1,
    USD_EUR: 0.91, EUR_USD: 1.10,
    USD_GBP: 0.79, GBP_USD: 1.27,
    EUR_GBP: 0.87, GBP_EUR: 1.15,
    USD_BTC: 0.00004, BTC_USD: 25000,
    USD_ETH: 0.0003, ETH_USD: 3333,
    EUR_BTC: 0.000044, BTC_EUR: 22727,
    EUR_ETH: 0.00033, ETH_EUR: 3030,
    GBP_BTC: 0.00005, BTC_GBP: 20000,
    GBP_ETH: 0.000375, ETH_GBP: 2667,
    BTC_ETH: 7.5, ETH_BTC: 0.133,
  };
  return {
    getLiveConversionRate: jest.fn().mockImplementation((from: string, to: string) => {
      const key = `${from}_${to}`;
      const rate = RATES[key] || 1;
      return Promise.resolve({ rate, source: 'hardcoded', cached: false });
    }),
  };
});

describe('TransactionService', () => {
  let db: Database.Database;
  let transactionRepository: TransactionRepository;
  let balanceRepository: BalanceRepository;
  let userRepository: UserRepository;
  let service: TransactionService;
  let aliceId: number;
  let bobId: number;

  beforeEach(() => {
    db = createTestDatabase();
    transactionRepository = new TransactionRepository(db);
    balanceRepository = new BalanceRepository(db);
    userRepository = new UserRepository(db);
    service = new TransactionService(
      transactionRepository,
      balanceRepository,
      userRepository,
      db
    );

    // Seed test users
    aliceId = seedUser(db, TEST_USERS.alice);
    bobId = seedUser(db, TEST_USERS.bob);

    // Initialize balances
    seedBalance(db, aliceId, 'USD', 100000n); // $1000
    seedBalance(db, aliceId, 'EUR', 50000n); // €500
    seedBalance(db, aliceId, 'BTC', 10000000n); // 0.1 BTC
    seedBalance(db, bobId, 'USD', 50000n); // $500
    seedBalance(db, bobId, 'EUR', 0n); // €0
    seedBalance(db, bobId, 'BTC', 0n); // 0 BTC
  });

  afterEach(() => {
    db.close();
  });

  describe('deposit', () => {
    it('should deposit USD successfully', () => {
      const result = service.deposit(aliceId, {
        currency: 'USD',
        amount: 500,
      });

      expect(result.transaction).toBeDefined();
      expect(result.transaction.type).toBe('deposit');
      expect(result.transaction.fromAmount).toBe(500);
      expect(result.transaction.toAmount).toBe(500);
      expect(result.newBalance.amount).toBe(1500); // 1000 + 500
      expect(result.newBalance.formatted).toBe('$1500.00');
    });

    it('should deposit BTC successfully', () => {
      const result = service.deposit(aliceId, {
        currency: 'BTC',
        amount: 0.05,
      });

      expect(result.transaction.fromCurrency).toBe('BTC');
      expect(result.transaction.toCurrency).toBe('BTC');
      expect(result.newBalance.amount).toBe(0.15); // 0.1 + 0.05
    });

    it('should create deposit transaction with sender = receiver', () => {
      const result = service.deposit(aliceId, {
        currency: 'USD',
        amount: 100,
      });

      expect(result.transaction.senderId).toBe(aliceId);
      expect(result.transaction.receiverId).toBe(aliceId);
    });

    it('should throw ValidationError for zero amount', () => {
      expect(() => {
        service.deposit(aliceId, {
          currency: 'USD',
          amount: 0,
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for negative amount', () => {
      expect(() => {
        service.deposit(aliceId, {
          currency: 'USD',
          amount: -100,
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid currency', () => {
      expect(() => {
        service.deposit(aliceId, {
          currency: 'INVALID' as 'USD',
          amount: 100,
        });
      }).toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent user', () => {
      expect(() => {
        service.deposit(999, {
          currency: 'USD',
          amount: 100,
        });
      }).toThrow(NotFoundError);
    });
  });

  describe('transfer', () => {
    it('should transfer USD to USD successfully', async () => {
      const result = await service.transfer(aliceId, {
        recipientIdentifier: TEST_USERS.bob.email,
        fromCurrency: 'USD',
        toCurrency: 'USD',
        amount: 100,
      });

      expect(result.transaction.type).toBe('transfer');
      expect(result.transaction.fromAmount).toBe(100);
      expect(result.transaction.toAmount).toBe(100);
      expect(result.sender.newBalance.amount).toBe(900); // 1000 - 100
      expect(result.recipient.username).toBe(TEST_USERS.bob.username);
      expect(result.recipient.received.amount).toBe(100);
    });

    it('should transfer with currency conversion (USD to EUR)', async () => {
      const result = await service.transfer(aliceId, {
        recipientIdentifier: TEST_USERS.bob.email,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100,
      });

      expect(result.transaction.fromCurrency).toBe('USD');
      expect(result.transaction.toCurrency).toBe('EUR');
      expect(result.transaction.fromAmount).toBe(100);
      // Rate is 0.91, so 100 USD = 91 EUR
      expect(result.transaction.toAmount).toBe(91);
      expect(result.recipient.received.amount).toBe(91);
    });

    it('should transfer with currency conversion (USD to BTC)', async () => {
      const result = await service.transfer(aliceId, {
        recipientIdentifier: TEST_USERS.bob.email,
        fromCurrency: 'USD',
        toCurrency: 'BTC',
        amount: 1000,
      });

      expect(result.transaction.fromCurrency).toBe('USD');
      expect(result.transaction.toCurrency).toBe('BTC');
      // Rate is 0.00004, so 1000 USD = 0.04 BTC
      expect(result.transaction.toAmount).toBeCloseTo(0.04, 8);
    });

    it('should find recipient by username', async () => {
      const result = await service.transfer(aliceId, {
        recipientIdentifier: TEST_USERS.bob.username,
        fromCurrency: 'USD',
        toCurrency: 'USD',
        amount: 50,
      });

      expect(result.recipient.username).toBe(TEST_USERS.bob.username);
    });

    it('should debit sender and credit recipient atomically', async () => {
      await service.transfer(aliceId, {
        recipientIdentifier: TEST_USERS.bob.email,
        fromCurrency: 'USD',
        toCurrency: 'USD',
        amount: 200,
      });

      // Verify balances after transfer
      const aliceBalance = balanceRepository.findByUserAndCurrency(aliceId, 'USD');
      const bobBalance = balanceRepository.findByUserAndCurrency(bobId, 'USD');

      expect(aliceBalance?.amount).toBe(80000n); // 100000 - 20000
      expect(bobBalance?.amount).toBe(70000n); // 50000 + 20000
    });

    it('should throw InsufficientBalanceError when balance too low', async () => {
      await expect(
        service.transfer(aliceId, {
          recipientIdentifier: TEST_USERS.bob.email,
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 2000, // Only have $1000
        })
      ).rejects.toThrow(InsufficientBalanceError);
    });

    it('should throw BusinessRuleError for self-transfer', async () => {
      await expect(
        service.transfer(aliceId, {
          recipientIdentifier: TEST_USERS.alice.email,
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 100,
        })
      ).rejects.toThrow(BusinessRuleError);
    });

    it('should throw NotFoundError for non-existent recipient', async () => {
      await expect(
        service.transfer(aliceId, {
          recipientIdentifier: 'nonexistent@example.com',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 100,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for zero amount', async () => {
      await expect(
        service.transfer(aliceId, {
          recipientIdentifier: TEST_USERS.bob.email,
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 0,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid currency', async () => {
      await expect(
        service.transfer(aliceId, {
          recipientIdentifier: TEST_USERS.bob.email,
          fromCurrency: 'INVALID' as 'USD',
          toCurrency: 'USD',
          amount: 100,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('previewConversion', () => {
    it('should preview USD to EUR conversion', () => {
      const result = service.previewConversion('USD', 'EUR', 100);

      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
      expect(result.fromAmount).toBe(100);
      expect(result.toAmount).toBe(91); // Rate is 0.91
      expect(result.rate).toBe(0.91);
      expect(result.inverseRate).toBeCloseTo(1.0989, 4);
      expect(result.fromFormatted).toBe('$100.00');
      expect(result.toFormatted).toBe('€91.00');
    });

    it('should preview USD to BTC conversion', () => {
      const result = service.previewConversion('USD', 'BTC', 25000);

      expect(result.toAmount).toBe(1); // 25000 * 0.00004 = 1
      expect(result.rate).toBe(0.00004);
    });

    it('should preview same currency conversion', () => {
      const result = service.previewConversion('USD', 'USD', 100);

      expect(result.fromAmount).toBe(100);
      expect(result.toAmount).toBe(100);
      expect(result.rate).toBe(1);
    });

    it('should throw ValidationError for unsupported from currency', () => {
      expect(() => {
        service.previewConversion('INVALID' as 'USD', 'EUR', 100);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for unsupported to currency', () => {
      expect(() => {
        service.previewConversion('USD', 'INVALID' as 'EUR', 100);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for zero amount', () => {
      expect(() => {
        service.previewConversion('USD', 'EUR', 0);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for negative amount', () => {
      expect(() => {
        service.previewConversion('USD', 'EUR', -100);
      }).toThrow(ValidationError);
    });
  });

  describe('getConversionRate', () => {
    it('should return correct rate for USD to EUR', () => {
      const rate = service.getConversionRate('USD', 'EUR');

      expect(rate).toBe(0.91);
    });

    it('should return correct rate for BTC to USD', () => {
      const rate = service.getConversionRate('BTC', 'USD');

      expect(rate).toBe(25000);
    });

    it('should return 1 for same currency', () => {
      const rate = service.getConversionRate('USD', 'USD');

      expect(rate).toBe(1);
    });

    it('should throw ValidationError for unsupported currency', () => {
      expect(() => {
        service.getConversionRate('INVALID' as 'USD', 'EUR');
      }).toThrow(ValidationError);
    });
  });

  describe('getTransactionHistory', () => {
    beforeEach(async () => {
      // Create some transactions
      service.deposit(aliceId, { currency: 'USD', amount: 100 });
      await service.transfer(aliceId, {
        recipientIdentifier: TEST_USERS.bob.email,
        fromCurrency: 'USD',
        toCurrency: 'USD',
        amount: 50,
      });
      service.deposit(aliceId, { currency: 'EUR', amount: 200 });
    });

    it('should return transaction history for user', () => {
      const result = service.getTransactionHistory(aliceId);

      expect(result.transactions.length).toBe(3);
      expect(result.pagination.total).toBe(3);
    });

    it('should include transactions where user is recipient', () => {
      // Bob received a transfer from Alice
      const result = service.getTransactionHistory(bobId);

      expect(result.transactions.length).toBe(1);
      expect(result.transactions[0]?.type).toBe('transfer');
    });

    it('should respect limit parameter', () => {
      const result = service.getTransactionHistory(aliceId, { limit: 2 });

      expect(result.transactions.length).toBe(2);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should respect offset parameter', () => {
      const result = service.getTransactionHistory(aliceId, { limit: 2, offset: 1 });

      expect(result.transactions.length).toBe(2);
      expect(result.pagination.offset).toBe(1);
    });

    it('should filter by transaction type', () => {
      const depositsOnly = service.getTransactionHistory(aliceId, { type: 'deposit' });
      const transfersOnly = service.getTransactionHistory(aliceId, { type: 'transfer' });

      expect(depositsOnly.transactions.length).toBe(2);
      expect(transfersOnly.transactions.length).toBe(1);
    });

    it('should throw NotFoundError for non-existent user', () => {
      expect(() => {
        service.getTransactionHistory(999);
      }).toThrow(NotFoundError);
    });
  });

  describe('getTransaction', () => {
    let transactionId: number;

    beforeEach(() => {
      const result = service.deposit(aliceId, { currency: 'USD', amount: 100 });
      transactionId = result.transaction.id;
    });

    it('should return transaction for authorized user', () => {
      const result = service.getTransaction(transactionId, aliceId);

      expect(result.id).toBe(transactionId);
      expect(result.type).toBe('deposit');
    });

    it('should throw NotFoundError for non-existent transaction', () => {
      expect(() => {
        service.getTransaction(999, aliceId);
      }).toThrow(NotFoundError);
    });

    it('should throw BusinessRuleError for unauthorized user', () => {
      // Create a third user who has no relation to the transaction
      const charlieId = seedUser(db, TEST_USERS.charlie);

      expect(() => {
        service.getTransaction(transactionId, charlieId);
      }).toThrow(BusinessRuleError);
    });

    it('should allow recipient to view transfer transaction', async () => {
      // Create a transfer
      const transferResult = await service.transfer(aliceId, {
        recipientIdentifier: TEST_USERS.bob.email,
        fromCurrency: 'USD',
        toCurrency: 'USD',
        amount: 50,
      });

      // Bob should be able to view it
      const result = service.getTransaction(transferResult.transaction.id, bobId);
      expect(result.id).toBe(transferResult.transaction.id);
    });
  });

  describe('getTransactionStats', () => {
    beforeEach(async () => {
      service.deposit(aliceId, { currency: 'USD', amount: 100 });
      service.deposit(aliceId, { currency: 'EUR', amount: 200 });
      await service.transfer(aliceId, {
        recipientIdentifier: TEST_USERS.bob.email,
        fromCurrency: 'USD',
        toCurrency: 'USD',
        amount: 50,
      });
    });

    it('should return transaction counts by type', () => {
      const stats = service.getTransactionStats(aliceId);

      expect(stats.deposit).toBe(2);
      expect(stats.transfer).toBe(1);
      expect(stats.payment).toBe(0);
    });

    it('should throw NotFoundError for non-existent user', () => {
      expect(() => {
        service.getTransactionStats(999);
      }).toThrow(NotFoundError);
    });
  });
});
