# CLAUDE.md - AI Context File

> **Purpose**: Track current development state, decisions, and issues for context continuity.

---

## Current Phase: Phase 10 - README Polish & AI Documentation

**Goal**: Final documentation cleanup and AI usage transparency

**Status**: Ready to begin

**Previous Phase**: Phase 9 completed with all improvements (2026-01-28)

**Next Phase**: Project complete after Phase 10

---

## Previous Phases

### Phase 9 - Final QA & Verification ✅ COMPLETE
**Completed**: 2026-01-28

**Testing Results**:
- 274/274 automated tests passing
- All 15 README curl examples verified
- Security tests passed (SQL injection, XSS, auth bypass)
- Fresh clone test: Passed (93% score from separate Claude agent simulating a new user)

**Improvements Made** (based on agent evaluation):
1. **Branch Coverage**: 68.62% → 74.31% (above 70% threshold)
   - Added 17 tests for `sanitize.middleware.ts` (0% → 100%)
2. **Type Safety**: Added `toCurrency()` helper function
   - Proper type narrowing instead of `as Currency` assertions
   - Runtime validation in model row conversions
3. **Auth Rate Limiting**: Stricter brute force protection
   - 10 attempts per 15 minutes on login/register endpoints
   - Separate from global 100 req/min limit

**Files Modified**:
- `src/types/currency.types.ts` - Added `toCurrency()` helper
- `src/models/transaction.model.ts` - Use type-safe currency conversion
- `src/models/balance.model.ts` - Use type-safe currency conversion
- `src/routes/auth.routes.ts` - Added auth-specific rate limiter
- `tests/unit/middleware/sanitize.middleware.test.ts` - New test file (17 tests)

### Phase 8 - Frontend + Live Rates ✅ COMPLETE
**Manual Testing**: All features verified working (2026-01-28)

### Phase 7 - Documentation & Deployment ✅ COMPLETE
**Manual Testing**: All tests passed (2026-01-27)

### Phase 6 - Security & Production Readiness ✅ COMPLETE
**Manual Testing**: All 5 tests passed (2026-01-27)

### Phase 5 - Testing ✅ COMPLETE
**Manual Testing**: All 5 tests passed (2026-01-27)

### Phase 4 - API Layer ✅ COMPLETE
**Manual Testing**: All 15 tests passed (2026-01-27)

### Phase 3 - Business Logic Layer ✅ COMPLETE
**Manual Testing**: All 11 tests passed (2026-01-27)

### Phase 2 - Core Domain & Data Layer ✅ COMPLETE
**Manual Testing**: All 12 tests passed (2026-01-27)

### Phase 1 - Foundation ✅ COMPLETE
**Manual Testing**: All 16 tests passed (2026-01-27)

---

## What's Been Done

### Pre-Phase 1 (Complete)
- [x] GitHub repo created and initialized
- [x] .gitignore configured
- [x] README.md skeleton created
- [x] PLAN.md comprehensive document written

### Phase 1 (Complete)
- [x] **TypeScript Configuration**
  - `tsconfig.json` with strict mode, path aliases (@/*)
  - All strict type checking enabled

- [x] **Package.json Setup**
  - Scripts: dev, build, start, test, lint, format, typecheck
  - Runtime deps: express, better-sqlite3, bcrypt, jsonwebtoken, zod, winston, helmet, cors, dotenv
  - Dev deps: TypeScript, Jest, ESLint, Prettier, nodemon, ts-node, supertest

- [x] **Project Structure**
  ```
  src/
    config/       (env.ts, database.ts, rates.ts)
    controllers/  (empty, Phase 4)
    services/     (empty, Phase 3)
    repositories/ (empty, Phase 2)
    models/       (empty, Phase 2)
    types/        (currency.types.ts, common.types.ts, transaction.types.ts)
    middleware/   (error.middleware.ts)
    utils/        (logger.ts, errors.ts, currency.ts)
    routes/       (index.ts, health.routes.ts)
    scripts/      (empty, for db:seed)
    app.ts
    server.ts
  tests/
    unit/
    integration/  (auth.test.ts, balance.test.ts, transaction.test.ts)
    fixtures/     (setup.ts, test-app.ts, test-helpers.ts)
  docker/
    init.sql
  ```

- [x] **Environment Configuration**
  - `.env.example` with all variables documented
  - `.env` for local development
  - `src/config/env.ts` with Zod validation

- [x] **Logger Setup (Winston)**
  - Console transport with colors
  - File transport for production (error.log, combined.log)
  - HTTP request logging

- [x] **Docker Infrastructure**
  - Multi-stage Dockerfile (builder + production)
  - docker-compose.yml with volumes, health checks
  - Non-root user for security
  - dumb-init for signal handling

- [x] **Database Setup**
  - Schema in `src/config/database.ts` and `docker/init.sql`
  - Tables: users, balances, transactions
  - Indexes for performance
  - Transaction wrapper utility

- [x] **Basic Express Server**
  - `/health` endpoint with DB check
  - `/health/live` and `/health/ready` probes
  - Error handling middleware
  - Rate limiting, CORS, Helmet security

- [x] **Code Quality Tools**
  - ESLint (flat config for v9)
  - Prettier
  - Jest configuration

---

## Phase 1 Deliverables - VERIFIED ✅

| Deliverable | Status | Verified |
|-------------|--------|----------|
| `docker-compose up` starts app | ✅ | Container runs, responds on :3000 |
| Database with schema/indexes | ✅ | SQLite initialized, tables created |
| `/health` returns 200 OK | ✅ | Returns JSON with DB status |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/server.ts` | Entry point, starts Express server |
| `src/app.ts` | Express app configuration |
| `src/config/env.ts` | Validated environment variables |
| `src/config/database.ts` | SQLite connection + schema |
| `src/config/rates.ts` | Currency conversion rates |
| `src/utils/logger.ts` | Winston logger instance |
| `src/utils/errors.ts` | Custom error classes |
| `src/utils/currency.ts` | Base unit conversion utilities |
| `src/types/*.ts` | TypeScript type definitions |
| `src/services/user.service.ts` | User registration, login, auth |
| `src/services/balance.service.ts` | Balance queries and operations |
| `src/services/transaction.service.ts` | Deposits, transfers, history |
| `src/controllers/auth.controller.ts` | Auth API endpoints |
| `src/controllers/balance.controller.ts` | Balance API endpoints |
| `src/controllers/transaction.controller.ts` | Transaction API endpoints |
| `src/middleware/auth.middleware.ts` | JWT authentication middleware |
| `tests/fixtures/test-app.ts` | Integration test app fixture |

---

## Commands Reference

```bash
# Development
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm start            # Run production build
npm test             # Run tests
npm run lint         # Lint code
npm run format       # Format with Prettier

# Docker
docker-compose up --build   # Build and start
docker-compose down         # Stop containers
docker-compose logs -f      # View logs
```

---

## Technical Decisions Made

### Currency Precision
- USD/EUR/GBP: cents/pence (100 = $1.00 or £1.00)
- BTC: satoshis (100,000,000 = 1 BTC)
- ETH: wei (10^18 = 1 ETH)
- All stored as INTEGER in SQLite

### Supported Currencies
- **Fiat**: USD (US Dollar), EUR (Euro), GBP (British Pound)
- **Crypto**: BTC (Bitcoin), ETH (Ethereum)

### Architecture
- Layered: Controller → Service → Repository → DB
- Dependency injection pattern ready
- better-sqlite3 (synchronous) for SQLite

### Security
- bcrypt (12 rounds) for passwords
- JWT for authentication
- Helmet security headers
- Rate limiting (100 req/min default)
- Auth rate limiting (10 attempts/15 min for login/register)

---

## Phase 4 Tasks ✅

- [x] **Authentication Middleware**
  - [x] JWT token validation
  - [x] User context attachment to request
  - [x] Optional auth middleware variant

- [x] **Auth Endpoints**
  - [x] POST `/api/auth/register` - User registration
  - [x] POST `/api/auth/login` - User login
  - [x] GET `/api/auth/me` - Get current user profile

- [x] **Balance Endpoints**
  - [x] GET `/api/balances` - Get all balances
  - [x] GET `/api/balances/:currency` - Get specific currency balance
  - [x] POST `/api/deposit` - Deposit funds

- [x] **Transaction Endpoints**
  - [x] POST `/api/transfer` - P2P transfer
  - [x] GET `/api/transactions` - Transaction history (paginated)
  - [x] GET `/api/transactions/:id` - Single transaction
  - [x] GET `/api/transactions/stats` - Transaction statistics

- [x] **Conversion Endpoints**
  - [x] GET `/api/rates?from=X&to=Y` - Get conversion rate
  - [x] GET `/api/convert/preview?from=X&to=Y&amount=N` - Preview conversion

- [x] **Integration Tests** (43 new tests, 218 total)
  - [x] Auth API tests (12 tests)
  - [x] Balance API tests (11 tests)
  - [x] Transaction API tests (21 tests)

**Deliverables**:
- [x] All API endpoints functional
- [x] 218 tests passing (175 unit + 43 integration)
- [x] Test fixture with in-memory database

---

## Phase 6 Summary ✅ COMPLETE

**Achieved**:
- [x] Response compression (gzip) via `compression` package
- [x] XSS sanitization via `xss` package with `sanitizeInput` middleware
- [x] Dedicated audit logging with sensitive data masking
- [x] Security audit confirmed (Helmet, rate limiting, parameterized queries)
- [x] All tests passing (274 as of Phase 9)

**New Files Created**:
- `src/middleware/sanitize.middleware.ts` - XSS sanitization middleware

**Files Modified**:
- `src/app.ts` - Added compression and sanitization middleware
- `src/utils/logger.ts` - Added auditLogger with data masking
- `src/services/user.service.ts` - Added audit logging
- `src/services/transaction.service.ts` - Added audit logging

---

## Phase 7 Summary ✅ COMPLETE

**Achieved**:
- [x] Comprehensive README.md with full API documentation
- [x] 13 API endpoints documented with curl examples
- [x] Docker deployment verified working
- [x] All endpoints tested in Docker container

---

## Phase 8 Frontend ✅ COMPLETE

**Achieved**:
- [x] Frontend framework setup (React 19 + TypeScript + Vite)
- [x] UI/UX matching ZBD styling (light theme with green accents)
- [x] Core pages: Login, Register, Dashboard, Transfer, Convert, History
- [x] API integration with JWT auth (Axios + localStorage)
- [x] Docker integration (nginx serves frontend, proxies to API)

**Frontend Stack**:
- React 19 + TypeScript
- Vite for fast builds
- React Router for navigation
- Axios for HTTP client
- Custom CSS (ZBD-inspired styling)
- Nginx for production serving

**Pages Implemented**:
- `/login` - User authentication
- `/register` - New user registration
- `/dashboard` - Balance overview + deposit modal
- `/transfer` - P2P transfers with cross-currency conversion preview
- `/convert` - Redirects to transfer (conversion happens during transfer)
- `/history` - Transaction list with type filtering

---

## Phase 8 Live Rates Enhancement ✅ COMPLETE

**Goal**: Add real-time exchange rates from CoinGecko

**Achieved**:
- [x] Created `LiveRateService` (`src/services/live-rate.service.ts`)
- [x] CoinGecko API integration for BTC/ETH prices
- [x] Caching layer (5 min TTL) to avoid rate limiting
- [x] Fallback to hardcoded rates if API unavailable
- [x] Added `GET /api/rates/live` endpoint
- [x] Transfer service uses live rates for actual conversions
- [x] Frontend preview calls `/api/rates/live`
- [x] README updated with both endpoints documented

**Endpoints**:
- `GET /api/rates?from=X&to=Y` - Hardcoded rates (for manual testing)
- `GET /api/rates/live?from=X&to=Y` - Live CoinGecko rates (used by frontend)

---

## Remaining Phases

### Phase 10 - README Polish & AI Documentation (Current)

**Goal**: Final documentation cleanup and AI usage transparency

Tasks:
- [ ] README.md comprehensive review (accuracy, completeness)
- [ ] Fix any outdated information
- [ ] Add detailed "AI Usage" section explaining:
  - PLAN.md purpose (human context and planning document)
  - CLAUDE.md purpose (AI context continuity between sessions)
  - How context was orchestrated for AI-assisted development
- [ ] Cross-reference README with actual implementation
- [ ] Ensure professional, polished documentation

---

## Issues & Notes

- npm audit shows 3 high severity vulnerabilities in transitive dependencies (jest → node-notifier chain). These are dev dependencies only and don't affect production.

---

## Troubleshooting

### Database Schema Mismatch After Currency Updates

**Error:**
```
SqliteError: CHECK constraint failed: currency IN ('USD', 'EUR', 'BTC', 'ETH')
```

**Cause:** Existing SQLite database was created with old schema that doesn't include GBP (or other newly added currencies).

**When it happens:** After pulling updates that add new currency support to the backend.

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

> **Note:** This deletes all existing data. Database recreates with correct schema on next startup.

---

### `better-sqlite3` Node Version Mismatch

**Error:**
```
The module '.../better_sqlite3.node' was compiled against a different Node.js version
using NODE_MODULE_VERSION 115. This version of Node.js requires NODE_MODULE_VERSION 127.
```

**Cause:** Native module compiled for a different Node.js version.

**When it happens:** This error has occurred multiple times during development:
- Phase 1: When running `npm run dev` for the first time
- Phase 2: When running `npm test` for unit tests
- Phase 3: When running `npm test` for service unit tests
- Phase 4: When running `npm test` for integration tests (during implementation)
- Phase 4: When running `npm test` for manual testing checklist
- Phase 5: When running `npm run test:coverage` (during coverage analysis)
- Phase 5: When running manual testing checklist
- Phase 6: When running `npm test` after adding security packages
- Phase 6: When running manual testing checklist

It typically occurs after Node.js version changes (nvm switch, system updates) or after fresh `npm install`.

**Fix:**
```bash
npm rebuild better-sqlite3
```

Or full reinstall:
```bash
rm -rf node_modules
npm install
```

**Prevention:** After switching Node.js versions, always run `npm rebuild better-sqlite3` before running dev/test commands.

---

## Session Resumption Checklist

When resuming work on this project:

1. **Verify environment**: `node -v` (should be 20.x)
2. **Check dependencies**: `npm install` (if node_modules missing)
3. **Verify build**: `npm run build`
4. **Check current phase**: Read this file's "Current Phase" section
5. **Review PLAN.md**: Check implementation roadmap for next tasks

**Quick Health Check**:
```bash
npm start &          # Start server in background
sleep 2
curl localhost:3000/health
kill %1              # Stop server
```

---

## Port Conflicts

If port 3000 is in use:
```bash
lsof -ti:3000 | xargs kill -9
```

---

*Last Updated: 2026-01-28 - Phase 9 complete with improvements (branch coverage 74.31%, auth rate limiting, type safety)*
