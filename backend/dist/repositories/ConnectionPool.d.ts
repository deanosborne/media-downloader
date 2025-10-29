/**
 * Database connection pool management
 */
import { DatabaseConnection } from './DatabaseConnection.js';
import { IDatabaseConnection } from './interfaces/IDatabaseConnection.js';
export interface ConnectionPoolOptions {
    filename: string;
    maxConnections?: number;
    acquireTimeoutMs?: number;
    idleTimeoutMs?: number;
}
export declare class ConnectionPool {
    private connections;
    private availableConnections;
    private pendingAcquires;
    private options;
    private isShuttingDown;
    constructor(options: ConnectionPoolOptions);
    /**
     * Initialize the connection pool
     */
    initialize(): Promise<void>;
    /**
     * Acquire a connection from the pool
     */
    acquire(): Promise<DatabaseConnection>;
    /**
     * Release a connection back to the pool
     */
    release(connection: DatabaseConnection): void;
    /**
     * Execute a callback with a connection from the pool
     */
    withConnection<T>(callback: (connection: IDatabaseConnection) => Promise<T>): Promise<T>;
    /**
     * Get pool statistics
     */
    getStats(): {
        total: number;
        available: number;
        pending: number;
    };
    /**
     * Shutdown the connection pool
     */
    shutdown(): Promise<void>;
    /**
     * Create a new database connection
     */
    private createConnection;
    /**
     * Destroy a database connection
     */
    private destroyConnection;
    /**
     * Start periodic cleanup of idle connections
     */
    private startIdleCleanup;
}
//# sourceMappingURL=ConnectionPool.d.ts.map