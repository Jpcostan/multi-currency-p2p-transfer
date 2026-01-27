/**
 * Common Type Definitions
 *
 * Shared types used across the application for API responses,
 * pagination, and general data structures.
 */

/**
 * Standard API success response wrapper.
 * All successful responses follow this structure.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard API error response wrapper.
 * All error responses follow this structure.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Union type for all API responses.
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

/**
 * Pagination parameters for list endpoints.
 */
export interface PaginationParams {
  /** Number of records to return (default: 20, max: 100) */
  limit: number;
  /** Number of records to skip (default: 0) */
  offset: number;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Timestamp fields common to all database entities.
 */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base entity with ID and timestamps.
 */
export interface BaseEntity extends Timestamps {
  id: number;
}

/**
 * JWT token payload structure.
 */
export interface JwtPayload {
  /** User ID */
  sub: number;
  /** User email */
  email: string;
  /** Token issued at timestamp */
  iat: number;
  /** Token expiration timestamp */
  exp: number;
}

/**
 * Authenticated request user object.
 * Attached to request by auth middleware.
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  username: string;
}

/**
 * Helper type to make all properties optional except specified keys.
 */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

/**
 * Helper type for creating DTO (Data Transfer Object) types.
 * Omits database-specific fields for API responses.
 */
export type DTO<T> = Omit<T, 'passwordHash'>;
