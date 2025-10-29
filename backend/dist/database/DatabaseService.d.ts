/**
 * Database service with repository pattern integration
 */
import { Database } from 'sqlite3';
import { DatabaseConnection, QueueRepository, ConfigRepository, MigrationManager } from '../repositories/index.js';
import { ConfigManager } from '../config/index.js';
export declare class DatabaseService {
    private db;
    private connection;
    private queueRepository;
    private configRepository;
    private configManager;
    private migrationManager;
    /**
     * Initialize the database service
     */
    initialize(): Promise<void>;
    /**
     * Get the queue repository
     */
    getQueueRepository(): QueueRepository;
    /**
     * Get the config repository
     */
    getConfigRepository(): ConfigRepository;
    /**
     * Get the configuration manager
     */
    getConfigManager(): ConfigManager;
    /**
     * Get the database connection
     */
    getConnection(): DatabaseConnection;
    /**
     * Get the raw database instance (for backward compatibility)
     */
    getDatabase(): Database;
    /**
     * Get migration manager
     */
    getMigrationManager(): MigrationManager;
    /**
     * Close the database connection
     */
    close(): Promise<void>;
}
/**
 * Get the singleton database service instance
 */
export declare function getDatabaseService(): DatabaseService;
/**
 * Initialize the database service (convenience function)
 */
export declare function initializeDatabaseService(): Promise<DatabaseService>;
//# sourceMappingURL=DatabaseService.d.ts.map