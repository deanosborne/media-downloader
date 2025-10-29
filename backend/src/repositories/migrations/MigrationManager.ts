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

export class MigrationManager {
  private db: IDatabaseConnection;
  private migrations: Migration[] = [];

  constructor(db: IDatabaseConnection) {
    this.db = db;
  }

  /**
   * Register a migration
   */
  addMigration(migration: Migration): void {
    this.migrations.push(migration);
    // Sort migrations by version
    this.migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Initialize the migrations table
   */
  private async initializeMigrationsTable(): Promise<void> {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get the current database version
   */
  private async getCurrentVersion(): Promise<number> {
    await this.initializeMigrationsTable();
    
    const result = await this.db.get<{ version: number }>(
      'SELECT MAX(version) as version FROM migrations'
    );
    
    return result?.version || 0;
  }

  /**
   * Record a migration as applied
   */
  private async recordMigration(migration: Migration): Promise<void> {
    await this.db.run(
      'INSERT INTO migrations (version, name) VALUES (?, ?)',
      [migration.version, migration.name]
    );
  }

  /**
   * Remove a migration record
   */
  private async removeMigrationRecord(version: number): Promise<void> {
    await this.db.run('DELETE FROM migrations WHERE version = ?', [version]);
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`);
      
      try {
        await this.db.transaction(async () => {
          await migration.up(this.db);
          await this.recordMigration(migration);
        });
        
        console.log(`✓ Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`✗ Migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    
    if (currentVersion === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const migration = this.migrations.find(m => m.version === currentVersion);
    if (!migration) {
      throw new Error(`Migration ${currentVersion} not found`);
    }

    console.log(`Rolling back migration ${migration.version}: ${migration.name}`);

    try {
      await this.db.transaction(async () => {
        await migration.down(this.db);
        await this.removeMigrationRecord(migration.version);
      });
      
      console.log(`✓ Migration ${migration.version} rolled back successfully`);
    } catch (error) {
      console.error(`✗ Rollback of migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{ current: number; pending: number; total: number }> {
    const currentVersion = await this.getCurrentVersion();
    const totalMigrations = this.migrations.length;
    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion).length;

    return {
      current: currentVersion,
      pending: pendingMigrations,
      total: totalMigrations
    };
  }
}