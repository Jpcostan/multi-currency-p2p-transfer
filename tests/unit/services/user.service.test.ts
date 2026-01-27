/**
 * User Service Unit Tests
 */

import Database from 'better-sqlite3';
import { UserService } from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { BalanceRepository } from '@/repositories/balance.repository';
import { createTestDatabase, TEST_USERS } from '../../fixtures/test-helpers';
import { Balance } from '@/models/balance.model';
import { ValidationError, AuthenticationError, NotFoundError } from '@/utils/errors';

describe('UserService', () => {
  let db: Database.Database;
  let userRepository: UserRepository;
  let balanceRepository: BalanceRepository;
  let service: UserService;

  beforeEach(() => {
    db = createTestDatabase();
    userRepository = new UserRepository(db);
    balanceRepository = new BalanceRepository(db);
    service = new UserService(userRepository, balanceRepository, {
      bcryptRounds: 4, // Lower rounds for faster tests
      jwtSecret: 'test-secret-key',
      jwtExpiration: '1h',
    });
  });

  afterEach(() => {
    db.close();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await service.register({
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'SecurePass123!',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.username).toBe('newuser');
      expect(result.user.id).toBe(1);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      // Should not include password hash
      expect((result.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('should initialize balances for all currencies', async () => {
      await service.register({
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'SecurePass123!',
      });

      // Check that balances were created for all currencies
      const balances = balanceRepository.findAllByUserId(1);
      expect(balances.length).toBe(4); // USD, EUR, BTC, ETH
      balances.forEach((balance: Balance) => {
        expect(balance.amount).toBe(0n);
      });
    });

    it('should throw ValidationError for invalid email', async () => {
      await expect(
        service.register({
          email: 'invalid-email',
          username: 'newuser',
          password: 'SecurePass123!',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for short password', async () => {
      await expect(
        service.register({
          email: 'user@example.com',
          username: 'newuser',
          password: 'short',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for short username', async () => {
      await expect(
        service.register({
          email: 'user@example.com',
          username: 'ab',
          password: 'SecurePass123!',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should convert email to lowercase', async () => {
      const result = await service.register({
        email: 'USER@EXAMPLE.COM',
        username: 'newuser',
        password: 'SecurePass123!',
      });

      expect(result.user.email).toBe('user@example.com');
    });

    it('should convert username to lowercase', async () => {
      const result = await service.register({
        email: 'user@example.com',
        username: 'NewUser',
        password: 'SecurePass123!',
      });

      expect(result.user.username).toBe('newuser');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Register a user first
      await service.register({
        email: TEST_USERS.alice.email,
        username: TEST_USERS.alice.username,
        password: 'AlicePassword123!',
      });
    });

    it('should login with email successfully', async () => {
      const result = await service.login({
        identifier: TEST_USERS.alice.email,
        password: 'AlicePassword123!',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(TEST_USERS.alice.email);
      expect(result.token).toBeDefined();
    });

    it('should login with username successfully', async () => {
      const result = await service.login({
        identifier: TEST_USERS.alice.username,
        password: 'AlicePassword123!',
      });

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe(TEST_USERS.alice.username);
      expect(result.token).toBeDefined();
    });

    it('should be case-insensitive for identifier', async () => {
      const result = await service.login({
        identifier: TEST_USERS.alice.email.toUpperCase(),
        password: 'AlicePassword123!',
      });

      expect(result.user.email).toBe(TEST_USERS.alice.email);
    });

    it('should throw AuthenticationError for wrong password', async () => {
      await expect(
        service.login({
          identifier: TEST_USERS.alice.email,
          password: 'WrongPassword123!',
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      await expect(
        service.login({
          identifier: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw ValidationError for empty identifier', async () => {
      await expect(
        service.login({
          identifier: '',
          password: 'AnyPassword123!',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserById', () => {
    it('should return user DTO for existing user', async () => {
      const { user } = await service.register({
        email: 'user@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
      });

      const result = service.getUserById(user.id);

      expect(result.id).toBe(user.id);
      expect(result.email).toBe('user@example.com');
    });

    it('should throw NotFoundError for non-existent user', () => {
      expect(() => {
        service.getUserById(999);
      }).toThrow(NotFoundError);
    });
  });

  describe('getUserByEmail', () => {
    it('should return user DTO for existing email', async () => {
      await service.register({
        email: 'user@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
      });

      const result = service.getUserByEmail('user@example.com');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('user@example.com');
    });

    it('should return null for non-existent email', () => {
      const result = service.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserByUsername', () => {
    it('should return user DTO for existing username', async () => {
      await service.register({
        email: 'user@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
      });

      const result = service.getUserByUsername('testuser');

      expect(result).not.toBeNull();
      expect(result?.username).toBe('testuser');
    });

    it('should return null for non-existent username', () => {
      const result = service.getUserByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return payload', async () => {
      const { token, user } = await service.register({
        email: 'user@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
      });

      const payload = service.verifyToken(token);

      expect(payload.userId).toBe(user.id);
      expect(payload.email).toBe(user.email);
      expect(payload.username).toBe(user.username);
    });

    it('should throw AuthenticationError for invalid token', () => {
      expect(() => {
        service.verifyToken('invalid-token');
      }).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for expired token', () => {
      // Test by creating a malformed "expired" scenario
      expect(() => {
        service.verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInVzZXJuYW1lIjoidGVzdCIsImlhdCI6MCwiZXhwIjoxfQ.invalid');
      }).toThrow(AuthenticationError);
    });
  });

  describe('changePassword', () => {
    let userId: number;

    beforeEach(async () => {
      const { user } = await service.register({
        email: 'user@example.com',
        username: 'testuser',
        password: 'OldPassword123!',
      });
      userId = user.id;
    });

    it('should change password successfully', async () => {
      await service.changePassword(userId, 'OldPassword123!', 'NewPassword123!');

      // Should be able to login with new password
      const result = await service.login({
        identifier: 'user@example.com',
        password: 'NewPassword123!',
      });
      expect(result.user).toBeDefined();
    });

    it('should reject login with old password after change', async () => {
      await service.changePassword(userId, 'OldPassword123!', 'NewPassword123!');

      await expect(
        service.login({
          identifier: 'user@example.com',
          password: 'OldPassword123!',
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for wrong current password', async () => {
      await expect(
        service.changePassword(userId, 'WrongPassword123!', 'NewPassword123!')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw ValidationError for short new password', async () => {
      await expect(service.changePassword(userId, 'OldPassword123!', 'short')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(
        service.changePassword(999, 'AnyPassword123!', 'NewPassword123!')
      ).rejects.toThrow(NotFoundError);
    });
  });
});
