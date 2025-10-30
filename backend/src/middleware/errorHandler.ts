/**
 * Express error handling middleware
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { 
  ErrorTransformer, 
  ErrorCategorizer, 
  ErrorSeverity,
  ValidationError,
  NotFoundError,
  TimeoutError
} from '../types/errors.js';
import { ILogger } from '../types/service.js';
import { defaultLogger } from '../utils/Logger.js';

export interface ErrorHandlerOptions {
  logger?: ILogger;
  includeStackTrace?: boolean;
  sanitizeHeaders?: boolean;
}

/**
 * Main error handling middleware
 */
export const errorHandler = (options: ErrorHandlerOptions = {}): ErrorRequestHandler => {
  const logger = options.logger || defaultLogger;
  const includeStackTrace = options.includeStackTrace ?? process.env['NODE_ENV'] === 'development';
  const sanitizeHeaders = options.sanitizeHeaders ?? true;

  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    // Transform unknown errors to AppError
    const appError = ErrorTransformer.transform(err);
    const category = ErrorCategorizer.categorize(appError);

    // Create request context for logging
    const requestContext = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      headers: sanitizeHeaders ? sanitizeRequestHeaders(req.headers) : req.headers,
      body: sanitizeRequestBody(req.body),
      params: req.params,
      query: req.query,
      timestamp: new Date().toISOString()
    };

    // Log the error with appropriate level
    const logLevel = getLogLevel(category.severity);
    const logMessage = `${appError.constructor.name}: ${appError.message}`;
    const logMeta = {
      error: appError.toJSON(),
      request: requestContext,
      category,
      correlationId: req.headers['x-correlation-id'] || generateCorrelationId()
    };

    switch (logLevel) {
      case 'error':
        logger.error(logMessage, logMeta);
        break;
      case 'warn':
        logger.warn(logMessage, logMeta);
        break;
      case 'info':
        logger.info(logMessage, logMeta);
        break;
      default:
        logger.debug(logMessage, logMeta);
    }

    // Prepare client response
    const clientResponse = ErrorTransformer.toClientSafe(appError);
    
    // Add stack trace in development
    if (includeStackTrace && appError.stack) {
      clientResponse['stack'] = appError.stack;
    }

    // Add correlation ID for tracking
    if (logMeta.correlationId) {
      clientResponse['correlationId'] = logMeta.correlationId;
    }

    // Set appropriate headers
    res.set({
      'Content-Type': 'application/json',
      'X-Error-Type': appError.constructor.name,
      'X-Correlation-ID': logMeta.correlationId
    });

    // Send error response
    res.status(appError.statusCode).json({
      success: false,
      error: clientResponse
    });
  };
};

/**
 * 404 Not Found handler for unmatched routes
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new NotFoundError('Route', `${req.method} ${req.path}`);
  next(error);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request timeout middleware
 */
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new TimeoutError('HTTP Request', timeoutMs);
        next(error);
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};

/**
 * Validation error handler for request validation
 */
export const validationErrorHandler = (errors: any[]) => {
  const validationErrors = errors.map(error => ({
    field: error.path || error.param,
    message: error.msg || error.message,
    value: error.value
  }));

  const validationError = new ValidationError('Validation failed', 'multiple');
  // Add validation errors to context
  (validationError as any).context = { ...validationError.context, validationErrors };
  throw validationError;
};

// Helper functions
function sanitizeRequestHeaders(headers: any): Record<string, any> {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const sanitized = { ...headers };

  Object.keys(sanitized).forEach(key => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***';
    }
  });

  return sanitized;
}

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'auth'];
  const sanitized = { ...body };

  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    }
  });

  return sanitized;
}

function getLogLevel(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warn';
    case ErrorSeverity.LOW:
      return 'info';
    default:
      return 'debug';
  }
}

function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

