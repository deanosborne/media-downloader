/**
 * Tests for error handling infrastructure
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ExternalServiceError,
  TimeoutError,
  DatabaseError,
  ConfigurationError,
  FileSystemError,
  ErrorTransformer,
  ErrorCategorizer,
  ErrorSeverity
} from '../errors.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with basic properties', () => {
      class TestError extends AppError {
        readonly statusCode = 400;
        readonly isOperational = true;
      }

      const error = new TestError('Test message');
      
      expect(error.message).toBe('Test message');
      expect(error.name).toBe('TestError');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should include context in error', () => {
      class TestError extends AppError {
        readonly statusCode = 400;
        readonly isOperational = true;
      }

      const context = { field: 'email', value: 'invalid' };
      const error = new TestError('Test message', context);
      
      expect(error.context).toEqual(context);
    });

    it('should serialize to JSON correctly', () => {
      class TestError extends AppError {
        readonly statusCode = 400;
        readonly isOperational = true;
      }

      const error = new TestError('Test message', { field: 'test' });
      const json = error.toJSON();
      
      expect(json['name']).toBe('TestError');
      expect(json['message']).toBe('Test message');
      expect(json['statusCode']).toBe(400);
      expect(json['isOperational']).toBe(true);
      expect(json['context']).toEqual({ field: 'test' });
      expect(json['timestamp']).toBeDefined();
      expect(json['stack']).toBeDefined();
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field context', () => {
      const error = new ValidationError('Invalid email format', 'email', 'invalid-email');
      
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.context).toEqual({ field: 'email', value: 'invalid-email' });
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with resource context', () => {
      const error = new NotFoundError('User', 123);
      
      expect(error.message).toBe('User not found with identifier: 123');
      expect(error.statusCode).toBe(404);
      expect(error.context).toEqual({ resource: 'User', identifier: 123 });
    });

    it('should create not found error without identifier', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.context).toEqual({ resource: 'User', identifier: undefined });
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error with original error', () => {
      const originalError = new Error('Connection failed');
      const error = new ExternalServiceError('TMDB', originalError, 502);
      
      expect(error.message).toBe('External service TMDB failed: Connection failed');
      expect(error.statusCode).toBe(502);
      expect(error.context?.['service']).toBe('TMDB');
      expect(error.context?.['originalError']).toBe('Connection failed');
      expect(error.context?.['externalStatusCode']).toBe(502);
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with operation context', () => {
      const error = new TimeoutError('API request', 5000);
      
      expect(error.message).toBe("Operation 'API request' timed out after 5000ms");
      expect(error.statusCode).toBe(408);
      expect(error.context).toEqual({ operation: 'API request', timeoutMs: 5000 });
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with operation context', () => {
      const originalError = new Error('Connection lost');
      const error = new DatabaseError('SELECT query', originalError);
      
      expect(error.message).toBe('Database operation failed: SELECT query');
      expect(error.statusCode).toBe(500);
      expect(error.context?.['operation']).toBe('SELECT query');
      expect(error.context?.['originalError']).toBe('Connection lost');
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new ConfigurationError('database.url', 'Missing required value');
      
      expect(error.message).toBe("Configuration error for 'database.url': Missing required value");
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
      expect(error.context).toEqual({ configKey: 'database.url', reason: 'Missing required value' });
    });
  });
});

describe('ErrorTransformer', () => {
  describe('transform', () => {
    it('should return AppError as-is', () => {
      const originalError = new ValidationError('Test error');
      const transformed = ErrorTransformer.transform(originalError);
      
      expect(transformed).toBe(originalError);
    });

    it('should transform ValidationError by name', () => {
      const error = new Error('Invalid input');
      error.name = 'ValidationError';
      
      const transformed = ErrorTransformer.transform(error);
      
      expect(transformed).toBeInstanceOf(ValidationError);
      expect(transformed.message).toBe('Invalid input');
    });

    it('should transform timeout errors', () => {
      const error = new Error('Request timeout occurred');
      
      const transformed = ErrorTransformer.transform(error);
      
      expect(transformed).toBeInstanceOf(TimeoutError);
    });

    it('should transform file system errors', () => {
      const error = new Error('ENOENT: file not found');
      
      const transformed = ErrorTransformer.transform(error);
      
      expect(transformed).toBeInstanceOf(FileSystemError);
    });

    it('should transform string errors', () => {
      const transformed = ErrorTransformer.transform('Something went wrong');
      
      expect(transformed.message).toBe('Something went wrong');
    });

    it('should transform unknown errors', () => {
      const transformed = ErrorTransformer.transform({ weird: 'object' });
      
      expect(transformed.message).toBe('An unexpected error occurred');
      expect(transformed.context?.['originalError']).toBe('[object Object]');
    });
  });

  describe('isOperational', () => {
    it('should return true for operational AppError', () => {
      const error = new ValidationError('Test');
      expect(ErrorTransformer.isOperational(error)).toBe(true);
    });

    it('should return false for non-operational AppError', () => {
      const error = new ConfigurationError('test');
      expect(ErrorTransformer.isOperational(error)).toBe(false);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Test');
      expect(ErrorTransformer.isOperational(error)).toBe(false);
    });
  });

  describe('toClientSafe', () => {
    it('should return safe error info for operational errors', () => {
      const error = new ValidationError('Invalid email', 'email', 'test');
      const safe = ErrorTransformer.toClientSafe(error);
      
      expect(safe['message']).toBe('Invalid email');
      expect(safe['type']).toBe('ValidationError');
      expect(safe['statusCode']).toBe(400);
      expect(safe['context']).toEqual({ field: 'email', value: 'test' });
    });

    it('should return generic message for non-operational errors', () => {
      const error = new ConfigurationError('secret.key');
      const safe = ErrorTransformer.toClientSafe(error);
      
      expect(safe['message']).toBe('Internal server error');
      expect(safe['type']).toBe('ConfigurationError');
      expect(safe['statusCode']).toBe(500);
      expect(safe['context']).toBeUndefined();
    });
  });
});

describe('ErrorCategorizer', () => {
  it('should categorize validation errors correctly', () => {
    const error = new ValidationError('Test');
    const category = ErrorCategorizer.categorize(error);
    
    expect(category.type).toBe('client');
    expect(category.severity).toBe(ErrorSeverity.LOW);
    expect(category.shouldAlert).toBe(false);
    expect(category.shouldRetry).toBe(false);
  });

  it('should categorize authentication errors correctly', () => {
    const error = new AuthenticationError('Invalid token');
    const category = ErrorCategorizer.categorize(error);
    
    expect(category.type).toBe('security');
    expect(category.severity).toBe(ErrorSeverity.MEDIUM);
    expect(category.shouldAlert).toBe(true);
    expect(category.shouldRetry).toBe(false);
  });

  it('should categorize external service errors correctly', () => {
    const error = new ExternalServiceError('TMDB');
    const category = ErrorCategorizer.categorize(error);
    
    expect(category.type).toBe('external');
    expect(category.severity).toBe(ErrorSeverity.HIGH);
    expect(category.shouldAlert).toBe(true);
    expect(category.shouldRetry).toBe(true);
  });

  it('should categorize configuration errors correctly', () => {
    const error = new ConfigurationError('test');
    const category = ErrorCategorizer.categorize(error);
    
    expect(category.type).toBe('system');
    expect(category.severity).toBe(ErrorSeverity.CRITICAL);
    expect(category.shouldAlert).toBe(true);
    expect(category.shouldRetry).toBe(false);
  });

  it('should provide default category for unknown errors', () => {
    class UnknownError extends AppError {
      readonly statusCode = 500;
      readonly isOperational = true;
    }
    
    const error = new UnknownError('Test');
    const category = ErrorCategorizer.categorize(error);
    
    expect(category.type).toBe('unknown');
    expect(category.severity).toBe(ErrorSeverity.HIGH);
    expect(category.shouldAlert).toBe(true);
    expect(category.shouldRetry).toBe(false);
  });
});