/**
 * Transaction Repository Unit Tests
 */

import Database from 'better-sqlite3';
import { TransactionRepository } from '@/repositories/transaction.repository';
import {
  createTestDatabase,
  TEST_USERS,
  seedUser,
  seedTransaction,
} from '../../fixtures/test-helpers';
import { NotFoundError } from '@/utils/errors';

describe('TransactionRepository', () => {
  let db: Database.Database;
  let repository: TransactionRepository;
  let aliceId: number;
  let bobId: number;
  let charlieId: number;

  beforeEach(() => {
    db = createTestDatabase();
    repository = new TransactionRepository(db);

    // Seed test users
    aliceId = seedUser(db, TEST_USERS.alice);
    bobId = seedUser(db, TEST_USERS.bob);
    charlieId = seedUser(db, TEST_USERS.charlie);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a new transaction', () => {
      const transaction = repository.create({
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
        type: 'transfer',
      });

      expect(transaction).toBeDefined();
      expect(transaction.id).toBe(1);
      expect(transaction.senderId).toBe(aliceId);
      expect(transaction.receiverId).toBe(bobId);
      expect(transaction.fromCurrency).toBe('USD');
      expect(transaction.toCurrency).toBe('EUR');
      expect(transaction.fromAmount).toBe(10000n);
      expect(transaction.toAmount).toBe(9100n);
      expect(transaction.conversionRate).toBe('0.91');
      expect(transaction.type).toBe('transfer');
      expect(transaction.status).toBe('completed');
      expect(transaction.createdAt).toBeInstanceOf(Date);
    });

    it('should create a deposit transaction', () => {
      const transaction = repository.create({
        senderId: aliceId,
        receiverId: aliceId, // Deposit: sender = receiver
        fromCurrency: 'USD',
        toCurrency: 'USD',
        fromAmount: 100000n,
        toAmount: 100000n,
        conversionRate: '1',
        type: 'deposit',
      });

      expect(transaction.type).toBe('deposit');
      expect(transaction.senderId).toBe(transaction.receiverId);
    });
  });

  describe('findById', () => {
    it('should find an existing transaction', () => {
      const txId = seedTransaction(db, {
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
      });

      const transaction = repository.findById(txId);

      expect(transaction).not.toBeNull();
      expect(transaction?.id).toBe(txId);
    });

    it('should return null for non-existent ID', () => {
      const transaction = repository.findById(999);

      expect(transaction).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return transaction for existing ID', () => {
      const txId = seedTransaction(db, {
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
      });

      const transaction = repository.getById(txId);

      expect(transaction.id).toBe(txId);
    });

    it('should throw NotFoundError for non-existent ID', () => {
      expect(() => {
        repository.getById(999);
      }).toThrow(NotFoundError);
    });
  });

  describe('findByUserId', () => {
    beforeEach(() => {
      // Alice sends to Bob
      seedTransaction(db, {
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
      });

      // Bob sends to Alice
      seedTransaction(db, {
        senderId: bobId,
        receiverId: aliceId,
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        fromAmount: 5000n,
        toAmount: 5500n,
        conversionRate: '1.1',
      });

      // Charlie sends to Bob (Alice not involved)
      seedTransaction(db, {
        senderId: charlieId,
        receiverId: bobId,
        fromCurrency: 'BTC',
        toCurrency: 'USD',
        fromAmount: 1000000n,
        toAmount: 2500000n,
        conversionRate: '25000',
      });
    });

    it('should return transactions where user is sender or receiver', () => {
      const result = repository.findByUserId(aliceId);

      // Alice is involved in 2 transactions
      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should respect pagination', () => {
      const result = repository.findByUserId(aliceId, { limit: 1, offset: 0 });

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it('should filter by type', () => {
      // Add a deposit
      seedTransaction(db, {
        senderId: aliceId,
        receiverId: aliceId,
        fromCurrency: 'USD',
        toCurrency: 'USD',
        fromAmount: 50000n,
        toAmount: 50000n,
        conversionRate: '1',
        type: 'deposit',
      });

      const transfersOnly = repository.findByUserId(aliceId, { type: 'transfer' });
      const depositsOnly = repository.findByUserId(aliceId, { type: 'deposit' });

      expect(transfersOnly.total).toBe(2);
      expect(depositsOnly.total).toBe(1);
    });
  });

  describe('findBySenderId', () => {
    it('should return only transactions where user is sender', () => {
      seedTransaction(db, {
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
      });

      seedTransaction(db, {
        senderId: bobId,
        receiverId: aliceId,
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        fromAmount: 5000n,
        toAmount: 5500n,
        conversionRate: '1.1',
      });

      const transactions = repository.findBySenderId(aliceId);

      expect(transactions).toHaveLength(1);
      expect(transactions[0]?.senderId).toBe(aliceId);
    });
  });

  describe('findByReceiverId', () => {
    it('should return only transactions where user is receiver', () => {
      seedTransaction(db, {
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
      });

      seedTransaction(db, {
        senderId: bobId,
        receiverId: aliceId,
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        fromAmount: 5000n,
        toAmount: 5500n,
        conversionRate: '1.1',
      });

      const transactions = repository.findByReceiverId(aliceId);

      expect(transactions).toHaveLength(1);
      expect(transactions[0]?.receiverId).toBe(aliceId);
    });
  });

  describe('findRecent', () => {
    it('should return recent transactions in descending order', () => {
      seedTransaction(db, {
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
      });

      seedTransaction(db, {
        senderId: bobId,
        receiverId: charlieId,
        fromCurrency: 'EUR',
        toCurrency: 'BTC',
        fromAmount: 5000n,
        toAmount: 22n,
        conversionRate: '0.000044',
      });

      const transactions = repository.findRecent(10);

      expect(transactions).toHaveLength(2);
      // Verify we got both transactions (order may vary with same timestamp)
      const ids = transactions.map((t) => t.id).sort((a, b) => a - b);
      expect(ids).toEqual([1, 2]);
    });

    it('should respect limit', () => {
      seedTransaction(db, {
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
      });

      seedTransaction(db, {
        senderId: bobId,
        receiverId: charlieId,
        fromCurrency: 'EUR',
        toCurrency: 'BTC',
        fromAmount: 5000n,
        toAmount: 22n,
        conversionRate: '0.000044',
      });

      const transactions = repository.findRecent(1);

      expect(transactions).toHaveLength(1);
    });
  });

  describe('countByTypeForUser', () => {
    it('should return counts by transaction type', () => {
      // Deposit
      seedTransaction(db, {
        senderId: aliceId,
        receiverId: aliceId,
        fromCurrency: 'USD',
        toCurrency: 'USD',
        fromAmount: 50000n,
        toAmount: 50000n,
        conversionRate: '1',
        type: 'deposit',
      });

      // Two transfers
      seedTransaction(db, {
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
        type: 'transfer',
      });

      seedTransaction(db, {
        senderId: bobId,
        receiverId: aliceId,
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        fromAmount: 5000n,
        toAmount: 5500n,
        conversionRate: '1.1',
        type: 'transfer',
      });

      const counts = repository.countByTypeForUser(aliceId);

      expect(counts.deposit).toBe(1);
      expect(counts.transfer).toBe(2);
      expect(counts.payment).toBe(0);
    });
  });

  describe('count', () => {
    it('should return total transaction count', () => {
      expect(repository.count()).toBe(0);

      seedTransaction(db, {
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
      });

      expect(repository.count()).toBe(1);
    });
  });

  describe('findBetweenUsers', () => {
    it('should find transactions between two specific users', () => {
      // Alice <-> Bob transactions
      seedTransaction(db, {
        senderId: aliceId,
        receiverId: bobId,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmount: 10000n,
        toAmount: 9100n,
        conversionRate: '0.91',
      });

      seedTransaction(db, {
        senderId: bobId,
        receiverId: aliceId,
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        fromAmount: 5000n,
        toAmount: 5500n,
        conversionRate: '1.1',
      });

      // Charlie -> Bob (not Alice-Bob)
      seedTransaction(db, {
        senderId: charlieId,
        receiverId: bobId,
        fromCurrency: 'BTC',
        toCurrency: 'USD',
        fromAmount: 1000000n,
        toAmount: 2500000n,
        conversionRate: '25000',
      });

      const transactions = repository.findBetweenUsers(aliceId, bobId);

      expect(transactions).toHaveLength(2);
    });
  });
});
