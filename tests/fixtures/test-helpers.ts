/**
 * Test Helpers
 *
 * Utility functions for setting up and tearing down test environments.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Create an in-memory SQLite database for testing.
 * Initializes the schema from init.sql.
 *
 * @returns Configured test database
 */
export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Read and execute schema
  const schemaPath = path.resolve(__dirname, '../../docker/init.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Execute schema (split by semicolons for multiple statements)
  db.exec(schema);

  return db;
}

/**
 * Test user data for seeding.
 */
export const TEST_USERS = {
  alice: {
    email: 'alice@example.com',
    username: 'alice',
    // Password: "Password123!" - hashed with bcrypt (12 rounds)
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4I8VLKBZqYGZJMxy',
  },
  bob: {
    email: 'bob@example.com',
    username: 'bob',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4I8VLKBZqYGZJMxy',
  },
  charlie: {
    email: 'charlie@example.com',
    username: 'charlie',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4I8VLKBZqYGZJMxy',
  },
};

/**
 * Seed a test user into the database.
 *
 * @param db - Test database
 * @param userData - User data to insert
 * @returns Created user ID
 */
export function seedUser(
  db: Database.Database,
  userData: { email: string; username: string; passwordHash: string }
): number {
  const stmt = db.prepare(`
    INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(userData.email, userData.username, userData.passwordHash);
  return result.lastInsertRowid as number;
}

/**
 * Seed a balance for a user.
 *
 * @param db - Test database
 * @param userId - User ID
 * @param currency - Currency code
 * @param amount - Amount in base units
 */
export function seedBalance(
  db: Database.Database,
  userId: number,
  currency: string,
  amount: bigint
): void {
  const stmt = db.prepare(`
    INSERT INTO balances (user_id, currency, amount)
    VALUES (?, ?, ?)
  `);

  stmt.run(userId, currency, amount.toString());
}

/**
 * Seed all currency balances for a user with zero amounts.
 *
 * @param db - Test database
 * @param userId - User ID
 */
export function seedAllBalances(db: Database.Database, userId: number): void {
  const currencies = ['USD', 'EUR', 'BTC', 'ETH'];
  const stmt = db.prepare(`
    INSERT INTO balances (user_id, currency, amount)
    VALUES (?, ?, 0)
  `);

  for (const currency of currencies) {
    stmt.run(userId, currency);
  }
}

/**
 * Seed a transaction record.
 *
 * @param db - Test database
 * @param data - Transaction data
 * @returns Created transaction ID
 */
export function seedTransaction(
  db: Database.Database,
  data: {
    senderId: number;
    receiverId: number;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: bigint;
    toAmount: bigint;
    conversionRate: string;
    type?: string;
    status?: string;
  }
): number {
  const stmt = db.prepare(`
    INSERT INTO transactions (
      sender_id, receiver_id, from_currency, to_currency,
      from_amount, to_amount, conversion_rate, type, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.senderId,
    data.receiverId,
    data.fromCurrency,
    data.toCurrency,
    data.fromAmount.toString(),
    data.toAmount.toString(),
    data.conversionRate,
    data.type || 'transfer',
    data.status || 'completed'
  );

  return result.lastInsertRowid as number;
}

/**
 * Clear all data from test database.
 *
 * @param db - Test database
 */
export function clearDatabase(db: Database.Database): void {
  db.exec('DELETE FROM transactions');
  db.exec('DELETE FROM balances');
  db.exec('DELETE FROM users');
}
