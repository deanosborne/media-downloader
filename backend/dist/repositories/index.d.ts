/**
 * Repository layer exports
 */
export { IRepository, QueryCriteria } from './interfaces/IRepository.js';
export { IDatabaseConnection, DatabaseResult } from './interfaces/IDatabaseConnection.js';
export { BaseRepository } from './BaseRepository.js';
export { DatabaseConnection } from './DatabaseConnection.js';
export { ConnectionPool, ConnectionPoolOptions } from './ConnectionPool.js';
export { QueueRepository } from './QueueRepository.js';
export { ConfigRepository } from './ConfigRepository.js';
export { MigrationManager, Migration } from './migrations/MigrationManager.js';
export { initialSchemaMigration } from './migrations/001_initial_schema.js';
//# sourceMappingURL=index.d.ts.map