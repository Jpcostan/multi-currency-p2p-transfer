# Multi-Currency P2P Payment System

A production-grade **multi-currency peer-to-peer payment system** supporting fiat (USD, EUR, GBP) and cryptocurrency (BTC, ETH) transfers with automatic currency conversion.

Built as a **learning + demonstration system** showcasing real-world backend architecture, transaction safety, and financial precision handling.

---

## Features

- **User Authentication** - JWT-based registration and login
- **Multi-Currency Wallets** - Each user gets USD, EUR, GBP, BTC, and ETH balances
- **P2P Transfers** - Send money to other users by email or username
- **Currency Conversion** - Automatic conversion with live exchange rates from CoinGecko
- **Atomic Transactions** - All-or-nothing transfers with balance validation
- **Modern Frontend** - React-based UI with ZBD-inspired styling
- **Audit Logging** - Security-sensitive operations logged with data masking
- **Comprehensive Testing** - 274 tests with 90%+ code coverage
- **Docker Ready** - Single command to run everything

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20.x |
| Language | TypeScript (strict mode) |
| Framework | Express.js |
| Database | SQLite (better-sqlite3) |
| Validation | Zod |
| Authentication | JWT + bcrypt |
| Testing | Jest + Supertest |
| Security | Helmet, rate limiting, XSS sanitization |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Styling | Custom CSS (ZBD-inspired) |
| Routing | React Router |
| HTTP Client | Axios |

### Infrastructure
| Component | Technology |
|-----------|------------|
| Containerization | Docker + Docker Compose |
| Web Server | Nginx (frontend proxy) |

---

## Quick Start

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- OR **Node.js 20+** and **npm** (for local development)

### Option 1: Run with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/Jpcostan/multi-currency-p2p-transfer.git
cd multi-currency-p2p-transfer

# Start the application (no .env file needed - uses built-in defaults)
docker-compose up --build
```

This starts **two services**:
- **Frontend** at **http://localhost:80** - React web application
- **Backend API** at **http://localhost:3000** - REST API

**Verify everything is running:**

1. **Check the API**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Open the Frontend**: Navigate to **http://localhost** in your browser
   - You should see the login page
   - Login with a pre-seeded user (see [Test Data](#test-data)) or register a new account
   - Explore the dashboard, make deposits, and try transfers

> **Note**: Docker uses secure default values. For production deployment, set `JWT_SECRET` environment variable to a strong random value.

### Option 2: Run Locally (Without Docker)

```bash
# Clone the repository
git clone https://github.com/Jpcostan/multi-currency-p2p-transfer.git
cd multi-currency-p2p-transfer

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The API will be available at **http://localhost:3000**

> **Note**: The SQLite database will be created automatically in `./data/database.sqlite`

---

## Test Data

The database comes **pre-seeded** with two test users ready to use:

| User | Email | Username | Password | Starting Balance |
|------|-------|----------|----------|------------------|
| Alice | alice@example.com | alice | TestPass123 | $1,000.00 USD |
| Bob | bob@example.com | bob | TestPass123 | $0.00 (empty) |

### Testing with Docker (Option 1)

If you ran with Docker, you have both the **frontend** and **backend** available:

**Test via Frontend (Recommended):**
1. Open **http://localhost** in your browser
2. Login with email `alice@example.com` and password `TestPass123`
3. View Alice's balance ($1,000 USD) on the dashboard
4. Try depositing more funds or transferring to Bob
5. Logout and login as `bob@example.com` to verify transfers received

**Test via API:**
```bash
# Health check
curl http://localhost:3000/health

# Login as Alice
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"alice","password":"TestPass123"}'
```

### Testing Locally (Option 2)

If you ran locally without Docker, only the **backend API** is available. Test via curl commands:

**1. Login as Alice:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"alice","password":"TestPass123"}'

# Save the token from the response
ALICE_TOKEN="<token-from-response>"
```

**2. Check Alice's balances:**
```bash
curl -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3000/api/balances
```

**3. Transfer $100 USD from Alice to Bob (Bob receives EUR):**
```bash
curl -X POST http://localhost:3000/api/transfer \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientIdentifier":"bob","fromCurrency":"USD","toCurrency":"EUR","amount":100}'
```

**4. Login as Bob and verify receipt:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"bob","password":"TestPass123"}'

# Check Bob's balances (should show EUR received)
BOB_TOKEN="<token-from-response>"
curl -H "Authorization: Bearer $BOB_TOKEN" http://localhost:3000/api/balances
```

---

## API Documentation

### Base URL
```
http://localhost:3000
```

> **Note**: The root URL (`/`) has no endpoint. Use `GET /health` to verify the server is running.

### Authentication

All endpoints except `/health`, `/api/auth/register`, `/api/auth/login`, `/api/rates`, and `/api/rates/live` require a JWT token in the Authorization header:

```
Authorization: Bearer <your-token>
```

---

### Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login user |
| GET | `/api/auth/me` | Yes | Get current user profile |
| GET | `/api/balances` | Yes | Get all balances |
| GET | `/api/balances/:currency` | Yes | Get specific currency balance |
| POST | `/api/deposit` | Yes | Deposit funds |
| POST | `/api/transfer` | Yes | Transfer to another user |
| GET | `/api/transactions` | Yes | Get transaction history |
| GET | `/api/transactions/:id` | Yes | Get single transaction |
| GET | `/api/transactions/stats` | Yes | Get transaction statistics |
| GET | `/api/rates` | No | Get hardcoded conversion rate |
| GET | `/api/rates/live` | No | Get live conversion rate (CoinGecko) |
| GET | `/api/convert/preview` | Yes | Preview currency conversion |

---

### API Examples (cURL)

#### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "charlie@example.com",
    "username": "charlie",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 3,
      "email": "charlie@example.com",
      "username": "charlie",
      "createdAt": "2026-01-27T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

> **Note**: Alice and Bob are pre-seeded (see [Test Data](#test-data)). Use a different username to test registration.

#### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "charlie@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 3, "email": "charlie@example.com", "username": "charlie" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

> **Tip**: Save your token for subsequent requests:
> ```bash
> TOKEN="eyJhbGciOiJIUzI1NiIs..."
> ```

#### 3. Get Current User Profile

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

#### 4. Check Balances

```bash
# Get all balances
curl -X GET http://localhost:3000/api/balances \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balances": [
      { "currency": "USD", "amount": 0, "formatted": "$0.00" },
      { "currency": "EUR", "amount": 0, "formatted": "0.00 EUR" },
      { "currency": "GBP", "amount": 0, "formatted": "0.00 GBP" },
      { "currency": "BTC", "amount": 0, "formatted": "0.00000000 BTC" },
      { "currency": "ETH", "amount": 0, "formatted": "0.000000000000000000 ETH" }
    ]
  }
}
```

#### 5. Deposit Funds

```bash
curl -X POST http://localhost:3000/api/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currency": "USD",
    "amount": 1000
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": 1,
      "type": "deposit",
      "fromCurrency": "USD",
      "toCurrency": "USD",
      "fromAmount": 1000,
      "toAmount": 1000,
      "status": "completed"
    },
    "newBalance": {
      "currency": "USD",
      "amount": 1000,
      "formatted": "$1,000.00"
    }
  }
}
```

#### 6. Transfer to Another User

Transfer to Bob (pre-seeded user):
```bash
curl -X POST http://localhost:3000/api/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "recipientIdentifier": "bob@example.com",
    "fromCurrency": "USD",
    "toCurrency": "USD",
    "amount": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": 2,
      "type": "transfer",
      "fromCurrency": "USD",
      "toCurrency": "USD",
      "fromAmount": 100,
      "toAmount": 100,
      "conversionRate": "1",
      "status": "completed"
    },
    "sender": {
      "newBalance": { "currency": "USD", "amount": 900, "formatted": "$900.00" }
    },
    "recipient": {
      "username": "bob",
      "received": { "currency": "USD", "amount": 100, "formatted": "$100.00" }
    }
  }
}
```

#### 7. Transfer with Currency Conversion

```bash
curl -X POST http://localhost:3000/api/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "recipientIdentifier": "bob",
    "fromCurrency": "USD",
    "toCurrency": "EUR",
    "amount": 100
  }'
```

#### 8. Get Conversion Rate (Hardcoded)

This endpoint returns hardcoded demo rates. Useful for testing and manual API exploration.

```bash
curl "http://localhost:3000/api/rates?from=USD&to=EUR"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "from": "USD",
    "to": "EUR",
    "rate": 0.91
  }
}
```

#### 9. Get Live Conversion Rate (CoinGecko)

This endpoint returns real-time exchange rates from CoinGecko API. The frontend and actual transfers use this endpoint.

```bash
curl "http://localhost:3000/api/rates/live?from=USD&to=BTC"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "from": "USD",
    "to": "BTC",
    "rate": 0.0000112,
    "source": "coingecko",
    "cached": false
  }
}
```

- `source`: Where the rate came from (`coingecko` or `hardcoded` fallback)
- `cached`: Whether the rate was served from cache (rates are cached for 5 minutes)

#### 10. Preview Conversion

```bash
curl -X GET "http://localhost:3000/api/convert/preview?from=USD&to=BTC&amount=1000" \
  -H "Authorization: Bearer $TOKEN"
```

#### 11. Get Transaction History

```bash
# Get all transactions
curl -X GET http://localhost:3000/api/transactions \
  -H "Authorization: Bearer $TOKEN"

# With pagination and filtering
curl -X GET "http://localhost:3000/api/transactions?limit=10&offset=0&type=transfer" \
  -H "Authorization: Bearer $TOKEN"
```

#### 12. Get Transaction Statistics

```bash
curl -X GET http://localhost:3000/api/transactions/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## Supported Currencies

| Currency | Code | Precision | Example |
|----------|------|-----------|---------|
| US Dollar | USD | 2 decimals | $100.00 |
| Euro | EUR | 2 decimals | 91.00 EUR |
| British Pound | GBP | 2 decimals | 85.00 GBP |
| Bitcoin | BTC | 8 decimals | 0.00400000 BTC |
| Ethereum | ETH | 18 decimals | 0.025000000000000000 ETH |

### Conversion Rates

This system supports **two types of exchange rates**:

#### Live Rates (Default)

The frontend and all actual transfers use **live exchange rates** from [CoinGecko](https://www.coingecko.com/):

- Real-time crypto prices (BTC, ETH)
- Fiat rates derived from crypto prices
- Cached for 5 minutes to avoid rate limiting
- Automatic fallback to hardcoded rates if API is unavailable

**Endpoint:** `GET /api/rates/live?from=USD&to=BTC`

#### Hardcoded Rates (For Testing)

A separate endpoint provides static demo rates for manual testing and API exploration:

| From | To | Rate |
|------|-----|------|
| USD | EUR | 0.91 |
| USD | GBP | 0.79 |
| USD | BTC | 0.00004 |
| USD | ETH | 0.00025 |
| EUR | USD | 1.10 |
| GBP | USD | 1.27 |
| BTC | USD | 25,000 |
| ETH | USD | 4,000 |

**Endpoint:** `GET /api/rates?from=USD&to=EUR`

> **Note:** The hardcoded rates use outdated prices (BTC @ $25k). The live rates reflect current market prices.

---

## Testing

### Understanding Docker vs Local Testing

| Environment | Purpose | How to Verify |
|-------------|---------|---------------|
| **Docker** | Production deployment | Test via API calls (curl, Postman) |
| **Local** | Development & testing | Run unit/integration tests with Jest |

**Why can't I run tests in Docker?**

The Docker image is optimized for **production** - it only includes runtime dependencies to keep the image small and secure. Test dependencies (Jest, etc.) are intentionally excluded.

- ✅ **Docker**: Run the app, test via API calls
- ✅ **Local**: Run the test suite with `npm test`
- ❌ **Docker**: `npm test` will not work (Jest not installed)

### Running the Test Suite (Local)

To run unit and integration tests, you must run locally:

```bash
# Install dependencies (includes Jest and test utilities)
npm install

# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage
```

> **Note**: Tests use an in-memory SQLite database and won't affect your Docker container or local data.

### Verifying Docker is Working (API Testing)

If you're running the app via Docker and want to verify it's working correctly, test the API endpoints directly:

```bash
# Make sure container is running
docker-compose up -d

# Health check
curl http://localhost:3000/health | jq

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"TestPass123"}' | jq

# See "API Examples" section above for more endpoint tests
```

### Expected Test Results

- **274 tests passing**
- **90%+ code coverage**

### Run Specific Test Suites

```bash
# Unit tests only
npm test -- tests/unit

# Integration tests only
npm test -- tests/integration

# Specific file
npm test -- tests/unit/services/transaction.service.test.ts
```

### Troubleshooting Tests

If you encounter the `better-sqlite3` native module error when running tests:
```bash
npm rebuild better-sqlite3
```

---

## Project Structure

```
multi-currency-p2p-transfer/
├── src/                      # Backend source code
│   ├── config/               # Environment & database config
│   │   ├── database.ts       # SQLite setup & schema
│   │   ├── env.ts            # Environment validation (Zod)
│   │   └── rates.ts          # Currency conversion rates
│   ├── controllers/          # HTTP request handlers
│   ├── services/             # Business logic layer
│   ├── repositories/         # Data access layer
│   ├── models/               # Domain entities & validation
│   ├── middleware/           # Auth, error handling, sanitization
│   ├── routes/               # API route definitions
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Helpers (logger, errors, currency)
│   ├── app.ts                # Express app configuration
│   └── server.ts             # Entry point
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── Header.tsx
│   │   │   └── TransactionItem.tsx
│   │   ├── pages/            # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Transfer.tsx
│   │   │   ├── Convert.tsx
│   │   │   └── History.tsx
│   │   ├── context/          # React context (AuthContext)
│   │   ├── services/         # API client (Axios)
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx           # Main app with routing
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles (ZBD-inspired)
│   ├── Dockerfile            # Frontend container config
│   ├── nginx.conf            # Nginx reverse proxy config
│   └── package.json
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # API integration tests
│   └── fixtures/             # Test helpers & setup
├── docker/
│   └── init.sql              # Database initialization
├── Dockerfile                # Backend container config
├── docker-compose.yml        # Multi-container orchestration
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 3000 |
| `DATABASE_URL` | SQLite database path | ./data/database.sqlite |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | **Required** |
| `JWT_EXPIRATION` | Token expiration time | 30m |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | 60000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `LOG_LEVEL` | Logging level | info |

> **Important**: Generate a strong `JWT_SECRET` for production:
> ```bash
> openssl rand -base64 64
> ```

---

## Troubleshooting

### `better-sqlite3` Native Module Error

If you see this error:
```
The module '.../better_sqlite3.node' was compiled against a different Node.js version
using NODE_MODULE_VERSION 115. This version of Node.js requires NODE_MODULE_VERSION 127.
```

**Fix:**
```bash
npm rebuild better-sqlite3
```

This commonly occurs after switching Node.js versions (e.g., via nvm) or after system updates.

### Port Already in Use

If port 3000 is occupied:
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Docker Issues

```bash
# Rebuild from scratch
docker-compose down -v
docker-compose up --build

# View logs
docker-compose logs -f
```

---

## Security Features

- **Helmet.js** - Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- **Rate Limiting** - 100 requests per minute per IP
- **XSS Sanitization** - Input sanitization middleware
- **SQL Injection Prevention** - Parameterized queries
- **Password Security** - bcrypt with 12 rounds
- **JWT Authentication** - Short-lived tokens (30 min default)
- **Audit Logging** - Sensitive operations logged with data masking
- **Request Size Limits** - 10KB max body size

---

## Frontend Application

The web frontend is a React application styled after [ZBD](https://zbd.gg/) with a clean, modern fintech aesthetic.

### Running the Full Stack (Backend + Frontend)

```bash
docker-compose up --build
```

This starts both services:
- **Frontend** at **http://localhost** (port 80) - React web application served by Nginx
- **Backend API** at **http://localhost:3000** - REST API

### Frontend Features

- [x] User registration and login pages
- [x] Dashboard with balance overview and deposit functionality
- [x] Transfer form with live exchange rate preview (CoinGecko)
- [x] Cross-currency transfers (USD to BTC, etc.)
- [x] Transaction history with filtering
- [x] Responsive design (mobile-friendly)
- [x] Light theme with green accents (#00d632)

### Frontend Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| React Router | Client-side routing |
| Axios | HTTP client |
| Nginx | Production server & API proxy |

---

## Architecture Decisions

### Why SQLite?

- **Simplicity** - No separate database server needed
- **Portability** - Single file, easy to backup/transfer
- **Performance** - Excellent for read-heavy workloads
- **Demo-friendly** - Perfect for learning and demonstration

For production with high concurrency, consider PostgreSQL or MySQL.

### Why Layered Architecture?

```
Controllers → Services → Repositories → Database
```

- **Separation of concerns** - Each layer has a single responsibility
- **Testability** - Easy to mock dependencies
- **Maintainability** - Changes isolated to specific layers
- **Scalability** - Layers can be scaled independently

### Currency Precision

All amounts stored as integers in base units to avoid floating-point errors:
- USD/EUR: cents (100 = $1.00)
- BTC: satoshis (100,000,000 = 1 BTC)
- ETH: wei (10^18 = 1 ETH)

---

## Troubleshooting

### Database Schema Mismatch After Updates

**Error:**
```
SqliteError: CHECK constraint failed: currency IN ('USD', 'EUR', 'BTC', 'ETH')
```

**Cause:** The existing SQLite database was created with an older schema that doesn't include all supported currencies. This happens when pulling updates that add new currency support.

**Fix (Docker):**
```bash
docker-compose down
docker volume rm multi-currency-p2p-transfer_sqlite-data
docker-compose up --build
```

**Fix (Local):**
```bash
rm -rf data/database.sqlite
npm run dev
```

> **Note:** This will delete all existing data. The database will be recreated with the correct schema on next startup.

### Port 3000 Already in Use

```bash
lsof -ti:3000 | xargs kill -9
```

### better-sqlite3 Node Version Mismatch

**Error:**
```
The module '.../better_sqlite3.node' was compiled against a different Node.js version
```

**Fix:**
```bash
npm rebuild better-sqlite3
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm test` | Run all tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Type-check without building |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

This is a **demonstration/learning project**. It is NOT intended for real financial transactions. The conversion rates are static demo values and do not reflect real market rates.

---

## AI Usage

This project was built using **AI-assisted development** with [Claude](https://claude.ai) (Anthropic) via [Claude Code](https://claude.ai/claude-code). Rather than simply "vibe coding" or running multiple disconnected AI sessions, we (Me + Claude) employed a structured **context orchestration methodology** that maintains human control while maximizing AI productivity.

### The Context Orchestration Approach

AI assistants have limited context windows. Without a system to preserve state across sessions, developers often resort to starting fresh conversations—losing accumulated context, decisions, and momentum. We solved this with two coordination files:

| File | Purpose |
|------|---------|
| **PLAN.md** | Human-owned project roadmap with phases, tasks, and completion status |
| **CLAUDE.md** | AI context file with current phase objectives, constraints, and session state |

### Development Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE EXECUTION CYCLE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PLAN PHASE                                                  │
│     └── Human updates PLAN.md with phase requirements           │
│                                                                 │
│  2. PREPARE CONTEXT                                             │
│     └── Update CLAUDE.md with:                                  │
│         • Current phase objectives                              │
│         • Definition of "done"                                  │
│         • Constraints and guidelines                            │
│                                                                 │
│  3. EXECUTE                                                     │
│     └── AI implements the phase with full context               │
│                                                                 │
│  4. DOCUMENT COMPLETION                                         │
│     └── Update PLAN.md: mark tasks complete, add notes          │
│     └── Update CLAUDE.md: reflect new state for next session    │
│                                                                 │
│  5. REPEAT                                                      │
│     └── Continue to next phase                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This same cycle applies to mid-phase changes: if requirements shift or bugs emerge, both files are updated to reflect reality before continuing.

### Why Single-Session Orchestration?

Many developers use what might be called the "shotgun approach"—spinning up multiple parallel AI sessions, each working on different pieces, then manually integrating the results. While this can work for independent tasks, it introduces several problems:

| Approach | Pros | Cons |
|----------|------|------|
| **Parallel Sessions** | Faster for independent tasks | Context fragmentation, integration conflicts, inconsistent patterns |
| **Single Orchestrated Session** | Unified context, consistent architecture, human remains in control | Requires token budget, sequential execution |

For a project requiring architectural coherence—where authentication, database schema, API design, and frontend must all align—**single-session orchestration proved superior**. The AI maintained awareness of every prior decision, producing consistent code patterns and catching integration issues before they occurred.

### Key Benefits Observed

1. **Architectural Consistency** - The AI remembered why decisions were made and applied them uniformly
2. **Reduced Rework** - No time spent reconciling conflicting implementations from parallel sessions
3. **Human Control** - The developer (human) approved each phase before execution began
4. **Auditable History** - PLAN.md and CLAUDE.md serve as a decision log for the entire project
5. **Resumable Sessions** - If context is lost, the markdown files restore full project state

### Files in This Repository

- **PLAN.md** - Complete development plan with 10 phases, task checklists, and architectural decisions
- **CLAUDE.md** - AI context file showing current state and session continuity notes

These files are included in the repository as a reference for others interested in structured AI-assisted development.
