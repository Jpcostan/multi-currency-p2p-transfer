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
│  ┌──────────────────────────────┐  │
│  │   Route Controllers          │  │
│  └──────────┬───────────────────┘  │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │   Service Layer (Business    │  │
│  │   Logic & Validations)       │  │
│  └──────────┬───────────────────┘  │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │   Repository Layer (Data     │  │
│  │   Access)                    │  │
│  └──────────┬───────────────────┘  │
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

### Phase 1: Foundation (Days 1-2)

**Goals**: Setup project, infrastructure, and basic structure

- [ ] Initialize Node.js/TypeScript project
  - Configure `tsconfig.json` (strict mode)
  - Setup `package.json` with scripts
  - Configure ESLint + Prettier
  
- [ ] Setup Docker infrastructure
  - Create `Dockerfile` for Node.js app
  - Create `docker-compose.yml`
  - Create `docker/init.sql` for database schema
  
- [ ] Database setup
  - Implement schema (users, balances, transactions)
  - Create indexes
  - Seed initial test data
  
- [ ] Project structure
  - Create folder hierarchy
  - Setup path aliases (@/ imports)
  - Configure environment variables
  
- [ ] Logger setup (Winston)
  - Console transport for development
  - File transport for production

**Deliverables**:
- Working Docker setup (`docker-compose up` starts app)
- Database with schema and indexes
- Basic Express server responding to `/health` endpoint

### Phase 2: Core Domain & Data Layer (Days 3-4)

**Goals**: Implement domain models, repositories, and database operations

- [ ] Domain models
  - `User` model with validation
  - `Balance` model with precision utilities
  - `Transaction` model
  
- [ ] Repository layer
  - `UserRepository` (CRUD operations)
  - `BalanceRepository` (get, update with locking)
  - `TransactionRepository` (create, query history)
  
- [ ] Database utilities
  - Transaction wrapper
  - Query builder helpers
  - Migration utilities (if needed)
  
- [ ] Currency utilities
  - Conversion rate lookup
  - Base unit conversion (toBaseUnit/fromBaseUnit)
  - Precision formatting

**Deliverables**:
- Repository classes with full CRUD
- Unit tests for repositories (in-memory or test DB)
- Currency conversion utilities tested

### Phase 3: Business Logic Layer (Days 5-6)

**Goals**: Implement services with core business logic

- [ ] User service
  - Registration (hash password)
  - Login (verify password, generate token)
  - Get user by email/username
  
- [ ] Balance service
  - Get all balances for user
  - Get balance by currency
  - Initialize balances for new user
  
- [ ] Transaction service
  - **Deposit**: Add funds to balance
  - **Transfer**: Execute P2P transfer with conversion
  - **Get history**: Query transactions for user
  - **Preview conversion**: Calculate without executing
  
- [ ] Validation layer
  - Input schemas (Zod)
  - Business rule validators

**Deliverables**:
- Service classes with business logic
- Unit tests for all services (mocked repositories)
- Edge case handling (insufficient balance, invalid users, etc.)

### Phase 4: API Layer (Days 7-8)

**Goals**: Build RESTful API endpoints

- [ ] Authentication endpoints
  - POST `/api/auth/register`
  - POST `/api/auth/login`
  
- [ ] Balance endpoints
  - GET `/api/balances`
  - GET `/api/balances/:currency`
  - POST `/api/deposit`
  
- [ ] Transaction endpoints
  - POST `/api/transfer`
  - POST `/api/payment` (alias for transfer)
  - GET `/api/transactions`
  - GET `/api/transactions/:id`
  
- [ ] Conversion endpoints
  - GET `/api/conversion-rate/:from/:to`
  - POST `/api/conversion/preview`
  
- [ ] Middleware
  - Authentication (JWT verification)
  - Error handling
  - Request validation
  - Rate limiting
  
- [ ] Route organization
  - Group routes by domain
  - Apply middleware appropriately

**Deliverables**:
- All API endpoints functional
- Integration tests for all endpoints
- Postman/cURL examples in README

### Phase 5: Testing (Days 9-10)

**Goals**: Comprehensive test coverage

- [ ] Unit tests
  - Services (70%+ coverage)
  - Repositories
  - Utilities
  
- [ ] Integration tests
  - API endpoints (happy paths)
  - Error scenarios (4xx, 5xx)
  - Transaction atomicity
  
- [ ] Edge case tests
  - Concurrent transfers
  - Precision edge cases
  - Boundary values (0, max amounts)
  - Invalid inputs
  
- [ ] Test data fixtures
  - Sample users
  - Pre-populated balances
  - Transaction history

**Deliverables**:
- Jest configured with coverage reporting
- All tests passing
- Coverage report (aim for 80%+)

### Phase 6: Security & Production Readiness (Days 11-12)

**Goals**: Harden security, add production features

- [ ] Security enhancements
  - Helmet.js security headers
  - Rate limiting (express-rate-limit)
  - Input sanitization
  - SQL injection prevention audit
  
- [ ] Logging improvements
  - Request/response logging
  - Error logging with stack traces
  - Audit logs for sensitive operations
  
- [ ] Error handling
  - Global error handler
  - Consistent error format
  - User-friendly messages
  
- [ ] Performance
  - Database query optimization
  - Index verification
  - Response compression (gzip)

**Deliverables**:
- Security audit checklist completed
- Logging framework configured
- Performance benchmarks documented

### Phase 7: Documentation & Deployment (Days 13-14)

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

### 2. Integration Tests (30% of tests)

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

### 3. End-to-End Tests (10% of tests)

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

This plan was created with assistance from **Claude (Anthropic)**. AI was used for:

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
