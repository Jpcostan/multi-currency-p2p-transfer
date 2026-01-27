/**
 * User Repository
 *
 * Data access layer for user operations.
 * Handles all database interactions for the users table.
 */

import Database from 'better-sqlite3';
import { getDatabase } from '@/config/database';
import { User, UserRow, rowToUser, CreateUserInput } from '@/models/user.model';
import { logger } from '@/utils/logger';
import { DatabaseError, ConflictError, NotFoundError } from '@/utils/errors';

/**
 * Repository for user data access operations.
 */
export class UserRepository {
  private _db?: Database.Database;

  constructor(database?: Database.Database) {
    this._db = database;
  }

  /**
   * Get the database instance.
   * If not explicitly provided, uses the singleton from getDatabase().
   */
  private get db(): Database.Database {
    return this._db || getDatabase();
  }

  /**
   * Create a new user in the database.
   *
   * @param input - User creation data (email, username)
   * @param passwordHash - Bcrypt hashed password
   * @returns The created user
   * @throws ConflictError if email or username already exists
   * @throws DatabaseError on database failure
   */
  create(input: Omit<CreateUserInput, 'password'> & { passwordHash: string }): User {
    const { email, username, passwordHash } = input;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (email, username, password_hash)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(email, username, passwordHash);
      const userId = result.lastInsertRowid as number;

      logger.info('User created', { userId, email, username });

      // Fetch and return the created user
      const user = this.findById(userId);
      if (!user) {
        throw new DatabaseError('Failed to retrieve created user');
      }

      return user;
    } catch (error: unknown) {
      // Handle unique constraint violations from SQLite
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as { code?: string }).code;

      // Check for UNIQUE constraint violations (handles both message and code)
      if (
        errorMessage.includes('UNIQUE constraint failed') ||
        errorCode === 'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        if (errorMessage.includes('users.email')) {
          throw new ConflictError('Email already registered', { email });
        }
        if (errorMessage.includes('users.username')) {
          throw new ConflictError('Username already taken', { username });
        }
      }
      throw error;
    }
  }

  /**
   * Find a user by their ID.
   *
   * @param id - User ID
   * @returns User if found, null otherwise
   */
  findById(id: number): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, username, password_hash, created_at, updated_at
      FROM users
      WHERE id = ?
    `);

    const row = stmt.get(id) as UserRow | undefined;

    if (!row) {
      return null;
    }

    return rowToUser(row);
  }

  /**
   * Find a user by their email address.
   *
   * @param email - User email (case-insensitive)
   * @returns User if found, null otherwise
   */
  findByEmail(email: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, username, password_hash, created_at, updated_at
      FROM users
      WHERE email = ?
    `);

    const row = stmt.get(email.toLowerCase()) as UserRow | undefined;

    if (!row) {
      return null;
    }

    return rowToUser(row);
  }

  /**
   * Find a user by their username.
   *
   * @param username - Username (case-insensitive)
   * @returns User if found, null otherwise
   */
  findByUsername(username: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, username, password_hash, created_at, updated_at
      FROM users
      WHERE username = ?
    `);

    const row = stmt.get(username.toLowerCase()) as UserRow | undefined;

    if (!row) {
      return null;
    }

    return rowToUser(row);
  }

  /**
   * Find a user by email or username.
   * Useful for login where user can provide either.
   *
   * @param identifier - Email or username
   * @returns User if found, null otherwise
   */
  findByEmailOrUsername(identifier: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, username, password_hash, created_at, updated_at
      FROM users
      WHERE email = ? OR username = ?
    `);

    const normalizedIdentifier = identifier.toLowerCase();
    const row = stmt.get(normalizedIdentifier, normalizedIdentifier) as UserRow | undefined;

    if (!row) {
      return null;
    }

    return rowToUser(row);
  }

  /**
   * Get a user by ID, throwing if not found.
   *
   * @param id - User ID
   * @returns User
   * @throws NotFoundError if user doesn't exist
   */
  getById(id: number): User {
    const user = this.findById(id);

    if (!user) {
      throw new NotFoundError('User', id);
    }

    return user;
  }

  /**
   * Check if an email is already registered.
   *
   * @param email - Email to check
   * @returns true if email exists
   */
  emailExists(email: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM users WHERE email = ?
    `);

    return stmt.get(email.toLowerCase()) !== undefined;
  }

  /**
   * Check if a username is already taken.
   *
   * @param username - Username to check
   * @returns true if username exists
   */
  usernameExists(username: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM users WHERE username = ?
    `);

    return stmt.get(username.toLowerCase()) !== undefined;
  }

  /**
   * Update user's password hash.
   *
   * @param userId - User ID
   * @param newPasswordHash - New bcrypt hash
   * @throws NotFoundError if user doesn't exist
   */
  updatePassword(userId: number, newPasswordHash: string): void {
    const stmt = this.db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(newPasswordHash, userId);

    if (result.changes === 0) {
      throw new NotFoundError('User', userId);
    }

    logger.info('User password updated', { userId });
  }

  /**
   * Get total count of users.
   * Useful for admin/metrics.
   *
   * @returns Total number of users
   */
  count(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM users`);
    const result = stmt.get() as { count: number };
    return result.count;
  }
}

/**
 * Singleton instance for convenience.
 * Use `new UserRepository()` for testing with mock database.
 */
let instance: UserRepository | null = null;

export function getUserRepository(): UserRepository {
  if (!instance) {
    instance = new UserRepository();
  }
  return instance;
}

/**
 * Reset singleton (for testing).
 */
export function resetUserRepository(): void {
  instance = null;
}
