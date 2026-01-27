/**
 * Authentication API Integration Tests
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestApp, cleanupTestApp, TestContext } from '../fixtures/test-app';

describe('Auth API', () => {
  let app: Express;
  let ctx: TestContext;

  beforeEach(async () => {
    const result = await createTestApp();
    app = result.app;
    ctx = result.ctx;
  });

  afterEach(async () => {
    await cleanupTestApp(ctx);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user.username).toBe('newuser');
      expect(response.body.data.token).toBeDefined();
      // Password should not be in response
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          username: 'newuser',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          username: 'newuser',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for short username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          username: 'ab',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          username: 'user1',
          password: 'SecurePass123!',
        });

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          username: 'user2',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user first
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
        });
    });

    it('should login with email successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'testuser@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('testuser@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should login with username successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'testuser',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testuser');
    });

    it('should return 401 for wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'testuser@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistent@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
        });

      token = registerResponse.body.data.token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('testuser@example.com');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
