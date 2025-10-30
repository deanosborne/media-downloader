/**
 * Comprehensive error handling types and classes
 */

// Base application error class
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  readonly timestamp: Date;
  readonly context: Record<string, any> | undefined;

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }
}

// Client errors (4xx)
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string, field?: string, value?: any) {
    super(message, { field, value });
  }
}

export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;
}

export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(resource: string, identifier?: string | number) {
    super(`${resource} not found${identifier ? ` with identifier: ${identifier}` : ''}`, { resource, identifier });
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly isOperational = true;
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;

  constructor(message: string, retryAfter?: number) {
    super(message, { retryAfter });
  }
}

// Server errors (5xx)
export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;
}

export class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly isOperational = true;

  constructor(service: string, originalError?: Error, statusCode?: number) {
    super(`External service ${service} failed: ${originalError?.message || 'Unknown error'}`, { 
      service, 
      originalError: originalError?.message,
      originalStack: originalError?.stack,
      externalStatusCode: statusCode
    });
  }
}

export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly isOperational = true;
}

export class TimeoutError extends AppError {
  readonly statusCode = 408;
  readonly isOperational = true;

  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`, { operation, timeoutMs });
  }
}

// Database specific errors
export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = true;

  constructor(operation: string, originalError?: Error) {
    super(`Database operation failed: ${operation}`, { 
      operation, 
      originalError: originalError?.message,
      originalStack: originalError?.stack
    });
  }
}

// Configuration errors
export class ConfigurationError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(configKey: string, reason?: string) {
    super(`Configuration error for '${configKey}'${reason ? `: ${reason}` : ''}`, { configKey, reason });
  }
}

// File system errors
export class FileSystemError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = true;

  constructor(operation: string, path: string, originalError?: Error) {
    super(`File system operation '${operation}' failed for path: ${path}`, { 
      operation, 
      path, 
      originalError: originalError?.message 
    });
  }
}

// Error transformation utilities
export class ErrorTransformer {
  /**
   * Transform unknown errors into AppError instances
   */
  static transform(error: unknown, defaultMessage = 'An unexpected error occurred'): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Handle specific error types
      if (error.name === 'ValidationError') {
        return new ValidationError(error.message);
      }
      
      if (error.name === 'CastError' || error.name === 'MongoError') {
        return new DatabaseError('Database operation failed', error);
      }

      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return new TimeoutError('Request timeout', 30000);
      }

      if (error.message.includes('ENOENT') || error.message.includes('EACCES')) {
        return new FileSystemError('File access', 'unknown', error);
      }

      // Generic error transformation
      return new InternalServerError(error.message, { originalError: error.message });
    }

    // Handle string errors
    if (typeof error === 'string') {
      return new InternalServerError(error);
    }

    // Handle unknown error types
    return new InternalServerError(defaultMessage, { originalError: String(error) });
  }

  /**
   * Check if an error is operational (expected) or programming error
   */
  static isOperational(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Extract safe error information for client responses
   */
  static toClientSafe(error: AppError): Record<string, any> {
    return {
      message: error.isOperational ? error.message : 'Internal server error',
      type: error.constructor.name,
      statusCode: error.statusCode,
      timestamp: error.timestamp.toISOString(),
      // Only include context for operational errors
      ...(error.isOperational && error.context && { context: error.context })
    };
  }
}

// Error severity levels for logging
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categorization for monitoring and alerting
export interface ErrorCategory {
  type: string;
  severity: ErrorSeverity;
  shouldAlert: boolean;
  shouldRetry: boolean;
}

export class ErrorCategorizer {
  private static categories: Map<string, ErrorCategory> = new Map([
    ['ValidationError', { type: 'client', severity: ErrorSeverity.LOW, shouldAlert: false, shouldRetry: false }],
    ['AuthenticationError', { type: 'security', severity: ErrorSeverity.MEDIUM, shouldAlert: true, shouldRetry: false }],
    ['AuthorizationError', { type: 'security', severity: ErrorSeverity.MEDIUM, shouldAlert: true, shouldRetry: false }],
    ['NotFoundError', { type: 'client', severity: ErrorSeverity.LOW, shouldAlert: false, shouldRetry: false }],
    ['ConflictError', { type: 'client', severity: ErrorSeverity.LOW, shouldAlert: false, shouldRetry: false }],
    ['RateLimitError', { type: 'client', severity: ErrorSeverity.MEDIUM, shouldAlert: true, shouldRetry: true }],
    ['TimeoutError', { type: 'network', severity: ErrorSeverity.MEDIUM, shouldAlert: true, shouldRetry: true }],
    ['ExternalServiceError', { type: 'external', severity: ErrorSeverity.HIGH, shouldAlert: true, shouldRetry: true }],
    ['DatabaseError', { type: 'infrastructure', severity: ErrorSeverity.HIGH, shouldAlert: true, shouldRetry: false }],
    ['ConfigurationError', { type: 'system', severity: ErrorSeverity.CRITICAL, shouldAlert: true, shouldRetry: false }],
    ['FileSystemError', { type: 'infrastructure', severity: ErrorSeverity.MEDIUM, shouldAlert: true, shouldRetry: true }],
    ['InternalServerError', { type: 'system', severity: ErrorSeverity.HIGH, shouldAlert: true, shouldRetry: false }],
  ]);

  static categorize(error: AppError): ErrorCategory {
    return this.categories.get(error.constructor.name) || {
      type: 'unknown',
      severity: ErrorSeverity.HIGH,
      shouldAlert: true,
      shouldRetry: false
    };
  }
}