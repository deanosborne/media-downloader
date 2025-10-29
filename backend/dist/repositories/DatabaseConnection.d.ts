/**
 * SQLite database connection implementation
 */
import { Database } from 'sqlite3';
import { IDatabaseConnection, DatabaseResult } from './interfaces/IDatabaseConnection.js';
export declare class DatabaseConnection implements IDatabaseConnection {
    private db;
    private inTransaction;
    constructor(database: Database);
    run(sql: string, params?: any[]): Promise<DatabaseResult>;
    get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
    all<T = any>(sql: string, params?: any[]): Promise<T[]>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    transaction<T>(callback: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=DatabaseConnection.d.ts.map