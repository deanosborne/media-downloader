/**
 * Database connection interface for abstraction
 */
export interface DatabaseResult {
    id: number;
    changes: number;
}
export interface IDatabaseConnection {
    /**
     * Execute a SQL statement that modifies data (INSERT, UPDATE, DELETE)
     */
    run(sql: string, params?: any[]): Promise<DatabaseResult>;
    /**
     * Execute a SQL query that returns a single row
     */
    get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
    /**
     * Execute a SQL query that returns multiple rows
     */
    all<T = any>(sql: string, params?: any[]): Promise<T[]>;
    /**
     * Begin a database transaction
     */
    beginTransaction(): Promise<void>;
    /**
     * Commit a database transaction
     */
    commit(): Promise<void>;
    /**
     * Rollback a database transaction
     */
    rollback(): Promise<void>;
    /**
     * Execute multiple operations within a transaction
     */
    transaction<T>(callback: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=IDatabaseConnection.d.ts.map