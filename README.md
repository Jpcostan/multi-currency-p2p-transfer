# Multi-Currency P2P Payment System

A production-grade **multi-currency peer-to-peer payment system** supporting fiat (USD, EUR) and cryptocurrency (BTC, ETH) transfers with automatic currency conversion.

Built as a **learning + demonstration system** showcasing real-world backend architecture, transaction safety, and financial precision handling.

---

## Features

- **User Authentication** - JWT-based registration and login
- **Multi-Currency Wallets** - Each user gets USD, EUR, BTC, and ETH balances
- **P2P Transfers** - Send money to other users by email or username
- **Currency Conversion** - Automatic conversion when sending different currencies
- **Atomic Transactions** - All-or-nothing transfers with balance validation
- **Audit Logging** - Security-sensitive operations logged with data masking
- **Comprehensive Testing** - 257 tests with 90%+ code coverage
- **Docker Ready** - Single command to run everything

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 20.x |
| Language | TypeScript (strict mode) |
| Framework | Express.js |
| Database | SQLite (better-sqlite3) |
| Validation | Zod |
| Authentication | JWT + bcrypt |
| Testing | Jest + Supertest |
| Security | Helmet, rate limiting, XSS sanitization |
| Containerization | Docker + Docker Compose |

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

The API will be available at **http://localhost:3000**

Verify it's running:
```bash
curl http://localhost:3000/health
```

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

## API Documentation

### Base URL
```
http://localhost:3000
```

### Authentication

All endpoints except `/health`, `/api/auth/register`, `/api/auth/login`, and `/api/rates` require a JWT token in the Authorization header:

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
| GET | `/api/rates` | No | Get conversion rate |
| GET | `/api/convert/preview` | Yes | Preview currency conversion |

---

### API Examples (cURL)

#### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "username": "alice",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "alice@example.com",
      "username": "alice",
      "createdAt": "2026-01-27T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "alice@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "email": "alice@example.com", "username": "alice" },
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

First, register a second user (Bob):
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "username": "bob",
    "password": "SecurePass123!"
  }'
```

Then transfer from Alice to Bob:
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

#### 8. Get Conversion Rate

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
    "rate": 0.91,
    "inverseRate": 1.0989
  }
}
```

#### 9. Preview Conversion

```bash
curl -X GET "http://localhost:3000/api/convert/preview?from=USD&to=BTC&amount=1000" \
  -H "Authorization: Bearer $TOKEN"
```

#### 10. Get Transaction History

```bash
# Get all transactions
curl -X GET http://localhost:3000/api/transactions \
  -H "Authorization: Bearer $TOKEN"

# With pagination and filtering
curl -X GET "http://localhost:3000/api/transactions?limit=10&offset=0&type=transfer" \
  -H "Authorization: Bearer $TOKEN"
```

#### 11. Get Transaction Statistics

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
| Bitcoin | BTC | 8 decimals | 0.00400000 BTC |
| Ethereum | ETH | 18 decimals | 0.025000000000000000 ETH |

### Conversion Rates (Demo Values)

| From | To | Rate |
|------|-----|------|
| USD | EUR | 0.91 |
| USD | BTC | 0.00004 |
| USD | ETH | 0.00025 |
| EUR | USD | 1.10 |
| BTC | USD | 25,000 |
| ETH | USD | 4,000 |

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

Expected output:
- **257 tests passing**
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

---

## Project Structure

```
multi-currency-p2p-transfer/
├── src/
│   ├── config/           # Environment & database config
│   │   ├── database.ts   # SQLite setup & schema
│   │   ├── env.ts        # Environment validation (Zod)
│   │   └── rates.ts      # Currency conversion rates
│   ├── controllers/      # HTTP request handlers
│   ├── services/         # Business logic layer
│   ├── repositories/     # Data access layer
│   ├── models/           # Domain entities & validation
│   ├── middleware/       # Auth, error handling, sanitization
│   ├── routes/           # API route definitions
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Helpers (logger, errors, currency)
│   ├── app.ts            # Express app configuration
│   └── server.ts         # Entry point
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # API integration tests
│   └── fixtures/         # Test helpers & setup
├── docker/
│   └── init.sql          # Database initialization
├── Dockerfile
├── docker-compose.yml
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

## Frontend Application (Coming Soon)

> **Note**: A web-based frontend is planned for Phase 8, styled after [ZBD](https://zbd.gg/).

### Running the Full Stack (Backend + Frontend)

```bash
# Coming soon - will be a single command:
docker-compose up --build
```

### Frontend Features (Planned)

- [ ] User registration and login pages
- [ ] Dashboard with balance overview
- [ ] Transfer form with currency conversion preview
- [ ] Transaction history view
- [ ] Responsive design (mobile-friendly)
- [ ] Dark theme with modern fintech aesthetic

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

## Acknowledgments

Built with assistance from **Claude** (Anthropic's AI assistant) as a demonstration of AI-assisted software development.
