/**
 * Health Check Routes
 *
 * Provides endpoints for container orchestration and monitoring
 * to verify application health.
 */

import { Router, Request, Response } from 'express';
import { isDatabaseHealthy } from '@/config/database';
import { ApiResponse } from '@/types/common.types';

const router = Router();

/**
 * Health check response structure.
 */
interface HealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  checks: {
    database: boolean;
  };
}

/**
 * GET /health
 *
 * Basic health check endpoint for load balancers and container orchestration.
 * Returns 200 if the service is healthy, 503 if unhealthy.
 *
 * @example
 * curl http://localhost:3000/health
 * {
 *   "success": true,
 *   "data": {
 *     "status": "ok",
 *     "timestamp": "2026-01-27T10:00:00.000Z",
 *     "uptime": 3600,
 *     "environment": "development",
 *     "checks": {
 *       "database": true
 *     }
 *   }
 * }
 */
router.get('/', (_req: Request, res: Response): void => {
  const dbHealthy = isDatabaseHealthy();

  const health: HealthResponse = {
    status: dbHealthy ? 'ok' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: dbHealthy,
    },
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  const response: ApiResponse<HealthResponse> = {
    success: true,
    data: health,
  };

  res.status(statusCode).json(response);
});

/**
 * GET /health/live
 *
 * Kubernetes liveness probe endpoint.
 * Returns 200 if the process is running.
 */
router.get('/live', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'live' });
});

/**
 * GET /health/ready
 *
 * Kubernetes readiness probe endpoint.
 * Returns 200 if the service is ready to accept traffic.
 */
router.get('/ready', (_req: Request, res: Response): void => {
  const ready = isDatabaseHealthy();

  if (ready) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

export default router;
