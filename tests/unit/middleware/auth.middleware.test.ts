/**
 * Auth Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '@/middleware/auth.middleware';
import { AuthenticationError } from '@/utils/errors';

// Mock the user service
const mockVerifyToken = jest.fn();
jest.mock('@/services/user.service', () => ({
  getUserService: () => ({
    verifyToken: mockVerifyToken,
  }),
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
    mockVerifyToken.mockReset();
  });

  describe('authMiddleware', () => {
    it('should call next() with valid token', () => {
      const payload = { userId: 1, email: 'test@example.com', username: 'testuser' };
      mockVerifyToken.mockReturnValue(payload);
      mockReq.headers = { authorization: 'Bearer valid-token' };

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
      expect((mockReq as AuthenticatedRequest).user).toEqual(payload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() with error when no authorization header', () => {
      mockReq.headers = {};

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should call next() with error for invalid format (no Bearer)', () => {
      mockReq.headers = { authorization: 'invalid-format' };

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should call next() with error for invalid format (wrong scheme)', () => {
      mockReq.headers = { authorization: 'Basic some-token' };

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should call next() with error when token verification fails', () => {
      mockVerifyToken.mockImplementation(() => {
        throw new AuthenticationError('Invalid token');
      });
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should attach user when valid token provided', () => {
      const payload = { userId: 1, email: 'test@example.com', username: 'testuser' };
      mockVerifyToken.mockReturnValue(payload);
      mockReq.headers = { authorization: 'Bearer valid-token' };

      optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as AuthenticatedRequest).user).toEqual(payload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() without user when no authorization header', () => {
      mockReq.headers = {};

      optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as AuthenticatedRequest).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() without user when token is invalid', () => {
      mockVerifyToken.mockImplementation(() => {
        throw new AuthenticationError('Invalid token');
      });
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as AuthenticatedRequest).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() without user for malformed authorization header', () => {
      mockReq.headers = { authorization: 'malformed' };

      optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as AuthenticatedRequest).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
