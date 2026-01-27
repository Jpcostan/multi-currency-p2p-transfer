/**
 * Test App Fixture
 *
 * Creates an Express app instance with in-memory SQLite
 * for integration testing.
 */

import express, { Express } from 'express';
import Database from 'better-sqlite3';
import request from 'supertest';
import routes from '@/routes';
import { errorHandler } from '@/middleware/error.middleware';
import { setDatabase, closeDatabase } from '@/config/database';
import { resetUserService } from '@/services/user.service';
import { resetBalanceService } from '@/services/balance.service';
import { resetTransactionService } from '@/services/transaction.service';
import { resetUserRepository } from '@/repositories/user.repository';
import { resetBalanceRepository } from '@/repositories/balance.repository';
import { resetTransactionRepository } from '@/repositories/transaction.repository';

/**
 * Schema for in-memory test database
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    currency TEXT NOT NULL CHECK(currency IN ('USD', 'EUR', 'BTC', 'ETH')),
    amount INTEGER NOT NULL DEFAULT 0 CHECK(amount >= 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, currency)
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    from_currency TEXT NOT NULL CHECK(from_currency IN ('USD', 'EUR', 'BTC', 'ETH')),
    to_currency TEXT NOT NULL CHECK(to_currency IN ('USD', 'EUR', 'BTC', 'ETH')),
    from_amount INTEGER NOT NULL CHECK(from_amount > 0),
    to_amount INTEGER NOT NULL CHECK(to_amount > 0),
    conversion_rate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed')),
    type TEXT NOT NULL DEFAULT 'transfer' CHECK(type IN ('deposit', 'transfer', 'payment')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_balances_user ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balances_user_currency ON balances(user_id, currency);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id, created_at DESC);
`;

/**
 * Test context containing the database and reset functions
 */
export interface TestContext {
  db: Database.Database;
}

/**
 * Setup the test database using setDatabase to properly
 * set the module-level singleton.
 */
function setupTestDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  // Set the database instance in the database module
  // This ensures getDatabase() returns our test database
  setDatabase(db);

  return db;
}

/**
 * Create a test Express app with in-memory database
 */
export async function createTestApp(): Promise<{ app: Express; ctx: TestContext }> {
  // Reset all singletons first
  resetUserService();
  resetBalanceService();
  resetTransactionService();
  resetUserRepository();
  resetBalanceRepository();
  resetTransactionRepository();

  // Setup test database
  const db = setupTestDatabase();

  // Create Express app
  const app = express();
  app.use(express.json());
  app.use(routes);
  app.use(errorHandler);

  return {
    app,
    ctx: { db },
  };
}

/**
 * Cleanup test app and database
 */
export async function cleanupTestApp(_ctx: TestContext): Promise<void> {
  // Close the database (this resets the singleton in the database module)
  closeDatabase();

  // Reset all singletons
  resetUserService();
  resetBalanceService();
  resetTransactionService();
  resetUserRepository();
  resetBalanceRepository();
  resetTransactionRepository();
}

/**
 * Register a user and return the token
 */
export async function registerAndLogin(
  app: Express,
  credentials: { email: string; username: string; password: string }
): Promise<{ token: string; userId: number }> {
  const response = await request(app)
    .post('/api/auth/register')
    .send(credentials);

  if (response.status !== 201) {
    throw new Error(`Failed to register user: ${JSON.stringify(response.body)}`);
  }

  return {
    token: response.body.data.token,
    userId: response.body.data.user.id,
  };
}
