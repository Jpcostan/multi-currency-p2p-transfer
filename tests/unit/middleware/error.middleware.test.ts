/**
 * Error Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { errorHandler, notFoundHandler, asyncHandler } from '@/middleware/error.middleware';
import { ValidationError, NotFoundError, DatabaseError } from '@/utils/errors';

// Mock logger to prevent actual logging during tests
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Error Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      method: 'GET',
      path: '/test',
      body: {},
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle ValidationError (4xx)', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email' },
        },
      });
    });

    it('should handle NotFoundError (404)', () => {
      const error = new NotFoundError('User', 123);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: "User with identifier '123' not found",
          details: { resource: 'User', identifier: 123 },
        },
      });
    });

    it('should handle DatabaseError (5xx)', () => {
      const error = new DatabaseError('Connection failed');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Connection failed',
          details: undefined,
        },
      });
    });

    it('should handle ZodError with validation details', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      let zodError: ZodError;
      try {
        schema.parse({ email: 'invalid', age: 10 });
      } catch (e) {
        zodError = e as ZodError;
      }

      errorHandler(zodError!, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
          }),
        })
      );
    });

    it('should handle unexpected errors in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Unexpected failure');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected failure',
        },
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Sensitive internal error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with route details', () => {
      const notFoundReq = {
        method: 'POST',
        path: '/api/unknown',
        body: {},
      } as Request;

      notFoundHandler(notFoundReq, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route POST /api/unknown not found',
        },
      });
    });
  });

  describe('asyncHandler', () => {
    it('should pass successful result through', async () => {
      const handler = asyncHandler(async (_req: Request, res: Response) => {
        res.json({ success: true });
      });

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward errors to next', async () => {
      const error = new Error('Async error');
      const handler = asyncHandler(async () => {
        throw error;
      });

      await handler(mockReq as Request, mockRes as Response, mockNext);

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
