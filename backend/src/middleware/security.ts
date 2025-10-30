import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { InputSanitizer } from '../utils/validation';

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.themoviedb.org", "https://api.real-debrid.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Rate limiting middleware
 */
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: message || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

/**
 * General API rate limiting
 */
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many API requests from this IP, please try again later.'
);

/**
 * Strict rate limiting for sensitive operations
 */
export const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 requests per windowMs
  'Too many sensitive operations from this IP, please try again later.'
);

/**
 * Configuration update rate limiting
 */
export const configRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  5, // limit each IP to 5 config updates per windowMs
  'Too many configuration updates from this IP, please try again later.'
);

/**
 * CSRF protection middleware for state-changing operations
 * Since this is primarily an API, we'll use a simple token-based approach
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF for GET requests and certain endpoints
  if (req.method === 'GET' || req.path.startsWith('/api/config/check')) {
    return next();
  }

  // For now, we'll implement a simple origin check
  // In a production environment, you might want to use a more robust CSRF solution
  const origin = req.get('Origin') || req.get('Referer');
  const host = req.get('Host');

  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        res.status(403).json({
          error: 'CSRF protection: Invalid origin',
          message: 'Request origin does not match server host'
        });
        return;
      }
    } catch (error) {
      res.status(403).json({
        error: 'CSRF protection: Invalid origin format',
        message: 'Unable to validate request origin'
      });
      return;
    }
  }

  next();
};

/**
 * Request sanitization middleware
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          if (key === 'path') {
            // Special handling for file paths
            req.query[key] = InputSanitizer.sanitizeFilePath(value);
          } else if (key === 'query' || key === 'q') {
            // Special handling for search queries
            req.query[key] = InputSanitizer.sanitizeSearchQuery(value);
          } else {
            // General HTML sanitization
            req.query[key] = InputSanitizer.sanitizeHtml(value);
          }
        }
      }
    }

    // Sanitize body parameters (for non-config endpoints)
    if (req.body && typeof req.body === 'object' && !req.path.includes('/api/config')) {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          if (key.toLowerCase().includes('path')) {
            req.body[key] = InputSanitizer.sanitizeFilePath(value);
          } else if (key === 'name' || key === 'episode_name') {
            req.body[key] = InputSanitizer.sanitizeHtml(value);
          }
        }
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: 'Input validation failed',
      message: error instanceof Error ? error.message : 'Invalid input data'
    });
  }
};

/**
 * Security logging middleware
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log security-relevant information
  const securityInfo = {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    method: req.method,
    path: req.path,
    origin: req.get('Origin'),
    referer: req.get('Referer')
  };

  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /data:.*base64/i  // Data URI attacks
  ];

  const requestString = JSON.stringify(req.query) + JSON.stringify(req.body);
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));

  if (isSuspicious) {
    console.warn('🚨 Suspicious request detected:', {
      ...securityInfo,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined
    });
  }

  // Continue with request
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log failed requests
    if (res.statusCode >= 400) {
      console.warn('⚠️ Failed request:', {
        ...securityInfo,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    }
  });

  next();
};

/**
 * File path validation middleware for filesystem endpoints
 */
export const validateFilePath = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const pathParam = req.query['path'] || req.body.path;
    
    if (pathParam && typeof pathParam === 'string') {
      // Validate and sanitize the file path
      const sanitizedPath = InputSanitizer.sanitizeFilePath(pathParam);
      
      // Update the request with sanitized path
      if (req.query['path']) {
        req.query['path'] = sanitizedPath;
      }
      if (req.body.path) {
        req.body.path = sanitizedPath;
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: 'Invalid file path',
      message: error instanceof Error ? error.message : 'File path validation failed'
    });
  }
};

/**
 * Content type validation middleware
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({
        error: 'Invalid content type',
        message: 'Content-Type must be application/json'
      });
      return;
    }
  }

  next();
};