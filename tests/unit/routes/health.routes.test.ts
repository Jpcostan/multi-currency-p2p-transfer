/**
 * Health Routes Tests
 */

import express from 'express';
import request from 'supertest';

// Mock database functions
const mockIsDatabaseHealthy = jest.fn();
jest.mock('@/config/database', () => ({
  isDatabaseHealthy: () => mockIsDatabaseHealthy(),
}));

// Import after mocking
import healthRoutes from '@/routes/health.routes';

describe('Health Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    // Mount at /health to match app.ts
    app.use('/health', healthRoutes);
    mockIsDatabaseHealthy.mockReset();
  });

  describe('GET /health', () => {
    it('should return healthy status when database is connected', async () => {
      mockIsDatabaseHealthy.mockReturnValue(true);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.checks.database).toBe(true);
      expect(response.body.data.uptime).toBeDefined();
    });

    it('should return unhealthy status when database is disconnected', async () => {
      mockIsDatabaseHealthy.mockReturnValue(false);

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('unhealthy');
      expect(response.body.data.checks.database).toBe(false);
    });
  });

  describe('GET /health/live', () => {
    it('should return live status', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('live');
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status when database is healthy', async () => {
      mockIsDatabaseHealthy.mockReturnValue(true);

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
    });

    it('should return not ready when database is unhealthy', async () => {
      mockIsDatabaseHealthy.mockReturnValue(false);

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('not ready');
    });
  });
});
