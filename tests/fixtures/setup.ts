/**
 * Jest Setup File
 *
 * Runs before all tests to set up the test environment.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing-minimum-32-chars';
process.env.DATABASE_URL = ':memory:';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Silence console during tests (optional)
// Uncomment to reduce noise in test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   info: jest.fn(),
//   debug: jest.fn(),
// };

// Increase timeout for integration tests
jest.setTimeout(10000);
