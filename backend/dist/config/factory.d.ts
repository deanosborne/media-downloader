/**
 * Factory functions for creating configured instances
 */
import { Database } from 'sqlite3';
import { ConfigManager } from './ConfigManager.js';
/**
 * Create a ConfigManager instance with database storage
 */
export declare function createConfigManager(db: Database, useEncryption?: boolean): Promise<ConfigManager>;
/**
 * Create a ConfigManager instance for testing with in-memory storage
 */
export declare function createTestConfigManager(): Promise<ConfigManager>;
//# sourceMappingURL=factory.d.ts.map