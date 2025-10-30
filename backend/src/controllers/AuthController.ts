import { Request, Response } from 'express';
import { authManager, UserRole, ApiKeyInfo } from '../middleware/authentication';
import { ValidationRules, createValidationMiddleware } from '../utils/validation';
import { body } from 'express-validator';

/**
 * Authentication and API key management controller
 */
export class AuthController {
  /**
   * Create a new API key
   */
  static async createApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { name, role, permissions, expiresInDays } = req.body;

      const apiKey = authManager.generateApiKey(
        name,
        role as UserRole,
        permissions || [],
        expiresInDays
      );

      res.status(201).json({
        message: 'API key created successfully',
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          key: apiKey.key, // Only show the key once during creation
          role: apiKey.role,
          permissions: apiKey.permissions,
          createdAt: apiKey.createdAt,
          expiresAt: apiKey.expiresAt
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create API key',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * List all API keys (without showing the actual keys)
   */
  static async listApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const apiKeys = authManager.listApiKeys().map(key => ({
        ...key,
        usage: authManager.getKeyUsage(key.id)
      }));

      res.json({
        apiKeys,
        total: apiKeys.length
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list API keys',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Revoke an API key
   */
  static async revokeApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      
      // Find the key by ID
      const apiKeys = authManager.listApiKeys();
      const targetKey = apiKeys.find(key => key.id === keyId);
      
      if (!targetKey) {
        res.status(404).json({
          error: 'API key not found',
          message: 'The specified API key does not exist'
        });
        return;
      }

      // Note: We need to find the actual key string to revoke it
      // This is a limitation of the current design - in production, 
      // you'd store keys in a database with proper indexing
      const success = authManager.revokeApiKey(targetKey.id);
      
      if (success) {
        res.json({
          message: 'API key revoked successfully',
          keyId: keyId
        });
      } else {
        res.status(404).json({
          error: 'API key not found',
          message: 'The specified API key could not be revoked'
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Failed to revoke API key',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get current user information
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const keyInfo = (req as any).apiKey as ApiKeyInfo;
      
      if (!keyInfo) {
        res.status(401).json({
          error: 'Not authenticated',
          message: 'No valid API key provided'
        });
        return;
      }

      res.json({
        user: {
          id: keyInfo.id,
          name: keyInfo.name,
          role: keyInfo.role,
          permissions: keyInfo.permissions,
          lastUsed: keyInfo.lastUsed,
          usage: authManager.getKeyUsage(keyInfo.key)
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get user information',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test API key authentication
   */
  static async testAuth(req: Request, res: Response): Promise<void> {
    try {
      const keyInfo = (req as any).apiKey as ApiKeyInfo;
      
      res.json({
        message: 'Authentication successful',
        authenticated: true,
        user: {
          name: keyInfo.name,
          role: keyInfo.role,
          permissions: keyInfo.permissions
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Authentication test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validation rules for creating API keys
   */
  static createApiKeyValidation() {
    return createValidationMiddleware([
      body('name')
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters'),
      body('role')
        .isIn(Object.values(UserRole))
        .withMessage('Role must be admin, user, or readonly'),
      body('permissions')
        .optional()
        .isArray()
        .withMessage('Permissions must be an array'),
      body('expiresInDays')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Expiration must be between 1 and 365 days')
    ]);
  }
}

/**
 * Available permissions for API keys
 */
export const AVAILABLE_PERMISSIONS = [
  'config:read',
  'config:write',
  'queue:read',
  'queue:write',
  'search:read',
  'torrents:read',
  'filesystem:read',
  'filesystem:write',
  'system:admin',
  'keys:manage'
];