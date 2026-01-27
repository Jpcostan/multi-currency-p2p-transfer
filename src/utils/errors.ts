/**
 * Custom Error Classes
 *
 * Domain-specific errors for consistent error handling across the application.
 * Each error type maps to an appropriate HTTP status code.
 */

/**
 * Base application error class.
 * All custom errors extend this for consistent error handling.
 */
export class AppError extends Error {
  /** HTTP status code for this error type */
  public readonly statusCode: number;

  /** Machine-readable error code for client handling */
  public readonly code: string;

  /** Additional error context/details */
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (400 Bad Request)
 * Used when request data fails validation.
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication Error (401 Unauthorized)
 * Used when authentication fails or is missing.
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization Error (403 Forbidden)
 * Used when user lacks permission for an action.
 */
export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not Found Error (404)
 * Used when a requested resource doesn't exist.
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, identifier });
  }
}

/**
 * Conflict Error (409)
 * Used when action conflicts with current state (e.g., duplicate email).
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Insufficient Balance Error (422 Unprocessable Entity)
 * Used when a financial operation fails due to insufficient funds.
 */
export class InsufficientBalanceError extends AppError {
  constructor(
    currency: string,
    required: number,
    available: number
  ) {
    super(
      `Insufficient ${currency} balance for this transaction`,
      422,
      'INSUFFICIENT_BALANCE',
      { currency, required, available }
    );
  }
}

/**
 * Invalid Transfer Error (422 Unprocessable Entity)
 * Used for business rule violations in transfers.
 */
export class InvalidTransferError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, 'INVALID_TRANSFER', details);
  }
}

/**
 * Rate Limit Error (429 Too Many Requests)
 * Used when client exceeds rate limits.
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'Too many requests, please try again later',
      429,
      'RATE_LIMIT_EXCEEDED',
      retryAfter ? { retryAfter } : undefined
    );
  }
}

/**
 * Database Error (500 Internal Server Error)
 * Used for database operation failures.
 * Note: Details are logged but not exposed to clients.
 */
export class DatabaseError extends AppError {
  constructor(message = 'A database error occurred') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Business Rule Error (422 Unprocessable Entity)
 * Used when a business rule is violated (e.g., self-transfer).
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION', details);
  }
}

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
