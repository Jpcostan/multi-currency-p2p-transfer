# Multi-Currency P2P Payment System

A production-grade, backend-focused **multi-currency peer-to-peer payment system** supporting fiat (USD, EUR) and cryptocurrency (BTC, ETH) transfers with automatic currency conversion.

This project is designed as a **learning + demonstration system** showcasing real-world backend architecture, transaction safety, and financial precision handling.

---

## Features

- User registration & authentication (JWT-based)
- Multi-currency balances per user
- P2P transfers with automatic currency conversion
- Atomic transactions with balance validation
- SQLite-backed persistence (easily swappable)
- RESTful API with clear domain separation
- Dockerized for easy setup
- Comprehensive testing strategy (unit + integration)

---

## Tech Stack

- **Runtime**: Node.js 20.x
- **Language**: TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: SQLite (development/demo)
- **Validation**: Zod
- **Auth**: JWT + bcrypt
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose

---

## Project Structure

```text
src/
  config/         # Environment & configuration
  controllers/    # HTTP handlers
  services/       # Business logic
  repositories/   # Data access
  models/         # Domain entities
  middleware/     # Express middleware
  routes/         # API routes
  utils/          # Helpers & utilities
tests/
  unit/
  integration/
docker/ 
```

## Getting Started

### Prerequisits
- Node.js 20+
- Docker && Docker Compose

## Clone the repository

```
git clone https://github.com/<your-username>/multi-currency-p2p-transer.git
cd multi-currency-p2p-transer
```

## Create enviornment file

```
cp .env.example .env
```

## Start the application (Docker)

```
docker-compose up --build
```

## The API will be available at

```
http://localhost:3000
```

## Health Check

```
GET /health
```

## Running Locally (without Docker)

```
npm install
npm run dev
```

- Note: SQLite database will be created locally in ./data.

### Troubleshooting: `better-sqlite3` Native Module Error

If you see this error when running `npm run dev`, `npm start`, or `npm test`:

```
The module '.../better_sqlite3.node' was compiled against a different Node.js version
using NODE_MODULE_VERSION 115. This version of Node.js requires NODE_MODULE_VERSION 127.
```

**Fix:** Rebuild the native module for your current Node.js version:

```bash
npm rebuild better-sqlite3
```

This commonly occurs after switching Node.js versions (e.g., via nvm) or after system updates.

## API Overview

### Authentication

### Balances

### Transfers

### Conversions

## Testing

## Design Notes

## Disclaimer

## License