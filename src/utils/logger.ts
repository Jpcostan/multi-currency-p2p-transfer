/**
 * Winston Logger Configuration
 *
 * Provides structured logging with different transports for
 * development (console) and production (file).
 */

import winston from 'winston';
import path from 'path';

// Determine environment (can't import env.ts here to avoid circular deps)
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Custom log format for console output.
 * Includes timestamp, level, and colorized message.
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] ${level}: ${message} ${metaStr}`.trim();
  })
);

/**
 * JSON format for file logging.
 * Structured for log aggregation systems.
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Configure transports based on environment.
 */
const transports: winston.transport[] = [
  // Console transport for all environments
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Log directory for file transports
const logDir = path.resolve(process.cwd(), 'logs');

// Add file transports in production
if (NODE_ENV === 'production') {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * Audit log format with additional security context.
 */
const auditFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Mask sensitive data
    const sanitizedMeta = { ...meta };
    if (sanitizedMeta.password) sanitizedMeta.password = '[REDACTED]';
    if (sanitizedMeta.passwordHash) sanitizedMeta.passwordHash = '[REDACTED]';
    if (sanitizedMeta.token) sanitizedMeta.token = '[REDACTED]';
    if (sanitizedMeta.email && typeof sanitizedMeta.email === 'string') {
      // Mask email: show first 2 chars and domain
      const [local, domain] = sanitizedMeta.email.split('@');
      if (local && domain) {
        sanitizedMeta.email = `${local.substring(0, 2)}***@${domain}`;
      }
    }
    return JSON.stringify({
      timestamp,
      level,
      event: message,
      ...sanitizedMeta,
    });
  })
);

/**
 * Dedicated audit logger for security-sensitive operations.
 * Writes to a separate audit.log file with sensitive data masking.
 *
 * Use for:
 * - User registration/login
 * - Password changes
 * - Financial transactions (deposits, transfers)
 * - Access control events
 */
export const auditLogger = winston.createLogger({
  level: 'info',
  defaultMeta: { service: 'p2p-payment-api', type: 'audit' },
  transports: [
    // Always write to audit.log (even in development for testing)
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      format: auditFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10, // Keep more audit logs for compliance
    }),
    // Also log to console in development
    ...(NODE_ENV !== 'production'
      ? [new winston.transports.Console({ format: consoleFormat })]
      : []),
  ],
  exitOnError: false,
});

/**
 * Main application logger instance.
 *
 * @example
 * import { logger } from '@utils/logger';
 *
 * logger.info('User registered', { userId: 123 });
 * logger.error('Transfer failed', { error: err.message });
 */
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'p2p-payment-api' },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Stream for Morgan HTTP request logging integration.
 * Pipes HTTP logs through Winston at 'http' level.
 */
export const httpLogStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
