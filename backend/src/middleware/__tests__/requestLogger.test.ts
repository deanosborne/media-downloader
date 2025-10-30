/**
 * Tests for request logging middleware
 */

import { Request, Response, NextFunction } from 'express';
import { requestLogger, accessLogger } from '../requestLogger.js';
import { ILogger } from '../../types/service.js';

// Mock logger
const mockLogger: ILogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock Express objects
const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
  method: 'GET',
  url: '/test',
  path: '/test',
  headers: {},
  body: {},
  params: {},
  query: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' } as any,
  get: jest.fn().mockReturnValue('test-agent'),
  ...overrides
} as Request);

const createMockResponse = (): Response => {
  const res: any = {
    statusCode: 200,
    on: jest.fn(),
    getHeaders: jest.fn().mockReturnValue({}),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  
  // Mock the 'finish' event
  res.on.mockImplementation((event: string, callback: () => void) => {
    if (event === 'finish') {
      // Simulate finish event after a short delay
      setTimeout(() => callback(), 10);
    }
  });
  
  return res as Response;
};

const createMockNext = (): NextFunction => jest.fn();

describe('requestLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log request and response', (done) => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = requestLogger({ logger: mockLogger });
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('GET /test - Request'),
      expect.objectContaining({
        method: 'GET',
        url: '/test',
        correlationId: expect.any(String)
      })
    );

    // Wait for response finish event
    setTimeout(() => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('GET /test - Response 200'),
        expect.objectContaining({
          statusCode: 200,
          duration: expect.any(Number),
          correlationId: expect.any(String)
        })
      );
      done();
    }, 20);
  });

  it('should skip logging for specified paths', () => {
    const req = createMockRequest({ path: '/health' });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = requestLogger({ 
      logger: mockLogger, 
      skipPaths: ['/health'] 
    });
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('should skip logging for specified methods', () => {
    const req = createMockRequest({ method: 'OPTIONS' });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = requestLogger({ 
      logger: mockLogger, 
      skipMethods: ['OPTIONS'] 
    });
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('should include headers when requested', () => {
    const req = createMockRequest({
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer token123'
      }
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = requestLogger({ 
      logger: mockLogger, 
      includeHeaders: true,
      sanitizeHeaders: true
    });
    middleware(req, res, next);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'authorization': '***REDACTED***'
        })
      })
    );
  });

  it('should include and sanitize request body', () => {
    const req = createMockRequest({
      body: {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com'
      }
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = requestLogger({ 
      logger: mockLogger, 
      includeBody: true,
      sanitizeBody: true
    });
    middleware(req, res, next);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          username: 'testuser',
          password: '***REDACTED***',
          email: 'test@example.com'
        })
      })
    );
  });

  it('should truncate long request bodies', () => {
    const longBody = 'a'.repeat(2000);
    const req = createMockRequest({ body: longBody });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = requestLogger({ 
      logger: mockLogger, 
      includeBody: true,
      maxBodyLength: 1000
    });
    middleware(req, res, next);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('... [truncated]')
      })
    );
  });

  it('should use existing correlation ID from headers', () => {
    const correlationId = 'existing-correlation-id';
    const req = createMockRequest({
      headers: { 'x-correlation-id': correlationId }
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = requestLogger({ logger: mockLogger });
    middleware(req, res, next);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        correlationId
      })
    );
  });

  it('should log errors with appropriate level based on status code', (done) => {
    const req = createMockRequest();
    const res = createMockResponse();
    res.statusCode = 500;
    const next = createMockNext();

    const middleware = requestLogger({ logger: mockLogger });
    middleware(req, res, next);

    // Wait for response finish event
    setTimeout(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Response 500'),
        expect.any(Object)
      );
      done();
    }, 20);
  });

  it('should log warnings for 4xx status codes', (done) => {
    const req = createMockRequest();
    const res = createMockResponse();
    res.statusCode = 404;
    const next = createMockNext();

    const middleware = requestLogger({ logger: mockLogger });
    middleware(req, res, next);

    // Wait for response finish event
    setTimeout(() => {
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Response 404'),
        expect.any(Object)
      );
      done();
    }, 20);
  });

  it('should capture response body when available', (done) => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = requestLogger({ 
      logger: mockLogger, 
      includeBody: true 
    });
    middleware(req, res, next);

    // Simulate response with body
    const responseBody = { success: true, data: 'test' };
    res.json!(responseBody);

    // Wait for response finish event
    setTimeout(() => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Response 200'),
        expect.objectContaining({
          body: responseBody
        })
      );
      done();
    }, 20);
  });
});

describe('accessLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log successful requests with info level', (done) => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = accessLogger(mockLogger);
    middleware(req, res, next);

    // Wait for response finish event
    setTimeout(() => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/GET \/test 200 \d+ms - 127\.0\.0\.1/)
      );
      done();
    }, 20);
  });

  it('should log error requests with warn level', (done) => {
    const req = createMockRequest();
    const res = createMockResponse();
    res.statusCode = 404;
    const next = createMockNext();

    const middleware = accessLogger(mockLogger);
    middleware(req, res, next);

    // Wait for response finish event
    setTimeout(() => {
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/GET \/test 404 \d+ms - 127\.0\.0\.1/)
      );
      done();
    }, 20);
  });
});