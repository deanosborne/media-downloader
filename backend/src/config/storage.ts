/**
 * Configuration storage implementations
 */

import { IConfigStorage, ISecureConfigStorage } from './types.js';
import { Database } from 'sqlite3';
import crypto from 'crypto';
import { getSensitiveFields } from './schema.js';

/**
 * Database-based configuration storage
 */
export class DatabaseConfigStorage implements IConfigStorage {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async get(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT value FROM config WHERE key = ?',
        [key],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row ? row.value : undefined);
        }
      );
    });
  }

  async set(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      this.db.run(
        'INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [key, serializedValue],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  async getAll(): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT key, value FROM config',
        [],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          const config: Record<string, any> = {};
          rows.forEach(row => {
            try {
              // Try to parse as JSON, fallback to string
              config[row.key] = JSON.parse(row.value);
            } catch {
              config[row.key] = row.value;
            }
          });
          
          resolve(config);
        }
      );
    });
  }

  async delete(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM config WHERE key = ?',
        [key],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  async exists(key: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT 1 FROM config WHERE key = ?',
        [key],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(!!row);
        }
      );
    });
  }
}

/**
 * Secure configuration storage with encryption for sensitive data
 */
export class SecureConfigStorage implements ISecureConfigStorage {
  private storage: IConfigStorage;
  private encryptionKey: string;
  private sensitiveFields: Set<string>;

  constructor(storage: IConfigStorage, encryptionKey?: string) {
    this.storage = storage;
    this.encryptionKey = encryptionKey || this.generateEncryptionKey();
    this.sensitiveFields = new Set(getSensitiveFields());
  }

  private generateEncryptionKey(): string {
    // In production, this should come from environment or secure key management
    return process.env['CONFIG_ENCRYPTION_KEY'] || crypto.randomBytes(32).toString('hex');
  }

  encrypt(value: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decrypt(encryptedValue: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private isSensitive(key: string): boolean {
    return this.sensitiveFields.has(key);
  }

  async get(key: string): Promise<any> {
    const value = await this.storage.get(key);
    
    if (value && this.isSensitive(key)) {
      try {
        return this.decrypt(value);
      } catch (error) {
        console.warn(`Failed to decrypt sensitive config key: ${key}`);
        return value; // Return as-is if decryption fails (for backward compatibility)
      }
    }
    
    return value;
  }

  async set(key: string, value: any): Promise<void> {
    let processedValue = value;
    
    if (this.isSensitive(key) && typeof value === 'string') {
      processedValue = this.encrypt(value);
    }
    
    return this.storage.set(key, processedValue);
  }

  async getAll(): Promise<Record<string, any>> {
    const allConfig = await this.storage.getAll();
    const decryptedConfig: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(allConfig)) {
      if (this.isSensitive(key) && typeof value === 'string') {
        try {
          decryptedConfig[key] = this.decrypt(value);
        } catch (error) {
          console.warn(`Failed to decrypt sensitive config key: ${key}`);
          decryptedConfig[key] = value;
        }
      } else {
        decryptedConfig[key] = value;
      }
    }
    
    return decryptedConfig;
  }

  async delete(key: string): Promise<void> {
    return this.storage.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.exists(key);
  }
}

/**
 * In-memory configuration storage for testing
 */
export class MemoryConfigStorage implements IConfigStorage {
  private data: Map<string, any> = new Map();

  async get(key: string): Promise<any> {
    return this.data.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }

  async getAll(): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.data.entries()) {
      result[key] = value;
    }
    return result;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  clear(): void {
    this.data.clear();
  }
}