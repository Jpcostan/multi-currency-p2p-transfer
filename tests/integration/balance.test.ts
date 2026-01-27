/**
 * Balance API Integration Tests
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestApp, cleanupTestApp, TestContext, registerAndLogin } from '../fixtures/test-app';

describe('Balance API', () => {
  let app: Express;
  let ctx: TestContext;
  let token: string;

  beforeEach(async () => {
    const result = await createTestApp();
    app = result.app;
    ctx = result.ctx;

    // Register and login a user
    const auth = await registerAndLogin(app, {
      email: 'testuser@example.com',
      username: 'testuser',
      password: 'SecurePass123!',
    });
    token = auth.token;
  });

  afterEach(async () => {
    await cleanupTestApp(ctx);
  });

  describe('GET /api/balances', () => {
    it('should return all balances for authenticated user', async () => {
      const response = await request(app)
        .get('/api/balances')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.balances).toBeDefined();
      expect(response.body.data.balances.length).toBe(4); // USD, EUR, BTC, ETH

      // All balances should be zero initially
      response.body.data.balances.forEach((balance: { amount: number }) => {
        expect(balance.amount).toBe(0);
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/balances');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/balances/:currency', () => {
    it('should return balance for specific currency', async () => {
      const response = await request(app)
        .get('/api/balances/USD')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.balance.currency).toBe('USD');
      expect(response.body.data.balance.amount).toBe(0);
    });

    it('should be case-insensitive for currency', async () => {
      const response = await request(app)
        .get('/api/balances/usd')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.balance.currency).toBe('USD');
    });

    it('should return 400 for invalid currency', async () => {
      const response = await request(app)
        .get('/api/balances/INVALID')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/deposit', () => {
    it('should deposit USD successfully', async () => {
      const response = await request(app)
        .post('/api/deposit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currency: 'USD',
          amount: 1000,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction).toBeDefined();
      expect(response.body.data.transaction.type).toBe('deposit');
      expect(response.body.data.newBalance.amount).toBe(1000);
      expect(response.body.data.newBalance.formatted).toBe('$1000.00');
    });

    it('should deposit BTC successfully', async () => {
      const response = await request(app)
        .post('/api/deposit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currency: 'BTC',
          amount: 0.5,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.newBalance.amount).toBe(0.5);
    });

    it('should update balance correctly with multiple deposits', async () => {
      await request(app)
        .post('/api/deposit')
        .set('Authorization', `Bearer ${token}`)
        .send({ currency: 'USD', amount: 500 });

      const response = await request(app)
        .post('/api/deposit')
        .set('Authorization', `Bearer ${token}`)
        .send({ currency: 'USD', amount: 300 });

      expect(response.body.data.newBalance.amount).toBe(800);
    });

    it('should return 400 for zero amount', async () => {
      const response = await request(app)
        .post('/api/deposit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currency: 'USD',
          amount: 0,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for negative amount', async () => {
      const response = await request(app)
        .post('/api/deposit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currency: 'USD',
          amount: -100,
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/deposit')
        .send({ currency: 'USD', amount: 100 });

      expect(response.status).toBe(401);
    });
  });
});
