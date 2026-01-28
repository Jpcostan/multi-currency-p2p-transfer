/**
 * Express Application Setup
 *
 * Configures Express with middleware, routes, and error handling.
 * Separated from server.ts for easier testing.
 */

import express, { Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';
import { sanitizeInput } from '@/middleware/sanitize.middleware';
import { swaggerSpec } from '@/config/swagger';
import routes from '@/routes';

/**
 * Create and configure Express application.
 *
 * @returns Configured Express application
 */
export function createApp(): Application {
  const app = express();

  // ===== Security Middleware =====

  // Helmet: Set security-related HTTP headers
  app.use(helmet());

  // Compression: gzip/deflate response compression
  app.use(compression());

  // CORS: Allow cross-origin requests (configure as needed)
  app.use(
    cors({
      origin: env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate limiting: Prevent abuse
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    },
    skip: (req) => {
      // Skip rate limiting for health checks and API docs
      return req.path.startsWith('/health') || req.path.startsWith('/api/docs');
    },
  });
  app.use(limiter);

  // ===== Body Parsing Middleware =====

  // Parse JSON request bodies
  app.use(express.json({ limit: '10kb' }));

  // Parse URL-encoded request bodies
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ===== Input Sanitization =====

  // Sanitize inputs to prevent XSS attacks
  app.use(sanitizeInput);

  // ===== Request Logging =====

  // Log all incoming requests
  app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.http(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    });

    next();
  });

  // ===== API Documentation =====

  // Swagger UI at /api/docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'P2P Transfer API Docs',
  }));

  // ===== Routes =====

  // Mount all routes
  app.use(routes);

  // ===== Error Handling =====

  // Handle 404 for unmatched routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
