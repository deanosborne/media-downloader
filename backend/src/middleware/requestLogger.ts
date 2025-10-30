/**
 * Request/Response logging middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ILogger } from '../types/service.js';
import { defaultLogger } from '../utils/Logger.js';

export interface RequestLoggerOptions {
  logger?: ILogger;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  includeBody?: boolean;
  includeHeaders?: boolean;
  sanitizeHeaders?: boolean;
  sanitizeBody?: boolean;
  skipPaths?: string[];
  skipMethods?: string[];
  maxBodyLength?: number;
}

export interface RequestLog {
  method: string;
  url: string;
  headers?: Record<string, any>;
  body?: any;
  query: any;
  params: any;
  ip: string;
  userAgent: string | undefined;
  timestamp: string;
  correlationId: string;
}

export interface ResponseLog {
  statusCode: number;
  headers?: Record<string, any>;
  body?: any;
  duration: number;
  timestamp: string;
  correlationId: string;
}

/**
 * Request/Response logging middleware
 */
export const requestLogger = (options: RequestLoggerOptions = {}) => {
  const {
    logger = defaultLogger,
    logLevel = 'info',
    includeBody = false,
    includeHeaders = true,
    sanitizeHeaders = true,
    sanitizeBody = true,
    skipPaths = ['/health', '/metrics'],
    skipMethods = [],
    maxBodyLength = 1000
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Skip logging for specified paths and methods
    if (skipPaths.includes(req.path) || skipMethods.includes(req.method)) {
      return next();
    }

    // Generate correlation ID if not present
    const correlationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();
    req.headers['x-correlation-id'] = correlationId;

    // Prepare request log
    const requestLog: RequestLog = {
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      correlationId
    };

    // Add headers if requested
    if (includeHeaders) {
      requestLog.headers = sanitizeHeaders ? sanitizeRequestHeaders(req.headers) : req.headers;
    }

    // Add body if requested
    if (includeBody && req.body) {
      let body = req.body;
      if (sanitizeBody) {
        body = sanitizeRequestBody(body);
      }
      if (typeof body === 'string' && body.length > maxBodyLength) {
        body = body.substring(0, maxBodyLength) + '... [truncated]';
      }
      requestLog.body = body;
    }

    // Log the request
    logMessage(logger, logLevel, `${req.method} ${req.url} - Request`, requestLog);

    // Capture original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any;

    // Override res.send to capture response body
    res.send = function(body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Override res.json to capture response body
    res.json = function(body: any) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      const responseLog: ResponseLog = {
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString(),
        correlationId
      };

      // Add headers if requested
      if (includeHeaders) {
        responseLog.headers = sanitizeHeaders ? sanitizeResponseHeaders(res.getHeaders()) : res.getHeaders();
      }

      // Add body if requested and available
      if (includeBody && responseBody) {
        let body = responseBody;
        if (sanitizeBody && typeof body === 'object') {
          body = sanitizeResponseBody(body);
        }
        if (typeof body === 'string' && body.length > maxBodyLength) {
          body = body.substring(0, maxBodyLength) + '... [truncated]';
        }
        responseLog.body = body;
      }

      // Determine log level based on status code
      const responseLogLevel = getResponseLogLevel(res.statusCode, logLevel);
      
      logMessage(
        logger, 
        responseLogLevel, 
        `${req.method} ${req.url} - Response ${res.statusCode} (${duration}ms)`, 
        responseLog
      );
    });

    next();
  };
};

/**
 * Simple access log middleware (lighter version)
 */
export const accessLogger = (logger: ILogger = defaultLogger) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const message = `${req.method} ${req.url} ${res.statusCode} ${duration}ms - ${req.ip}`;
      
      if (res.statusCode >= 400) {
        logger.warn(message);
      } else {
        logger.info(message);
      }
    });

    next();
  };
};

// Helper functions
function sanitizeRequestHeaders(headers: any): Record<string, any> {
  const sensitiveHeaders = [
    'authorization', 
    'cookie', 
    'x-api-key', 
    'x-auth-token',
    'x-access-token',
    'bearer'
  ];
  
  const sanitized = { ...headers };

  Object.keys(sanitized).forEach(key => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***';
    }
  });

  return sanitized;
}

function sanitizeResponseHeaders(headers: any): Record<string, any> {
  const sensitiveHeaders = [
    'set-cookie',
    'x-auth-token',
    'x-access-token'
  ];
  
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

  const sensitiveFields = [
    'password', 
    'token', 
    'secret', 
    'key', 
    'apiKey', 
    'auth',
    'authorization',
    'credentials'
  ];
  
  const sanitized = Array.isArray(body) ? [...body] : { ...body };

  const sanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    
    Object.keys(result).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        result[key] = '***REDACTED***';
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = sanitizeObject(result[key]);
      }
    });
    
    return result;
  };

  return sanitizeObject(sanitized);
}

function sanitizeResponseBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  // Generally, response bodies are less sensitive, but we still sanitize tokens
  const sensitiveFields = ['token', 'secret', 'key', 'password'];
  const sanitized = Array.isArray(body) ? [...body] : { ...body };

  const sanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    
    Object.keys(result).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        result[key] = '***REDACTED***';
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = sanitizeObject(result[key]);
      }
    });
    
    return result;
  };

  return sanitizeObject(sanitized);
}

function getResponseLogLevel(statusCode: number, defaultLevel: string): string {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  if (statusCode >= 300) return 'info';
  return defaultLevel;
}

function logMessage(logger: ILogger, level: string, message: string, meta?: any): void {
  switch (level) {
    case 'error':
      logger.error(message, meta);
      break;
    case 'warn':
      logger.warn(message, meta);
      break;
    case 'info':
      logger.info(message, meta);
      break;
    case 'debug':
      logger.debug(message, meta);
      break;
    default:
      logger.info(message, meta);
  }
}

function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}