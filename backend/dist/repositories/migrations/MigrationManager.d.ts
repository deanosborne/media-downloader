/**
 * Database migration management utilities
 */
import { IDatabaseConnection } from '../interfaces/IDatabaseConnection.js';
export interface Migration {
    version: number;
    name: string;
    up: (db: IDatabaseConnection) => Promise<void>;
    down: (db: IDatabaseConnection) => Promise<void>;
}
export declare class MigrationManager {
    private db;
    private migrations;
    constructor(db: IDatabaseConnection);
    /**
     * Register a migration
     */
    addMigration(migration: Migration): void;
    /**
     * Initialize the migrations table
     */
    private initializeMigrationsTable;
    /**
     * Get the current database version
     */
    private getCurrentVersion;
    /**
     * Record a migration as applied
     */
    private recordMigration;
    /**
     * Remove a migration record
     */
    private removeMigrationRecord;
    /**
     * Run all pending migrations
     */
    migrate(): Promise<void>;
    /**
     * Rollback the last migration
     */
    rollback(): Promise<void>;
    /**
     * Get migration status
     */
    getStatus(): Promise<{
        current: number;
        pending: number;
        total: number;
    }>;
}
//# sourceMappingURL=MigrationManager.d.ts.map