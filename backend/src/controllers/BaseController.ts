/**
 * Base controller class with common functionality
 */

import { Request, Response, NextFunction } from 'express';
import { ILogger } from '../types/service.js';
import { defaultLogger } from '../utils/Logger.js';
import { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  AppError 
} from '../types/errors.js';

export interface ControllerOptions {
  logger?: ILogger;
  requireAuth?: boolean;
  rateLimitConfig?: RateLimitConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export interface RequestContext {
  correlationId: string;
  timestamp: Date;
  user?: any;
  ip: string;
  userAgent: string | undefined;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T | undefined;
  error?: any;
  meta?: {
    timestamp: string;
    correlationId: string;
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

/**
 * Base controller providing common functionality for all controllers
 */
export abstract class BaseController {
  protected logger: ILogger;
  protected options: ControllerOptions;

  constructor(options: ControllerOptions = {}) {
    this.logger = options.logger || defaultLogger;
    this.options = options;
  }

  /**
   * Create request context from Express request
   */
  protected createRequestContext(req: Request): RequestContext {
    return {
      correlationId: (req.headers['x-correlation-id'] as string) || this.generateCorrelationId(),
      timestamp: new Date(),
      user: (req as any).user,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent')
    };
  }

  /**
   * Send successful response
   */
  protected sendSuccess<T>(
    res: Response, 
    data?: T, 
    statusCode: number = 200,
    meta?: Partial<ApiResponse['meta']>
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        correlationId: res.get('X-Correlation-ID') || this.generateCorrelationId(),
        ...meta
      }
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   */
  protected sendPaginatedSuccess<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    statusCode: number = 200
  ): void {
    this.sendSuccess(res, data, statusCode, { pagination });
  }

  /**
   * Send error response (handled by error middleware, but useful for manual error responses)
   */
  protected sendError(
    res: Response, 
    error: AppError | string, 
    statusCode?: number
  ): void {
    if (typeof error === 'string') {
      error = new ValidationError(error);
    }

    const response: ApiResponse = {
      success: false,
      error: {
        message: error.message,
        type: error.constructor.name,
        statusCode: statusCode || error.statusCode
      },
      meta: {
        timestamp: new Date().toISOString(),
        correlationId: res.get('X-Correlation-ID') || this.generateCorrelationId()
      }
    };

    res.status(statusCode || error.statusCode).json(response);
  }

  /**
   * Validate required fields in request body
   */
  protected validateRequiredFields(
    body: any, 
    requiredFields: string[], 
    fieldName: string = 'request body'
  ): void {
    if (!body || typeof body !== 'object') {
      throw new ValidationError(`Invalid ${fieldName}: must be an object`);
    }

    const missingFields = requiredFields.filter(field => {
      const value = body[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      const firstMissingField = missingFields[0];
      throw new ValidationError(
        `Missing required fields in ${fieldName}: ${missingFields.join(', ')}`,
        firstMissingField,
        firstMissingField ? body[firstMissingField] : undefined
      );
    }
  }

  /**
   * Validate and sanitize pagination parameters
   */
  protected validatePagination(query: any, options: PaginationOptions = {}): {
    page: number;
    limit: number;
    offset: number;
  } {
    const {
      maxLimit = 100
    } = options;

    let page = parseInt(query.page);
    let limit = parseInt(query.limit);

    // Use defaults if parsing failed or not provided
    if (isNaN(page) || !query.page) page = 1;
    if (isNaN(limit) || !query.limit) limit = 20;

    // Validate page
    if (page < 1) {
      throw new ValidationError('Page must be greater than 0', 'page', page);
    }

    // Validate and cap limit
    if (limit < 1) {
      throw new ValidationError('Limit must be greater than 0', 'limit', limit);
    }

    if (limit > maxLimit) {
      limit = maxLimit;
    }

    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Create pagination metadata
   */
  protected createPaginationMeta(
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
   * Sanitize input to prevent XSS and injection attacks
   */
  protected sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .trim();
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (input && typeof input === 'object') {
      const sanitized: any = {};
      Object.keys(input).forEach(key => {
        sanitized[key] = this.sanitizeInput(input[key]);
      });
      return sanitized;
    }

    return input;
  }

  /**
   * Validate file path to prevent directory traversal
   */
  protected validateFilePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new ValidationError('Invalid file path', 'filePath', filePath);
    }

    // Normalize path and check for directory traversal
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
      throw new ValidationError('Directory traversal not allowed', 'filePath', filePath);
    }

    // Check for absolute paths to sensitive directories
    const forbiddenPaths = ['/etc', '/root', '/sys', '/proc'];
    const forbiddenWindowsPaths = ['c:/windows', 'c:/system32'];
    const lowerPath = normalizedPath.toLowerCase();
    
    if (forbiddenPaths.some(forbidden => lowerPath.startsWith(forbidden)) ||
        forbiddenWindowsPaths.some(forbidden => lowerPath.startsWith(forbidden))) {
      throw new ValidationError('Access to system directories not allowed', 'filePath', filePath);
    }
  }

  /**
   * Extract and validate authentication token
   */
  protected extractAuthToken(req: Request): string {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('Authorization header required');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError('Invalid authorization header format. Expected: Bearer <token>');
    }

    const token = parts[1];
    if (!token || token.length < 10) {
      throw new AuthenticationError('Invalid token format');
    }

    return token;
  }

  /**
   * Check if user has required permissions
   */
  protected checkPermissions(user: any, requiredPermissions: string[]): void {
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!user.permissions || !Array.isArray(user.permissions)) {
      throw new AuthorizationError('User permissions not found');
    }

    const hasPermission = requiredPermissions.every(permission => 
      user.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new AuthorizationError(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      );
    }
  }

  /**
   * Async wrapper for controller methods
   */
  protected asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      const context = this.createRequestContext(req);
      
      // Add correlation ID to response headers
      res.set('X-Correlation-ID', context.correlationId);
      
      // Log request
      this.logger.info(`${req.method} ${req.path} - Controller: ${this.constructor.name}`, {
        correlationId: context.correlationId,
        method: req.method,
        path: req.path,
        ip: context.ip,
        userAgent: context.userAgent
      });

      Promise.resolve(fn.call(this, req, res, next, context))
        .catch(next);
    };
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}