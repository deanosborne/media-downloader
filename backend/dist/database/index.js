/**
 * Database module with repository pattern integration
 * Maintains backward compatibility while providing new repository-based access
 */
import { getDatabaseService, initializeDatabaseService } from './DatabaseService.js';
// Legacy variables for backward compatibility
let db = null;
let configManager = null;
/**
 * Initialize the database and configuration manager
 * Now uses the new DatabaseService internally
 */
export async function initializeDatabase() {
    if (db && configManager) {
        return { db, configManager };
    }
    // Initialize the new database service
    const databaseService = await initializeDatabaseService();
    // Set legacy variables for backward compatibility
    db = databaseService.getDatabase();
    configManager = databaseService.getConfigManager();
    return { db, configManager };
}
/**
 * Get the database service instance
 */
export function getService() {
    return getDatabaseService();
}
/**
 * Get the queue repository
 */
export function getQueueRepository() {
    const service = getService();
    return service.getQueueRepository();
}
/**
 * Get the config repository
 */
export function getConfigRepository() {
    const service = getService();
    return service.getConfigRepository();
}
/**
 * Basic database operations
 */
export const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized. Call initializeDatabase() first.'));
            return;
        }
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};
export const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized. Call initializeDatabase() first.'));
            return;
        }
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(row);
            }
        });
    });
};
export const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized. Call initializeDatabase() first.'));
            return;
        }
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
/**
 * Get the configuration manager instance
 */
export function getConfigManager() {
    if (!configManager) {
        throw new Error('Configuration manager not initialized. Call initializeDatabase() first.');
    }
    return configManager;
}
/**
 * Get the database instance
 */
export function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}
/**
 * Legacy configuration functions for backward compatibility
 * These will be deprecated in favor of using ConfigManager directly
 */
export const getConfig = async (key) => {
    console.warn('getConfig() is deprecated. Use ConfigManager.get() instead.');
    const manager = getConfigManager();
    return manager.get(key) || null;
};
export const setConfig = async (key, value) => {
    console.warn('setConfig() is deprecated. Use ConfigManager.set() instead.');
    const manager = getConfigManager();
    await manager.set(key, value);
};
export const getAllConfig = async () => {
    console.warn('getAllConfig() is deprecated. Use ConfigManager.getAllConfig() instead.');
    const manager = getConfigManager();
    return manager.getAllConfig();
};
export const isConfigured = async () => {
    console.warn('isConfigured() is deprecated. Use ConfigManager.isConfigured() instead.');
    const manager = getConfigManager();
    return manager.isConfigured();
};
// Export repository types and classes
export { QueueRepository, ConfigRepository } from '../repositories/index.js';
export { MediaType, QueueStatus } from '../models/index.js';
export { db as default };
//# sourceMappingURL=index.js.map