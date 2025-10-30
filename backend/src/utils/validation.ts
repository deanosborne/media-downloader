import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import sanitizeHtml from 'sanitize-html';
import path from 'path';
import { ValidationError } from '../types/errors';

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    return sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    });
  }

  /**
   * Sanitize file paths to prevent directory traversal
   */
  static sanitizeFilePath(filePath: string): string {
    if (!filePath || typeof filePath !== 'string') {
      throw new ValidationError('Invalid file path');
    }

    // Check for directory traversal attempts before normalization
    if (filePath.includes('..') || filePath.includes('~')) {
      throw new ValidationError('Directory traversal not allowed');
    }

    // Normalize the path to resolve any .. or . segments
    const normalizedPath = path.normalize(filePath);
    
    // Check again after normalization
    if (normalizedPath.includes('..')) {
      throw new ValidationError('Directory traversal not allowed');
    }

    // Prevent access to system directories on Windows and Unix
    const forbiddenPaths = [
      '/etc', '\\etc', '/root', '\\root', '/sys', '\\sys', 
      '/proc', '\\proc', '/dev', '\\dev', '/boot', '\\boot',
      'C:\\Windows', 'C:\\System32', 'C:\\Program Files'
    ];

    const lowerPath = normalizedPath.toLowerCase();
    for (const forbidden of forbiddenPaths) {
      const forbiddenLower = forbidden.toLowerCase();
      if (lowerPath === forbiddenLower || 
          lowerPath.startsWith(forbiddenLower + '/') ||
          lowerPath.startsWith(forbiddenLower + '\\')) {
        throw new ValidationError(`Access to ${forbidden} is not allowed`);
      }
    }

    // For cross-platform compatibility, preserve the original path separator style
    // if it was Unix-style, keep it Unix-style
    if (filePath.includes('/') && !filePath.includes('\\')) {
      return normalizedPath.replace(/\\/g, '/');
    }

    return normalizedPath;
  }

  /**
   * Sanitize search query to prevent injection attacks
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // Remove HTML tags first
    let sanitized = this.sanitizeHtml(query);
    
    // Remove dangerous characters but keep common punctuation for movie/show titles
    sanitized = sanitized
      .replace(/[<>'"]/g, '') // Remove dangerous HTML chars
      .replace(/[!@#$%^*]/g, '') // Remove special chars but keep ()[] and &
      .trim()
      .substring(0, 200); // Limit length

    return sanitized;
  }

  /**
   * Sanitize configuration values
   */
  static sanitizeConfigValue(key: string, value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // For sensitive keys, don't log or sanitize the actual value
    if (key.toLowerCase().includes('key') || 
        key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('password')) {
      return value; // Return as-is for API keys/tokens
    }

    // For URLs, basic validation
    if (key.toLowerCase().includes('url')) {
      try {
        new URL(value);
        return value;
      } catch {
        throw new ValidationError(`Invalid URL format for ${key}`);
      }
    }

    // For paths, sanitize
    if (key.toLowerCase().includes('path')) {
      return this.sanitizeFilePath(value);
    }

    // For other string values, sanitize HTML
    return this.sanitizeHtml(value);
  }
}

/**
 * Validation rule builders
 */
export class ValidationRules {
  /**
   * Common validation rules for media search
   */
  static mediaSearch(): ValidationChain[] {
    return [
      query('query')
        .isLength({ min: 1, max: 200 })
        .withMessage('Query must be between 1 and 200 characters')
        .customSanitizer(InputSanitizer.sanitizeSearchQuery),
      query('type')
        .optional()
        .isIn(['movie', 'tv', 'TV Show', 'book', 'audiobook', 'application'])
        .withMessage('Invalid media type'),
      query('season')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Season must be a number between 1 and 50'),
      query('episode')
        .optional()
        .isInt({ min: 1, max: 500 })
        .withMessage('Episode must be a number between 1 and 500')
    ];
  }

  /**
   * Validation rules for queue operations
   */
  static queueItem(): ValidationChain[] {
    return [
      body('type')
        .isIn(['movie', 'TV Show', 'book', 'audiobook', 'application'])
        .withMessage('Invalid media type'),
      body('name')
        .isLength({ min: 1, max: 500 })
        .withMessage('Name must be between 1 and 500 characters')
        .customSanitizer(InputSanitizer.sanitizeHtml),
      body('year')
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() + 5 })
        .withMessage('Year must be between 1900 and 5 years in the future'),
      body('tmdb_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('TMDB ID must be a positive integer'),
      body('season')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Season must be between 1 and 50'),
      body('episode')
        .optional()
        .isInt({ min: 1, max: 500 })
        .withMessage('Episode must be between 1 and 500'),
      body('episode_name')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Episode name must be less than 500 characters')
        .customSanitizer(InputSanitizer.sanitizeHtml),
      body('is_season_pack')
        .optional()
        .isBoolean()
        .withMessage('is_season_pack must be a boolean')
    ];
  }

  /**
   * Validation rules for configuration
   */
  static configuration(): ValidationChain[] {
    return [
      body('TMDB_API_KEY')
        .optional()
        .isLength({ min: 10, max: 100 })
        .withMessage('TMDB API key must be between 10 and 100 characters'),
      body('JACKETT_URL')
        .optional()
        .isURL({ require_protocol: true })
        .withMessage('Jackett URL must be a valid URL'),
      body('JACKETT_API_KEY')
        .optional()
        .isLength({ min: 10, max: 100 })
        .withMessage('Jackett API key must be between 10 and 100 characters'),
      body('REAL_DEBRID_API_KEY')
        .optional()
        .isLength({ min: 10, max: 100 })
        .withMessage('Real-Debrid API key must be between 10 and 100 characters'),
      body('PLEX_URL')
        .optional()
        .isURL({ require_protocol: true })
        .withMessage('Plex URL must be a valid URL'),
      body('PLEX_TOKEN')
        .optional()
        .isLength({ min: 10, max: 100 })
        .withMessage('Plex token must be between 10 and 100 characters'),
      body('DOWNLOAD_PATH')
        .optional()
        .custom((value) => {
          if (value) {
            InputSanitizer.sanitizeFilePath(value);
          }
          return true;
        })
        .withMessage('Invalid download path'),
      body('PLEX_MOVIE_PATH')
        .optional()
        .custom((value) => {
          if (value) {
            InputSanitizer.sanitizeFilePath(value);
          }
          return true;
        })
        .withMessage('Invalid Plex movie path'),
      body('PLEX_TV_PATH')
        .optional()
        .custom((value) => {
          if (value) {
            InputSanitizer.sanitizeFilePath(value);
          }
          return true;
        })
        .withMessage('Invalid Plex TV path')
    ];
  }

  /**
   * Validation rules for file system operations
   */
  static fileSystem(): ValidationChain[] {
    return [
      query('path')
        .optional()
        .custom((value) => {
          if (value) {
            InputSanitizer.sanitizeFilePath(value);
          }
          return true;
        })
        .withMessage('Invalid file path'),
      body('path')
        .optional()
        .custom((value) => {
          if (value) {
            InputSanitizer.sanitizeFilePath(value);
          }
          return true;
        })
        .withMessage('Invalid file path')
    ];
  }

  /**
   * Validation rules for torrent operations
   */
  static torrentSearch(): ValidationChain[] {
    return [
      query('query')
        .isLength({ min: 1, max: 200 })
        .withMessage('Query must be between 1 and 200 characters')
        .customSanitizer(InputSanitizer.sanitizeSearchQuery),
      query('type')
        .optional()
        .isIn(['movie', 'TV Show', 'book', 'audiobook', 'application'])
        .withMessage('Invalid media type'),
      query('resolution')
        .optional()
        .isIn(['any', '720p', '1080p', '4K', '2160p'])
        .withMessage('Invalid resolution'),
      query('minSeeders')
        .optional()
        .isInt({ min: 0, max: 10000 })
        .withMessage('Min seeders must be between 0 and 10000')
    ];
  }

  /**
   * Validation rules for ID parameters
   */
  static idParam(): ValidationChain[] {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be a positive integer')
    ];
  }
}

/**
 * Middleware to handle validation results
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => {
      // Handle different error types from express-validator
      if ('path' in error) {
        return {
          field: error.path,
          message: error.msg,
          value: error.value
        };
      } else if ('param' in error) {
        return {
          field: error.param,
          message: error.msg,
          value: 'value' in error ? error.value : undefined
        };
      } else {
        return {
          field: 'unknown',
          message: error.msg,
          value: undefined
        };
      }
    });

    res.status(400).json({
      error: 'Validation failed',
      details: errorMessages
    });
    return;
  }

  next();
};

/**
 * Create validation middleware chain
 */
export const createValidationMiddleware = (rules: ValidationChain[]) => {
  return [
    ...rules, 
    (req: Request, res: Response, next: NextFunction) => {
      try {
        handleValidationErrors(req, res, next);
      } catch (error) {
        console.error('Validation middleware error:', error);
        res.status(500).json({
          error: 'Internal validation error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  ];
};