/**
 * Repository layer exports
 */

// Interfaces
export { IRepository, QueryCriteria } from './interfaces/IRepository.js';
export { IDatabaseConnection, DatabaseResult } from './interfaces/IDatabaseConnection.js';

// Base classes
export { BaseRepository } from './BaseRepository.js';
export { DatabaseConnection } from './DatabaseConnection.js';

// Connection management
export { ConnectionPool, ConnectionPoolOptions } from './ConnectionPool.js';

// Specific repositories
export { QueueRepository } from './QueueRepository.js';
export { ConfigRepository } from './ConfigRepository.js';

// Migration utilities
export { MigrationManager, Migration } from './migrations/MigrationManager.js';
export { initialSchemaMigration } from './migrations/001_initial_schema.js';