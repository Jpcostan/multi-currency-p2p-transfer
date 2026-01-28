-- ==================================
-- Multi-Currency P2P Payment System
-- Database Schema Initialization
-- ==================================

-- Users table
-- Stores registered user accounts
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Balances table
-- Stores currency balances for each user
-- IMPORTANT: Amounts are stored as INTEGER in smallest units:
--   USD/EUR/GBP: cents/pence (100 = $1.00)
--   BTC: satoshis (100000000 = 1 BTC)
--   ETH: wei (1000000000000000000 = 1 ETH)
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

-- ===== Performance Indexes =====

-- User lookups by email/username (for login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Balance lookups by user
CREATE INDEX IF NOT EXISTS idx_balances_user ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balances_user_currency ON balances(user_id, currency);

-- Transaction history queries
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ===== Seed Test Data =====
-- NOTE: Test users are seeded by the application (src/config/database.ts)
-- when NODE_ENV is not 'test'. This keeps the schema file clean for unit tests.
--
-- Pre-seeded users (password: TestPass123):
--   - alice@example.com (alice) - $1,000 USD
--   - bob@example.com (bob) - $0 (empty balances)
