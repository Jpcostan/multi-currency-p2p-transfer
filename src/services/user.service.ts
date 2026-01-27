/**
 * User Service
 *
 * Business logic for user operations including registration,
 * authentication, and user lookup.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository, getUserRepository } from '@/repositories/user.repository';
import { BalanceRepository, getBalanceRepository } from '@/repositories/balance.repository';
import {
  User,
  UserDTO,
  userToDTO,
  CreateUserInput,
  LoginInput,
  createUserSchema,
  loginSchema,
} from '@/models/user.model';
import { env } from '@/config/env';
import { logger, auditLogger } from '@/utils/logger';
import { ValidationError, AuthenticationError } from '@/utils/errors';

/**
 * Authentication response with user data and JWT token.
 */
export interface AuthResponse {
  user: UserDTO;
  token: string;
}

/**
 * JWT payload structure.
 */
export interface JWTPayload {
  userId: number;
  email: string;
  username: string;
}

/**
 * Service for user-related business logic.
 */
export class UserService {
  private userRepository: UserRepository;
  private balanceRepository: BalanceRepository;
  private bcryptRounds: number;
  private jwtSecret: string;
  private jwtExpiration: string;

  constructor(
    userRepository?: UserRepository,
    balanceRepository?: BalanceRepository,
    options?: {
      bcryptRounds?: number;
      jwtSecret?: string;
      jwtExpiration?: string;
    }
  ) {
    this.userRepository = userRepository || getUserRepository();
    this.balanceRepository = balanceRepository || getBalanceRepository();
    this.bcryptRounds = options?.bcryptRounds ?? env.BCRYPT_ROUNDS;
    this.jwtSecret = options?.jwtSecret ?? env.JWT_SECRET;
    this.jwtExpiration = options?.jwtExpiration ?? env.JWT_EXPIRATION;
  }

  /**
   * Register a new user.
   *
   * Creates the user account and initializes zero balances for all
   * supported currencies.
   *
   * @param input - Registration data (email, username, password)
   * @returns Auth response with user DTO and JWT token
   * @throws ValidationError if input validation fails
   * @throws ConflictError if email or username already exists
   */
  async register(input: CreateUserInput): Promise<AuthResponse> {
    // Validate input
    const parseResult = createUserSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      throw new ValidationError(firstError?.message || 'Invalid registration data', {
        field: firstError?.path.join('.'),
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { email, username, password } = parseResult.data;

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);

    // Create user (repository handles duplicate checks)
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
    });

    // Initialize balances for all supported currencies
    this.balanceRepository.initializeForUser(user.id);

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // Audit log for compliance
    auditLogger.info('USER_REGISTERED', {
      userId: user.id,
      email: user.email,
      username: user.username,
      action: 'register',
    });

    // Generate token and return
    const token = this.generateToken(user);
    return {
      user: userToDTO(user),
      token,
    };
  }

  /**
   * Authenticate a user with email/username and password.
   *
   * @param input - Login credentials (identifier can be email or username)
   * @returns Auth response with user DTO and JWT token
   * @throws ValidationError if input validation fails
   * @throws AuthenticationError if credentials are invalid
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    // Validate input
    const parseResult = loginSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      throw new ValidationError(firstError?.message || 'Invalid login data', {
        field: firstError?.path.join('.'),
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { identifier, password } = parseResult.data;

    // Find user by email or username
    const user = this.userRepository.findByEmailOrUsername(identifier.toLowerCase());
    if (!user) {
      // Use generic message to prevent user enumeration
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    // Audit log for compliance
    auditLogger.info('USER_LOGIN', {
      userId: user.id,
      email: user.email,
      action: 'login',
    });

    // Generate token and return
    const token = this.generateToken(user);
    return {
      user: userToDTO(user),
      token,
    };
  }

  /**
   * Get a user by their ID.
   *
   * @param userId - User ID
   * @returns User DTO
   * @throws NotFoundError if user doesn't exist
   */
  getUserById(userId: number): UserDTO {
    const user = this.userRepository.getById(userId);
    return userToDTO(user);
  }

  /**
   * Get a user by their email address.
   *
   * @param email - User email
   * @returns User DTO or null if not found
   */
  getUserByEmail(email: string): UserDTO | null {
    const user = this.userRepository.findByEmail(email.toLowerCase());
    return user ? userToDTO(user) : null;
  }

  /**
   * Get a user by their username.
   *
   * @param username - Username
   * @returns User DTO or null if not found
   */
  getUserByUsername(username: string): UserDTO | null {
    const user = this.userRepository.findByUsername(username.toLowerCase());
    return user ? userToDTO(user) : null;
  }

  /**
   * Verify a JWT token and return the payload.
   *
   * @param token - JWT token string
   * @returns Decoded JWT payload
   * @throws AuthenticationError if token is invalid or expired
   */
  verifyToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Change a user's password.
   *
   * @param userId - User ID
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @throws NotFoundError if user doesn't exist
   * @throws AuthenticationError if current password is incorrect
   * @throws ValidationError if new password doesn't meet requirements
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user (throws if not found)
    const user = this.userRepository.getById(userId);

    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Validate new password (same rules as registration)
    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', {
        field: 'newPassword',
        minLength: 8,
      });
    }

    // Hash and update
    const newPasswordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    this.userRepository.updatePassword(userId, newPasswordHash);

    logger.info('User password changed', { userId });
  }

  /**
   * Generate a JWT token for a user.
   *
   * @param user - User entity
   * @returns Signed JWT token string
   */
  private generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiration,
    } as jwt.SignOptions);
  }
}

/**
 * Singleton instance for convenience.
 * Use `new UserService()` for testing with mock dependencies.
 */
let instance: UserService | null = null;

export function getUserService(): UserService {
  if (!instance) {
    instance = new UserService();
  }
  return instance;
}

/**
 * Reset singleton (for testing).
 */
export function resetUserService(): void {
  instance = null;
}
