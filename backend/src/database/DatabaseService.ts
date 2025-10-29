/**
 * Database service with repository pattern integration
 */

import sqlite3, { Database } from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { 
  DatabaseConnection, 
  QueueRepository, 
  ConfigRepository,
  MigrationManager,
  initialSchemaMigration
} from '../repositories/index.js';
import { ConfigManager, createConfigManager } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseService {
  private db: Database | null = null;
  private connection: DatabaseConnection | null = null;
  private queueRepository: QueueRepository | null = null;
  private configRepository: ConfigRepository | null = null;
  private configManager: ConfigManager | null = null;
  private migrationManager: MigrationManager | null = null;

  /**
   * Initialize the database service
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return; // Already initialized
    }

    // Create database connection
    this.db = new sqlite3.Database(join(__dirname, '../../media_queue.db'));
    this.connection = new DatabaseConnection(this.db);

    // Setup migrations
    this.migrationManager = new MigrationManager(this.connection);
    this.migrationManager.addMigration(initialSchemaMigration);

    // Run migrations
    await this.migrationManager.migrate();

    // Initialize repositories
    this.queueRepository = new QueueRepository(this.connection);
    this.configRepository = new ConfigRepository(this.connection);

    // Create configuration manager
    this.configManager = await createConfigManager(this.db, true);
  }

  /**
   * Get the queue repository
   */
  getQueueRepository(): QueueRepository {
    if (!this.queueRepository) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return this.queueRepository;
  }

  /**
   * Get the config repository
   */
  getConfigRepository(): ConfigRepository {
    if (!this.configRepository) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return this.configRepository;
  }

  /**
   * Get the configuration manager
   */
  getConfigManager(): ConfigManager {
    if (!this.configManager) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return this.configManager;
  }

  /**
   * Get the database connection
   */
  getConnection(): DatabaseConnection {
    if (!this.connection) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return this.connection;
  }

  /**
   * Get the raw database instance (for backward compatibility)
   */
  getDatabase(): Database {
    if (!this.db) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get migration manager
   */
  getMigrationManager(): MigrationManager {
    if (!this.migrationManager) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return this.migrationManager;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        this.db!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      this.db = null;
      this.connection = null;
      this.queueRepository = null;
      this.configRepository = null;
      this.configManager = null;
      this.migrationManager = null;
    }
  }
}

// Singleton instance
let databaseService: DatabaseService | null = null;

/**
 * Get the singleton database service instance
 */
export function getDatabaseService(): DatabaseService {
  if (!databaseService) {
    databaseService = new DatabaseService();
  }
  return databaseService;
}

/**
 * Initialize the database service (convenience function)
 */
export async function initializeDatabaseService(): Promise<DatabaseService> {
  const service = getDatabaseService();
  await service.initialize();
  return service;
}