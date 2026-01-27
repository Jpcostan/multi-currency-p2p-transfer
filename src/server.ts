/**
 * Server Entry Point
 *
 * Initializes the database and starts the Express server.
 * Handles graceful shutdown on termination signals.
 */

import path from 'path';
import { createApp } from '@/app';
import { env } from '@/config/env';
import { initializeDatabase, closeDatabase } from '@/config/database';
import { logger } from '@/utils/logger';

/**
 * Start the server.
 */
async function start(): Promise<void> {
  try {
    // Initialize database
    const dbPath = path.resolve(process.cwd(), env.DATABASE_URL);
    initializeDatabase(dbPath);

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(env.PORT, () => {
      logger.info(`Server started`, {
        port: env.PORT,
        environment: env.NODE_ENV,
        pid: process.pid,
      });
      logger.info(`Health check available at http://localhost:${env.PORT}/health`);
    });

    // ===== Graceful Shutdown =====

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new connections
      server.close((err) => {
        if (err) {
          logger.error('Error during server close', { error: err.message });
        }
      });

      // Close database connection
      closeDatabase();

      logger.info('Graceful shutdown complete');
      process.exit(0);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: String(promise),
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Start the server
start();
