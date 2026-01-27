/**
 * User Repository Unit Tests
 */

import Database from 'better-sqlite3';
import { UserRepository } from '@/repositories/user.repository';
import {
  createTestDatabase,
  TEST_USERS,
  seedUser,
} from '../../fixtures/test-helpers';
import { ConflictError, NotFoundError } from '@/utils/errors';

describe('UserRepository', () => {
  let db: Database.Database;
  let repository: UserRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repository = new UserRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a new user successfully', () => {
      const user = repository.create({
        email: TEST_USERS.alice.email,
        username: TEST_USERS.alice.username,
        passwordHash: TEST_USERS.alice.passwordHash,
      });

      expect(user).toBeDefined();
      expect(user.id).toBe(1);
      expect(user.email).toBe(TEST_USERS.alice.email);
      expect(user.username).toBe(TEST_USERS.alice.username);
      expect(user.passwordHash).toBe(TEST_USERS.alice.passwordHash);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw ConflictError for duplicate email', () => {
      repository.create({
        email: TEST_USERS.alice.email,
        username: TEST_USERS.alice.username,
        passwordHash: TEST_USERS.alice.passwordHash,
      });

      expect(() => {
        repository.create({
          email: TEST_USERS.alice.email,
          username: 'different_username',
          passwordHash: TEST_USERS.alice.passwordHash,
        });
      }).toThrow(ConflictError);
    });

    it('should throw ConflictError for duplicate username', () => {
      repository.create({
        email: TEST_USERS.alice.email,
        username: TEST_USERS.alice.username,
        passwordHash: TEST_USERS.alice.passwordHash,
      });

      expect(() => {
        repository.create({
          email: 'different@example.com',
          username: TEST_USERS.alice.username,
          passwordHash: TEST_USERS.alice.passwordHash,
        });
      }).toThrow(ConflictError);
    });
  });

  describe('findById', () => {
    it('should find an existing user by ID', () => {
      const userId = seedUser(db, TEST_USERS.alice);

      const user = repository.findById(userId);

      expect(user).not.toBeNull();
      expect(user?.id).toBe(userId);
      expect(user?.email).toBe(TEST_USERS.alice.email);
    });

    it('should return null for non-existent ID', () => {
      const user = repository.findById(999);

      expect(user).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find an existing user by email', () => {
      seedUser(db, TEST_USERS.alice);

      const user = repository.findByEmail(TEST_USERS.alice.email);

      expect(user).not.toBeNull();
      expect(user?.email).toBe(TEST_USERS.alice.email);
    });

    it('should be case-insensitive', () => {
      seedUser(db, TEST_USERS.alice);

      const user = repository.findByEmail(TEST_USERS.alice.email.toUpperCase());

      expect(user).not.toBeNull();
    });

    it('should return null for non-existent email', () => {
      const user = repository.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find an existing user by username', () => {
      seedUser(db, TEST_USERS.alice);

      const user = repository.findByUsername(TEST_USERS.alice.username);

      expect(user).not.toBeNull();
      expect(user?.username).toBe(TEST_USERS.alice.username);
    });

    it('should return null for non-existent username', () => {
      const user = repository.findByUsername('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('findByEmailOrUsername', () => {
    beforeEach(() => {
      seedUser(db, TEST_USERS.alice);
    });

    it('should find user by email', () => {
      const user = repository.findByEmailOrUsername(TEST_USERS.alice.email);

      expect(user).not.toBeNull();
      expect(user?.email).toBe(TEST_USERS.alice.email);
    });

    it('should find user by username', () => {
      const user = repository.findByEmailOrUsername(TEST_USERS.alice.username);

      expect(user).not.toBeNull();
      expect(user?.username).toBe(TEST_USERS.alice.username);
    });

    it('should return null for non-existent identifier', () => {
      const user = repository.findByEmailOrUsername('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return user for existing ID', () => {
      const userId = seedUser(db, TEST_USERS.alice);

      const user = repository.getById(userId);

      expect(user.id).toBe(userId);
    });

    it('should throw NotFoundError for non-existent ID', () => {
      expect(() => {
        repository.getById(999);
      }).toThrow(NotFoundError);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', () => {
      seedUser(db, TEST_USERS.alice);

      expect(repository.emailExists(TEST_USERS.alice.email)).toBe(true);
    });

    it('should return false for non-existent email', () => {
      expect(repository.emailExists('nonexistent@example.com')).toBe(false);
    });
  });

  describe('usernameExists', () => {
    it('should return true for existing username', () => {
      seedUser(db, TEST_USERS.alice);

      expect(repository.usernameExists(TEST_USERS.alice.username)).toBe(true);
    });

    it('should return false for non-existent username', () => {
      expect(repository.usernameExists('nonexistent')).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update password hash', () => {
      const userId = seedUser(db, TEST_USERS.alice);
      const newHash = '$2b$12$newhashnewhashnewhashnewhashnewhashnewhashnew';

      repository.updatePassword(userId, newHash);

      const user = repository.findById(userId);
      expect(user?.passwordHash).toBe(newHash);
    });

    it('should throw NotFoundError for non-existent user', () => {
      expect(() => {
        repository.updatePassword(999, 'newhash');
      }).toThrow(NotFoundError);
    });
  });

  describe('count', () => {
    it('should return 0 for empty database', () => {
      expect(repository.count()).toBe(0);
    });

    it('should return correct count', () => {
      seedUser(db, TEST_USERS.alice);
      seedUser(db, TEST_USERS.bob);

      expect(repository.count()).toBe(2);
    });
  });
});
