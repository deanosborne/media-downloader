/**
 * Tests for validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { 
  validate, 
  sanitize, 
  validateFileUpload, 
  securityHeaders,
  ValidationSchema
} from '../validation.js';
import { ValidationError } from '../../types/errors.js';
import { ILogger } from '../../types/service.js';

// Mock logger
const mockLogger: ILogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock Express objects
const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
  headers: {},
  body: {},
  query: {},
  params: {},
  files: undefined,
  method: 'POST',
  path: '/test',
  ...overrides
} as any);

const createMockResponse = (): Response => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis()
} as any);

const createMockNext = (): NextFunction => jest.fn();

describe('Validation Middleware', () => {
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should pass validation with valid data', () => {
      mockReq.body = { name: 'John', email: 'john@example.com', age: 25 };
      
      const schema: ValidationSchema = {
        body: [
          { field: 'name', type: 'string', required: true, min: 2 },
          { field: 'email', type: 'email', required: true },
          { field: 'age', type: 'number', min: 18, max: 100 }
        ]
      };

      const middleware = validate(schema, { logger: mockLogger });
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Request validation passed',
        expect.objectContaining({
          method: 'POST',
          path: '/test'
        })
      );
    });

    it('should fail validation for missing required fields', () => {
      mockReq.body = { name: 'John' };
      
      const schema: ValidationSchema = {
        body: [
          { field: 'name', type: 'string', required: true },
          { field: 'email', type: 'email', required: true }
        ]
      };

      const middleware = validate(schema, { logger: mockLogger });
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Request validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.stringContaining('body.email is required')
          ])
        })
      );
    });

    it('should validate string type and length', () => {
      mockReq.body = { name: 'A' }; // Too short
      
      const schema: ValidationSchema = {
        body: [
          { field: 'name', type: 'string', required: true, min: 2, max: 50 }
        ]
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate number type and range', () => {
      mockReq.body = { age: 150 }; // Too high
      
      const schema: ValidationSchema = {
        body: [
          { field: 'age', type: 'number', min: 0, max: 120 }
        ]
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate email format', () => {
      mockReq.body = { email: 'invalid-email' };
      
      const schema: ValidationSchema = {
        body: [
          { field: 'email', type: 'email', required: true }
        ]
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate URL format', () => {
      mockReq.body = { website: 'not-a-url' };
      
      const schema: ValidationSchema = {
        body: [
          { field: 'website', type: 'url' }
        ]
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate array type', () => {
      mockReq.body = { tags: 'not-an-array' };
      
      const schema: ValidationSchema = {
        body: [
          { field: 'tags', type: 'array', required: true }
        ]
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate enum values', () => {
      mockReq.body = { status: 'invalid' };
      
      const schema: ValidationSchema = {
        body: [
          { field: 'status', type: 'string', enum: ['active', 'inactive', 'pending'] }
        ]
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate with regex pattern', () => {
      mockReq.body = { code: '123' }; // Should be letters only
      
      const schema: ValidationSchema = {
        body: [
          { field: 'code', type: 'string', pattern: /^[A-Z]+$/ }
        ]
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate with custom function', () => {
      mockReq.body = { password: 'weak' };
      
      const schema: ValidationSchema = {
        body: [
          { 
            field: 'password', 
            type: 'string', 
            custom: (value) => value.length >= 8 || 'Password must be at least 8 characters'
          }
        ]
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate query parameters', () => {
      mockReq.query = { page: 'invalid' };
      
      const schema: ValidationSchema = {
        query: [
          { field: 'page', type: 'number', min: 1 }
        ]
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should validate route parameters', () => {
      mockReq.params = { id: '' };
      
      const schema: ValidationSchema = {
        params: [
          { field: 'id', type: 'string', required: true, min: 1 }
        ]
      };

      const middleware = validate(schema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('sanitize', () => {
    it('should sanitize string values by default', () => {
      mockReq.body = {
        name: '  John Doe  ',
        description: '<script>alert("xss")</script>Hello'
      };

      const middleware = sanitize();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('John Doe');
      // The regex /<[^>]*>/g removes HTML tags but leaves content inside
      // So '<script>alert("xss")</script>Hello' becomes 'alert("xss")Hello'
      expect(mockReq.body.description).toBe('alert("xss")Hello');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should sanitize nested objects', () => {
      mockReq.body = {
        user: {
          name: '  John  ',
          bio: '<p>Hello</p>'
        }
      };

      const middleware = sanitize({ removeHtml: true });
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.user.name).toBe('John');
      expect(mockReq.body.user.bio).toBe('Hello');
    });

    it('should sanitize arrays', () => {
      mockReq.body = {
        tags: ['  tag1  ', '<script>tag2</script>']
      };

      const middleware = sanitize();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.tags).toEqual(['tag1', 'tag2']);
    });

    it('should preserve allowed HTML tags', () => {
      mockReq.body = {
        content: '<p>Hello</p><script>alert("xss")</script><b>World</b>'
      };

      const middleware = sanitize({
        removeHtml: true,
        allowedTags: ['p', 'b']
      });
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.content).toContain('<p>');
      expect(mockReq.body.content).toContain('<b>');
      expect(mockReq.body.content).not.toContain('<script>');
    });

    it('should truncate long strings', () => {
      mockReq.body = {
        text: 'a'.repeat(1000)
      };

      const middleware = sanitize({ maxStringLength: 100 });
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.text).toHaveLength(100);
    });

    it('should sanitize query parameters', () => {
      mockReq.query = {
        search: '  <script>alert("xss")</script>  '
      };

      const middleware = sanitize();
      middleware(mockReq, mockRes, mockNext);

      expect((mockReq.query as any).search).toBe('alert("xss")');
    });
  });

  describe('validateFileUpload', () => {
    it('should pass validation for valid files', () => {
      const mockFiles = [
        {
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          size: 1024 * 1024 // 1MB
        }
      ] as any[];

      (mockReq as any).files = mockFiles;

      const middleware = validateFileUpload({
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png']
      });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject files that are too large', () => {
      const mockFiles = [
        {
          originalname: 'large.jpg',
          mimetype: 'image/jpeg',
          size: 20 * 1024 * 1024 // 20MB
        }
      ] as any[];

      (mockReq as any).files = mockFiles;

      const middleware = validateFileUpload({
        maxSize: 10 * 1024 * 1024 // 10MB
      });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject files with invalid types', () => {
      const mockFiles = [
        {
          originalname: 'document.pdf',
          mimetype: 'application/pdf',
          size: 1024
        }
      ] as any[];

      (mockReq as any).files = mockFiles;

      const middleware = validateFileUpload({
        allowedTypes: ['image/jpeg', 'image/png']
      });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject too many files', () => {
      const mockFiles = [
        { originalname: 'file1.jpg', mimetype: 'image/jpeg', size: 1024 },
        { originalname: 'file2.jpg', mimetype: 'image/jpeg', size: 1024 },
        { originalname: 'file3.jpg', mimetype: 'image/jpeg', size: 1024 }
      ] as any[];

      (mockReq as any).files = mockFiles;

      const middleware = validateFileUpload({
        maxFiles: 2
      });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject files with malicious names', () => {
      const mockFiles = [
        {
          originalname: '../../../etc/passwd',
          mimetype: 'text/plain',
          size: 1024
        }
      ] as any[];

      (mockReq as any).files = mockFiles;

      const middleware = validateFileUpload({});
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should require files when specified', () => {
      (mockReq as any).files = [];

      const middleware = validateFileUpload({
        required: true
      });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should pass when no files and not required', () => {
      (mockReq as any).files = undefined;

      const middleware = validateFileUpload({
        required: false
      });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('securityHeaders', () => {
    it('should set security headers', () => {
      const middleware = securityHeaders();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
      });

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});