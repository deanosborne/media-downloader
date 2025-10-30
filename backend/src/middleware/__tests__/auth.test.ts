/**
 * Tests for authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import { 
  authenticate, 
  authorize, 
  requirePermissions, 
  authenticateApiKey, 
  rateLimit,
  AuthUser 
} from '../auth.js';
import { AuthenticationError, AuthorizationError } from '../../types/errors.js';
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
  ip: '127.0.0.1',
  get: jest.fn(),
  ...overrides
} as any);

const createMockResponse = (): Response => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis()
} as any);

const createMockNext = (): NextFunction => jest.fn();

describe('Authentication Middleware', () => {
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid Bearer token', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      const middleware = authenticate({ logger: mockLogger });

      await middleware(mockReq, mockRes, mockNext);

      expect((mockReq as any).user).toBeDefined();
      expect((mockReq as any).user.id).toBe('user-123');
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'User authenticated successfully',
        expect.objectContaining({
          userId: 'user-123',
          username: 'testuser'
        })
      );
    });

    it('should reject missing authorization header', async () => {
      const middleware = authenticate({ logger: mockLogger });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authentication failed',
        expect.objectContaining({
          error: 'Authorization header required'
        })
      );
    });

    it('should reject invalid token format', async () => {
      mockReq.headers.authorization = 'Invalid format';
      const middleware = authenticate({ logger: mockLogger });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should reject invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      const middleware = authenticate({ logger: mockLogger });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should allow optional authentication when no header provided', async () => {
      const middleware = authenticate({ optional: true, logger: mockLogger });

      await middleware(mockReq, mockRes, mockNext);

      expect((mockReq as any).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should still validate token when optional and header provided', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      const middleware = authenticate({ optional: true, logger: mockLogger });

      await middleware(mockReq, mockRes, mockNext);

      expect((mockReq as any).user).toBeDefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('authorize', () => {
    const mockUser: AuthUser = {
      id: 'user-123',
      username: 'testuser',
      roles: ['user', 'editor'],
      permissions: ['read', 'write'],
      isActive: true
    };

    it('should authorize user with required role', () => {
      (mockReq as any).user = mockUser;
      const middleware = authorize('user', { logger: mockLogger });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'User authorized successfully',
        expect.objectContaining({
          userId: 'user-123',
          userRoles: ['user', 'editor'],
          requiredRoles: ['user']
        })
      );
    });

    it('should authorize user with any of multiple required roles', () => {
      (mockReq as any).user = mockUser;
      const middleware = authorize(['admin', 'editor'], { logger: mockLogger });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject user without required role', () => {
      (mockReq as any).user = mockUser;
      const middleware = authorize('admin', { logger: mockLogger });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthorizationError));
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authorization failed - insufficient roles',
        expect.objectContaining({
          userId: 'user-123',
          userRoles: ['user', 'editor'],
          requiredRoles: ['admin']
        })
      );
    });

    it('should reject unauthenticated user', () => {
      const middleware = authorize('user', { logger: mockLogger });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('requirePermissions', () => {
    const mockUser: AuthUser = {
      id: 'user-123',
      username: 'testuser',
      roles: ['user'],
      permissions: ['read', 'write', 'delete'],
      isActive: true
    };

    it('should authorize user with required permission', () => {
      (mockReq as any).user = mockUser;
      const middleware = requirePermissions('read', { logger: mockLogger });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'User permissions validated successfully',
        expect.objectContaining({
          userId: 'user-123',
          userPermissions: ['read', 'write', 'delete'],
          requiredPermissions: ['read']
        })
      );
    });

    it('should authorize user with all required permissions', () => {
      (mockReq as any).user = mockUser;
      const middleware = requirePermissions(['read', 'write'], { logger: mockLogger });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject user missing required permission', () => {
      (mockReq as any).user = mockUser;
      const middleware = requirePermissions(['read', 'admin'], { logger: mockLogger });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthorizationError));
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Authorization failed - insufficient permissions',
        expect.objectContaining({
          userId: 'user-123',
          userPermissions: ['read', 'write', 'delete'],
          requiredPermissions: ['read', 'admin']
        })
      );
    });

    it('should reject unauthenticated user', () => {
      const middleware = requirePermissions('read', { logger: mockLogger });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('authenticateApiKey', () => {
    it('should authenticate valid API key', async () => {
      mockReq.headers['x-api-key'] = 'test-api-key-123';
      const middleware = authenticateApiKey({ logger: mockLogger });

      await middleware(mockReq, mockRes, mockNext);

      expect((mockReq as any).user).toBeDefined();
      expect((mockReq as any).user.username).toBe('api-key-user');
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'API key authenticated successfully',
        expect.objectContaining({
          apiKey: 'test-api...'
        })
      );
    });

    it('should reject missing API key', async () => {
      const middleware = authenticateApiKey({ logger: mockLogger });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'API key authentication failed',
        expect.objectContaining({
          error: 'API key required in X-API-Key header'
        })
      );
    });

    it('should reject invalid API key', async () => {
      mockReq.headers['x-api-key'] = 'invalid-key';
      const middleware = authenticateApiKey({ logger: mockLogger });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('rateLimit', () => {
    beforeEach(() => {
      // Clear rate limit storage between tests
      jest.clearAllTimers();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow requests within limit', () => {
      const middleware = rateLimit({
        windowMs: 60000,
        maxRequests: 5
      });

      // First request should pass
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '4',
        'X-RateLimit-Reset': expect.any(String)
      });
    });

    it('should reject requests exceeding limit', () => {
      const middleware = rateLimit({
        windowMs: 60000,
        maxRequests: 2,
        message: 'Rate limit exceeded'
      });

      // Make requests up to limit
      middleware(mockReq, mockRes, mockNext);
      middleware(mockReq, mockRes, mockNext);
      
      // Third request should be rejected
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockNext).toHaveBeenLastCalledWith(expect.objectContaining({
        message: 'Rate limit exceeded'
      }));
    });

    it('should reset count after window expires', () => {
      const middleware = rateLimit({
        windowMs: 60000,
        maxRequests: 1
      });

      // First request
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Advance time past window
      jest.advanceTimersByTime(61000);

      // Second request should pass after reset
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should use custom key generator', () => {
      const keyGenerator = jest.fn().mockReturnValue('custom-key');
      const middleware = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator
      });

      middleware(mockReq, mockRes, mockNext);

      expect(keyGenerator).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});