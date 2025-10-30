import { Database } from 'sqlite3';
import { SecureConfigManager } from '../utils/encryption';
import { ConfigurationError } from '../types/errors';

/**
 * Secure configuration repository with encryption and logging
 */
export class SecureConfigRepository {
  private db: Database;
  private secureManager: SecureConfigManager;
  private accessLog: ConfigAccessLog[];

  constructor(db: Database, encryptionKey?: string) {
    this.db = db;
    this.secureManager = new SecureConfigManager(encryptionKey);
    this.accessLog = [];
    this.initializeTables();
  }

  /**
   * Initialize database tables for secure configuration
   */
  private async initializeTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const createConfigTable = `
        CREATE TABLE IF NOT EXISTS secure_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          is_encrypted BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createAccessLogTable = `
        CREATE TABLE IF NOT EXISTS config_access_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          config_key TEXT NOT NULL,
          action TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createConfigTable, (err) => {
        if (err) {
          reject(new ConfigurationError(`Failed to create config table: ${err.message}`));
          return;
        }

        this.db.run(createAccessLogTable, (err) => {
          if (err) {
            reject(new ConfigurationError(`Failed to create access log table: ${err.message}`));
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Set a configuration value with encryption if sensitive
   */
  async setConfig(key: string, value: string, metadata?: ConfigAccessMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const isSensitive = this.secureManager.isSensitiveKey(key);
        const processedValue = isSensitive ? this.secureManager.encryptValue(key, value) : value;

        const query = `
          INSERT OR REPLACE INTO secure_config (key, value, is_encrypted, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `;

        this.db.run(query, [key, processedValue, isSensitive], (err) => {
          if (err) {
            reject(new ConfigurationError(`Failed to set config ${key}: ${err.message}`));
            return;
          }

          // Log the access
          this.logAccess(key, 'SET', metadata);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get a configuration value with decryption if needed
   */
  async getConfig(key: string, metadata?: ConfigAccessMetadata): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const query = 'SELECT value, is_encrypted FROM secure_config WHERE key = ?';

      this.db.get(query, [key], (err, row: any) => {
        if (err) {
          reject(new ConfigurationError(`Failed to get config ${key}: ${err.message}`));
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        try {
          const value = row.is_encrypted ? 
            this.secureManager.decryptValue(key, row.value) : 
            row.value;

          // Log the access
          this.logAccess(key, 'GET', metadata);
          resolve(value);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Get all configuration values
   */
  async getAllConfig(metadata?: ConfigAccessMetadata): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      const query = 'SELECT key, value, is_encrypted FROM secure_config';

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(new ConfigurationError(`Failed to get all config: ${err.message}`));
          return;
        }

        try {
          const config: Record<string, string> = {};

          for (const row of rows) {
            config[row.key] = row.is_encrypted ? 
              this.secureManager.decryptValue(row.key, row.value) : 
              row.value;
          }

          // Log the access
          this.logAccess('*', 'GET_ALL', metadata);
          resolve(config);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Delete a configuration value
   */
  async deleteConfig(key: string, metadata?: ConfigAccessMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM secure_config WHERE key = ?';

      this.db.run(query, [key], (err) => {
        if (err) {
          reject(new ConfigurationError(`Failed to delete config ${key}: ${err.message}`));
          return;
        }

        // Log the access
        this.logAccess(key, 'DELETE', metadata);
        resolve();
      });
    });
  }

  /**
   * Check if configuration is properly set up
   */
  async isConfigured(): Promise<boolean> {
    try {
      const config = await this.getAllConfig();
      const requiredKeys = ['TMDB_API_KEY', 'JACKETT_API_KEY', 'REAL_DEBRID_API_KEY'];
      
      return requiredKeys.some(key => config[key] && config[key].trim() !== '');
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a backup of all configuration
   */
  async createBackup(): Promise<string> {
    try {
      const config = await this.getAllConfig();
      return this.secureManager.createBackup(config);
    } catch (error) {
      throw new ConfigurationError(`Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore configuration from backup
   */
  async restoreFromBackup(backupData: string, metadata?: ConfigAccessMetadata): Promise<void> {
    try {
      const config = this.secureManager.restoreFromBackup(backupData);

      // Clear existing configuration
      await new Promise<void>((resolve, reject) => {
        this.db.run('DELETE FROM secure_config', (err) => {
          if (err) {
            reject(new ConfigurationError(`Failed to clear config: ${err.message}`));
            return;
          }
          resolve();
        });
      });

      // Restore all configuration values
      for (const [key, value] of Object.entries(config)) {
        await this.setConfig(key, value as string, metadata);
      }

      // Log the restore operation
      this.logAccess('*', 'RESTORE', metadata);
    } catch (error) {
      throw new ConfigurationError(`Backup restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get configuration access logs
   */
  async getAccessLogs(limit: number = 100): Promise<ConfigAccessLog[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT config_key, action, ip_address, user_agent, timestamp
        FROM config_access_log
        ORDER BY timestamp DESC
        LIMIT ?
      `;

      this.db.all(query, [limit], (err, rows: any[]) => {
        if (err) {
          reject(new ConfigurationError(`Failed to get access logs: ${err.message}`));
          return;
        }

        resolve(rows.map(row => ({
          configKey: row.config_key,
          action: row.action,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          timestamp: new Date(row.timestamp)
        })));
      });
    });
  }

  /**
   * Log configuration access
   */
  private logAccess(key: string, action: string, metadata?: ConfigAccessMetadata): void {
    const query = `
      INSERT INTO config_access_log (config_key, action, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
    `;

    this.db.run(query, [
      key,
      action,
      metadata?.ipAddress || null,
      metadata?.userAgent || null
    ], (err) => {
      if (err) {
        console.error('Failed to log config access:', err.message);
      }
    });

    // Also keep in-memory log for recent access
    this.accessLog.push({
      configKey: key,
      action,
      ipAddress: metadata?.ipAddress || undefined,
      userAgent: metadata?.userAgent || undefined,
      timestamp: new Date()
    });

    // Keep only last 1000 entries in memory
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-1000);
    }
  }

  /**
   * Get recent access logs from memory
   */
  getRecentAccessLogs(): ConfigAccessLog[] {
    return [...this.accessLog].reverse();
  }

  /**
   * Get encryption key for backup purposes
   */
  getEncryptionKey(): string {
    return this.secureManager.getEncryptionKey();
  }
}

/**
 * Configuration access metadata
 */
export interface ConfigAccessMetadata {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Configuration access log entry
 */
export interface ConfigAccessLog {
  configKey: string;
  action: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  timestamp: Date;
}