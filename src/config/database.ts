/**
 * Database Configuration and Connection
 *
 * Provides SQLite database connection using better-sqlite3.
 * Includes schema initialization and transaction helpers.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '@/utils/logger';

/** Database instance singleton */
let db: Database.Database | null = null;

/**
 * SQL schema for database initialization.
 * Creates all tables, indexes, and constraints.
 */
const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Balances table
-- Stores amounts as INTEGER in smallest currency units (cents/satoshis/wei)
CREATE TABLE IF NOT EXISTS balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    currency TEXT NOT NULL CHECK(currency IN ('USD', 'EUR', 'GBP', 'BTC', 'ETH')),
    amount INTEGER NOT NULL DEFAULT 0 CHECK(amount >= 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, currency)
);

-- Transactions table
-- Immutable record of all financial transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    from_currency TEXT NOT NULL CHECK(from_currency IN ('USD', 'EUR', 'GBP', 'BTC', 'ETH')),
    to_currency TEXT NOT NULL CHECK(to_currency IN ('USD', 'EUR', 'GBP', 'BTC', 'ETH')),
    from_amount INTEGER NOT NULL CHECK(from_amount > 0),
    to_amount INTEGER NOT NULL CHECK(to_amount > 0),
    conversion_rate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed')),
    type TEXT NOT NULL DEFAULT 'transfer' CHECK(type IN ('deposit', 'transfer', 'payment')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_balances_user ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balances_user_currency ON balances(user_id, currency);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`;

/**
 * Seed data for test users.
 * Password for both users: "TestPass123"
 * Alice starts with $1,000 USD, Bob starts with empty balances.
 */
const SEED_DATA = `
-- Test users (password: TestPass123)
INSERT OR IGNORE INTO users (id, email, username, password_hash) VALUES
  (1, 'alice@example.com', 'alice', '$2b$12$v5gqdos54o9e9KBts5bcEOuYEvl/SJ3D6Tu/tUeORcs/CwxdLPOrm'),
  (2, 'bob@example.com', 'bob', '$2b$12$v5gqdos54o9e9KBts5bcEOuYEvl/SJ3D6Tu/tUeORcs/CwxdLPOrm');

-- Alice's balances ($1,000 USD)
INSERT OR IGNORE INTO balances (user_id, currency, amount) VALUES
  (1, 'USD', 100000), (1, 'EUR', 0), (1, 'GBP', 0), (1, 'BTC', 0), (1, 'ETH', 0),
  (2, 'USD', 0), (2, 'EUR', 0), (2, 'GBP', 0), (2, 'BTC', 0), (2, 'ETH', 0);
`;

/**
 * Initialize the database connection.
 * Creates the data directory and database file if they don't exist.
 *
 * @param dbPath - Path to SQLite database file
 * @returns Database instance
 */
export function initializeDatabase(dbPath: string): Database.Database {
  if (db) {
    return db;
  }

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logger.info(`Created data directory: ${dataDir}`);
  }

  // Create database connection
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  // Initialize schema
  db.exec(SCHEMA);

  // Seed test data only in non-test environments
  // Tests create their own isolated data
  if (process.env.NODE_ENV !== 'test') {
    db.exec(SEED_DATA);
    logger.info('Seeded test users: alice@example.com, bob@example.com');
  }

  logger.info(`Database initialized at: ${dbPath}`);

  return db;
}

/**
 * Get the current database instance.
 * Throws if database hasn't been initialized.
 *
 * @returns Database instance
 * @throws Error if database not initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

/**
 * Close the database connection.
 * Should be called during graceful shutdown.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Execute a function within a database transaction.
 * Automatically commits on success, rolls back on error.
 *
 * @param fn - Function to execute within transaction
 * @param database - Optional database instance (uses singleton if not provided)
 * @returns Result of the function
 * @throws Re-throws any error from the function after rollback
 *
 * @example
 * const result = withTransaction((db) => {
 *   db.prepare('UPDATE balances SET amount = ? WHERE id = ?').run(100, 1);
 *   db.prepare('INSERT INTO transactions ...').run(...);
 *   return { success: true };
 * });
 */
export function withTransaction<T>(
  fn: (db: Database.Database) => T,
  database?: Database.Database
): T {
  const dbInstance = database || getDatabase();

  const transaction = dbInstance.transaction(() => {
    return fn(dbInstance);
  });

  return transaction();
}

/**
 * Check if the database is connected and healthy.
 *
 * @returns true if database is healthy
 */
export function isDatabaseHealthy(): boolean {
  try {
    if (!db) return false;
    // Simple query to verify connection
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

/**
 * Set the database instance directly.
 * Used for testing with in-memory databases.
 *
 * @param database - Database instance to use
 */
export function setDatabase(database: Database.Database): void {
  db = database;
}
