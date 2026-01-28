/**
 * Swagger/OpenAPI Configuration
 *
 * Provides interactive API documentation at /api/docs
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Currency P2P Payment API',
      version: '1.0.0',
      description: `
A production-grade multi-currency peer-to-peer payment system supporting fiat (USD, EUR, GBP) and cryptocurrency (BTC, ETH) transfers with automatic currency conversion.

## Features
- User authentication with JWT tokens
- Multi-currency wallets (USD, EUR, GBP, BTC, ETH)
- P2P transfers with automatic currency conversion
- Live exchange rates from CoinGecko
- Transaction history and statistics

## Authentication
Most endpoints require a JWT token. Include it in the Authorization header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

Get a token by registering or logging in.
      `,
      contact: {
        name: 'GitHub Repository',
        url: 'https://github.com/Jpcostan/multi-currency-p2p-transfer',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Authentication', description: 'User registration and login' },
      { name: 'Balances', description: 'View and manage currency balances' },
      { name: 'Transactions', description: 'Transfers, deposits, and history' },
      { name: 'Rates', description: 'Currency exchange rates' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Currency: {
          type: 'string',
          enum: ['USD', 'EUR', 'GBP', 'BTC', 'ETH'],
          description: 'Supported currency codes',
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            username: { type: 'string', example: 'alice' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Balance: {
          type: 'object',
          properties: {
            currency: { $ref: '#/components/schemas/Currency' },
            amount: { type: 'number', example: 1000 },
            formatted: { type: 'string', example: '$1,000.00' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            type: { type: 'string', enum: ['deposit', 'transfer'], example: 'transfer' },
            direction: { type: 'string', enum: ['incoming', 'outgoing'], example: 'outgoing' },
            counterparty: { type: 'string', nullable: true, example: 'bob' },
            fromCurrency: { $ref: '#/components/schemas/Currency' },
            toCurrency: { $ref: '#/components/schemas/Currency' },
            fromAmount: { type: 'number', example: 100 },
            toAmount: { type: 'number', example: 91 },
            conversionRate: { type: 'number', example: 0.91 },
            status: { type: 'string', enum: ['pending', 'completed', 'failed'], example: 'completed' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid input' },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Missing or invalid authentication token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
              },
            },
          },
        },
        ValidationError: {
          description: 'Invalid request parameters',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive' },
              },
            },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Returns server health status including database connectivity',
          responses: {
            200: {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' },
                      database: { type: 'string', example: 'connected' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new user',
          description: 'Create a new user account. Returns user data and JWT token.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'username', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'charlie@example.com' },
                    username: { type: 'string', minLength: 3, maxLength: 30, example: 'charlie' },
                    password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'User created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/ValidationError' },
            409: {
              description: 'Email or username already taken',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login',
          description: 'Authenticate with email/username and password. Returns JWT token.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['identifier', 'password'],
                  properties: {
                    identifier: { type: 'string', example: 'alice@example.com', description: 'Email or username' },
                    password: { type: 'string', example: 'TestPass123' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get current user',
          description: 'Returns the authenticated user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'User profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/balances': {
        get: {
          tags: ['Balances'],
          summary: 'Get all balances',
          description: 'Returns balances for all currencies',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'List of balances',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          balances: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Balance' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/balances/{currency}': {
        get: {
          tags: ['Balances'],
          summary: 'Get balance for specific currency',
          description: 'Returns balance for a single currency',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'currency',
              in: 'path',
              required: true,
              schema: { $ref: '#/components/schemas/Currency' },
              description: 'Currency code',
            },
          ],
          responses: {
            200: {
              description: 'Balance for currency',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          balance: { $ref: '#/components/schemas/Balance' },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: {
              description: 'Currency not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/deposit': {
        post: {
          tags: ['Transactions'],
          summary: 'Deposit funds',
          description: 'Add funds to your wallet (simulated deposit)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currency', 'amount'],
                  properties: {
                    currency: { $ref: '#/components/schemas/Currency' },
                    amount: { type: 'number', minimum: 0.01, example: 1000 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Deposit successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          transaction: { $ref: '#/components/schemas/Transaction' },
                          newBalance: { $ref: '#/components/schemas/Balance' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/transfer': {
        post: {
          tags: ['Transactions'],
          summary: 'Transfer to another user',
          description: 'Send money to another user with optional currency conversion',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipientIdentifier', 'fromCurrency', 'toCurrency', 'amount'],
                  properties: {
                    recipientIdentifier: { type: 'string', example: 'bob@example.com', description: 'Recipient email or username' },
                    fromCurrency: { $ref: '#/components/schemas/Currency' },
                    toCurrency: { $ref: '#/components/schemas/Currency' },
                    amount: { type: 'number', minimum: 0.01, example: 100, description: 'Amount to send (in fromCurrency)' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Transfer successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          transaction: { $ref: '#/components/schemas/Transaction' },
                          sender: {
                            type: 'object',
                            properties: {
                              newBalance: { $ref: '#/components/schemas/Balance' },
                            },
                          },
                          recipient: {
                            type: 'object',
                            properties: {
                              username: { type: 'string', example: 'bob' },
                              received: { $ref: '#/components/schemas/Balance' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: {
              description: 'Recipient not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/transactions': {
        get: {
          tags: ['Transactions'],
          summary: 'Get transaction history',
          description: 'Returns paginated list of transactions',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 100 },
              description: 'Number of transactions to return',
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', default: 0 },
              description: 'Number of transactions to skip',
            },
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['deposit', 'transfer'] },
              description: 'Filter by transaction type',
            },
          ],
          responses: {
            200: {
              description: 'List of transactions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          transactions: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Transaction' },
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              total: { type: 'integer', example: 50 },
                              limit: { type: 'integer', example: 20 },
                              offset: { type: 'integer', example: 0 },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/transactions/{id}': {
        get: {
          tags: ['Transactions'],
          summary: 'Get single transaction',
          description: 'Returns details of a specific transaction',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'Transaction ID',
            },
          ],
          responses: {
            200: {
              description: 'Transaction details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          transaction: { $ref: '#/components/schemas/Transaction' },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: {
              description: 'Transaction not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/transactions/stats': {
        get: {
          tags: ['Transactions'],
          summary: 'Get transaction statistics',
          description: 'Returns summary statistics for user transactions',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Transaction statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          totalTransactions: { type: 'integer', example: 25 },
                          totalDeposits: { type: 'integer', example: 5 },
                          totalTransfers: { type: 'integer', example: 20 },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/rates': {
        get: {
          tags: ['Rates'],
          summary: 'Get hardcoded exchange rate',
          description: 'Returns static demo exchange rate (for testing)',
          parameters: [
            {
              name: 'from',
              in: 'query',
              required: true,
              schema: { $ref: '#/components/schemas/Currency' },
              description: 'Source currency',
            },
            {
              name: 'to',
              in: 'query',
              required: true,
              schema: { $ref: '#/components/schemas/Currency' },
              description: 'Target currency',
            },
          ],
          responses: {
            200: {
              description: 'Exchange rate',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          from: { type: 'string', example: 'USD' },
                          to: { type: 'string', example: 'EUR' },
                          rate: { type: 'number', example: 0.91 },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/api/rates/live': {
        get: {
          tags: ['Rates'],
          summary: 'Get live exchange rate',
          description: 'Returns real-time exchange rate from CoinGecko (cached 5 min)',
          parameters: [
            {
              name: 'from',
              in: 'query',
              required: true,
              schema: { $ref: '#/components/schemas/Currency' },
              description: 'Source currency',
            },
            {
              name: 'to',
              in: 'query',
              required: true,
              schema: { $ref: '#/components/schemas/Currency' },
              description: 'Target currency',
            },
          ],
          responses: {
            200: {
              description: 'Live exchange rate',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          from: { type: 'string', example: 'USD' },
                          to: { type: 'string', example: 'BTC' },
                          rate: { type: 'number', example: 0.0000112 },
                          source: { type: 'string', enum: ['coingecko', 'hardcoded'], example: 'coingecko' },
                          cached: { type: 'boolean', example: false },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/api/convert/preview': {
        get: {
          tags: ['Rates'],
          summary: 'Preview currency conversion',
          description: 'Calculate conversion result without executing transfer',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'from',
              in: 'query',
              required: true,
              schema: { $ref: '#/components/schemas/Currency' },
              description: 'Source currency',
            },
            {
              name: 'to',
              in: 'query',
              required: true,
              schema: { $ref: '#/components/schemas/Currency' },
              description: 'Target currency',
            },
            {
              name: 'amount',
              in: 'query',
              required: true,
              schema: { type: 'number', minimum: 0.01 },
              description: 'Amount to convert',
            },
          ],
          responses: {
            200: {
              description: 'Conversion preview',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          from: { type: 'string', example: 'USD' },
                          to: { type: 'string', example: 'EUR' },
                          fromAmount: { type: 'number', example: 1000 },
                          toAmount: { type: 'number', example: 910 },
                          rate: { type: 'number', example: 0.91 },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/ValidationError' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
    },
  },
  apis: [], // We're defining everything inline above
};

export const swaggerSpec = swaggerJsdoc(options);
