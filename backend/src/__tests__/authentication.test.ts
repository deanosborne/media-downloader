import request from 'supertest';
import express, { Request, Response } from 'express';
import { 
  AuthenticationManager, 
  UserRole, 
  authenticate, 
  authorize, 
  requireRole, 
  optionalAuth,
  getCurrentUser,
  authManager
} from '../middleware/authentication';

describe('Authentication System', () => {
  let app: express.Application;
  let testAuthManager: AuthenticationManager;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    testAuthManager = new AuthenticationManager();
  });

  describe('AuthenticationManager', () => {
    it('should generate API keys with correct format', () => {
      const apiKey = testAuthManager.generateApiKey('test-key', UserRole.USER);
      
      expect(apiKey.id).toBeDefined();
      expect(apiKey.name).toBe('test-key');
      expect(apiKey.key).toMatch(/^mk_[a-f0-9]{64}$/);
      expect(apiKey.role).toBe(UserRole.USER);
      expect(apiKey.permissions).toContain('queue:read');
      expect(apiKey.isActive).toBe(true);
      expect(apiKey.createdAt).toBeInstanceOf(Date);
    });

    it('should validate API keys correctly', () => {
      const apiKey = testAuthManager.generateApiKey('test-key', UserRole.USER);
      
      const validatedKey = testAuthManager.validateApiKey(apiKey.key);
      expect(validatedKey).toBeDefined();
      expect(validatedKey?.name).toBe('test-key');
      expect(validatedKey?.lastUsed).toBeInstanceOf(Date);
    });

    it('should reject invalid API keys', () => {
      const invalidKey = testAuthManager.validateApiKey('invalid-key');
      expect(invalidKey).toBeNull();
    });

    it('should handle expired API keys', () => {
      const apiKey = testAuthManager.generateApiKey('test-key', UserRole.USER, [], -1); // Expired yesterday
      
      const validatedKey = testAuthManager.validateApiKey(apiKey.key);
      expect(validatedKey).toBeNull();
    });

    it('should revoke API keys', () => {
      const apiKey = testAuthManager.generateApiKey('test-key', UserRole.USER);
      
      let validatedKey = testAuthManager.validateApiKey(apiKey.key);
      expect(validatedKey).toBeDefined();
      
      const revoked = testAuthManager.revokeApiKey(apiKey.key);
      expect(revoked).toBe(true);
      
      validatedKey = testAuthManager.validateApiKey(apiKey.key);
      expect(validatedKey).toBeNull();
    });

    it('should track key usage', () => {
      const apiKey = testAuthManager.generateApiKey('test-key', UserRole.USER);
      
      expect(testAuthManager.getKeyUsage(apiKey.key)).toBe(0);
      
      testAuthManager.validateApiKey(apiKey.key);
      testAuthManager.validateApiKey(apiKey.key);
      
      expect(testAuthManager.getKeyUsage(apiKey.key)).toBe(2);
    });

    it('should check permissions correctly', () => {
      const userKey = testAuthManager.generateApiKey('user-key', UserRole.USER);
      const adminKey = testAuthManager.generateApiKey('admin-key', UserRole.ADMIN);
      const readonlyKey = testAuthManager.generateApiKey('readonly-key', UserRole.READONLY);
      
      // User permissions
      expect(testAuthManager.hasPermission(userKey.key, 'queue:read')).toBe(true);
      expect(testAuthManager.hasPermission(userKey.key, 'queue:write')).toBe(true);
      expect(testAuthManager.hasPermission(userKey.key, 'config:write')).toBe(false);
      
      // Admin permissions (should have all)
      expect(testAuthManager.hasPermission(adminKey.key, 'config:write')).toBe(true);
      expect(testAuthManager.hasPermission(adminKey.key, 'system:admin')).toBe(true);
      
      // Readonly permissions
      expect(testAuthManager.hasPermission(readonlyKey.key, 'queue:read')).toBe(true);
      expect(testAuthManager.hasPermission(readonlyKey.key, 'queue:write')).toBe(false);
    });

    it('should list API keys without exposing key values', () => {
      testAuthManager.generateApiKey('key1', UserRole.USER);
      testAuthManager.generateApiKey('key2', UserRole.ADMIN);
      
      const keys = testAuthManager.listApiKeys();
      
      expect(keys).toHaveLength(3); // 2 created + 1 default admin
      expect(keys[0]).not.toHaveProperty('key');
      expect(keys[0]).toHaveProperty('name');
      expect(keys[0]).toHaveProperty('role');
    });
  });

  describe('Authentication Middleware', () => {
    let testApiKey: string;

    beforeEach(() => {
      const apiKey = authManager.generateApiKey('test-key', UserRole.USER);
      testApiKey = apiKey.key;
    });

    it('should authenticate valid API key in header', async () => {
      app.use(authenticate);
      app.get('/test', (req: Request, res: Response) => {
        const user = getCurrentUser(req);
        res.json({ authenticated: true, user: user?.name });
      });

      const response = await request(app)
        .get('/test')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user).toBe('test-key');
    });

    it('should authenticate valid API key in Authorization header', async () => {
      app.use(authenticate);
      app.get('/test', (_req: Request, res: Response) => {
        res.json({ authenticated: true });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${testApiKey}`);

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
    });

    it('should authenticate valid API key in query parameter', async () => {
      app.use(authenticate);
      app.get('/test', (_req: Request, res: Response) => {
        res.json({ authenticated: true });
      });

      const response = await request(app)
        .get('/test')
        .query({ api_key: testApiKey });

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
    });

    it('should reject requests without API key', async () => {
      app.use(authenticate);
      app.get('/test', (_req: Request, res: Response) => {
        res.json({ authenticated: true });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject requests with invalid API key', async () => {
      app.use(authenticate);
      app.get('/test', (_req: Request, res: Response) => {
        res.json({ authenticated: true });
      });

      const response = await request(app)
        .get('/test')
        .set('X-API-Key', 'invalid-key');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });

    it('should skip authentication for public endpoints', async () => {
      app.use(authenticate);
      app.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok' });
      });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Authorization Middleware', () => {
    let userApiKey: string;
    let adminApiKey: string;

    beforeEach(() => {
      const userKey = authManager.generateApiKey('user-key', UserRole.USER);
      const adminKey = authManager.generateApiKey('admin-key', UserRole.ADMIN);
      userApiKey = userKey.key;
      adminApiKey = adminKey.key;
    });

    it('should allow access with correct permission', async () => {
      app.use(authenticate);
      app.get('/test', authorize('queue:read'), (_req: Request, res: Response) => {
        res.json({ authorized: true });
      });

      const response = await request(app)
        .get('/test')
        .set('X-API-Key', userApiKey);

      expect(response.status).toBe(200);
      expect(response.body.authorized).toBe(true);
    });

    it('should deny access without correct permission', async () => {
      app.use(authenticate);
      app.get('/test', authorize('config:write'), (_req: Request, res: Response) => {
        res.json({ authorized: true });
      });

      const response = await request(app)
        .get('/test')
        .set('X-API-Key', userApiKey);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should allow admin access to all permissions', async () => {
      app.use(authenticate);
      app.get('/test', authorize('config:write'), (_req: Request, res: Response) => {
        res.json({ authorized: true });
      });

      const response = await request(app)
        .get('/test')
        .set('X-API-Key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.authorized).toBe(true);
    });
  });

  describe('Role-based Authorization', () => {
    let userApiKey: string;
    let adminApiKey: string;

    beforeEach(() => {
      const userKey = authManager.generateApiKey('user-key', UserRole.USER);
      const adminKey = authManager.generateApiKey('admin-key', UserRole.ADMIN);
      userApiKey = userKey.key;
      adminApiKey = adminKey.key;
    });

    it('should allow access with correct role', async () => {
      app.use(authenticate);
      app.get('/test', requireRole(UserRole.USER), (_req: Request, res: Response) => {
        res.json({ authorized: true });
      });

      const response = await request(app)
        .get('/test')
        .set('X-API-Key', userApiKey);

      expect(response.status).toBe(200);
      expect(response.body.authorized).toBe(true);
    });

    it('should allow admin access to all roles', async () => {
      app.use(authenticate);
      app.get('/test', requireRole(UserRole.USER), (_req: Request, res: Response) => {
        res.json({ authorized: true });
      });

      const response = await request(app)
        .get('/test')
        .set('X-API-Key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.authorized).toBe(true);
    });
  });

  describe('Optional Authentication', () => {
    let testApiKey: string;

    beforeEach(() => {
      const apiKey = authManager.generateApiKey('test-key', UserRole.USER);
      testApiKey = apiKey.key;
    });

    it('should work without API key', async () => {
      app.use(optionalAuth);
      app.get('/test', (req: Request, res: Response) => {
        const user = getCurrentUser(req);
        res.json({ user: user?.name || null });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.user).toBeNull();
    });

    it('should work with valid API key', async () => {
      app.use(optionalAuth);
      app.get('/test', (req: Request, res: Response) => {
        const user = getCurrentUser(req);
        res.json({ user: user?.name || null });
      });

      const response = await request(app)
        .get('/test')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body.user).toBe('test-key');
    });

    it('should ignore invalid API key', async () => {
      app.use(optionalAuth);
      app.get('/test', (req: Request, res: Response) => {
        const user = getCurrentUser(req);
        res.json({ user: user?.name || null });
      });

      const response = await request(app)
        .get('/test')
        .set('X-API-Key', 'invalid-key');

      expect(response.status).toBe(200);
      expect(response.body.user).toBeNull();
    });
  });
});