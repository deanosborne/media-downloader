/**
 * Base application error class
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string, field?: string, value?: any) {
    const context = field ? { field, value } : undefined;
    super(message, context);
  }
}

/**
 * Authentication error for auth failures
 */
export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Authorization error for permission failures
 */
export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(message: string = 'Resource not found', context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Rate limit error for too many requests
 */
export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;

  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * External service error for third-party API failures
 */
export class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly isOperational = true;

  constructor(service: string, originalError: Error, context?: Record<string, any>) {
    super(`External service ${service} failed: ${originalError.message}`, {
      ...context,
      service,
      originalError: originalError.message
    });
  }
}

/**
 * Configuration error for config-related issues
 */
export class ConfigurationError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = true;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Security error for security-related issues
 */
export class SecurityError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Timeout error for request timeouts
 */
export class TimeoutError extends AppError {
  readonly statusCode = 408;
  readonly isOperational = true;

  constructor(message: string = 'Request timeout', context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Database error for database-related issues
 */
export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = true;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * File system error for file operations
 */
export class FileSystemError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = true;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error transformer utility
 */
export class ErrorTransformer {
  static transform(error: any): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error.code === 'ENOENT') {
      return new FileSystemError('File not found', { originalError: error.message });
    }

    if (error.code === 'EACCES') {
      return new SecurityError('Access denied', { originalError: error.message });
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return new TimeoutError('Request timeout', { originalError: error.message });
    }

    return new ConfigurationError('Unknown error occurred', { originalError: error.message });
  }
}

/**
 * Error categorizer utility
 */
export class ErrorCategorizer {
  static categorize(error: AppError): ErrorSeverity {
    if (error instanceof SecurityError) {
      return ErrorSeverity.HIGH;
    }

    if (error instanceof DatabaseError || error instanceof FileSystemError) {
      return ErrorSeverity.MEDIUM;
    }

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }
}

/**
 * Type guard to check if error is an operational error
 */
export const isOperationalError = (error: Error): error is AppError => {
  return error instanceof AppError && error.isOperational;
};