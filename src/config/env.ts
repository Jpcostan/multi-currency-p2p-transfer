/**
 * Environment Configuration
 *
 * Centralized environment variable loading and validation.
 * All env vars are validated at startup to fail fast on misconfiguration.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Environment variable schema with strict validation.
 * Defines all required and optional configuration values.
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default('3000'),

  // Database
  DATABASE_URL: z.string().default('./data/database.sqlite'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRATION: z.string().default('30m'),

  // Security
  BCRYPT_ROUNDS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(10).max(15))
    .default('12'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('100'),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),
});

/**
 * Parsed and validated environment configuration.
 * Throws on validation failure with detailed error messages.
 */
function loadEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    console.error('Environment validation failed:\n' + errors);
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment configuration object.
 * Import this throughout the application for type-safe env access.
 *
 * @example
 * import { env } from '@config/env';
 * console.log(env.PORT); // number, not string
 */
export const env = loadEnv();

/**
 * Type export for use in other modules.
 */
export type Env = z.infer<typeof envSchema>;
