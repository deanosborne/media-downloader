/**
 * Response formatting utilities
 */

import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  meta?: ResponseMeta;
}

export interface ErrorResponse {
  message: string;
  type: string;
  statusCode: number;
  details?: any;
  stack?: string;
}

export interface ResponseMeta {
  timestamp: string;
  correlationId: string;
  version?: string;
  pagination?: PaginationMeta;
  performance?: PerformanceMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PerformanceMeta {
  processingTime: number;
  memoryUsage?: number;
  cacheHit?: boolean;
}

export interface ResponseOptions {
  correlationId?: string;
  version?: string;
  includePerformance?: boolean;
  startTime?: number;
}

/**
 * Response formatter utility class
 */
export class ResponseFormatter {
  private static readonly API_VERSION = '1.0.0';

  /**
   * Format successful response
   */
  static success<T>(
    res: Response,
    data?: T,
    statusCode: number = 200,
    options: ResponseOptions = {}
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: this.createMeta(options)
    };

    res.status(statusCode).json(response);
  }

  /**
   * Format paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    statusCode: number = 200,
    options: ResponseOptions = {}
  ): void {
    const response: ApiResponse<T[]> = {
      success: true,
      data,
      meta: {
        ...this.createMeta(options),
        pagination
      }
    };

    res.status(statusCode).json(response);
  }

  /**
   * Format error response
   */
  static error(
    res: Response,
    error: Error | string,
    statusCode: number = 500,
    options: ResponseOptions = {}
  ): void {
    const errorResponse: ErrorResponse = {
      message: typeof error === 'string' ? error : error.message,
      type: typeof error === 'string' ? 'Error' : error.constructor.name,
      statusCode
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && typeof error !== 'string' && error.stack) {
      errorResponse.stack = error.stack;
    }

    const response: ApiResponse = {
      success: false,
      error: errorResponse,
      meta: this.createMeta(options)
    };

    res.status(statusCode).json(response);
  }

  /**
   * Format validation error response
   */
  static validationError(
    res: Response,
    errors: Array<{ field: string; message: string; value?: any }>,
    options: ResponseOptions = {}
  ): void {
    const errorResponse: ErrorResponse = {
      message: 'Validation failed',
      type: 'ValidationError',
      statusCode: 400,
      details: errors
    };

    const response: ApiResponse = {
      success: false,
      error: errorResponse,
      meta: this.createMeta(options)
    };

    res.status(400).json(response);
  }

  /**
   * Format not found response
   */
  static notFound(
    res: Response,
    resource: string,
    identifier?: string | number,
    options: ResponseOptions = {}
  ): void {
    const message = identifier 
      ? `${resource} not found with identifier: ${identifier}`
      : `${resource} not found`;

    const errorResponse: ErrorResponse = {
      message,
      type: 'NotFoundError',
      statusCode: 404,
      details: { resource, identifier }
    };

    const response: ApiResponse = {
      success: false,
      error: errorResponse,
      meta: this.createMeta(options)
    };

    res.status(404).json(response);
  }

  /**
   * Format unauthorized response
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized',
    options: ResponseOptions = {}
  ): void {
    const errorResponse: ErrorResponse = {
      message,
      type: 'AuthenticationError',
      statusCode: 401
    };

    const response: ApiResponse = {
      success: false,
      error: errorResponse,
      meta: this.createMeta(options)
    };

    res.status(401).json(response);
  }

  /**
   * Format forbidden response
   */
  static forbidden(
    res: Response,
    message: string = 'Forbidden',
    options: ResponseOptions = {}
  ): void {
    const errorResponse: ErrorResponse = {
      message,
      type: 'AuthorizationError',
      statusCode: 403
    };

    const response: ApiResponse = {
      success: false,
      error: errorResponse,
      meta: this.createMeta(options)
    };

    res.status(403).json(response);
  }

  /**
   * Format rate limit response
   */
  static rateLimited(
    res: Response,
    retryAfter?: number,
    options: ResponseOptions = {}
  ): void {
    const errorResponse: ErrorResponse = {
      message: 'Too many requests',
      type: 'RateLimitError',
      statusCode: 429,
      details: retryAfter ? { retryAfter } : undefined
    };

    const response: ApiResponse = {
      success: false,
      error: errorResponse,
      meta: this.createMeta(options)
    };

    if (retryAfter) {
      res.set('Retry-After', retryAfter.toString());
    }

    res.status(429).json(response);
  }

  /**
   * Format created response
   */
  static created<T>(
    res: Response,
    data: T,
    location?: string,
    options: ResponseOptions = {}
  ): void {
    if (location) {
      res.set('Location', location);
    }

    this.success(res, data, 201, options);
  }

  /**
   * Format no content response
   */
  static noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Create response metadata
   */
  private static createMeta(options: ResponseOptions): ResponseMeta {
    const meta: ResponseMeta = {
      timestamp: new Date().toISOString(),
      correlationId: options.correlationId || this.generateCorrelationId(),
      version: options.version || this.API_VERSION
    };

    // Add performance metrics if requested
    if (options.includePerformance && options.startTime) {
      meta.performance = {
        processingTime: Date.now() - options.startTime,
        memoryUsage: process.memoryUsage().heapUsed
      };
    }

    return meta;
  }

  /**
   * Create pagination metadata
   */
  static createPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * Generate correlation ID
   */
  private static generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Express response extension with formatting methods
 */
declare global {
  namespace Express {
    interface Response {
      success<T>(data?: T, statusCode?: number, options?: ResponseOptions): void;
      paginated<T>(data: T[], pagination: PaginationMeta, statusCode?: number, options?: ResponseOptions): void;
      error(error: Error | string, statusCode?: number, options?: ResponseOptions): void;
      validationError(errors: Array<{ field: string; message: string; value?: any }>, options?: ResponseOptions): void;
      notFound(resource: string, identifier?: string | number, options?: ResponseOptions): void;
      unauthorized(message?: string, options?: ResponseOptions): void;
      forbidden(message?: string, options?: ResponseOptions): void;
      rateLimited(retryAfter?: number, options?: ResponseOptions): void;
      created<T>(data: T, location?: string, options?: ResponseOptions): void;
    }
  }
}

/**
 * Middleware to extend Express response with formatting methods
 */
export const responseFormatter = () => {
  return (req: any, res: any, next: any): void => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] || ResponseFormatter['generateCorrelationId']();

    // Set correlation ID header
    res.set('X-Correlation-ID', correlationId);

    const defaultOptions: ResponseOptions = {
      correlationId,
      includePerformance: process.env.NODE_ENV === 'development',
      startTime
    };

    // Extend response object with formatting methods
    res.success = function<T>(data?: T, statusCode: number = 200, options: ResponseOptions = {}) {
      ResponseFormatter.success(this, data, statusCode, { ...defaultOptions, ...options });
    };

    res.paginated = function<T>(data: T[], pagination: PaginationMeta, statusCode: number = 200, options: ResponseOptions = {}) {
      ResponseFormatter.paginated(this, data, pagination, statusCode, { ...defaultOptions, ...options });
    };

    res.error = function(error: Error | string, statusCode: number = 500, options: ResponseOptions = {}) {
      ResponseFormatter.error(this, error, statusCode, { ...defaultOptions, ...options });
    };

    res.validationError = function(errors: Array<{ field: string; message: string; value?: any }>, options: ResponseOptions = {}) {
      ResponseFormatter.validationError(this, errors, { ...defaultOptions, ...options });
    };

    res.notFound = function(resource: string, identifier?: string | number, options: ResponseOptions = {}) {
      ResponseFormatter.notFound(this, resource, identifier, { ...defaultOptions, ...options });
    };

    res.unauthorized = function(message?: string, options: ResponseOptions = {}) {
      ResponseFormatter.unauthorized(this, message, { ...defaultOptions, ...options });
    };

    res.forbidden = function(message?: string, options: ResponseOptions = {}) {
      ResponseFormatter.forbidden(this, message, { ...defaultOptions, ...options });
    };

    res.rateLimited = function(retryAfter?: number, options: ResponseOptions = {}) {
      ResponseFormatter.rateLimited(this, retryAfter, { ...defaultOptions, ...options });
    };

    res.created = function<T>(data: T, location?: string, options: ResponseOptions = {}) {
      ResponseFormatter.created(this, data, location, { ...defaultOptions, ...options });
    };

    next();
  };
};