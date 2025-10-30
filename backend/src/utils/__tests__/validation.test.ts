import { 
  validateEmail, 
  validateUrl, 
  validateFilePath, 
  sanitizeInput, 
  ValidationRules,
  createValidationMiddleware 
} from '../validation.js';
import { ValidationError } from '../../types/errors.js';
import { Request, Response, NextFunction } from 'express';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('user123@test-domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('test..test@domain.com')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
      expect(validateUrl('https://api.example.com/v1/endpoint')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('validateFilePath', () => {
    it('should validate safe file paths', () => {
      expect(validateFilePath('/home/user/documents/file.txt')).toBe(true);
      expect(validateFilePath('relative/path/file.txt')).toBe(true);
      expect(validateFilePath('./local/file.txt')).toBe(true);
    });

    it('should reject dangerous file paths', () => {
      expect(validateFilePath('../../../etc/passwd')).toBe(false);
      expect(validateFilePath('/etc/shadow')).toBe(false);
      expect(validateFilePath('C:\\Windows\\System32\\config')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML input', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeInput(input);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('Safe content');
    });

    it('should preserve safe HTML tags', () => {
      const input = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
      const result = sanitizeInput(input);
      
      expect(result).toContain('<p>Paragraph</p>');
      expect(result).toContain('<strong>Bold</strong>');
      expect(result).toContain('<em>Italic</em>');
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(123 as any)).toBe('123');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('ValidationRules', () => {
    it('should create required rule', () => {
      const rule = ValidationRules.required('Field is required');
      
      expect(rule('')).toBe('Field is required');
      expect(rule('value')).toBeUndefined();
      expect(rule(null)).toBe('Field is required');
      expect(rule(undefined)).toBe('Field is required');
    });

    it('should create email rule', () => {
      const rule = ValidationRules.email('Invalid email');
      
      expect(rule('test@example.com')).toBeUndefined();
      expect(rule('invalid-email')).toBe('Invalid email');
    });

    it('should create minLength rule', () => {
      const rule = ValidationRules.minLength(5, 'Too short');
      
      expect(rule('12345')).toBeUndefined();
      expect(rule('1234')).toBe('Too short');
    });

    it('should create maxLength rule', () => {
      const rule = ValidationRules.maxLength(10, 'Too long');
      
      expect(rule('1234567890')).toBeUndefined();
      expect(rule('12345678901')).toBe('Too long');
    });

    it('should create pattern rule', () => {
      const rule = ValidationRules.pattern(/^\d+$/, 'Must be numeric');
      
      expect(rule('12345')).toBeUndefined();
      expect(rule('abc123')).toBe('Must be numeric');
    });

    it('should create custom rule', () => {
      const rule = ValidationRules.custom((value) => {
        return value === 'test' ? undefined : 'Must be test';
      });
      
      expect(rule('test')).toBeUndefined();
      expect(rule('other')).toBe('Must be test');
    });
  });

  describe('createValidationMiddleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      req = { body: {} };
      res = {};
      next = jest.fn();
    });

    it('should pass validation with valid data', () => {
      const rules = {
        email: [ValidationRules.required('Email required'), ValidationRules.email('Invalid email')]
      };
      
      req.body = { email: 'test@example.com' };
      
      const middleware = createValidationMiddleware(rules);
      middleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail validation with invalid data', () => {
      const rules = {
        email: [ValidationRules.required('Email required'), ValidationRules.email('Invalid email')]
      };
      
      req.body = { email: 'invalid-email' };
      
      const middleware = createValidationMiddleware(rules);
      
      expect(() => {
        middleware(req as Request, res as Response, next);
      }).toThrow(ValidationError);
    });

    it('should validate nested fields', () => {
      const rules = {
        'user.email': [ValidationRules.email('Invalid email')]
      };
      
      req.body = { user: { email: 'test@example.com' } };
      
      const middleware = createValidationMiddleware(rules);
      middleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle missing nested fields', () => {
      const rules = {
        'user.email': [ValidationRules.required('Email required')]
      };
      
      req.body = {};
      
      const middleware = createValidationMiddleware(rules);
      
      expect(() => {
        middleware(req as Request, res as Response, next);
      }).toThrow(ValidationError);
    });
  });
});