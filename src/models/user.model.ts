/**
 * User Domain Model
 *
 * Represents a registered user in the P2P payment system.
 * Handles user data validation and transformation.
 */

import { z } from 'zod';

/**
 * User entity as stored in the database.
 */
export interface User {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User data for public API responses (excludes sensitive fields).
 */
export interface UserDTO {
  id: number;
  email: string;
  username: string;
  createdAt: string;
}

/**
 * Data required to create a new user.
 */
export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
}

/**
 * Data required to login a user.
 */
export interface LoginInput {
  identifier: string; // Can be email or username
  password: string;
}

/**
 * Raw user row from SQLite database.
 * Column names use snake_case as stored in DB.
 */
export interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

/**
 * Zod schema for validating user registration input.
 */
export const createUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be 255 characters or less')
    .transform((val) => val.toLowerCase().trim()),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores'
    )
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be 72 characters or less') // bcrypt limit
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * Zod schema for user login input (by email).
 */
export const loginUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.toLowerCase().trim()),

  password: z.string().min(1, 'Password is required'),
});

/**
 * Zod schema for user login input (by identifier - email or username).
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or username is required')
    .transform((val) => val.toLowerCase().trim()),

  password: z.string().min(1, 'Password is required'),
});

/**
 * Convert a database row to a User entity.
 *
 * @param row - Raw database row
 * @returns User entity with proper types
 */
export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Convert a User entity to a public DTO (excludes password hash).
 *
 * @param user - User entity
 * @returns Public user data safe for API responses
 */
export function userToDTO(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.createdAt.toISOString(),
  };
}
