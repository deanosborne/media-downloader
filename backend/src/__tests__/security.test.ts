import request from 'supertest';
import express, { Request, Response } from 'express';
import { query } from 'express-validator';
import { InputSanitizer, ValidationRules, createValidationMiddleware } from '../utils/validation';
import { 
  securityHeaders, 
  csrfProtection, 
  sanitizeRequest,
  validateFilePath,
  validateContentType
} from '../middleware/security';
import { ValidationError } from '../types/errors';

describe('Security Middleware and Validation', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('InputSanitizer', () => {
    describe('sanitizeHtml', () => {
      it('should remove HTML tags', () => {
        const input = '<script>alert("xss")</script>Hello World';
        const result = InputSanitizer.sanitizeHtml(input);
        expect(result).toBe('Hello World');
      });

      it('should handle empty input', () => {
        const result = InputSanitizer.sanitizeHtml('');
        expect(result).toBe('');
      });

      it('should remove all HTML attributes', () => {
        const input = '<div onclick="alert(1)">Content</div>';
        const result = InputSanitizer.sanitizeHtml(input);
        expect(result).toBe('Content');
      });
    });

    describe('sanitizeFilePath', () => {
      it('should reject directory traversal attempts', () => {
        expect(() => {
          InputSanitizer.sanitizeFilePath('../../../etc/passwd');
        }).toThrow(ValidationError);
      });

      it('should reject paths with tilde', () => {
        expect(() => {
          InputSanitizer.sanitizeFilePath('~/secret');
        }).toThrow(ValidationError);
      });

      it('should reject system directories', () => {
        expect(() => {
          InputSanitizer.sanitizeFilePath('/etc');
        }).toThrow(ValidationError);

        expect(() => {
          InputSanitizer.sanitizeFilePath('/etc/passwd');
        }).toThrow(ValidationError);

        expect(() => {
          InputSanitizer.sanitizeFilePath('C:\\Windows\\System32');
        }).toThrow(ValidationError);
      });

      it('should allow valid paths', () => {
        const validPath = '/home/user/downloads';
        const result = InputSanitizer.sanitizeFilePath(validPath);
        expect(result).toBe(validPath);
      });

      it('should normalize paths', () => {
        const input = '/home/user/downloads/./movies';
        const result = InputSanitizer.sanitizeFilePath(input);
        expect(result).toBe('/home/user/downloads/movies');
      });

      it('should throw error for invalid input types', () => {
        expect(() => {
          InputSanitizer.sanitizeFilePath(null as any);
        }).toThrow(ValidationError);

        expect(() => {
          InputSanitizer.sanitizeFilePath(123 as any);
        }).toThrow(ValidationError);
      });
    });

    describe('sanitizeSearchQuery', () => {
      it('should remove HTML tags from search queries', () => {
        const input = '<script>alert(1)</script>Avengers';
        const result = InputSanitizer.sanitizeSearchQuery(input);
        expect(result).toBe('Avengers');
      });

      it('should remove special characters', () => {
        const input = 'Movie Title!@#$%^*()';
        const result = InputSanitizer.sanitizeSearchQuery(input);
        expect(result).toBe('Movie Title()');
      });

      it('should limit query length', () => {
        const longInput = 'a'.repeat(300);
        const result = InputSanitizer.sanitizeSearchQuery(longInput);
        expect(result.length).toBe(200);
      });

      it('should handle empty or invalid input', () => {
        expect(InputSanitizer.sanitizeSearchQuery('')).toBe('');
        expect(InputSanitizer.sanitizeSearchQuery(null as any)).toBe('');
        expect(InputSanitizer.sanitizeSearchQuery(undefined as any)).toBe('');
      });
    });

    describe('sanitizeConfigValue', () => {
      it('should not modify API keys and tokens', () => {
        const apiKey = 'secret-api-key-123';
        const result = InputSanitizer.sanitizeConfigValue('TMDB_API_KEY', apiKey);
        expect(result).toBe(apiKey);
      });

      it('should validate URLs', () => {
        const validUrl = 'https://api.example.com';
        const result = InputSanitizer.sanitizeConfigValue('JACKETT_URL', validUrl);
        expect(result).toBe(validUrl);

        expect(() => {
          InputSanitizer.sanitizeConfigValue('JACKETT_URL', 'invalid-url');
        }).toThrow(ValidationError);
      });

      it('should sanitize file paths', () => {
        const validPath = '/home/user/downloads';
        const result = InputSanitizer.sanitizeConfigValue('DOWNLOAD_PATH', validPath);
        expect(result).toBe(validPath);

        expect(() => {
          InputSanitizer.sanitizeConfigValue('DOWNLOAD_PATH', '../../../etc');
        }).toThrow(ValidationError);
      });

      it('should sanitize HTML in other values', () => {
        const input = '<script>alert(1)</script>value';
        const result = InputSanitizer.sanitizeConfigValue('OTHER_CONFIG', input);
        expect(result).toBe('value');
      });
    });
  });

  describe('Security Headers Middleware', () => {
    it('should add security headers', async () => {
      app.use(securityHeaders);
      app.get('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });
  });

  describe('CSRF Protection', () => {
    beforeEach(() => {
      app.use(csrfProtection);
    });

    it('should allow GET requests without origin check', async () => {
      app.get('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    it('should allow POST requests with matching origin', async () => {
      app.post('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app)
        .post('/test')
        .set('Origin', 'http://localhost')
        .set('Host', 'localhost')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
    });

    it('should reject POST requests with mismatched origin', async () => {
      app.post('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app)
        .post('/test')
        .set('Origin', 'http://evil.com')
        .set('Host', 'localhost')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('CSRF protection');
    });

    it('should allow config check endpoint without CSRF', async () => {
      app.post('/api/config/check', (_req, res) => res.json({ success: true }));

      const response = await request(app)
        .post('/api/config/check')
        .set('Origin', 'http://evil.com')
        .set('Host', 'localhost')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
    });
  });

  describe('Request Sanitization', () => {
    beforeEach(() => {
      app.use(sanitizeRequest);
    });

    it('should sanitize query parameters', async () => {
      app.get('/test', (req, res) => res.json({ query: req.query }));

      const response = await request(app)
        .get('/test')
        .query({ 
          query: '<script>alert(1)</script>test',
          normal: 'value'
        });

      expect(response.status).toBe(200);
      expect(response.body.query.query).toBe('test');
      expect(response.body.query.normal).toBe('value');
    });

    it('should sanitize body parameters', async () => {
      app.post('/test', (req, res) => res.json({ body: req.body }));

      const response = await request(app)
        .post('/test')
        .send({
          name: '<script>alert(1)</script>Movie Title',
          episode_name: '<b>Episode</b> Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.body.name).toBe('Movie Title');
      expect(response.body.body.episode_name).toBe('Episode Name');
    });

    it('should handle file path sanitization errors', async () => {
      app.get('/test', (req, res) => res.json({ path: req.query['path'] }));

      const response = await request(app)
        .get('/test')
        .query({ path: '../../../etc/passwd' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Input validation failed');
    });
  });

  describe('File Path Validation', () => {
    beforeEach(() => {
      app.use(validateFilePath);
    });

    it('should validate and sanitize file paths', async () => {
      app.get('/test', (req, res) => res.json({ path: req.query['path'] }));

      const response = await request(app)
        .get('/test')
        .query({ path: '/home/user/downloads' });

      expect(response.status).toBe(200);
      expect(response.body.path).toBe('/home/user/downloads');
    });

    it('should reject invalid file paths', async () => {
      app.get('/test', (req, res) => res.json({ path: req.query['path'] }));

      const response = await request(app)
        .get('/test')
        .query({ path: '../../../etc/passwd' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid file path');
    });
  });

  describe('Content Type Validation', () => {
    beforeEach(() => {
      app.use(validateContentType);
    });

    it('should allow GET requests without content type', async () => {
      app.get('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    it('should require JSON content type for POST requests', async () => {
      app.post('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'text/plain')
        .send('data');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid content type');
    });

    it('should allow JSON content type for POST requests', async () => {
      app.post('/test', (_req, res) => res.json({ success: true }));

      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
    });
  });

  describe('Validation Rules', () => {
    describe('Media Search Validation', () => {
      it('should create validation rules', () => {
        const rules = ValidationRules.mediaSearch();
        expect(rules).toBeDefined();
        expect(Array.isArray(rules)).toBe(true);
        expect(rules.length).toBeGreaterThan(0);
      });

      it('should create queue validation rules', () => {
        const rules = ValidationRules.queueItem();
        expect(rules).toBeDefined();
        expect(Array.isArray(rules)).toBe(true);
        expect(rules.length).toBeGreaterThan(0);
      });

      it('should create configuration validation rules', () => {
        const rules = ValidationRules.configuration();
        expect(rules).toBeDefined();
        expect(Array.isArray(rules)).toBe(true);
        expect(rules.length).toBeGreaterThan(0);
      });

      it('should create file system validation rules', () => {
        const rules = ValidationRules.fileSystem();
        expect(rules).toBeDefined();
        expect(Array.isArray(rules)).toBe(true);
        expect(rules.length).toBeGreaterThan(0);
      });
    });

    describe('Validation Middleware', () => {
      it('should create validation middleware', () => {
        const middleware = createValidationMiddleware(ValidationRules.mediaSearch());
        expect(middleware).toBeDefined();
        expect(Array.isArray(middleware)).toBe(true);
        expect(middleware.length).toBeGreaterThan(0);
      });

      it('should handle validation errors gracefully', async () => {
        app.get('/test-validation', createValidationMiddleware([
          // Simple validation rule that will fail
          query('test').isLength({ min: 5 }).withMessage('Test must be at least 5 characters')
        ]), (_req: Request, res: Response) => {
          res.json({ success: true });
        });

        const response = await request(app)
          .get('/test-validation')
          .query({ test: 'abc' });

        // Should return 400 or 500, but not crash
        expect([400, 500]).toContain(response.status);
      });
    });
  });
});