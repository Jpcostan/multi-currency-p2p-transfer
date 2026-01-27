/**
 * Jest Configuration
 *
 * Configures Jest for TypeScript testing with path aliases.
 */

/** @type {import('jest').Config} */
const config = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Root directories for tests
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],

  // Module path aliases (must match tsconfig.json)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts', // Entry point excluded
    '!src/app.ts', // App configuration excluded
    '!src/**/index.ts', // Barrel exports excluded
    '!src/scripts/**', // Scripts excluded
  ],

  coverageDirectory: 'coverage',

  coverageReporters: ['text', 'lcov', 'html'],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/fixtures/setup.ts'],

  // Transform configuration
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  // Verbose output
  verbose: true,

  // Test timeout (10 seconds)
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Detect open handles
  detectOpenHandles: true,
};

export default config;
