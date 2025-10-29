/**
 * Database module with ConfigManager integration
 */
import { Database } from 'sqlite3';
import { ConfigManager } from '../config/index.js';
declare let db: Database | null;
/**
 * Initialize the database and configuration manager
 */
export declare function initializeDatabase(): Promise<{
    db: Database;
    configManager: ConfigManager;
}>;
/**
 * Basic database operations
 */
export declare const dbRun: (sql: string, params?: any[]) => Promise<{
    id: number;
    changes: number;
}>;
export declare const dbGet: (sql: string, params?: any[]) => Promise<any>;
export declare const dbAll: (sql: string, params?: any[]) => Promise<any[]>;
/**
 * Get the configuration manager instance
 */
export declare function getConfigManager(): ConfigManager;
/**
 * Get the database instance
 */
export declare function getDatabase(): Database;
/**
 * Legacy configuration functions for backward compatibility
 * These will be deprecated in favor of using ConfigManager directly
 */
export declare const getConfig: (key: string) => Promise<string | null>;
export declare const setConfig: (key: string, value: string) => Promise<void>;
export declare const getAllConfig: () => Promise<Record<string, any>>;
export declare const isConfigured: () => Promise<boolean>;
export { db as default };
//# sourceMappingURL=index.d.ts.map