import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * User roles for authorization
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  READONLY = 'readonly'
}

/**
 * API key information
 */
export interface ApiKeyInfo {
  id: string;
  name: string;
  key: string;
  role: UserRole;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date | undefined;
  expiresAt?: Date | undefined;
  isActive: boolean;
}

/**
 * Authentication manager for API key-based authentication
 */
export class AuthenticationManager {
  private apiKeys: Map<string, ApiKeyInfo> = new Map();
  private keyUsage: Map<string, number> = new Map();

  constructor() {
    // Initialize with a default admin key for setup
    this.createDefaultAdminKey();
  }

  /**
   * Create a default admin API key for initial setup
   */
  private createDefaultAdminKey(): void {
    const defaultKey = this.generateApiKey('default-admin', UserRole.ADMIN, [
      'config:read', 'config:write', 'queue:read', 'queue:write', 
      'system:admin', 'keys:manage'
    ]);
    
    console.log('🔑 Default admin API key created:', defaultKey.key);
    console.log('   Use this key for initial setup and create additional keys as needed.');
  }

  /**
   * Generate a new API key
   */
  generateApiKey(
    name: string, 
    role: UserRole, 
    permissions: string[] = [],
    expiresInDays?: number
  ): ApiKeyInfo {
    const id = crypto.randomUUID();
    const key = `mk_${crypto.randomBytes(32).toString('hex')}`;
    
    const expiresAt = expiresInDays ? 
      new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : 
      undefined;

    const apiKeyInfo: ApiKeyInfo = {
      id,
      name,
      key,
      role,
      permissions: [...this.getDefaultPermissions(role), ...permissions],
      createdAt: new Date(),
      expiresAt,
      isActive: true
    };

    this.apiKeys.set(key, apiKeyInfo);
    return apiKeyInfo;
  }

  /**
   * Get default permissions for a role
   */
  private getDefaultPermissions(role: UserRole): string[] {
    switch (role) {
      case UserRole.ADMIN:
        return [
          'config:read', 'config:write',
          'queue:read', 'queue:write',
          'search:read', 'torrents:read',
          'filesystem:read', 'filesystem:write',
          'system:admin', 'keys:manage'
        ];
      case UserRole.USER:
        return [
          'config:read',
          'queue:read', 'queue:write',
          'search:read', 'torrents:read',
          'filesystem:read'
        ];
      case UserRole.READONLY:
        return [
          'config:read',
          'queue:read',
          'search:read'
        ];
      default:
        return [];
    }
  }

  /**
   * Validate an API key
   */
  validateApiKey(key: string): ApiKeyInfo | null {
    const apiKeyInfo = this.apiKeys.get(key);
    
    if (!apiKeyInfo) {
      return null;
    }

    // Check if key is active
    if (!apiKeyInfo.isActive) {
      return null;
    }

    // Check if key has expired
    if (apiKeyInfo.expiresAt && apiKeyInfo.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    apiKeyInfo.lastUsed = new Date();
    
    // Track usage
    const currentUsage = this.keyUsage.get(key) || 0;
    this.keyUsage.set(key, currentUsage + 1);

    return apiKeyInfo;
  }

  /**
   * Revoke an API key
   */
  revokeApiKey(key: string): boolean {
    const apiKeyInfo = this.apiKeys.get(key);
    if (apiKeyInfo) {
      apiKeyInfo.isActive = false;
      return true;
    }
    return false;
  }

  /**
   * List all API keys (without the actual key values)
   */
  listApiKeys(): Omit<ApiKeyInfo, 'key'>[] {
    return Array.from(this.apiKeys.values()).map(({ key, ...info }) => info);
  }

  /**
   * Get API key usage statistics
   */
  getKeyUsage(key: string): number {
    return this.keyUsage.get(key) || 0;
  }

  /**
   * Check if a key has a specific permission
   */
  hasPermission(key: string, permission: string): boolean {
    const apiKeyInfo = this.apiKeys.get(key);
    if (!apiKeyInfo || !apiKeyInfo.isActive) {
      return false;
    }

    return apiKeyInfo.permissions.includes(permission) || 
           apiKeyInfo.role === UserRole.ADMIN;
  }
}

// Global authentication manager instance
export const authManager = new AuthenticationManager();

/**
 * Authentication middleware
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // Skip authentication for health check and public endpoints
  if (req.path === '/health' || req.path === '/' || req.path.startsWith('/static')) {
    return next();
  }

  // Extract API key from header or query parameter
  const apiKey = req.headers['x-api-key'] as string || 
                 req.headers['authorization']?.replace('Bearer ', '') ||
                 req.query['api_key'] as string;

  if (!apiKey) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'API key must be provided in X-API-Key header, Authorization header, or api_key query parameter'
    });
    return;
  }

  const keyInfo = authManager.validateApiKey(apiKey);
  if (!keyInfo) {
    res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided API key is invalid, expired, or has been revoked'
    });
    return;
  }

  // Add key info to request for use in authorization
  (req as any).apiKey = keyInfo;
  next();
};

/**
 * Authorization middleware factory
 */
export const authorize = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const keyInfo = (req as any).apiKey as ApiKeyInfo;
    
    if (!keyInfo) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Request must be authenticated before authorization'
      });
      return;
    }

    if (!authManager.hasPermission(keyInfo.key, requiredPermission)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `This operation requires the '${requiredPermission}' permission`
      });
      return;
    }

    next();
  };
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const keyInfo = (req as any).apiKey as ApiKeyInfo;
    
    if (!keyInfo) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Request must be authenticated before authorization'
      });
      return;
    }

    // Admin role can access everything
    if (keyInfo.role === UserRole.ADMIN) {
      return next();
    }

    if (keyInfo.role !== requiredRole) {
      res.status(403).json({
        error: 'Insufficient role',
        message: `This operation requires '${requiredRole}' role or higher`
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no key provided)
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string || 
                 req.headers['authorization']?.replace('Bearer ', '') ||
                 req.query['api_key'] as string;

  if (apiKey) {
    const keyInfo = authManager.validateApiKey(apiKey);
    if (keyInfo) {
      (req as any).apiKey = keyInfo;
    }
  }

  next();
};

/**
 * Get current user info from request
 */
export const getCurrentUser = (req: Request): ApiKeyInfo | null => {
  return (req as any).apiKey || null;
};