# Multi-Currency P2P Payment System - Development Plan

## Executive Summary

This document outlines the comprehensive plan for building a production-quality multi-currency peer-to-peer payment system. The system will support fiat (USD, EUR) and cryptocurrency (BTC, ETH) transfers with automatic conversion, following enterprise-grade software engineering practices.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Design](#database-design)
3. [API Design](#api-design)
4. [Security Considerations](#security-considerations)
5. [Business Logic & Domain Model](#business-logic--domain-model)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Testing Strategy](#testing-strategy)
8. [Deployment & DevOps](#deployment--devops)
9. [Code Quality Standards](#code-quality-standards)
10. [Risk Assessment](#risk-assessment)

---

## System Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │
│ (curl/API)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│        Express.js API Layer         │
│  ┌──────────────────────────────┐   │
│  │   Route Controllers          │   │
│  └──────────┬───────────────────┘   │
│             ▼                       │
│  ┌──────────────────────────────┐   │
│  │   Service Layer (Business    │   │
│  │   Logic & Validations)       │   │
│  └──────────┬───────────────────┘   │
│             ▼                       │
│  ┌──────────────────────────────┐   │
│  │   Repository Layer (Data     │   │
│  │   Access)                    │   │
│  └──────────┬───────────────────┘   │
└─────────────┼───────────────────────┘
              ▼
       ┌─────────────┐
       │   SQLite    │
       │   Database  │
       └─────────────┘
```

### Architectural Patterns

1. **Layered Architecture**
   - **Controller Layer**: HTTP request/response handling, input validation
   - **Service Layer**: Business logic, orchestration, domain rules
   - **Repository Layer**: Data access abstraction
   - **Domain Layer**: Core business entities and value objects

2. **Dependency Injection**
   - Inversion of control for testability
   - Easy mocking in unit tests

3. **Repository Pattern**
   - Abstract data access
   - Enable easy database swapping if needed

### Technology Stack

- **Runtime**: Node.js 20.x LTS
- **Language**: TypeScript 5.x (strict mode)
- **Framework**: Express.js 4.x
- **Database**: SQLite 3.x (development/demo), easily replaceable with PostgreSQL
- **ORM**: Better-sqlite3 (synchronous, faster for SQLite)
- **Validation**: Zod (type-safe runtime validation)
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose
- **Logging**: Winston
- **API Documentation**: OpenAPI/Swagger (optional but recommended)

### Project Structure

```
/project-root
├── src/
│   ├── config/           # Configuration management
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── rates.ts
│   ├── controllers/      # HTTP request handlers
│   │   ├── auth.controller.ts
│   │   ├── balance.controller.ts
│   │   ├── transaction.controller.ts
│   │   └── conversion.controller.ts
│   ├── services/         # Business logic
│   │   ├── user.service.ts
│   │   ├── balance.service.ts
│   │   ├── transaction.service.ts
│   │   └── conversion.service.ts
│   ├── repositories/     # Data access layer
│   │   ├── user.repository.ts
│   │   ├── balance.repository.ts
│   │   └── transaction.repository.ts
│   ├── models/           # Domain entities
│   │   ├── user.model.ts
│   │   ├── balance.model.ts
│   │   └── transaction.model.ts
│   ├── types/            # TypeScript types & interfaces
│   │   ├── common.types.ts
│   │   ├── currency.types.ts
│   │   └── transaction.types.ts
│   ├── middleware/       # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── utils/            # Utility functions
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   └── errors.ts
│   ├── routes/           # Route definitions
│   │   └── index.ts
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── repositories/
│   ├── integration/
│   │   └── api/
│   └── fixtures/
│       └── test-data.ts
├── docker/
│   ├── init.sql
│   └── Dockerfile
├── .env.example
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md
└── PLAN.md (this file)
```

---

## Database Design

### Schema Design Principles

1. **ACID Compliance**: Leverage SQLite transactions for consistency
2. **Normalization**: 3NF to avoid data redundancy
3. **Audit Trail**: Immutable transaction records
4. **Precision**: Use INTEGER for currency (store cents/satoshis) to avoid floating-point errors

### Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ email (UNIQUE)  │
│ username (UNQ)  │
│ password_hash   │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│    balances     │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ currency        │
│ amount          │ <- INTEGER (smallest unit)
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────────┐
│   transactions      │
├─────────────────────┤
│ id (PK)             │
│ sender_id (FK)      │
│ receiver_id (FK)    │
│ from_currency       │
│ to_currency         │
│ from_amount         │ <- INTEGER
│ to_amount           │ <- INTEGER
│ conversion_rate     │ <- DECIMAL (stored as text)
│ status              │
│ type                │
│ created_at          │
└─────────────────────┘

UNIQUE INDEX: (user_id, currency) on balances
INDEX: (sender_id, created_at) on transactions
INDEX: (receiver_id, created_at) on transactions
```

### Table Definitions (SQL)

```sql
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

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    from_amount INTEGER NOT NULL,
    to_amount INTEGER NOT NULL,
    conversion_rate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed')),
    type TEXT NOT NULL DEFAULT 'transfer' CHECK(type IN ('deposit', 'transfer', 'payment')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_balances_user ON balances(user_id);
CREATE INDEX idx_transactions_sender ON transactions(sender_id, created_at);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_id, created_at);
```

### Currency Precision Strategy

**Problem**: Floating-point arithmetic causes precision errors in financial calculations.

**Solution**: Store all amounts as integers representing the smallest unit:
- USD/EUR: Store cents (100 cents = $1)
- BTC: Store satoshis (100,000,000 satoshis = 1 BTC)
- ETH: Store wei (10^18 wei = 1 ETH)

```typescript
// Example conversion utilities
const CURRENCY_PRECISION = {
  USD: 100,           // cents
  EUR: 100,           // cents
  BTC: 100_000_000,   // satoshis
  ETH: 1_000_000_000_000_000_000n, // wei (use BigInt for ETH)
};

// Convert user-facing amount to database integer
function toBaseUnit(amount: number, currency: Currency): bigint {
  return BigInt(Math.round(amount * CURRENCY_PRECISION[currency]));
}

// Convert database integer to user-facing amount
function fromBaseUnit(amount: bigint, currency: Currency): number {
  return Number(amount) / CURRENCY_PRECISION[currency];
}
```

---

## API Design

### RESTful API Endpoints

#### Authentication (Basic Auth for simplicity)

```
POST /api/auth/register
POST /api/auth/login
```

#### Balance Management

```
GET    /api/balances              # Get all balances for current user
GET    /api/balances/:currency    # Get specific currency balance
POST   /api/deposit               # Simulate adding funds
```

#### Transfers & Payments

```
POST   /api/transfer              # P2P transfer
POST   /api/payment               # Alternative endpoint (same logic)
GET    /api/transactions          # Get transaction history
GET    /api/transactions/:id      # Get specific transaction
```

#### Conversion Utilities

```
GET    /api/conversion-rate/:from/:to        # Get current rate
POST   /api/conversion/preview              # Preview conversion before sending
```

### Request/Response Examples

#### 1. Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "alice@example.com",
  "username": "alice",
  "password": "SecurePassword123!"
}
```

**Response (201 Created)**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "alice@example.com",
    "username": "alice",
    "createdAt": "2025-01-27T10:00:00Z"
  }
}
```

#### 2. Deposit Funds

```http
POST /api/deposit
Authorization: Bearer <token>
Content-Type: application/json

{
  "currency": "USD",
  "amount": 1000.00
}
```

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_123",
    "currency": "USD",
    "amount": 1000.00,
    "newBalance": 1000.00
  }
}
```

#### 3. Preview Conversion

```http
POST /api/conversion/preview
Authorization: Bearer <token>
Content-Type: application/json

{
  "fromCurrency": "USD",
  "toCurrency": "BTC",
  "amount": 100.00
}
```

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "fromCurrency": "USD",
    "toCurrency": "BTC",
    "fromAmount": 100.00,
    "toAmount": 0.004,
    "rate": 0.00004,
    "inverseRate": 25000
  }
}
```

#### 4. Transfer Money

```http
POST /api/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientEmail": "bob@example.com",
  "fromCurrency": "USD",
  "toCurrency": "BTC",
  "amount": 100.00
}
```

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_456",
    "sender": "alice",
    "recipient": "bob",
    "fromCurrency": "USD",
    "toCurrency": "BTC",
    "fromAmount": 100.00,
    "toAmount": 0.004,
    "conversionRate": 0.00004,
    "timestamp": "2025-01-27T10:05:00Z"
  }
}
```

#### 5. Get Transaction History

```http
GET /api/transactions?limit=10&offset=0
Authorization: Bearer <token>
```

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_456",
        "type": "transfer",
        "direction": "outgoing",
        "counterparty": "bob",
        "fromCurrency": "USD",
        "toCurrency": "BTC",
        "fromAmount": 100.00,
        "toAmount": 0.004,
        "conversionRate": 0.00004,
        "status": "completed",
        "timestamp": "2025-01-27T10:05:00Z"
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 10,
      "offset": 0
    }
  }
}
```

### Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient USD balance for this transaction",
    "details": {
      "required": 100.00,
      "available": 50.00,
      "currency": "USD"
    }
  }
}
```

### Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created (e.g., new user)
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid authentication
- `403 Forbidden`: Valid auth but insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Business rule violation (e.g., duplicate email)
- `422 Unprocessable Entity`: Validation errors
- `500 Internal Server Error`: Server-side error

---

## Security Considerations

### Authentication & Authorization

1. **Password Security**
   - Use bcrypt with salt rounds ≥ 12
   - Enforce password complexity (min 8 chars, mixed case, numbers)
   - Never log or expose passwords

2. **Session Management**
   - JWT tokens with short expiration (15-30 minutes)
   - Refresh tokens for extended sessions
   - Secure, httpOnly cookies for token storage (if web-based)

3. **API Security**
   - Rate limiting per IP/user (e.g., 100 req/min)
   - Input validation on all endpoints (using Zod schemas)
   - Helmet.js for security headers

### Data Protection

1. **SQL Injection Prevention**
   - Use parameterized queries (never string concatenation)
   - ORM/query builder provides automatic escaping

2. **Sensitive Data**
   - Never log sensitive information (passwords, full account balances in plaintext)
   - Sanitize error messages (don't expose internal details)

3. **HTTPS Only** (in production)
   - Enforce TLS 1.2+
   - HSTS headers

### Transaction Security

1. **ACID Transactions**
   - Use database transactions for all balance updates
   - Rollback on any error to maintain consistency

2. **Idempotency**
   - Prevent duplicate transactions with idempotency keys (optional enhancement)

3. **Balance Validation**
   - Check balances atomically within transaction
   - Use row-level locking if needed (`SELECT ... FOR UPDATE`)

### Example: Secure Transfer Implementation

```typescript
async function executeTransfer(
  senderId: number,
  receiverId: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  amount: number
): Promise<Transaction> {
  return await db.transaction(async (tx) => {
    // 1. Lock sender's balance row
    const senderBalance = await tx.query(
      'SELECT amount FROM balances WHERE user_id = ? AND currency = ? FOR UPDATE',
      [senderId, fromCurrency]
    );
    
    // 2. Validate sufficient balance
    if (senderBalance.amount < toBaseUnit(amount, fromCurrency)) {
      throw new InsufficientBalanceError();
    }
    
    // 3. Calculate conversion
    const rate = getConversionRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate;
    
    // 4. Update balances atomically
    await tx.query(
      'UPDATE balances SET amount = amount - ? WHERE user_id = ? AND currency = ?',
      [toBaseUnit(amount, fromCurrency), senderId, fromCurrency]
    );
    
    await tx.query(
      'INSERT INTO balances (user_id, currency, amount) VALUES (?, ?, ?) 
       ON CONFLICT(user_id, currency) DO UPDATE SET amount = amount + ?',
      [receiverId, toCurrency, toBaseUnit(convertedAmount, toCurrency), toBaseUnit(convertedAmount, toCurrency)]
    );
    
    // 5. Record transaction
    const transaction = await tx.insert('transactions', {
      sender_id: senderId,
      receiver_id: receiverId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      from_amount: toBaseUnit(amount, fromCurrency),
      to_amount: toBaseUnit(convertedAmount, toCurrency),
      conversion_rate: rate.toString(),
      status: 'completed',
      type: 'transfer'
    });
    
    return transaction;
  });
}
```

### Environment Variables Security

```bash
# .env (never commit this file)
NODE_ENV=development
PORT=3000
DATABASE_URL=./data/database.sqlite
JWT_SECRET=<generate-strong-random-secret>
JWT_EXPIRATION=30m
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Business Logic & Domain Model

### Core Domain Entities

#### 1. User
```typescript
interface User {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. Balance
```typescript
interface Balance {
  id: number;
  userId: number;
  currency: Currency;
  amount: bigint; // Base units (cents, satoshis, wei)
  createdAt: Date;
  updatedAt: Date;
}

type Currency = 'USD' | 'EUR' | 'BTC' | 'ETH';
```

#### 3. Transaction
```typescript
interface Transaction {
  id: number;
  senderId: number;
  receiverId: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: bigint;
  toAmount: bigint;
  conversionRate: string; // Stored as string to preserve precision
  status: TransactionStatus;
  type: TransactionType;
  createdAt: Date;
}

type TransactionStatus = 'pending' | 'completed' | 'failed';
type TransactionType = 'deposit' | 'transfer' | 'payment';
```

### Conversion Rate Configuration

Hardcoded rates for simplicity (can be replaced with external API):

```typescript
// src/config/rates.ts
export const CONVERSION_RATES: Record<string, number> = {
  // Fiat to Crypto
  'USD_BTC': 0.00004,     // 1 USD = 0.00004 BTC (BTC @ $25,000)
  'USD_ETH': 0.0003,      // 1 USD = 0.0003 ETH (ETH @ $3,333)
  'EUR_BTC': 0.000044,    // 1 EUR = 0.000044 BTC
  'EUR_ETH': 0.00033,     // 1 EUR = 0.00033 ETH
  
  // Fiat to Fiat
  'USD_EUR': 0.91,        // 1 USD = 0.91 EUR
  'EUR_USD': 1.10,        // 1 EUR = 1.10 USD
  
  // Crypto to Fiat
  'BTC_USD': 25000,
  'BTC_EUR': 22727,
  'ETH_USD': 3333,
  'ETH_EUR': 3030,
  
  // Crypto to Crypto
  'BTC_ETH': 7.5,         // 1 BTC = 7.5 ETH
  'ETH_BTC': 0.133,       // 1 ETH = 0.133 BTC
  
  // Same currency (identity)
  'USD_USD': 1,
  'EUR_EUR': 1,
  'BTC_BTC': 1,
  'ETH_ETH': 1,
};

export function getConversionRate(from: Currency, to: Currency): number {
  const key = `${from}_${to}`;
  const rate = CONVERSION_RATES[key];
  
  if (!rate) {
    throw new Error(`Conversion rate not found for ${from} to ${to}`);
  }
  
  return rate;
}
```

### Business Rules

1. **Balance Rules**
   - Each user has one balance per currency
   - Balances cannot be negative
   - All balance changes must occur within transactions

2. **Transfer Rules**
   - Sender must have sufficient balance in source currency
   - Sender and receiver cannot be the same user
   - Conversion rate is locked at transaction time (immutable)
   - Both debit and credit must succeed or both fail (atomicity)

3. **Deposit Rules**
   - Deposits can only increase balances
   - Deposits have sender_id = receiver_id (self-transaction)
   - Type must be 'deposit'

4. **Transaction Immutability**
   - Completed transactions cannot be modified
   - Reversal requires new compensating transaction

### Critical Edge Cases

1. **Concurrent Transfers**
   - Use database transactions with row locking
   - Prevent race conditions on balance updates

2. **Precision Loss**
   - Always round down when converting to base units
   - Round to 2 decimals for fiat, 8 for BTC, 18 for ETH (when displaying)

3. **Zero/Negative Amounts**
   - Validate amount > 0 before processing
   - Reject negative amounts at API layer

4. **Invalid Recipients**
   - Check recipient exists before processing
   - Return clear error if not found

5. **Same Currency Transfers**
   - Support USD→USD (no conversion needed)
   - Rate = 1.0, amounts equal

---

## Implementation Roadmap

Legend:
- [x] Completed
- [~] In progress / partially complete
- [ ] Not started

## Pre-Phase 1: Environment & Repository Setup (Completed)

- GitHub repo created and initialized
- .gitignore, README.md and PLAN.md committed
- Node.js verified at v20.x
- npm verified
- Docker Desktop installed and verified
- Docker daemon running sucessfully
- Git working and synced with origin/main

### Phase 1: Foundation ✅ COMPLETE

**Goals**: Setup project, infrastructure, and basic structure

**Completed**: 2026-01-27

- [x] Initialize Node.js/TypeScript project
  - [x] Initialize npm project
  - [x] Install TypeScript
  - [x] Configure `tsconfig.json` (strict mode, path aliases)
  - [x] Setup `package.json` with scripts
  - [x] Configure ESLint + Prettier

- [x] Setup Docker infrastructure
  - [x] Create `Dockerfile` for Node.js app (multi-stage build)
  - [x] Create `docker-compose.yml`
  - [x] Create `docker/init.sql` for database schema

- [x] Database setup
  - [x] Implement schema (users, balances, transactions)
  - [x] Create indexes
  - [x] Seed initial test data (template ready in init.sql)

- [x] Project structure
  - [x] Create folder hierarchy
  - [x] Setup path aliases (@/ imports)
  - [x] Configure environment variables

- [x] Logger setup (Winston)
  - [x] Console transport for development
  - [x] File transport for production

**Deliverables**:
- [x] Working Docker setup (`docker-compose up` starts app)
- [x] Database with schema and indexes
- [x] Basic Express server responding to `/health` endpoint

---

#### 📋 Phase 1 Completion Report

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: FOUNDATION - COMPLETE                       │
│                         Completed: 2026-01-27                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✅ DELIVERABLES VERIFIED                                               │
│  ┌───────────────────────────────────┬──────────┬────────────────────┐  │
│  │ Deliverable                       │ Status   │ Evidence           │  │
│  ├───────────────────────────────────┼──────────┼────────────────────┤  │
│  │ docker-compose up starts app      │ PASS ✓   │ Container on :3000 │  │
│  │ Database with schema/indexes      │ PASS ✓   │ SQLite initialized │  │
│  │ /health returns 200 OK            │ PASS ✓   │ JSON response OK   │  │
│  └───────────────────────────────────┴──────────┴────────────────────┘  │
│                                                                         │
│  📁 FILES CREATED (22 total)                                            │
│                                                                         │
│  Configuration:                                                         │
│    • tsconfig.json      - Strict TS config with path aliases            │
│    • package.json       - Scripts + 10 runtime / 15 dev dependencies    │
│    • .env.example       - Environment variable template                 │
│    • eslint.config.js   - ESLint v9 flat config                         │
│    • .prettierrc        - Code formatting rules                         │
│    • jest.config.js     - Test configuration                            │
│                                                                         │
│  Source Code (src/):                                                    │
│    • config/env.ts      - Zod-validated environment loading             │
│    • config/database.ts - SQLite connection + schema + transactions     │
│    • config/rates.ts    - Currency conversion rates                     │
│    • utils/logger.ts    - Winston logger (console + file)               │
│    • utils/errors.ts    - Custom error classes (8 types)                │
│    • utils/currency.ts  - Base unit conversion utilities                │
│    • types/*.ts         - TypeScript definitions (3 files)              │
│    • middleware/error.middleware.ts - Global error handler              │
│    • routes/index.ts    - Route aggregation                             │
│    • routes/health.routes.ts - Health check endpoints                   │
│    • app.ts             - Express app configuration                     │
│    • server.ts          - Server entry point                            │
│                                                                         │
│  Docker:                                                                │
│    • Dockerfile         - Multi-stage production build                  │
│    • docker-compose.yml - Container orchestration                       │
│    • docker/init.sql    - Database schema                               │
│                                                                         │
│  Tests:                                                                 │
│    • tests/fixtures/setup.ts - Jest environment setup                   │
│                                                                         │
│  🔧 TECHNICAL STACK CONFIGURED                                          │
│    • Runtime:     Node.js 20.x + TypeScript 5.x (strict mode)           │
│    • Framework:   Express.js 4.x with Helmet, CORS, rate limiting       │
│    • Database:    SQLite via better-sqlite3 (synchronous API)           │
│    • Validation:  Zod for runtime type checking                         │
│    • Logging:     Winston with console + file transports                │
│    • Security:    bcrypt (12 rounds), JWT, Helmet headers               │
│    • Testing:     Jest + Supertest (configured, ready for Phase 5)      │
│    • Docker:      Multi-stage build, non-root user, health checks       │
│                                                                         │
│  🏗️ PROJECT STRUCTURE                                                   │
│    src/                                                                 │
│    ├── config/        ← env.ts, database.ts, rates.ts                   │
│    ├── controllers/   ← (Phase 4)                                       │
│    ├── services/      ← (Phase 3)                                       │
│    ├── repositories/  ← (Phase 2)                                       │
│    ├── models/        ← (Phase 2)                                       │
│    ├── types/         ← currency, common, transaction types             │
│    ├── middleware/    ← error handling                                  │
│    ├── utils/         ← logger, errors, currency                        │
│    ├── routes/        ← health routes                                   │
│    ├── app.ts         ← Express configuration                           │
│    └── server.ts      ← Entry point                                     │
│                                                                         │
│  📝 COMMANDS AVAILABLE                                                  │
│    npm run dev        - Start dev server with hot reload                │
│    npm run build      - Compile TypeScript                              │
│    npm start          - Run production build                            │
│    npm test           - Run test suite                                  │
│    npm run lint       - Lint code with ESLint                           │
│    npm run format     - Format with Prettier                            │
│    docker-compose up  - Start containerized application                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### 🧪 Phase 1 Manual Testing Checklist

> **Instructions**: Open a separate terminal, navigate to the project directory, and run each test. Mark items complete as you go.

```bash
cd ~/workspace/multi-currency-p2p-transfer
```

---

**1. Verify Project Structure**
```bash
ls -la src/
ls -la src/config/
ls -la src/types/
ls -la src/utils/
ls -la src/routes/
ls -la src/middleware/
ls -la tests/
ls -la docker/
```
✓ Expected: All directories present with files

---

**2. Verify Dependencies**
```bash
npm list --depth=0
```
✓ Expected: Shows express, better-sqlite3, winston, zod, etc.

---

**3. TypeScript Build**
```bash
rm -rf dist/
npm run build
ls -la dist/
```
✓ Expected: `dist/` folder created with `.js` files

---

**4. Type Checking**
```bash
npm run typecheck
```
✓ Expected: No errors (exit code 0)

---

**5. Run Server Locally (Development Mode)**
```bash
npm run dev
```
✓ Expected: "Database initialized", "Server started" on port 3000
*(Press Ctrl+C to stop)*

> ⚠️ **Troubleshooting**: If you see `NODE_MODULE_VERSION` mismatch error for `better-sqlite3`, run:
> ```bash
> npm rebuild better-sqlite3
> ```

---

**6. Run Server Locally (Production Mode)**
```bash
npm start
```
✓ Expected: Same as above, runs from compiled `dist/`
*(Keep running for next tests, or open new terminal)*

---

**7. Test Health Endpoints** *(in new terminal)*
```bash
curl -s http://localhost:3000/health | python3 -m json.tool
curl -s http://localhost:3000/health/live
curl -s http://localhost:3000/health/ready
```
✓ Expected:
- `/health`: `{"success":true,"data":{"status":"ok",...}}`
- `/health/live`: `{"status":"live"}`
- `/health/ready`: `{"status":"ready"}`

---

**8. Test 404 Handling**
```bash
curl -s http://localhost:3000/nonexistent | python3 -m json.tool
```
✓ Expected: `{"success":false,"error":{"code":"NOT_FOUND",...}}`

---

**9. Test Rate Limiting**
```bash
for i in {1..5}; do curl -s http://localhost:3000/health -o /dev/null -w "%{http_code}\n"; done
```
✓ Expected: All return `200` (rate limit is 100/min)

---

**10. Stop Local Server**
```bash
# If running in foreground: Ctrl+C
# If running in background:
lsof -ti:3000 | xargs kill -9
```

---

**11. Docker Build**
```bash
docker-compose build
```
✓ Expected: Image builds successfully

---

**12. Docker Run**
```bash
docker-compose up
```
✓ Expected: Container starts, "Server started" message
*(Keep running for next test)*

---

**13. Test Docker Health** *(in new terminal)*
```bash
curl -s http://localhost:3000/health | python3 -m json.tool
docker ps
```
✓ Expected: Health returns `"status":"ok"`, container shows "healthy"

---

**14. Check Docker Logs**
```bash
docker-compose logs --tail=30
```
✓ Expected: Shows startup logs

---

**15. Stop Docker**
```bash
docker-compose down
```
✓ Expected: Container and network removed

---

**16. Verify Database Created**
```bash
ls -la data/
sqlite3 data/database.sqlite ".schema"
```
✓ Expected: `database.sqlite` exists, shows tables

---

#### 📋 Phase 1 Testing Summary Checklist

| #  | Test                        | Pass  |
|----|-----------------------------|------ |
| 1  | Project structure exists    | [✅]  |
| 2  | Dependencies installed      | [✅]  |
| 3  | TypeScript builds           | [✅]  |
| 4  | Type check passes           | [✅]  |
| 5  | Dev server starts           | [✅]  |
| 6  | Production server starts    | [✅]  |
| 7  | Health endpoints work       | [✅]  |
| 8  | 404 handling works          | [✅]  |
| 9  | Rate limiting configured    | [✅]  |
| 10 | Server stops cleanly        | [✅]  |
| 11 | Docker builds               | [✅]  |
| 12 | Docker runs                 | [✅]  |
| 13 | Docker health works         | [✅]  |
| 14 | Docker logs visible         | [✅]  |
| 15 | Docker stops cleanly        | [✅]  |
| 16 | SQLite database created     | [✅]  |

**Phase 1 Testing Completed**: [✅] *(Date: 01/27/26)*

---

### Phase 2: Core Domain & Data Layer ✅ COMPLETE

**Goals**: Implement domain models, repositories, and database operations

**Completed**: 2026-01-27

- [x] Domain models
  - [x] `User` model with Zod validation schemas
  - [x] `Balance` model with precision utilities
  - [x] `Transaction` model with type definitions

- [x] Repository layer
  - [x] `UserRepository` (CRUD, find by email/username, conflict handling)
  - [x] `BalanceRepository` (credit, debit, upsert with balance validation)
  - [x] `TransactionRepository` (create, paginated queries, filters)

- [x] Database utilities
  - [x] Transaction wrapper (in database.ts)
  - [x] Row-to-entity converters
  - [x] Test database helpers

- [x] Currency utilities
  - [x] Conversion rate lookup (`src/config/rates.ts`)
  - [x] Base unit conversion (`toBaseUnits`/`fromBaseUnits`)
  - [x] Precision formatting

**Deliverables**:
- [x] Repository classes with full CRUD
- [x] 84 unit tests passing (in-memory test DB)
- [x] Currency conversion utilities tested

---

#### 📋 Phase 2 Completion Report

```
┌─────────────────────────────────────────────────────────────────────────┐
│               PHASE 2: CORE DOMAIN & DATA LAYER - COMPLETE              │
│                         Completed: 2026-01-27                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📁 FILES CREATED                                                       │
│                                                                         │
│  Models (src/models/):                                                  │
│    • user.model.ts        - User entity, DTOs, Zod schemas              │
│    • balance.model.ts     - Balance entity with currency helpers        │
│    • transaction.model.ts - Transaction entity and schemas              │
│    • index.ts             - Barrel exports                              │
│                                                                         │
│  Repositories (src/repositories/):                                      │
│    • user.repository.ts        - User CRUD + conflict handling          │
│    • balance.repository.ts     - Balance credit/debit with validation   │
│    • transaction.repository.ts - Transaction queries with pagination    │
│    • index.ts                  - Barrel exports                         │
│                                                                         │
│  Tests (tests/):                                                        │
│    • fixtures/test-helpers.ts  - Test DB setup, seeders                 │
│    • unit/repositories/user.repository.test.ts        (23 tests)        │
│    • unit/repositories/balance.repository.test.ts     (25 tests)        │
│    • unit/repositories/transaction.repository.test.ts (16 tests)        │
│    • unit/utils/currency.test.ts                      (20 tests)        │
│                                                                         │
│  ✅ TEST RESULTS: 84 passed, 0 failed                                   │
│                                                                         │
│  🔧 KEY FEATURES IMPLEMENTED                                            │
│    • Zod validation schemas for all inputs                              │
│    • Row-to-entity converters (snake_case → camelCase)                  │
│    • Entity-to-DTO converters (hide sensitive data)                     │
│    • Conflict detection (duplicate email/username)                      │
│    • Insufficient balance detection with proper errors                  │
│    • Paginated queries with filters                                     │
│    • In-memory test database for fast unit tests                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### 🧪 Phase 2 Manual Testing Checklist

> **Instructions**: Open a separate terminal, navigate to the project directory, and run each test. Mark items complete as you go.

```bash
cd ~/workspace/multi-currency-p2p-transfer
```

---

**1. Verify New Files Exist**
```bash
# Models
ls -la src/models/
# Expected: user.model.ts, balance.model.ts, transaction.model.ts, index.ts

# Repositories
ls -la src/repositories/
# Expected: user.repository.ts, balance.repository.ts, transaction.repository.ts, index.ts

# Tests
ls -la tests/unit/repositories/
ls -la tests/unit/utils/
ls -la tests/fixtures/
```
✓ Expected: All model, repository, and test files present

---

**2. TypeScript Build**
```bash
npm run build
```
✓ Expected: Builds with no errors

---

**3. Type Check**
```bash
npm run typecheck
```
✓ Expected: No TypeScript errors

---

**4. Run All Unit Tests**
```bash
npm test
```
✓ Expected: 84 tests passing, 0 failing

> ⚠️ **Troubleshooting**: If you see `NODE_MODULE_VERSION` mismatch error for `better-sqlite3`, run:
> ```bash
> npm rebuild better-sqlite3
> ```

---

**5. Run Tests with Coverage**
```bash
npm run test:coverage
```
✓ Expected: Coverage report generated, shows percentage for each file

---

**6. Verify User Repository Tests**
```bash
npm test -- user.repository.test.ts
```
✓ Expected: 23 tests passing
- Create user, duplicate handling
- Find by ID, email, username
- Password update, count

---

**7. Verify Balance Repository Tests**
```bash
npm test -- balance.repository.test.ts
```
✓ Expected: 25 tests passing
- Initialize balances
- Credit, debit operations
- Insufficient balance detection
- Upsert functionality

---

**8. Verify Transaction Repository Tests**
```bash
npm test -- transaction.repository.test.ts
```
✓ Expected: 16 tests passing
- Create transactions
- Query by user with pagination
- Filter by type/status

---

**9. Verify Currency Utility Tests**
```bash
npm test -- currency.test.ts
```
✓ Expected: 20 tests passing
- toBaseUnits conversions
- fromBaseUnits conversions
- Formatting and validation

---

**10. Server Still Works**
```bash
npm start &
sleep 2
curl -s http://localhost:3000/health | python3 -m json.tool
lsof -ti:3000 | xargs kill -9
```
✓ Expected: Health endpoint returns `{"success":true,"data":{"status":"ok",...}}`

---

**11. Docker Still Works**
```bash
docker-compose build
docker-compose up -d
sleep 5
curl -s http://localhost:3000/health | python3 -m json.tool
docker-compose down
```
✓ Expected: Container builds, starts, and health check passes

---

**12. Lint Check (Optional)**
```bash
npm run lint 2>&1 | head -20
```
✓ Expected: No critical errors (warnings OK)

---

#### 📋 Phase 2 Testing Summary Checklist

| #  | Test                              | Pass  |
|----|-----------------------------------|-------|
| 1  | New files exist                   | [✅]  |
| 2  | TypeScript builds                 | [✅]  |
| 3  | Type check passes                 | [✅]  |
| 4  | All 84 unit tests pass            | [✅]  |
| 5  | Coverage report generates         | [✅]  |
| 6  | User repository tests pass (23)   | [✅]  |
| 7  | Balance repository tests pass (25)| [✅]  |
| 8  | Transaction repository tests (16) | [✅]  |
| 9  | Currency utility tests pass (20)  | [✅]  |
| 10 | Server health check works         | [✅]  |
| 11 | Docker build and health works     | [✅]  |
| 12 | Lint check passes                 | [✅]  |

**Phase 2 Testing Completed**: [✅] *(Date: 2026-01-27)*

---

### Phase 3: Business Logic Layer ✅

**Goals**: Implement services with core business logic

- [x] User service
  - Registration (hash password with bcrypt)
  - Login (verify password, generate JWT token)
  - Get user by ID/email/username
  - Change password
  - Token verification

- [x] Balance service
  - Get all balances for user
  - Get balance by currency
  - Initialize balances for new user
  - Credit/debit operations
  - Sufficient balance checks

- [x] Transaction service
  - **Deposit**: Add funds to balance with transaction record
  - **Transfer**: Execute P2P transfer with currency conversion
  - **Get history**: Query transactions with pagination
  - **Preview conversion**: Calculate conversion rates
  - **Get transaction**: View individual transaction
  - **Get stats**: Transaction counts by type

- [x] Validation layer
  - Input schemas (Zod) for all inputs
  - Business rule validators (self-transfer prevention, etc.)
  - Error types (BusinessRuleError added)

**Deliverables**:
- [x] Service classes with business logic (3 services)
- [x] Unit tests for all services (91 new tests, 175 total)
- [x] Edge case handling (insufficient balance, invalid users, etc.)

---

#### 📋 Phase 3 Completion Report

```
┌─────────────────────────────────────────────────────────────────────────┐
│               PHASE 3: BUSINESS LOGIC LAYER - COMPLETE                  │
│                         Completed: 2026-01-27                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📁 FILES CREATED                                                       │
│                                                                         │
│  Services (src/services/):                                              │
│    • user.service.ts        - Registration, login, JWT auth, password   │
│    • balance.service.ts     - Balance queries, credit/debit operations  │
│    • transaction.service.ts - Deposits, transfers, history, conversion  │
│    • index.ts               - Barrel exports with singleton getters     │
│                                                                         │
│  Tests (tests/unit/services/):                                          │
│    • user.service.test.ts        (27 tests)                             │
│    • balance.service.test.ts     (24 tests)                             │
│    • transaction.service.test.ts (40 tests)                             │
│                                                                         │
│  Models Updated (src/models/):                                          │
│    • user.model.ts          - Added LoginInput, loginSchema             │
│    • transaction.model.ts   - Added DepositInput, TransferInput,        │
│                               TransactionDTO, depositSchema             │
│                                                                         │
│  Errors Updated (src/utils/errors.ts):                                  │
│    • BusinessRuleError      - For business rule violations              │
│                                                                         │
│  ✅ TEST RESULTS: 175 passed, 0 failed                                  │
│    - Repository tests: 84 (existing from Phase 2)                       │
│    - Service tests: 91 (new)                                            │
│                                                                         │
│  🔧 KEY FEATURES IMPLEMENTED                                            │
│    • JWT-based authentication (sign, verify, expiration)                │
│    • Password hashing with bcrypt (12 rounds)                           │
│    • Atomic transfers using database transactions                       │
│    • Currency conversion with configurable rates                        │
│    • Balance validation before transfers                                │
│    • Self-transfer prevention                                           │
│    • Transaction history with pagination and filters                    │
│    • Conversion preview without executing transfer                      │
│                                                                         │
│  🔄 FIXES APPLIED                                                       │
│    • ValidationError signature (Record instead of array)                │
│    • Method name alignment (findAllByUserId, initializeForUser)         │
│    • withTransaction accepts optional database parameter                │
│    • better-sqlite3 NODE_MODULE_VERSION rebuild (recurring issue)       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### 🧪 Phase 3 Manual Testing Checklist

**1. Verify New Files Exist**
```bash
ls -la src/services/
```
✓ Expected: user.service.ts, balance.service.ts, transaction.service.ts, index.ts

**2. TypeScript Build**
```bash
npm run build
```
✓ Expected: Build completes with no errors

**3. Type Check**
```bash
npm run typecheck
```
✓ Expected: No type errors (silent success)

**4. Run All Unit Tests**
```bash
npm test
```
✓ Expected: 175 tests passing, 0 failing

> ⚠️ **Troubleshooting**: If you see `NODE_MODULE_VERSION` mismatch error for `better-sqlite3` (155 tests failing, only currency tests pass), run:
> ```bash
> npm rebuild better-sqlite3
> ```
> This issue has occurred in every phase of development.

**5. Run Tests with Coverage**
```bash
npm run test:coverage
```
✓ Expected: Coverage report generated, all tests pass

**6. User Service Tests Pass (27)**
```bash
npm test -- --testPathPattern="user.service"
```
✓ Expected: 27 tests passing

**7. Balance Service Tests Pass (24)**
```bash
npm test -- --testPathPattern="balance.service"
```
✓ Expected: 24 tests passing

**8. Transaction Service Tests Pass (40)**
```bash
npm test -- --testPathPattern="transaction.service"
```
✓ Expected: 40 tests passing

**9. Server Health Check Still Works**
```bash
npm run dev &
sleep 2
curl -s http://localhost:3000/health | jq
kill %1
```
✓ Expected: Returns JSON with status "ok" and database "connected"

**10. Docker Build Still Works**
```bash
docker-compose up --build -d
sleep 5
curl -s http://localhost:3000/health | jq
docker-compose down
```
✓ Expected: Container runs, health endpoint returns 200

**11. Lint Check Passes**
```bash
npm run lint 2>&1 | head -20
```
✓ Expected: No errors (warnings OK)

---

#### 📋 Phase 3 Testing Summary Checklist

| #  | Test                              | Pass  |
|----|-----------------------------------|-------|
| 1  | New service files exist           | [✅]  |
| 2  | TypeScript builds                 | [✅]  |
| 3  | Type check passes                 | [✅]  |
| 4  | All 175 unit tests pass           | [✅]  |
| 5  | Coverage report generates         | [✅]  |
| 6  | User service tests pass (27)      | [✅]  |
| 7  | Balance service tests pass (24)   | [✅]  |
| 8  | Transaction service tests pass (40)| [✅] |
| 9  | Server health check works         | [✅]  |
| 10 | Docker build and health works     | [✅]  |
| 11 | Lint check passes                 | [✅]  |

**Phase 3 Testing Completed**: [✅] *(Date: 2026-01-27)*

---

### Phase 4: API Layer ✅ COMPLETE

**Goals**: Build RESTful API endpoints

**Completed**: 2026-01-27

- [x] Authentication endpoints
  - POST `/api/auth/register`
  - POST `/api/auth/login`
  - GET `/api/auth/me` (get current user profile)

- [x] Balance endpoints
  - GET `/api/balances`
  - GET `/api/balances/:currency`
  - POST `/api/deposit`

- [x] Transaction endpoints
  - POST `/api/transfer`
  - GET `/api/transactions`
  - GET `/api/transactions/:id`
  - GET `/api/transactions/stats`

- [x] Conversion endpoints
  - GET `/api/rates?from=X&to=Y`
  - GET `/api/convert/preview?from=X&to=Y&amount=N`

- [x] Middleware
  - Authentication (JWT verification)
  - Error handling (already existed from Phase 1)
  - Rate limiting (already existed from Phase 1)

- [x] Route organization
  - Group routes by domain (auth, balance, transaction)
  - Apply middleware appropriately

**Deliverables**:
- [x] All API endpoints functional
- [x] Integration tests for all endpoints (43 new tests, 218 total)
- [x] Test fixture for in-memory database testing

---

#### 📋 Phase 4 Completion Report

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: API LAYER - COMPLETE                        │
│                         Completed: 2026-01-27                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📁 FILES CREATED                                                       │
│                                                                         │
│  Controllers (src/controllers/):                                        │
│    • auth.controller.ts       - Register, login, profile endpoints      │
│    • balance.controller.ts    - Get balances, deposit endpoint          │
│    • transaction.controller.ts- Transfer, history, stats, conversion    │
│    • index.ts                 - Barrel exports                          │
│                                                                         │
│  Middleware (src/middleware/):                                          │
│    • auth.middleware.ts       - JWT authentication middleware           │
│                                                                         │
│  Routes (src/routes/):                                                  │
│    • auth.routes.ts           - Auth route definitions                  │
│    • balance.routes.ts        - Balance route definitions               │
│    • transaction.routes.ts    - Transaction route definitions           │
│    • index.ts (updated)       - Mount all API routes                    │
│                                                                         │
│  Tests (tests/):                                                        │
│    • fixtures/test-app.ts     - Test app with in-memory SQLite          │
│    • integration/auth.test.ts        (12 tests)                         │
│    • integration/balance.test.ts     (11 tests)                         │
│    • integration/transaction.test.ts (21 tests)                         │
│                                                                         │
│  ✅ TEST RESULTS: 218 passed, 0 failed                                  │
│    - Unit tests: 175 (existing)                                         │
│    - Integration tests: 43 (new)                                        │
│                                                                         │
│  🔧 KEY FEATURES IMPLEMENTED                                            │
│    • JWT-based authentication middleware                                │
│    • RESTful API for all core operations                                │
│    • Currency conversion preview endpoint                               │
│    • Transaction statistics endpoint                                    │
│    • Case-insensitive currency handling                                 │
│    • Proper HTTP status codes (200, 201, 400, 401, 404, 409, 422)       │
│    • Integration tests with in-memory database                          │
│                                                                         │
│  🔄 FIXES APPLIED                                                       │
│    • Repository database getter pattern (lazy evaluation)               │
│    • BigInt serialization to string for JSON responses                  │
│    • better-sqlite3 NODE_MODULE_VERSION rebuild (recurring issue)       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### 🧪 Phase 4 Manual Testing Checklist

> **Instructions**: Open a separate terminal, navigate to the project directory, and run each test. Mark items complete as you go.

```bash
cd ~/workspace/multi-currency-p2p-transfer
```

---

**1. Verify New Files Exist**
```bash
# Controllers
ls -la src/controllers/
# Expected: auth.controller.ts, balance.controller.ts, transaction.controller.ts, index.ts

# Middleware
ls -la src/middleware/
# Expected: auth.middleware.ts, error.middleware.ts

# Routes
ls -la src/routes/
# Expected: auth.routes.ts, balance.routes.ts, transaction.routes.ts, health.routes.ts, index.ts

# Integration tests
ls -la tests/integration/
ls -la tests/fixtures/
```
✓ Expected: All controller, middleware, route, and test files present

---

**2. TypeScript Build**
```bash
npm run build
```
✓ Expected: Builds with no errors

---

**3. Type Check**
```bash
npm run typecheck
```
✓ Expected: No TypeScript errors

---

**4. Run All Tests**
```bash
npm test
```
✓ Expected: 218 tests passing, 0 failing

> ⚠️ **Troubleshooting**: If you see `NODE_MODULE_VERSION` mismatch error for `better-sqlite3`, run:
> ```bash
> npm rebuild better-sqlite3
> ```

---

**5. Run Integration Tests Only**
```bash
npm test -- --testPathPattern="integration"
```
✓ Expected: 44 integration tests passing

---

**6. Start Development Server**

> ⚠️ **Note**: Run the server in its own terminal tab so you can see logs. Keep it running for tests 7-12.

```bash
# First, ensure port 3000 is free
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start server (keep this terminal open)
npm run dev
```
✓ Expected: Server starts with "Database initialized" and no errors

---

**7. Test Health Endpoint**

> 📌 **Open a NEW terminal tab** for this and the following curl commands (tests 7-12). Keep the server running in the original tab.

```bash
curl -s http://localhost:3000/health | jq
```
✓ Expected: Returns status "ok" with database "connected"

---

**8. Test User Registration**
```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"TestPass123!"}' | jq
```
✓ Expected: 201 response with user data and token

---

**9. Test User Login**
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testuser","password":"TestPass123!"}' | jq
```
✓ Expected: 200 response with user data and token

---

**10. Test Deposit (save token from login first)**
```bash
TOKEN="<paste-token-here>"
curl -s -X POST http://localhost:3000/api/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD","amount":1000}' | jq
```
✓ Expected: 201 response with transaction and new balance

---

**11. Test Get Balances**
```bash
curl -s http://localhost:3000/api/balances \
  -H "Authorization: Bearer $TOKEN" | jq
```
✓ Expected: 200 response with all currency balances

---

**12. Test Conversion Rate (no auth required)**
```bash
curl -s "http://localhost:3000/api/rates?from=USD&to=EUR" | jq
```
✓ Expected: 200 response with rate 0.91

---

**13. Stop Development Server**

> 📌 Go back to the terminal tab running the server.

```bash
# Press Ctrl+C in the server terminal, or from any terminal run:
lsof -ti:3000 | xargs kill -9
```

---

**14. Docker Build**
```bash
docker-compose build
docker-compose up -d
sleep 5
curl -s http://localhost:3000/health | jq
docker-compose down
```
✓ Expected: Container builds, starts, and health check passes

---

**15. Lint Check**
```bash
npm run lint 2>&1 | head -20
```
✓ Expected: No errors (warnings OK)

---

#### 📋 Phase 4 Testing Summary Checklist

| #  | Test                              | Pass  |
|----|-----------------------------------|-------|
| 1  | New files exist                   | [✅]  |
| 2  | TypeScript builds                 | [✅]  |
| 3  | Type check passes                 | [✅]  |
| 4  | All 218 tests pass                | [✅]  |
| 5  | Integration tests pass (44)       | [✅]  |
| 6  | Dev server starts                 | [✅]  |
| 7  | Health endpoint works             | [✅]  |
| 8  | Registration works                | [✅]  |
| 9  | Login works                       | [✅]  |
| 10 | Deposit works                     | [✅]  |
| 11 | Get balances works                | [✅]  |
| 12 | Conversion rate works             | [✅]  |
| 13 | Server stops cleanly              | [✅]  |
| 14 | Docker build and health works     | [✅]  |
| 15 | Lint check passes                 | [✅]  |

**Phase 4 Testing Completed**: [✅] *(Date: 2026-01-27)*

---

### Phase 5: Testing ✅ COMPLETE

**Goals**: Comprehensive test coverage

**Completed**: 2026-01-27

- [x] Unit tests
  - Services (95%+ coverage)
  - Repositories (97%+ coverage)
  - Utilities (84%+ coverage)
  - Config (rates 100% coverage)
  - Middleware (95%+ coverage)
  - Routes (100% coverage)

- [x] Integration tests
  - API endpoints (happy paths)
  - Error scenarios (4xx, 5xx)
  - Transaction atomicity

- [x] Edge case tests
  - Precision edge cases
  - Boundary values (0, max amounts)
  - Invalid inputs
  - ZodError handling

- [x] Test data fixtures
  - Sample users
  - Pre-populated balances
  - Transaction history

**Deliverables**:
- [x] Jest configured with coverage reporting
- [x] All 257 tests passing
- [x] Coverage exceeds 70% threshold in all categories:
  - Statements: 90.76%
  - Branches: 74.87%
  - Functions: 87.34%
  - Lines: 91.15%

---

#### 📋 Phase 5 Completion Report

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: TESTING - COMPLETE                          │
│                         Completed: 2026-01-27                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📁 TEST FILES CREATED                                                  │
│                                                                         │
│  Unit Tests (tests/unit/):                                              │
│    • config/rates.test.ts           - Rate functions (16 tests)         │
│    • middleware/auth.middleware.test.ts    - JWT auth (9 tests)         │
│    • middleware/error.middleware.test.ts   - Error handling (9 tests)   │
│    • routes/health.routes.test.ts   - Health endpoints (5 tests)        │
│    • repositories/*.test.ts         - Repository tests (64 tests)       │
│    • services/*.test.ts             - Service tests (91 tests)          │
│    • utils/currency.test.ts         - Currency utils (20 tests)         │
│                                                                         │
│  Integration Tests (tests/integration/):                                │
│    • auth.test.ts        - Auth API (12 tests)                          │
│    • balance.test.ts     - Balance API (11 tests)                       │
│    • transaction.test.ts - Transaction API (21 tests)                   │
│                                                                         │
│  ✅ TEST RESULTS: 257 passed, 0 failed                                  │
│                                                                         │
│  📊 COVERAGE SUMMARY                                                    │
│  ┌──────────────┬──────────┬───────────┬────────┐                       │
│  │ Metric       │ Coverage │ Threshold │ Status │                       │
│  ├──────────────┼──────────┼───────────┼────────┤                       │
│  │ Statements   │ 90.76%   │ 70%       │   ✅   │                       │
│  │ Branches     │ 74.87%   │ 70%       │   ✅   │                       │
│  │ Functions    │ 87.34%   │ 70%       │   ✅   │                       │
│  │ Lines        │ 91.15%   │ 70%       │   ✅   │                       │
│  └──────────────┴──────────┴───────────┴────────┘                       │
│                                                                         │
│  📁 COVERAGE BY AREA                                                    │
│    • Routes:       100% statements                                      │
│    • Repositories: 97% statements                                       │
│    • Services:     95% statements                                       │
│    • Middleware:   96% statements                                       │
│    • Controllers:  94% statements                                       │
│    • Config:       71% statements (database init code)                  │
│    • Utils:        84% statements                                       │
│                                                                         │
│  🔧 TESTS ADDED THIS PHASE                                              │
│    • rates.test.ts - Tests all conversion functions                     │
│    • auth.middleware.test.ts - Tests JWT auth middleware                │
│    • error.middleware.test.ts - Tests error handling                    │
│    • health.routes.test.ts - Tests health check endpoints               │
│                                                                         │
│  ⚠️ RECURRING ISSUE                                                     │
│    better-sqlite3 NODE_MODULE_VERSION mismatch occurred again during    │
│    coverage testing. Fix: npm rebuild better-sqlite3                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### 🧪 Phase 5 Manual Testing Checklist

**1. Run All Tests**
```bash
npm test
```
✓ Expected: 257 tests passing, 0 failing

> ⚠️ **Troubleshooting**: If you see `NODE_MODULE_VERSION` mismatch error for `better-sqlite3`, run:
> ```bash
> npm rebuild better-sqlite3
> ```

**2. Run Tests with Coverage**
```bash
npm run test:coverage
```
✓ Expected: All coverage thresholds met (70%+)

**3. Verify Coverage Report**
```bash
ls -la coverage/
open coverage/lcov-report/index.html  # macOS
```
✓ Expected: HTML coverage report generated

---

#### 📋 Phase 5 Testing Summary Checklist

| #  | Test                              | Pass  |
|----|-----------------------------------|-------|
| 1  | All 257 tests pass                | [✅]  |
| 2  | Statements coverage ≥70%          | [✅]  |
| 3  | Branches coverage ≥70%            | [✅]  |
| 4  | Functions coverage ≥70%           | [✅]  |
| 5  | Lines coverage ≥70%               | [✅]  |

**Phase 5 Testing Completed**: [✅] *(Date: 2025_01_27)*

---

### Phase 6: Security & Production Readiness ✅ COMPLETE

**Goals**: Harden security, add production features

**Completed**: 2026-01-27

- [x] Security enhancements
  - [x] Helmet.js security headers (already in place)
  - [x] Rate limiting (express-rate-limit) (already in place)
  - [x] Input sanitization (XSS protection via `xss` package)
  - [x] SQL injection prevention audit (parameterized queries confirmed)

- [x] Logging improvements
  - [x] Request/response logging (already in place)
  - [x] Error logging with stack traces (already in place)
  - [x] Audit logs for sensitive operations (dedicated audit logger added)

- [x] Error handling
  - [x] Global error handler (already in place)
  - [x] Consistent error format (already in place)
  - [x] User-friendly messages (already in place)

- [x] Performance
  - [x] Database query optimization (WAL mode, prepared statements)
  - [x] Index verification (all critical indexes in place)
  - [x] Response compression (gzip via `compression` package)

**Deliverables**:
- [x] Security audit checklist completed
- [x] Logging framework configured with audit logs
- [x] Performance optimizations applied

---

#### 📋 Phase 6 Completion Report

```
┌─────────────────────────────────────────────────────────────────────────┐
│           PHASE 6: SECURITY & PRODUCTION READINESS - COMPLETE           │
│                         Completed: 2026-01-27                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📦 PACKAGES ADDED                                                      │
│    • compression (gzip/deflate response compression)                    │
│    • xss (XSS sanitization library)                                     │
│    • @types/compression (TypeScript definitions)                        │
│                                                                         │
│  📁 FILES CREATED/MODIFIED                                              │
│                                                                         │
│  New Files:                                                             │
│    • src/middleware/sanitize.middleware.ts                              │
│      - sanitizeInput middleware for XSS protection                      │
│      - sanitizeString utility for manual sanitization                   │
│                                                                         │
│  Modified Files:                                                        │
│    • src/app.ts                                                         │
│      - Added compression middleware                                     │
│      - Added sanitizeInput middleware                                   │
│                                                                         │
│    • src/utils/logger.ts                                                │
│      - Added dedicated auditLogger with sensitive data masking          │
│      - Audit logs written to separate audit.log file                    │
│      - Email masking (shows first 2 chars + domain)                     │
│      - Password/token redaction                                         │
│                                                                         │
│    • src/services/user.service.ts                                       │
│      - Added audit logging for USER_REGISTERED                          │
│      - Added audit logging for USER_LOGIN                               │
│                                                                         │
│    • src/services/transaction.service.ts                                │
│      - Added audit logging for DEPOSIT_COMPLETED                        │
│      - Added audit logging for TRANSFER_COMPLETED                       │
│                                                                         │
│  ✅ TEST RESULTS: 257 passed, 0 failed                                  │
│                                                                         │
│  🔒 SECURITY FEATURES                                                   │
│  ┌────────────────────────┬──────────────────────────────────────────┐  │
│  │ Feature                │ Implementation                           │  │
│  ├────────────────────────┼──────────────────────────────────────────┤  │
│  │ Helmet.js              │ Security headers (X-Frame-Options, etc.) │  │
│  │ Rate Limiting          │ 100 req/min, configurable via env        │  │
│  │ XSS Protection         │ Input sanitization middleware            │  │
│  │ SQL Injection          │ Parameterized queries (better-sqlite3)   │  │
│  │ Request Size Limit     │ 10kb max body size                       │  │
│  │ Password Security      │ bcrypt with 12 rounds                    │  │
│  │ JWT Authentication     │ Short expiration, secure verification    │  │
│  │ Audit Logging          │ Separate log file with data masking      │  │
│  │ Response Compression   │ gzip/deflate for all responses           │  │
│  └────────────────────────┴──────────────────────────────────────────┘  │
│                                                                         │
│  📊 AUDIT LOG EVENTS                                                    │
│    • USER_REGISTERED - New user registration                            │
│    • USER_LOGIN - Successful login                                      │
│    • DEPOSIT_COMPLETED - Funds deposited                                │
│    • TRANSFER_COMPLETED - P2P transfer completed                        │
│                                                                         │
│  ⚠️ RECURRING ISSUE                                                     │
│    better-sqlite3 NODE_MODULE_VERSION mismatch occurred again:          │
│    - After installing new packages (during implementation)              │
│    - During manual testing checklist                                    │
│    Fix: npm rebuild better-sqlite3                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### 🧪 Phase 6 Manual Testing Checklist

**1. Verify Build**
```bash
npm run build
```
✓ Expected: Builds with no errors

**2. Run All Tests**
```bash
npm test
```
✓ Expected: 257 tests passing, 0 failing

> ⚠️ **Troubleshooting**: If you see `NODE_MODULE_VERSION` mismatch error for `better-sqlite3`, run:
> ```bash
> npm rebuild better-sqlite3
> ```

**3. Test Compression (start server first in separate terminal)**
```bash
npm run dev
```
Then in another terminal:
```bash
curl -s -H "Accept-Encoding: gzip" http://localhost:3000/health -o /dev/null -w "%{size_download} bytes\n"
curl -s http://localhost:3000/health -o /dev/null -w "%{size_download} bytes\n"
```
✓ Expected: First request should return fewer bytes (compressed)

**4. Test XSS Sanitization**
```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test<script>@example.com","username":"test<img src=x>","password":"TestPass123!"}' | jq
```
✓ Expected: HTML tags stripped from email/username in response

**5. Verify Audit Log Created**
```bash
ls -la logs/
cat logs/audit.log | head -5
```
✓ Expected: audit.log file exists with JSON entries

---

#### 📋 Phase 6 Testing Summary Checklist

| #  | Test                              | Pass  |
|----|-----------------------------------|-------|
| 1  | TypeScript builds                 | [✅]  |
| 2  | All 257 tests pass                | [✅]  |
| 3  | Compression working               | [✅]  |
| 4  | XSS sanitization working          | [✅]  |
| 5  | Audit log created                 | [✅]  |

**Phase 6 Testing Completed**: [ ] *(Date: ________)*

---

### Phase 7: Documentation & Deployment

**Goals**: Complete documentation, finalize deployment

- [ ] README.md
  - Quick start guide
  - API endpoint documentation
  - Test data examples
  - Architecture decisions
  - AI usage documentation
  
- [ ] Code documentation
  - JSDoc comments for public APIs
  - Inline comments for complex logic
  - Type definitions complete
  
- [ ] Docker optimization
  - Multi-stage build
  - Minimize image size
  - Health checks
  
- [ ] Deployment validation
  - Test `docker-compose up` from scratch
  - Verify test data works
  - Run full test suite in container
  
- [ ] Final polish
  - Code formatting
  - Remove dead code
  - Update dependencies

**Deliverables**:
- Complete README.md
- All documentation updated
- Production-ready Docker setup
- Final code review completed

---

### Phase 8: Frontend Development (Bonus)

**Goals**: Create an impressive, functional frontend UI

**Reference Design**: https://zbd.gg/ (match styling, colors, and aesthetic)

- [ ] Frontend framework setup
  - Choose framework (React, Vue, or vanilla)
  - Setup build tooling
  - Configure to work with Docker

- [ ] UI/UX Design
  - Match styling to ZBD (https://zbd.gg/)
  - Dark theme with vibrant accent colors
  - Modern, sleek fintech aesthetic
  - Responsive design

- [ ] Core pages/components
  - Login/Register page
  - Dashboard with balances
  - Transfer form with currency conversion preview
  - Transaction history view

- [ ] API integration
  - Connect to backend endpoints
  - Handle authentication (JWT storage)
  - Real-time balance updates

- [ ] Docker integration
  - Add frontend to docker-compose
  - Configure nginx or serve static files
  - Single `docker-compose up` starts everything

**Deliverables**:
- Functional frontend matching reference styling
- All core features accessible via UI
- Integrated with Docker setup

---

### Phase 9: Final QA & Verification

**Goals**: Thorough end-to-end verification before marking complete

- [ ] Fresh clone test
  - Clone repo to new directory
  - Follow README instructions exactly
  - Verify everything works first try

- [ ] Docker verification
  - `docker-compose up` from scratch
  - All services start correctly
  - Health checks pass
  - Data persists across restarts

- [ ] Full feature walkthrough
  - Register new user
  - Login
  - Deposit all currency types
  - Transfer between users (same currency)
  - Transfer with conversion (cross-currency)
  - View transaction history
  - Check balances

- [ ] Frontend verification (if Phase 8 complete)
  - All pages render correctly
  - Forms submit and validate properly
  - Error messages display correctly
  - Responsive on mobile/tablet

- [ ] Edge case testing
  - Invalid inputs handled gracefully
  - Insufficient balance errors
  - Network error handling
  - Rate limiting behavior

- [ ] Documentation review
  - README is accurate and complete
  - All curl examples work
  - Architecture diagrams up to date

- [ ] Code quality final check
  - No console.log statements
  - No commented-out code
  - All tests pass
  - Linting passes

**Deliverables**:
- Verified working system from fresh clone
- All features tested end-to-end
- Documentation verified accurate
- Ready for submission/presentation

---

## Testing Strategy

### Testing Pyramid

```
        /\
       /  \      E2E Tests (few)
      /----\     API/Integration Tests (some)
     /------\    Unit Tests (many)
    /________\
```

### 1. Unit Tests (60% of tests)

**Scope**: Test individual functions/methods in isolation

**Tools**: Jest with mocked dependencies

**Coverage Areas**:
- Service layer business logic
- Repository data access
- Utility functions (conversions, validations)
- Domain model methods

**Example**:
```typescript
// tests/unit/services/transaction.service.test.ts
describe('TransactionService', () => {
  let service: TransactionService;
  let mockTransactionRepo: jest.Mocked<TransactionRepository>;
  let mockBalanceRepo: jest.Mocked<BalanceRepository>;
  
  beforeEach(() => {
    mockTransactionRepo = createMockTransactionRepo();
    mockBalanceRepo = createMockBalanceRepo();
    service = new TransactionService(mockTransactionRepo, mockBalanceRepo);
  });
  
  describe('executeTransfer', () => {
    it('should transfer USD to BTC successfully', async () => {
      // Arrange
      mockBalanceRepo.getBalance.mockResolvedValue({
        userId: 1,
        currency: 'USD',
        amount: BigInt(10000), // $100
      });
      
      // Act
      const result = await service.executeTransfer({
        senderId: 1,
        receiverEmail: 'bob@example.com',
        fromCurrency: 'USD',
        toCurrency: 'BTC',
        amount: 100,
      });
      
      // Assert
      expect(result.fromAmount).toBe(100);
      expect(result.toAmount).toBe(0.004);
      expect(mockBalanceRepo.updateBalance).toHaveBeenCalledTimes(2);
    });
    
    it('should throw error on insufficient balance', async () => {
      // Arrange
      mockBalanceRepo.getBalance.mockResolvedValue({
        userId: 1,
        currency: 'USD',
        amount: BigInt(1000), // $10
      });
      
      // Act & Assert
      await expect(
        service.executeTransfer({
          senderId: 1,
          receiverEmail: 'bob@example.com',
          fromCurrency: 'USD',
          toCurrency: 'BTC',
          amount: 100, // Trying to send $100
        })
      ).rejects.toThrow(InsufficientBalanceError);
    });
  });
});
```

### 2. Integration Tests (~30% of tests)

**Scope**: Test API endpoints with real database

**Tools**: Jest + Supertest + test database

**Coverage Areas**:
- All API endpoints (happy paths)
- Error handling (4xx, 5xx responses)
- Authentication flow
- Transaction atomicity

**Example**:
```typescript
// tests/integration/api/transfer.test.ts
describe('POST /api/transfer', () => {
  let app: Express;
  let db: Database;
  let aliceToken: string;
  
  beforeAll(async () => {
    app = createApp();
    db = await createTestDatabase();
    await seedTestData(db);
    aliceToken = await loginUser('alice@example.com', 'password');
  });
  
  afterAll(async () => {
    await db.close();
  });
  
  it('should transfer USD to BTC successfully', async () => {
    const response = await request(app)
      .post('/api/transfer')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        recipientEmail: 'bob@example.com',
        fromCurrency: 'USD',
        toCurrency: 'BTC',
        amount: 100,
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.fromAmount).toBe(100);
    expect(response.body.data.toAmount).toBe(0.004);
    
    // Verify balance changes
    const aliceBalance = await getBalance(1, 'USD');
    expect(aliceBalance).toBe(900); // Started with 1000
    
    const bobBalance = await getBalance(2, 'BTC');
    expect(bobBalance).toBe(0.004);
  });
  
  it('should return 400 for invalid currency', async () => {
    const response = await request(app)
      .post('/api/transfer')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        recipientEmail: 'bob@example.com',
        fromCurrency: 'INVALID',
        toCurrency: 'BTC',
        amount: 100,
      });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
```

### 3. End-to-End Tests (~10% of tests)

**Scope**: Complete user journeys

**Coverage Areas**:
- Register → Deposit → Transfer → View history
- Error recovery flows
- Concurrent operations

**Example**:
```typescript
describe('E2E: Complete transfer flow', () => {
  it('should allow new user to register, deposit, and transfer', async () => {
    // 1. Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'charlie@example.com',
        username: 'charlie',
        password: 'SecurePass123!',
      });
    expect(registerRes.status).toBe(201);
    
    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'charlie@example.com',
        password: 'SecurePass123!',
      });
    const token = loginRes.body.data.token;
    
    // 3. Deposit
    const depositRes = await request(app)
      .post('/api/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ currency: 'USD', amount: 500 });
    expect(depositRes.body.data.newBalance).toBe(500);
    
    // 4. Transfer
    const transferRes = await request(app)
      .post('/api/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipientEmail: 'alice@example.com',
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 100,
      });
    expect(transferRes.status).toBe(200);
    
    // 5. Check history
    const historyRes = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(historyRes.body.data.transactions).toHaveLength(2); // Deposit + Transfer
  });
});
```

### Edge Cases to Test

1. **Concurrent Transfers**
   - Two users transferring to same recipient simultaneously
   - Same user making multiple transfers concurrently

2. **Precision Edge Cases**
   - Very small amounts (0.00000001 BTC)
   - Very large amounts (millions USD)
   - Rounding errors accumulation

3. **Boundary Values**
   - Zero amounts (should reject)
   - Exactly available balance
   - Negative amounts (should reject)

4. **Invalid Inputs**
   - Non-existent recipient
   - Invalid currency codes
   - Malformed requests
   - Missing required fields

5. **Authentication/Authorization**
   - Expired tokens
   - Invalid tokens
   - Missing tokens
   - Transfer to self (should reject)

### Test Data Fixtures

```typescript
// tests/fixtures/test-data.ts
export const TEST_USERS = [
  {
    email: 'alice@example.com',
    username: 'alice',
    password: 'AlicePass123!',
    balances: {
      USD: 1000,
      EUR: 500,
      BTC: 0.1,
      ETH: 2,
    },
  },
  {
    email: 'bob@example.com',
    username: 'bob',
    password: 'BobPass123!',
    balances: {
      USD: 2000,
      BTC: 0.05,
    },
  },
];

export async function seedTestData(db: Database) {
  for (const user of TEST_USERS) {
    const userId = await createUser(db, user);
    for (const [currency, amount] of Object.entries(user.balances)) {
      await createBalance(db, userId, currency, amount);
    }
  }
}
```

### Coverage Goals

- **Overall**: 80%+ code coverage
- **Business Logic (Services)**: 90%+ coverage
- **Critical Paths**: 100% coverage (transfer, deposit, balance updates)

### Test Execution

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- transaction.service.test.ts

# Run integration tests only
npm run test:integration

# Watch mode during development
npm run test:watch
```

---

## Deployment & DevOps

### Docker Setup

#### Dockerfile (Multi-stage build)

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: p2p-payment-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=/app/data/database.sqlite
      - JWT_SECRET=${JWT_SECRET:-default-secret-change-in-production}
      - JWT_EXPIRATION=30m
      - BCRYPT_ROUNDS=12
      - RATE_LIMIT_WINDOW_MS=60000
      - RATE_LIMIT_MAX_REQUESTS=100
    volumes:
      - sqlite-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

volumes:
  sqlite-data:
    driver: local
```

**Note**: SQLite doesn't require a separate database container since it's file-based. The database file is stored in a Docker volume for persistence.

#### docker/init.sql

(Schema already defined in Database Design section - copy there)

### Environment Configuration

#### .env.example

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=./data/database.sqlite

# Authentication
JWT_SECRET=your-secret-key-here-generate-strong-random-value
JWT_EXPIRATION=30m

# Security
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Deployment Commands

```bash
# Build and start
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Stop and remove volumes (reset database)
docker-compose down -v

# Rebuild without cache
docker-compose build --no-cache
```

### Health Check Endpoint

```typescript
// src/routes/health.ts
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});
```

### Production Considerations

1. **Database Backups**
   - SQLite file at `/app/data/database.sqlite` in container
   - Regular backups of Docker volume
   - For production, consider PostgreSQL instead

2. **Secrets Management**
   - Use Docker secrets or environment variable injection
   - Never commit `.env` file
   - Rotate JWT secrets regularly

3. **Monitoring**
   - Add application metrics (Prometheus/Grafana)
   - Error tracking (Sentry)
   - Uptime monitoring

4. **Scalability**
   - SQLite is single-writer (not suitable for high concurrency)
   - For production scale, migrate to PostgreSQL/MySQL
   - Add Redis for caching/session management

---

## Code Quality Standards

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### ESLint Configuration

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### Code Style Guidelines

1. **Naming Conventions**
   - `PascalCase` for classes, interfaces, types
   - `camelCase` for functions, variables
   - `UPPER_SNAKE_CASE` for constants
   - Prefix interfaces with `I` only if needed for clarity

2. **Function Guidelines**
   - Max function length: 50 lines
   - Single responsibility principle
   - Pure functions where possible
   - Async/await over promises (no `.then()` chaining)

3. **Error Handling**
   - Custom error classes for domain errors
   - Always catch async errors
   - Never swallow errors silently

4. **Comments**
   - JSDoc for public APIs
   - Inline comments for complex logic only
   - Avoid obvious comments

### Pre-commit Hooks (Husky)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

### Code Review Checklist

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] ESLint warnings addressed
- [ ] Code formatted with Prettier
- [ ] No sensitive data in code/commits
- [ ] Error handling implemented
- [ ] Logging added for important operations
- [ ] Documentation updated
- [ ] No dead code
- [ ] Constants extracted (no magic numbers)

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Concurrent transaction race conditions** | Medium | High | Use database transactions with row locking (SELECT FOR UPDATE) |
| **Floating-point precision errors** | High | High | Store amounts as integers (base units), validated in tests |
| **SQL injection** | Low | Critical | Use parameterized queries exclusively, code review |
| **Password security breach** | Low | Critical | bcrypt with high salt rounds, never log passwords |
| **Insufficient balance edge cases** | Medium | Medium | Atomic balance checks within transaction, comprehensive tests |
| **JWT token compromise** | Low | High | Short expiration, secure storage, HTTPS only |
| **SQLite write concurrency** | Medium | Medium | Document limitation, recommend PostgreSQL for production |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Incorrect conversion rates** | Medium | High | Comprehensive unit tests, validation against known values |
| **Transaction reversal needed** | Low | Medium | Immutable transactions, implement compensating transactions if needed |
| **Currency precision mismatch** | Low | Medium | Strict precision definitions, conversion utilities tested |
| **User transfers to self** | Low | Low | Validation check in service layer |

### Deployment Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Docker build failure** | Low | Low | Multi-stage build tested, health checks |
| **Environment variable misconfiguration** | Medium | Medium | `.env.example` template, validation on startup |
| **Database migration issues** | Low | Medium | init.sql tested, version control for schema |

---

## Success Metrics

### Functional Requirements

- ✅ User registration and authentication working
- ✅ Deposit funds in all supported currencies
- ✅ Transfer between users with automatic conversion
- ✅ View transaction history with correct amounts
- ✅ Balance validation preventing overdrafts
- ✅ All API endpoints functional and documented

### Non-Functional Requirements

- ✅ Application starts with `docker-compose up`
- ✅ 80%+ test coverage
- ✅ All tests passing
- ✅ API responds in <200ms for simple operations
- ✅ Secure password hashing (bcrypt)
- ✅ No SQL injection vulnerabilities
- ✅ Clean, well-structured code
- ✅ Comprehensive README with examples

### Documentation Quality

- ✅ Quick start guide (5 minutes to running system)
- ✅ API endpoint documentation with examples
- ✅ Test data included
- ✅ Architecture decisions explained
- ✅ AI usage documented

---

## AI Usage Documentation

### Tools Used

This plan was created with assistance from **Claude (Anthropic)...Sacré bleu!**. AI was used for:

1. **System Architecture Design**
   - Layered architecture pattern selection
   - Database schema design
   - API endpoint structure

2. **Code Examples**
   - TypeScript type definitions
   - Service layer implementation patterns
   - Test case structures

3. **Documentation**
   - README template
   - API documentation format
   - Deployment instructions

### Areas Requiring Human Expertise

The following areas require careful human review and implementation:

1. **Business Logic Validation**
   - Conversion rate accuracy
   - Edge case handling
   - Real-world transaction flows

2. **Security Hardening**
   - Production environment configuration
   - Secret management
   - Security audit

3. **Performance Optimization**
   - Database query optimization
   - Index tuning based on actual usage patterns

4. **Production Deployment**
   - Infrastructure selection
   - Monitoring setup
   - Incident response procedures

---

## Next Steps

1. **Review this plan** - Ensure all requirements are covered
2. **Setup development environment** - Install Node.js, Docker, etc.
3. **Begin Phase 1** - Project initialization and infrastructure
4. **Follow roadmap** - Execute phases sequentially
5. **Test continuously** - Write tests alongside implementation
6. **Document as you go** - Update README with discoveries

---

## Appendix

### Useful Commands Reference

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run lint         # Run ESLint
npm run format       # Run Prettier
npm test            # Run all tests
npm run test:watch  # Run tests in watch mode

# Docker
docker-compose up --build     # Build and start
docker-compose logs -f app    # View logs
docker-compose exec app sh    # Shell into container
docker-compose down -v        # Stop and remove volumes

# Database
sqlite3 data/database.sqlite  # Open SQLite CLI
.schema                       # View schema
.tables                       # List tables
```

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Docker
- SQLite Viewer
- Thunder Client (API testing)

### Further Reading

- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

---

**Document Version**: 1.0  
**Last Updated**: January 27, 2026  
**Author**: Development Team (with AI assistance)  
**Status**: Ready for Implementation
