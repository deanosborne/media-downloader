/**
 * Request validation and sanitization middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types/errors.js';
import { ILogger } from '../types/service.js';
import { defaultLogger } from '../utils/Logger.js';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'date';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
}

export interface SanitizationOptions {
  trimStrings?: boolean;
  removeHtml?: boolean;
  maxStringLength?: number;
  allowedTags?: string[];
}

/**
 * Request validation middleware
 */
export const validate = (schema: ValidationSchema, options: { logger?: ILogger } = {}) => {
  const logger = options.logger || defaultLogger;

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const errors: string[] = [];

      // Validate body
      if (schema.body) {
        const bodyErrors = validateObject(req.body, schema.body, 'body');
        errors.push(...bodyErrors);
      }

      // Validate query parameters
      if (schema.query) {
        const queryErrors = validateObject(req.query, schema.query, 'query');
        errors.push(...queryErrors);
      }

      // Validate route parameters
      if (schema.params) {
        const paramErrors = validateObject(req.params, schema.params, 'params');
        errors.push(...paramErrors);
      }

      if (errors.length > 0) {
        logger.warn('Request validation failed', {
          errors,
          method: req.method,
          path: req.path,
          correlationId: req.headers['x-correlation-id']
        });

        throw new ValidationError(`Validation failed: ${errors.join(', ')}`);
      }

      logger.debug('Request validation passed', {
        method: req.method,
        path: req.path,
        correlationId: req.headers['x-correlation-id']
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Request sanitization middleware
 */
export const sanitize = (options: SanitizationOptions = {}) => {
  const {
    trimStrings = true,
    removeHtml = true,
    maxStringLength = 10000,
    allowedTags = []
  } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Sanitize body
      if (req.body) {
        req.body = sanitizeObject(req.body, {
          trimStrings,
          removeHtml,
          maxStringLength,
          allowedTags
        });
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = sanitizeObject(req.query, {
          trimStrings,
          removeHtml,
          maxStringLength,
          allowedTags
        });
      }

      // Sanitize route parameters
      if (req.params) {
        req.params = sanitizeObject(req.params, {
          trimStrings,
          removeHtml,
          maxStringLength,
          allowedTags
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * File upload validation middleware
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  required?: boolean;
}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    maxFiles = 1,
    required = false
  } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const files = (req as any).files as any[] | undefined;

      if (required && (!files || files.length === 0)) {
        throw new ValidationError('File upload is required');
      }

      if (!files || files.length === 0) {
        return next();
      }

      if (files.length > maxFiles) {
        throw new ValidationError(`Too many files. Maximum allowed: ${maxFiles}`);
      }

      for (const file of files) {
        // Check file size
        if (file.size > maxSize) {
          throw new ValidationError(
            `File ${file.originalname} is too large. Maximum size: ${maxSize} bytes`
          );
        }

        // Check file type
        if (!allowedTypes.includes(file.mimetype)) {
          throw new ValidationError(
            `File ${file.originalname} has invalid type. Allowed types: ${allowedTypes.join(', ')}`
          );
        }

        // Check for malicious file names
        if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
          throw new ValidationError(
            `File ${file.originalname} has invalid name`
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Security headers middleware
 */
export const securityHeaders = () => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    // Set security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    });

    next();
  };
};

// Helper functions
function validateObject(obj: any, rules: ValidationRule[], context: string): string[] {
  const errors: string[] = [];

  if (!obj && rules.some(rule => rule.required)) {
    errors.push(`${context} is required`);
    return errors;
  }

  if (!obj) {
    return errors;
  }

  for (const rule of rules) {
    const value = obj[rule.field];
    const fieldPath = `${context}.${rule.field}`;

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldPath} is required`);
      continue;
    }

    // Skip validation if field is not present and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    const typeError = validateType(value, rule.type, fieldPath);
    if (typeError) {
      errors.push(typeError);
      continue;
    }

    // Length/range validation
    if (rule.min !== undefined || rule.max !== undefined) {
      const rangeError = validateRange(value, rule.min, rule.max, fieldPath, rule.type);
      if (rangeError) {
        errors.push(rangeError);
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push(`${fieldPath} does not match required pattern`);
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${fieldPath} must be one of: ${rule.enum.join(', ')}`);
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        const errorMessage = typeof customResult === 'string' ? customResult : `${fieldPath} failed custom validation`;
        errors.push(errorMessage);
      }
    }
  }

  return errors;
}

function validateType(value: any, type: ValidationRule['type'], fieldPath: string): string | null {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return `${fieldPath} must be a string`;
      }
      break;

    case 'number':
      if (typeof value !== 'number' && !(!isNaN(Number(value)))) {
        return `${fieldPath} must be a number`;
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return `${fieldPath} must be a boolean`;
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return `${fieldPath} must be an array`;
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        return `${fieldPath} must be an object`;
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        return `${fieldPath} must be a valid email address`;
      }
      break;

    case 'url':
      if (typeof value !== 'string' || !isValidUrl(value)) {
        return `${fieldPath} must be a valid URL`;
      }
      break;

    case 'date':
      if (!isValidDate(value)) {
        return `${fieldPath} must be a valid date`;
      }
      break;
  }

  return null;
}

function validateRange(
  value: any, 
  min: number | undefined, 
  max: number | undefined, 
  fieldPath: string, 
  type: ValidationRule['type']
): string | null {
  let length: number;

  switch (type) {
    case 'string':
      length = value.length;
      break;
    case 'number':
      length = Number(value);
      break;
    case 'array':
      length = value.length;
      break;
    default:
      return null;
  }

  if (min !== undefined && length < min) {
    const unit = type === 'number' ? 'value' : 'length';
    return `${fieldPath} ${unit} must be at least ${min}`;
  }

  if (max !== undefined && length > max) {
    const unit = type === 'number' ? 'value' : 'length';
    return `${fieldPath} ${unit} must be at most ${max}`;
  }

  return null;
}

function sanitizeObject(obj: any, options: SanitizationOptions): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
      sanitized[key] = sanitizeObject(obj[key], options);
    });
    return sanitized;
  }

  return obj;
}

function sanitizeString(str: string, options: SanitizationOptions): string {
  let sanitized = str;

  // Trim whitespace
  if (options.trimStrings) {
    sanitized = sanitized.trim();
  }

  // Remove HTML tags
  if (options.removeHtml) {
    if (options.allowedTags && options.allowedTags.length > 0) {
      // Remove all HTML except allowed tags (simplified implementation)
      const allowedTagsPattern = options.allowedTags.join('|');
      const regex = new RegExp(`<(?!/?(?:${allowedTagsPattern})\\b)[^>]*>`, 'gi');
      sanitized = sanitized.replace(regex, '');
    } else {
      // Remove all HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
  }

  // Limit string length
  if (options.maxStringLength && sanitized.length > options.maxStringLength) {
    sanitized = sanitized.substring(0, options.maxStringLength);
  }

  return sanitized;
}

// Validation helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidDate(date: any): boolean {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  
  return false;
}