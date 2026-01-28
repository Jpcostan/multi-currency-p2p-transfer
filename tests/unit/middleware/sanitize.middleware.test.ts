/**
 * Sanitize Middleware Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import { sanitizeInput, sanitizeString } from '@/middleware/sanitize.middleware';

describe('Sanitize Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  describe('sanitizeInput', () => {
    it('should call next() after sanitization', () => {
      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should sanitize XSS in request body strings', () => {
      mockRequest.body = {
        name: '<script>alert("xss")</script>John',
        email: 'test@example.com',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.body.name).toBe('John');
      expect(mockRequest.body.email).toBe('test@example.com');
    });

    it('should sanitize XSS in nested objects', () => {
      mockRequest.body = {
        user: {
          name: '<img src=x onerror=alert(1)>Bob',
          profile: {
            bio: '<script>evil()</script>Hello',
          },
        },
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.body.user.name).toBe('Bob');
      expect(mockRequest.body.user.profile.bio).toBe('Hello');
    });

    it('should sanitize XSS in arrays', () => {
      mockRequest.body = {
        tags: ['<script>alert(1)</script>safe', 'normal', '<b>bold</b>'],
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.body.tags).toEqual(['safe', 'normal', 'bold']);
    });

    it('should sanitize query parameters', () => {
      mockRequest.query = {
        search: '<script>xss</script>query',
        page: '1',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.query.search).toBe('query');
      expect(mockRequest.query.page).toBe('1');
    });

    it('should sanitize URL params', () => {
      mockRequest.params = {
        id: '<script>alert(1)</script>123',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.params.id).toBe('123');
    });

    it('should preserve non-string values', () => {
      mockRequest.body = {
        count: 42,
        active: true,
        data: null,
        amount: 99.99,
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.body.count).toBe(42);
      expect(mockRequest.body.active).toBe(true);
      expect(mockRequest.body.data).toBe(null);
      expect(mockRequest.body.amount).toBe(99.99);
    });

    it('should handle empty body', () => {
      mockRequest.body = {};

      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.body).toEqual({});
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle undefined body', () => {
      mockRequest.body = undefined;

      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should remove style tag content', () => {
      mockRequest.body = {
        content: '<style>body{display:none}</style>visible',
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.body.content).toBe('visible');
    });

    it('should handle mixed nested arrays and objects', () => {
      mockRequest.body = {
        items: [
          { name: '<script>x</script>item1' },
          { name: 'item2', tags: ['<b>tag1</b>', 'tag2'] },
        ],
      };

      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.body.items[0].name).toBe('item1');
      expect(mockRequest.body.items[1].tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize script tags', () => {
      const result = sanitizeString('<script>alert("xss")</script>safe');

      expect(result).toBe('safe');
    });

    it('should sanitize img onerror', () => {
      const result = sanitizeString('<img src=x onerror=alert(1)>text');

      expect(result).toBe('text');
    });

    it('should sanitize HTML tags', () => {
      const result = sanitizeString('<b>bold</b> and <i>italic</i>');

      expect(result).toBe('bold and italic');
    });

    it('should preserve normal text', () => {
      const result = sanitizeString('Hello, World!');

      expect(result).toBe('Hello, World!');
    });

    it('should handle empty string', () => {
      const result = sanitizeString('');

      expect(result).toBe('');
    });

    it('should encode special characters in URLs', () => {
      const result = sanitizeString('javascript:alert(1)');

      // Should not be treated as executable
      expect(result).not.toContain('<');
    });
  });
});
