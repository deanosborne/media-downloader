/**
 * Initial database schema migration
 */

import { Migration } from './MigrationManager.js';

export const initialSchemaMigration: Migration = {
  version: 1,
  name: 'initial_schema',
  
  async up(db) {
    // Create queue table
    await db.run(`
      CREATE TABLE IF NOT EXISTS queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        year INTEGER,
        tmdb_id INTEGER,
        season INTEGER,
        episode INTEGER,
        episode_name TEXT,
        is_season_pack INTEGER DEFAULT 0,
        status TEXT DEFAULT 'not_started',
        torrent_name TEXT,
        torrent_link TEXT,
        torrent_id TEXT,
        real_debrid_id TEXT,
        progress INTEGER DEFAULT 0,
        error TEXT,
        file_path TEXT,
        download_speed TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create config table
    await db.run(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_queue_created_at ON queue(created_at)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_queue_type ON queue(type)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_queue_tmdb_id ON queue(tmdb_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_queue_season_episode ON queue(tmdb_id, season, episode)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_queue_real_debrid_id ON queue(real_debrid_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_config_key ON config(key)');
  },

  async down(db) {
    // Drop indexes
    await db.run('DROP INDEX IF EXISTS idx_queue_status');
    await db.run('DROP INDEX IF EXISTS idx_queue_created_at');
    await db.run('DROP INDEX IF EXISTS idx_queue_type');
    await db.run('DROP INDEX IF EXISTS idx_queue_tmdb_id');
    await db.run('DROP INDEX IF EXISTS idx_queue_season_episode');
    await db.run('DROP INDEX IF EXISTS idx_queue_real_debrid_id');
    await db.run('DROP INDEX IF EXISTS idx_config_key');

    // Drop tables
    await db.run('DROP TABLE IF EXISTS queue');
    await db.run('DROP TABLE IF EXISTS config');
  }
};