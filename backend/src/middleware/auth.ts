/**
 * Authentication and authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import { 
  AuthenticationError, 
  AuthorizationError,
  ValidationError 
} from '../types/errors.js';
import { ILogger } from '../types/service.js';
import { defaultLogger } from '../utils/Logger.js';

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
}

export interface AuthMiddlewareOptions {
  logger?: ILogger;
  optional?: boolean;
  roles?: string[];
  permissions?: string[];
}

/**
 * Basic authentication middleware
 * In a real application, this would validate JWT tokens or session cookies
 */
export const authenticate = (options: AuthMiddlewareOptions = {}) => {
  const logger = options.logger || defaultLogger;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      // If authentication is optional and no header provided, continue
      if (options.optional && !authHeader) {
        return next();
      }

      if (!authHeader) {
        throw new AuthenticationError('Authorization header required');
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new AuthenticationError('Invalid authorization header format. Expected: Bearer <token>');
      }

      const token = parts[1];
      if (!token) {
        throw new AuthenticationError('Token not provided');
      }

      // In a real application, you would:
      // 1. Validate JWT token
      // 2. Check token expiration
      // 3. Fetch user from database
      // 4. Check if user is active
      
      // For now, we'll create a mock user based on token
      const user = await validateToken(token);
      
      if (!user) {
        throw new AuthenticationError('Invalid or expired token');
      }

      if (!user.isActive) {
        throw new AuthenticationError('User account is disabled');
      }

      // Attach user to request
      (req as any).user = user;

      logger.debug('User authenticated successfully', {
        userId: user.id,
        username: user.username,
        roles: user.roles,
        correlationId: req.headers['x-correlation-id']
      });

      next();
    } catch (error) {
      logger.warn('Authentication failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.headers['x-correlation-id']
      });
      next(error);
    }
  };
};

/**
 * Role-based authorization middleware
 */
export const authorize = (requiredRoles: string | string[], options: AuthMiddlewareOptions = {}) => {
  const logger = options.logger || defaultLogger;
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user as AuthUser;

      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      const hasRequiredRole = roles.some(role => user.roles.includes(role));

      if (!hasRequiredRole) {
        logger.warn('Authorization failed - insufficient roles', {
          userId: user.id,
          userRoles: user.roles,
          requiredRoles: roles,
          correlationId: req.headers['x-correlation-id']
        });

        throw new AuthorizationError(
          `Insufficient permissions. Required roles: ${roles.join(', ')}`
        );
      }

      logger.debug('User authorized successfully', {
        userId: user.id,
        userRoles: user.roles,
        requiredRoles: roles,
        correlationId: req.headers['x-correlation-id']
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermissions = (requiredPermissions: string | string[], options: AuthMiddlewareOptions = {}) => {
  const logger = options.logger || defaultLogger;
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user as AuthUser;

      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      const hasAllPermissions = permissions.every(permission => 
        user.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        logger.warn('Authorization failed - insufficient permissions', {
          userId: user.id,
          userPermissions: user.permissions,
          requiredPermissions: permissions,
          correlationId: req.headers['x-correlation-id']
        });

        throw new AuthorizationError(
          `Insufficient permissions. Required: ${permissions.join(', ')}`
        );
      }

      logger.debug('User permissions validated successfully', {
        userId: user.id,
        userPermissions: user.permissions,
        requiredPermissions: permissions,
        correlationId: req.headers['x-correlation-id']
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * API key authentication middleware
 */
export const authenticateApiKey = (options: AuthMiddlewareOptions = {}) => {
  const logger = options.logger || defaultLogger;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        throw new AuthenticationError('API key required in X-API-Key header');
      }

      // In a real application, validate API key against database
      const isValidApiKey = await validateApiKey(apiKey);

      if (!isValidApiKey) {
        throw new AuthenticationError('Invalid API key');
      }

      // Create a system user for API key authentication
      const systemUser: AuthUser = {
        id: 'system',
        username: 'api-key-user',
        roles: ['api-user'],
        permissions: ['read', 'write'],
        isActive: true
      };

      (req as any).user = systemUser;

      logger.debug('API key authenticated successfully', {
        apiKey: apiKey.substring(0, 8) + '...',
        correlationId: req.headers['x-correlation-id']
      });

      next();
    } catch (error) {
      logger.warn('API key authentication failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
        correlationId: req.headers['x-correlation-id']
      });
      next(error);
    }
  };
};

/**
 * Rate limiting middleware
 */
export const rateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  const { windowMs, maxRequests, message = 'Too many requests', keyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [k, v] of requestCounts.entries()) {
      if (now > v.resetTime) {
        requestCounts.delete(k);
      }
    }

    const current = requestCounts.get(key);
    
    if (!current) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': (maxRequests - 1).toString(),
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });
      return next();
    }

    if (now > current.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': (maxRequests - 1).toString(),
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });
      return next();
    }

    if (current.count >= maxRequests) {
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
      });

      const error = new ValidationError(message);
      (error as any).statusCode = 429;
      return next(error);
    }

    current.count++;
    
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - current.count).toString(),
      'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
    });

    next();
  };
};

// Helper functions (mock implementations)
async function validateToken(token: string): Promise<AuthUser | null> {
  // Mock token validation
  // In a real application, this would validate JWT or check session store
  
  if (token === 'invalid-token') {
    return null;
  }

  // Mock user based on token
  return {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['user', 'admin'],
    permissions: ['read', 'write', 'delete'],
    isActive: true,
    lastLogin: new Date()
  };
}

async function validateApiKey(apiKey: string): Promise<boolean> {
  // Mock API key validation
  // In a real application, this would check against database
  const validApiKeys = ['test-api-key-123', 'admin-api-key-456'];
  return validApiKeys.includes(apiKey);
}