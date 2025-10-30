/**
 * Tests for error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler, 
  timeoutHandler,
  validationErrorHandler 
} from '../errorHandler.js';
import { 
  ValidationError, 
  NotFoundError, 
  ExternalServiceError,
  TimeoutError 
} from '../../types/errors.js';
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
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    headersSent: false,
    on: jest.fn(),
    getHeaders: jest.fn().mockReturnValue({}),
    send: jest.fn().mockReturnThis()
  };
  return res as Response;
};

const createMockNext = (): NextFunction => jest.fn();

describe('errorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle ValidationError correctly', () => {
    const error = new ValidationError('Invalid email', 'email', 'test@');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const handler = errorHandler({ logger: mockLogger });
    handler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({
        message: 'Invalid email',
        type: 'ValidationError',
        statusCode: 400
      })
    });
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('should handle ExternalServiceError correctly', () => {
    const error = new ExternalServiceError('TMDB', new Error('Connection failed'));
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const handler = errorHandler({ logger: mockLogger });
    handler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should handle unknown errors', () => {
    const error = new Error('Unknown error');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const handler = errorHandler({ logger: mockLogger });
    handler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should sanitize sensitive headers', () => {
    const error = new ValidationError('Test error');
    const req = createMockRequest({
      headers: {
        'authorization': 'Bearer secret-token',
        'x-api-key': 'secret-key',
        'content-type': 'application/json'
      }
    });
    const res = createMockResponse();
    const next = createMockNext();

    const handler = errorHandler({ logger: mockLogger, sanitizeHeaders: true });
    handler(error, req, res, next);

    const logCall = (mockLogger.info as jest.Mock).mock.calls[0];
    const logMeta = logCall[1];
    
    expect(logMeta.request.headers.authorization).toBe('***REDACTED***');
    expect(logMeta.request.headers['x-api-key']).toBe('***REDACTED***');
    expect(logMeta.request.headers['content-type']).toBe('application/json');
  });

  it('should sanitize sensitive body data', () => {
    const error = new ValidationError('Test error');
    const req = createMockRequest({
      body: {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com'
      }
    });
    const res = createMockResponse();
    const next = createMockNext();

    const handler = errorHandler({ logger: mockLogger });
    handler(error, req, res, next);

    const logCall = (mockLogger.info as jest.Mock).mock.calls[0];
    const logMeta = logCall[1];
    
    expect(logMeta.request.body.password).toBe('***REDACTED***');
    expect(logMeta.request.body.username).toBe('testuser');
    expect(logMeta.request.body.email).toBe('test@example.com');
  });

  it('should include stack trace in development', () => {
    const error = new ValidationError('Test error');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const handler = errorHandler({ logger: mockLogger, includeStackTrace: true });
    handler(error, req, res, next);

    const responseCall = (res.json as jest.Mock).mock.calls[0][0];
    expect(responseCall.error.stack).toBeDefined();
  });

  it('should set correlation ID header', () => {
    const error = new ValidationError('Test error');
    const req = createMockRequest({
      headers: { 'x-correlation-id': 'test-correlation-id' }
    });
    const res = createMockResponse();
    const next = createMockNext();

    const handler = errorHandler({ logger: mockLogger });
    handler(error, req, res, next);

    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'X-Correlation-ID': 'test-correlation-id'
    }));
  });
});

describe('notFoundHandler', () => {
  it('should create NotFoundError for unmatched routes', () => {
    const req = createMockRequest({ method: 'GET', path: '/nonexistent' });
    const res = createMockResponse();
    const next = createMockNext();

    notFoundHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error.message).toContain('GET /nonexistent');
  });
});

describe('asyncHandler', () => {
  it('should handle successful async operations', async () => {
    const asyncFn = jest.fn().mockResolvedValue('success');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const handler = asyncHandler(asyncFn);
    await handler(req, res, next);

    expect(asyncFn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch and forward async errors', async () => {
    const error = new Error('Async error');
    const asyncFn = jest.fn().mockRejectedValue(error);
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const handler = asyncHandler(asyncFn);
    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('timeoutHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call next with TimeoutError when timeout occurs', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const handler = timeoutHandler(1000);
    handler(req, res, next);

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    expect(next).toHaveBeenCalledWith(expect.any(TimeoutError));
  });

  it('should not timeout if response finishes in time', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const handler = timeoutHandler(1000);
    handler(req, res, next);

    // Simulate response finishing
    const finishCallback = (res.on as jest.Mock).mock.calls.find(call => call[0] === 'finish')[1];
    finishCallback();

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    expect(next).toHaveBeenCalledTimes(1); // Only the initial next() call
  });

  it('should not timeout if headers already sent', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    res.headersSent = true;
    const next = createMockNext();

    const handler = timeoutHandler(1000);
    handler(req, res, next);

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    expect(next).toHaveBeenCalledTimes(1); // Only the initial next() call
  });
});

describe('validationErrorHandler', () => {
  it('should create ValidationError with validation details', () => {
    const errors = [
      { path: 'email', msg: 'Invalid email format', value: 'invalid' },
      { param: 'password', message: 'Password too short', value: '123' }
    ];

    expect(() => validationErrorHandler(errors)).toThrow(ValidationError);
    
    try {
      validationErrorHandler(errors);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).context?.['validationErrors']).toEqual([
        { field: 'email', message: 'Invalid email format', value: 'invalid' },
        { field: 'password', message: 'Password too short', value: '123' }
      ]);
    }
  });
});