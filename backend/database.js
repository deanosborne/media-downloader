import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new sqlite3.Database(join(__dirname, "media_queue.db"));

// Initialize database
db.serialize(() => {
  db.run(`
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  db.run(
    `
    ALTER TABLE queue ADD COLUMN download_speed TEXT
  `,
    (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.error("Error adding speed column:", err.message);
      }
    }
  );
});

// Basic database operations
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Configuration helper functions
export const getConfig = async (key) => {
  const row = await dbGet("SELECT value FROM config WHERE key = ?", [key]);
  return row ? row.value : null;
};

export const setConfig = async (key, value) => {
  try {
    await dbRun("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", [
      key,
      value,
    ]);
    console.log(`Config saved: ${key} = ${value.substring(0, 20)}...`);
  } catch (error) {
    console.error(`Failed to save config ${key}:`, error.message);
    throw error;
  }
};

export const getAllConfig = async () => {
  try {
    const rows = await dbAll("SELECT key, value FROM config");
    const config = {};
    rows.forEach((row) => {
      config[row.key] = row.value;
    });
    return config;
  } catch (error) {
    console.error("Failed to get all config:", error.message);
    return {};
  }
};

export const isConfigured = async () => {
  const tmdbKey = await getConfig("TMDB_API_KEY");
  return !!tmdbKey; // Return true if at least TMDB key exists
};

export default db;
