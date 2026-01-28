/**
 * Transaction API Integration Tests
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestApp, cleanupTestApp, TestContext, registerAndLogin } from '../fixtures/test-app';

describe('Transaction API', () => {
  let app: Express;
  let ctx: TestContext;
  let aliceToken: string;
  let bobToken: string;

  beforeEach(async () => {
    const result = await createTestApp();
    app = result.app;
    ctx = result.ctx;

    // Register two users
    const alice = await registerAndLogin(app, {
      email: 'alice@example.com',
      username: 'alice',
      password: 'AlicePass123!',
    });
    aliceToken = alice.token;

    const bob = await registerAndLogin(app, {
      email: 'bob@example.com',
      username: 'bob',
      password: 'BobPass123!',
    });
    bobToken = bob.token;

    // Give Alice some funds
    await request(app)
      .post('/api/deposit')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ currency: 'USD', amount: 1000 });

    await request(app)
      .post('/api/deposit')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ currency: 'EUR', amount: 500 });
  });

  afterEach(async () => {
    await cleanupTestApp(ctx);
  });

  describe('POST /api/transfer', () => {
    it('should transfer USD to USD successfully', async () => {
      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'bob@example.com',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.type).toBe('transfer');
      expect(response.body.data.sender.newBalance.amount).toBe(900);
      expect(response.body.data.recipient.username).toBe('bob');
      expect(response.body.data.recipient.received.amount).toBe(100);
    });

    it('should transfer with currency conversion (USD to EUR)', async () => {
      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'bob',
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          amount: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.transaction.fromCurrency).toBe('USD');
      expect(response.body.data.transaction.toCurrency).toBe('EUR');
      expect(response.body.data.transaction.fromAmount).toBe(100);
      // Rate comes from live CoinGecko API, so just verify it's a positive number
      expect(response.body.data.transaction.toAmount).toBeGreaterThan(0);
    });

    it('should find recipient by username', async () => {
      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'bob',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 50,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.recipient.username).toBe('bob');
    });

    it('should return 422 for insufficient balance', async () => {
      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'bob',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 5000, // More than Alice has
        });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('should return 422 for self-transfer', async () => {
      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'alice',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 100,
        });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('should return 404 for non-existent recipient', async () => {
      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'nonexistent',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 100,
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 for zero amount', async () => {
      const response = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'bob',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 0,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      // Create some transactions
      await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'bob',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 100,
        });

      await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'bob',
          fromCurrency: 'EUR',
          toCurrency: 'EUR',
          amount: 50,
        });
    });

    it('should return transaction history', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Alice has 2 deposits + 2 transfers = 4 transactions
      expect(response.body.data.transactions.length).toBe(4);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should include received transactions', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(response.status).toBe(200);
      // Bob received 2 transfers
      expect(response.body.data.transactions.length).toBe(2);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/transactions?limit=2')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.body.data.transactions.length).toBe(2);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.hasMore).toBe(true);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/transactions?type=deposit')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.body.data.transactions.length).toBe(2);
      response.body.data.transactions.forEach((tx: { type: string }) => {
        expect(tx.type).toBe('deposit');
      });
    });
  });

  describe('GET /api/transactions/:id', () => {
    let transactionId: number;

    beforeEach(async () => {
      const transferResponse = await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'bob',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 100,
        });

      transactionId = transferResponse.body.data.transaction.id;
    });

    it('should return transaction for sender', async () => {
      const response = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.transaction.id).toBe(transactionId);
    });

    it('should return transaction for recipient', async () => {
      const response = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.transaction.id).toBe(transactionId);
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/api/transactions/99999')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid transaction ID', async () => {
      const response = await request(app)
        .get('/api/transactions/invalid')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/convert/preview', () => {
    it('should preview USD to EUR conversion', async () => {
      const response = await request(app)
        .get('/api/convert/preview?from=USD&to=EUR&amount=100')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.fromCurrency).toBe('USD');
      expect(response.body.data.toCurrency).toBe('EUR');
      expect(response.body.data.fromAmount).toBe(100);
      expect(response.body.data.toAmount).toBe(91);
      expect(response.body.data.rate).toBe(0.91);
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .get('/api/convert/preview?from=USD&to=EUR&amount=invalid')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/rates', () => {
    it('should return conversion rate (no auth required)', async () => {
      const response = await request(app)
        .get('/api/rates?from=USD&to=EUR');

      expect(response.status).toBe(200);
      expect(response.body.data.from).toBe('USD');
      expect(response.body.data.to).toBe('EUR');
      expect(response.body.data.rate).toBe(0.91);
    });

    it('should return BTC to USD rate', async () => {
      const response = await request(app)
        .get('/api/rates?from=BTC&to=USD');

      expect(response.body.data.rate).toBe(25000);
    });
  });

  describe('GET /api/transactions/stats', () => {
    beforeEach(async () => {
      // Create some transactions of different types
      await request(app)
        .post('/api/transfer')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          recipientIdentifier: 'bob',
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 50,
        });
    });

    it('should return transaction statistics', async () => {
      const response = await request(app)
        .get('/api/transactions/stats')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stats.deposit).toBe(2);
      expect(response.body.data.stats.transfer).toBe(1);
      expect(response.body.data.stats.payment).toBe(0);
    });
  });
});
