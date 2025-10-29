/**
 * Database module with ConfigManager integration
 */
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createConfigManager } from '../config/index.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Database instance
let db = null;
let configManager = null;
/**
 * Initialize the database and configuration manager
 */
export async function initializeDatabase() {
    if (db && configManager) {
        return { db, configManager };
    }
    // Create database connection
    db = new sqlite3.Database(join(__dirname, '../../media_queue.db'));
    // Initialize database schema
    await initializeSchema(db);
    // Create configuration manager
    configManager = await createConfigManager(db, true);
    return { db, configManager };
}
/**
 * Initialize database schema
 */
async function initializeSchema(database) {
    return new Promise((resolve, reject) => {
        database.serialize(() => {
            // Queue table
            database.run(`
        CREATE TABLE IF NOT EXISTS queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          year INTEGER,
          tmdb_id INTEGER,
          season INTEGER,
          episode INTEGER,
          episode_name TEXT,
          is_season_pack INTEGER DEFAULT 0,
          status TEXT DEFAULT 'not_started',
          torrent_name TEXT,
          torrent_link TEXT,
          torrent_id TEXT,
          real_debrid_id TEXT,
          progress INTEGER DEFAULT 0,
          error TEXT,
          file_path TEXT,
          download_speed TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Config table
            database.run(`
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
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
export { db as default };
//# sourceMappingURL=index.js.map