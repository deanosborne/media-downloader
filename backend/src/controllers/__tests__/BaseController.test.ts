/**
 * Tests for BaseController
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController, RequestContext } from '../BaseController.js';
import { ValidationError, AuthenticationError, AuthorizationError } from '../../types/errors.js';
import { ILogger } from '../../types/service.js';

// Mock logger
const mockLogger: ILogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Test controller implementation
class TestController extends BaseController {
  constructor() {
    super({ logger: mockLogger });
  }

  // Expose protected methods for testing
  public testCreateRequestContext(req: Request): RequestContext {
    return this.createRequestContext(req);
  }

  public testSendSuccess(res: Response, data?: any, statusCode?: number) {
    return this.sendSuccess(res, data, statusCode);
  }

  public testSendError(res: Response, error: any, statusCode?: number) {
    return this.sendError(res, error, statusCode);
  }

  public testValidateRequiredFields(body: any, fields: string[]) {
    return this.validateRequiredFields(body, fields);
  }

  public testValidatePagination(query: any, options?: any) {
    return this.validatePagination(query, options);
  }

  public testSanitizeInput(input: any) {
    return this.sanitizeInput(input);
  }

  public testValidateFilePath(path: string) {
    return this.validateFilePath(path);
  }

  public testExtractAuthToken(req: Request) {
    return this.extractAuthToken(req);
  }

  public testCheckPermissions(user: any, permissions: string[]) {
    return this.checkPermissions(user, permissions);
  }

  public testAsyncHandler(fn: Function) {
    return this.asyncHandler(fn);
  }
}

// Mock Express objects
const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
  headers: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  get: jest.fn(),
  method: 'GET',
  path: '/test',
  ...overrides
} as any);

const createMockResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    get: jest.fn()
  };
  return res as any;
};

const createMockNext = (): NextFunction => jest.fn();

describe('BaseController', () => {
  let controller: TestController;
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    controller = new TestController();
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('createRequestContext', () => {
    it('should create request context with default values', () => {
      const context = controller.testCreateRequestContext(mockReq);

      expect(context).toMatchObject({
        timestamp: expect.any(Date),
        ip: '127.0.0.1',
        correlationId: expect.any(String)
      });
    });

    it('should use correlation ID from headers if present', () => {
      mockReq.headers['x-correlation-id'] = 'test-correlation-id';
      const context = controller.testCreateRequestContext(mockReq);

      expect(context.correlationId).toBe('test-correlation-id');
    });

    it('should include user if present', () => {
      (mockReq as any).user = { id: 'user123', username: 'testuser' };
      const context = controller.testCreateRequestContext(mockReq);

      expect(context.user).toEqual({ id: 'user123', username: 'testuser' });
    });
  });

  describe('sendSuccess', () => {
    it('should send successful response with data', () => {
      const testData = { message: 'success' };
      controller.testSendSuccess(mockRes, testData, 200);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: testData,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          correlationId: expect.any(String)
        })
      });
    });

    it('should send successful response without data', () => {
      controller.testSendSuccess(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: undefined,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          correlationId: expect.any(String)
        })
      });
    });
  });

  describe('sendError', () => {
    it('should send error response with AppError', () => {
      const error = new ValidationError('Test validation error');
      controller.testSendError(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test validation error',
          type: 'ValidationError',
          statusCode: 400
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          correlationId: expect.any(String)
        })
      });
    });

    it('should send error response with string error', () => {
      controller.testSendError(mockRes, 'String error message');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'String error message',
          type: 'ValidationError',
          statusCode: 400
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          correlationId: expect.any(String)
        })
      });
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass validation with all required fields present', () => {
      const body = { name: 'test', email: 'test@example.com' };
      const fields = ['name', 'email'];

      expect(() => {
        controller.testValidateRequiredFields(body, fields);
      }).not.toThrow();
    });

    it('should throw ValidationError for missing fields', () => {
      const body = { name: 'test' };
      const fields = ['name', 'email'];

      expect(() => {
        controller.testValidateRequiredFields(body, fields);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for null body', () => {
      const fields = ['name', 'email'];

      expect(() => {
        controller.testValidateRequiredFields(null, fields);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty string values', () => {
      const body = { name: '', email: 'test@example.com' };
      const fields = ['name', 'email'];

      expect(() => {
        controller.testValidateRequiredFields(body, fields);
      }).toThrow(ValidationError);
    });
  });

  describe('validatePagination', () => {
    it('should return valid pagination parameters', () => {
      const query = { page: '2', limit: '10' };
      const result = controller.testValidatePagination(query);

      expect(result).toEqual({
        page: 2,
        limit: 10,
        offset: 10
      });
    });

    it('should use default values for missing parameters', () => {
      const query = {};
      const result = controller.testValidatePagination(query);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        offset: 0
      });
    });

    it('should throw ValidationError for invalid page', () => {
      const query = { page: '0' };

      expect(() => {
        controller.testValidatePagination(query);
      }).toThrow(ValidationError);
    });

    it('should cap limit at maximum', () => {
      const query = { limit: '200' };
      const result = controller.testValidatePagination(query, { maxLimit: 50 });

      expect(result.limit).toBe(50);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize string input', () => {
      const input = '  <script>alert("xss")</script>  ';
      const result = controller.testSanitizeInput(input);

      expect(result).toBe('alert("xss")');
    });

    it('should sanitize object input', () => {
      const input = {
        name: '  John<script>  ',
        email: 'john@example.com'
      };
      const result = controller.testSanitizeInput(input);

      expect(result).toEqual({
        name: 'John',
        email: 'john@example.com'
      });
    });

    it('should sanitize array input', () => {
      const input = ['  test<>  ', 'normal'];
      const result = controller.testSanitizeInput(input);

      expect(result).toEqual(['test', 'normal']);
    });

    it('should return non-string input unchanged', () => {
      const input = 123;
      const result = controller.testSanitizeInput(input);

      expect(result).toBe(123);
    });
  });

  describe('validateFilePath', () => {
    it('should pass validation for safe file paths', () => {
      expect(() => {
        controller.testValidateFilePath('/safe/path/file.txt');
      }).not.toThrow();
    });

    it('should throw ValidationError for directory traversal', () => {
      expect(() => {
        controller.testValidateFilePath('../../../etc/passwd');
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for system directories', () => {
      expect(() => {
        controller.testValidateFilePath('/etc/passwd');
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for Windows system directories', () => {
      expect(() => {
        controller.testValidateFilePath('C:\\Windows\\System32\\config');
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for null path', () => {
      expect(() => {
        controller.testValidateFilePath(null as any);
      }).toThrow(ValidationError);
    });
  });

  describe('extractAuthToken', () => {
    it('should extract valid Bearer token', () => {
      mockReq.headers.authorization = 'Bearer valid-token-123';
      const token = controller.testExtractAuthToken(mockReq);

      expect(token).toBe('valid-token-123');
    });

    it('should throw AuthenticationError for missing header', () => {
      expect(() => {
        controller.testExtractAuthToken(mockReq);
      }).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for invalid format', () => {
      mockReq.headers.authorization = 'Invalid format';

      expect(() => {
        controller.testExtractAuthToken(mockReq);
      }).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for short token', () => {
      mockReq.headers.authorization = 'Bearer short';

      expect(() => {
        controller.testExtractAuthToken(mockReq);
      }).toThrow(AuthenticationError);
    });
  });

  describe('checkPermissions', () => {
    it('should pass for user with required permissions', () => {
      const user = {
        id: 'user123',
        permissions: ['read', 'write', 'delete']
      };

      expect(() => {
        controller.testCheckPermissions(user, ['read', 'write']);
      }).not.toThrow();
    });

    it('should throw AuthenticationError for missing user', () => {
      expect(() => {
        controller.testCheckPermissions(null, ['read']);
      }).toThrow(AuthenticationError);
    });

    it('should throw AuthorizationError for missing permissions', () => {
      const user = {
        id: 'user123',
        permissions: ['read']
      };

      expect(() => {
        controller.testCheckPermissions(user, ['read', 'write']);
      }).toThrow(AuthorizationError);
    });

    it('should throw AuthorizationError for user without permissions array', () => {
      const user = {
        id: 'user123'
      };

      expect(() => {
        controller.testCheckPermissions(user, ['read']);
      }).toThrow(AuthorizationError);
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const handler = controller.testAsyncHandler(asyncFn);

      await handler(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext, expect.any(Object));
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith('X-Correlation-ID', expect.any(String));
    });

    it('should handle async function that throws error', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = controller.testAsyncHandler(asyncFn);

      await handler(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should log request information', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const handler = controller.testAsyncHandler(asyncFn);

      await handler(mockReq, mockRes, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('GET /test - Controller: TestController'),
        expect.objectContaining({
          correlationId: expect.any(String),
          method: 'GET',
          path: '/test'
        })
      );
    });
  });
});