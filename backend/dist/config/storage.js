/**
 * Configuration storage implementations
 */
import crypto from 'crypto';
import { getSensitiveFields } from './schema.js';
/**
 * Database-based configuration storage
 */
export class DatabaseConfigStorage {
    constructor(db) {
        this.db = db;
    }
    async get(key) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT value FROM config WHERE key = ?', [key], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row ? row.value : undefined);
            });
        });
    }
    async set(key, value) {
        return new Promise((resolve, reject) => {
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
            this.db.run('INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, serializedValue], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    async getAll() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT key, value FROM config', [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const config = {};
                rows.forEach(row => {
                    try {
                        // Try to parse as JSON, fallback to string
                        config[row.key] = JSON.parse(row.value);
                    }
                    catch {
                        config[row.key] = row.value;
                    }
                });
                resolve(config);
            });
        });
    }
    async delete(key) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM config WHERE key = ?', [key], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    async exists(key) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT 1 FROM config WHERE key = ?', [key], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(!!row);
            });
        });
    }
}
/**
 * Secure configuration storage with encryption for sensitive data
 */
export class SecureConfigStorage {
    constructor(storage, encryptionKey) {
        this.storage = storage;
        this.encryptionKey = encryptionKey || this.generateEncryptionKey();
        this.sensitiveFields = new Set(getSensitiveFields());
    }
    generateEncryptionKey() {
        // In production, this should come from environment or secure key management
        return process.env['CONFIG_ENCRYPTION_KEY'] || crypto.randomBytes(32).toString('hex');
    }
    encrypt(value) {
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
    decrypt(encryptedValue) {
        const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
        let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    isSensitive(key) {
        return this.sensitiveFields.has(key);
    }
    async get(key) {
        const value = await this.storage.get(key);
        if (value && this.isSensitive(key)) {
            try {
                return this.decrypt(value);
            }
            catch (error) {
                console.warn(`Failed to decrypt sensitive config key: ${key}`);
                return value; // Return as-is if decryption fails (for backward compatibility)
            }
        }
        return value;
    }
    async set(key, value) {
        let processedValue = value;
        if (this.isSensitive(key) && typeof value === 'string') {
            processedValue = this.encrypt(value);
        }
        return this.storage.set(key, processedValue);
    }
    async getAll() {
        const allConfig = await this.storage.getAll();
        const decryptedConfig = {};
        for (const [key, value] of Object.entries(allConfig)) {
            if (this.isSensitive(key) && typeof value === 'string') {
                try {
                    decryptedConfig[key] = this.decrypt(value);
                }
                catch (error) {
                    console.warn(`Failed to decrypt sensitive config key: ${key}`);
                    decryptedConfig[key] = value;
                }
            }
            else {
                decryptedConfig[key] = value;
            }
        }
        return decryptedConfig;
    }
    async delete(key) {
        return this.storage.delete(key);
    }
    async exists(key) {
        return this.storage.exists(key);
    }
}
/**
 * In-memory configuration storage for testing
 */
export class MemoryConfigStorage {
    constructor() {
        this.data = new Map();
    }
    async get(key) {
        return this.data.get(key);
    }
    async set(key, value) {
        this.data.set(key, value);
    }
    async getAll() {
        const result = {};
        for (const [key, value] of this.data.entries()) {
            result[key] = value;
        }
        return result;
    }
    async delete(key) {
        this.data.delete(key);
    }
    async exists(key) {
        return this.data.has(key);
    }
    clear() {
        this.data.clear();
    }
}
//# sourceMappingURL=storage.js.map