/**
 * Base repository implementation with common database operations
 */
import { IRepository, QueryCriteria } from './interfaces/IRepository.js';
import { IDatabaseConnection } from './interfaces/IDatabaseConnection.js';
export declare abstract class BaseRepository<T> implements IRepository<T> {
    protected db: IDatabaseConnection;
    protected tableName: string;
    constructor(db: IDatabaseConnection, tableName: string);
    /**
     * Map a database row to an entity
     */
    protected abstract mapToEntity(row: any): T;
    /**
     * Map an entity to a database row for insertion/update
     */
    protected abstract mapToRow(entity: Partial<T>): any;
    /**
     * Get the primary key field name (defaults to 'id')
     */
    protected getPrimaryKeyField(): string;
    /**
     * Build WHERE clause from criteria
     */
    protected buildWhereClause(criteria?: QueryCriteria): {
        sql: string;
        params: any[];
    };
    /**
     * Build ORDER BY clause from criteria
     */
    protected buildOrderByClause(criteria?: QueryCriteria): string;
    /**
     * Build LIMIT clause from criteria
     */
    protected buildLimitClause(criteria?: QueryCriteria): {
        sql: string;
        params: any[];
    };
    findById(id: string | number): Promise<T | null>;
    findAll(criteria?: QueryCriteria): Promise<T[]>;
    findOne(criteria: QueryCriteria): Promise<T | null>;
    create(entity: Partial<T>): Promise<T>;
    update(id: string | number, updates: Partial<T>): Promise<T>;
    delete(id: string | number): Promise<void>;
    count(criteria?: QueryCriteria): Promise<number>;
    exists(id: string | number): Promise<boolean>;
}
//# sourceMappingURL=BaseRepository.d.ts.map