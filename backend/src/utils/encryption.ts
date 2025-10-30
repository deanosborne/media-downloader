import crypto from 'crypto';
import { ConfigurationError } from '../types/errors';

/**
 * Encryption utilities for secure configuration storage
 */
export class EncryptionManager {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits

  private encryptionKey: Buffer;

  constructor(key?: string) {
    if (key) {
      // Use provided key (should be base64 encoded)
      try {
        this.encryptionKey = Buffer.from(key, 'base64');
        if (this.encryptionKey.length !== EncryptionManager.KEY_LENGTH) {
          throw new Error('Invalid key length');
        }
      } catch (error) {
        throw new ConfigurationError('Invalid encryption key format');
      }
    } else {
      // Generate a new key
      this.encryptionKey = crypto.randomBytes(EncryptionManager.KEY_LENGTH);
    }
  }

  /**
   * Get the encryption key as base64 string
   */
  getKeyAsBase64(): string {
    return this.encryptionKey.toString('base64');
  }

  /**
   * Encrypt a string value
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(EncryptionManager.IV_LENGTH);
      const cipher = crypto.createCipheriv(EncryptionManager.ALGORITHM, this.encryptionKey, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine IV + encrypted data
      const combined = iv.toString('hex') + encrypted;
      return Buffer.from(combined, 'hex').toString('base64');
    } catch (error) {
      throw new ConfigurationError(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt a string value
   */
  decrypt(encryptedData: string): string {
    try {
      const combined = Buffer.from(encryptedData, 'base64').toString('hex');
      
      // Extract IV and encrypted data
      const iv = Buffer.from(combined.slice(0, EncryptionManager.IV_LENGTH * 2), 'hex');
      const encrypted = combined.slice(EncryptionManager.IV_LENGTH * 2);

      const decipher = crypto.createDecipheriv(EncryptionManager.ALGORITHM, this.encryptionKey, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new ConfigurationError(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a value appears to be encrypted
   */
  static isEncrypted(value: string): boolean {
    try {
      // Check if it's a valid base64 string with reasonable length
      const decoded = Buffer.from(value, 'base64');
      return decoded.length >= (EncryptionManager.IV_LENGTH + 8); // IV + some encrypted data
    } catch {
      return false;
    }
  }

  /**
   * Generate a new encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(EncryptionManager.KEY_LENGTH).toString('base64');
  }
}

/**
 * Secure configuration manager with encryption support
 */
export class SecureConfigManager {
  private encryptionManager: EncryptionManager;
  private sensitiveKeys: Set<string>;

  constructor(encryptionKey?: string) {
    this.encryptionManager = new EncryptionManager(encryptionKey);
    this.sensitiveKeys = new Set([
      'TMDB_API_KEY',
      'JACKETT_API_KEY', 
      'REAL_DEBRID_API_KEY',
      'PLEX_TOKEN',
      'DATABASE_PASSWORD',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ]);
  }

  /**
   * Add a key to the sensitive keys list
   */
  addSensitiveKey(key: string): void {
    this.sensitiveKeys.add(key.toUpperCase());
  }

  /**
   * Check if a key is considered sensitive
   */
  isSensitiveKey(key: string): boolean {
    const upperKey = key.toUpperCase();
    return this.sensitiveKeys.has(upperKey) || 
           upperKey.includes('KEY') || 
           upperKey.includes('TOKEN') || 
           upperKey.includes('PASSWORD') ||
           upperKey.includes('SECRET');
  }

  /**
   * Encrypt a configuration value if it's sensitive
   */
  encryptValue(key: string, value: string): string {
    if (this.isSensitiveKey(key) && !EncryptionManager.isEncrypted(value)) {
      return this.encryptionManager.encrypt(value);
    }
    return value;
  }

  /**
   * Decrypt a configuration value if it's encrypted
   */
  decryptValue(key: string, value: string): string {
    if (this.isSensitiveKey(key) && EncryptionManager.isEncrypted(value)) {
      return this.encryptionManager.decrypt(value);
    }
    return value;
  }

  /**
   * Get the encryption key for backup purposes
   */
  getEncryptionKey(): string {
    return this.encryptionManager.getKeyAsBase64();
  }

  /**
   * Create a backup of configuration data
   */
  createBackup(configData: Record<string, any>): string {
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: configData,
      encryptionKey: this.getEncryptionKey()
    };

    return Buffer.from(JSON.stringify(backup)).toString('base64');
  }

  /**
   * Restore configuration from backup
   */
  restoreFromBackup(backupData: string): Record<string, any> {
    try {
      const backup = JSON.parse(Buffer.from(backupData, 'base64').toString('utf8'));
      
      if (!backup.data || !backup.timestamp) {
        throw new Error('Invalid backup format');
      }

      return backup.data;
    } catch (error) {
      throw new ConfigurationError(`Backup restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}