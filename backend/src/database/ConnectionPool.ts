/**
 * SQLite connection pool for better performance
 * While SQLite doesn't support true connection pooling like other databases,
 * this provides connection management and prepared statement caching
 */

import sqlite3, { Database, Statement } from 'sqlite3';
import { IDatabaseConnection, DatabaseResult } from '../repositories/interfaces/IDatabaseConnection.js';

interface PooledConnection {
  db: Database;
  inUse: boolean;
  lastUsed: Date;
  preparedStatements: Map<string, Statement>;
}

interface ConnectionPoolOptions {
  maxConnections: number;
  idleTimeout: number; // milliseconds
  maxPreparedStatements: number;
}

export class ConnectionPool {
  private connections: PooledConnection[] = [];
  private options: ConnectionPoolOptions;
  private dbPath: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(dbPath: string, options: Partial<ConnectionPoolOptions> = {}) {
    this.dbPath = dbPath;
    this.options = {
      maxConnections: options.maxConnections || 5,
      idleTimeout: options.idleTimeout || 30000, // 30 seconds
      maxPreparedStatements: options.maxPreparedStatements || 50,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(): Promise<PooledDatabaseConnection> {
    // Try to find an available connection
    let connection = this.connections.find(conn => !conn.inUse);

    if (!connection) {
      // Create new connection if under limit
      if (this.connections.length < this.options.maxConnections) {
        connection = await this.createConnection();
        this.connections.push(connection);
      } else {
        // Wait for a connection to become available
        connection = await this.waitForConnection();
      }
    }

    connection.inUse = true;
    connection.lastUsed = new Date();

    return new PooledDatabaseConnection(connection, this);
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(connection: PooledConnection): void {
    connection.inUse = false;
    connection.lastUsed = new Date();
  }

  /**
   * Close all connections in the pool
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const closePromises = this.connections.map(conn => this.closeConnection(conn));
    await Promise.all(closePromises);
    this.connections = [];
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    totalPreparedStatements: number;
  } {
    const activeConnections = this.connections.filter(conn => conn.inUse).length;
    const totalPreparedStatements = this.connections.reduce(
      (total, conn) => total + conn.preparedStatements.size,
      0
    );

    return {
      totalConnections: this.connections.length,
      activeConnections,
      idleConnections: this.connections.length - activeConnections,
      totalPreparedStatements,
    };
  }

  private async createConnection(): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          // Enable WAL mode for better concurrency
          db.run('PRAGMA journal_mode=WAL', (walErr) => {
            if (walErr) {
              console.warn('Failed to enable WAL mode:', walErr);
            }
          });

          // Optimize SQLite settings
          db.run('PRAGMA synchronous=NORMAL');
          db.run('PRAGMA cache_size=10000');
          db.run('PRAGMA temp_store=MEMORY');
          db.run('PRAGMA mmap_size=268435456'); // 256MB

          resolve({
            db,
            inUse: false,
            lastUsed: new Date(),
            preparedStatements: new Map(),
          });
        }
      });
    });
  }

  private async waitForConnection(): Promise<PooledConnection> {
    return new Promise((resolve) => {
      const checkForConnection = () => {
        const connection = this.connections.find(conn => !conn.inUse);
        if (connection) {
          resolve(connection);
        } else {
          setTimeout(checkForConnection, 10);
        }
      };
      checkForConnection();
    });
  }

  private async closeConnection(connection: PooledConnection): Promise<void> {
    // Close all prepared statements
    for (const [, stmt] of connection.preparedStatements) {
      stmt.finalize();
    }
    connection.preparedStatements.clear();

    // Close database connection
    return new Promise((resolve) => {
      connection.db.close(() => {
        resolve();
      });
    });
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.options.idleTimeout / 2);
  }

  private cleanupIdleConnections(): void {
    const now = new Date();
    const connectionsToClose: PooledConnection[] = [];

    for (const connection of this.connections) {
      if (
        !connection.inUse &&
        now.getTime() - connection.lastUsed.getTime() > this.options.idleTimeout
      ) {
        connectionsToClose.push(connection);
      }
    }

    // Keep at least one connection
    if (connectionsToClose.length >= this.connections.length) {
      connectionsToClose.pop();
    }

    for (const connection of connectionsToClose) {
      const index = this.connections.indexOf(connection);
      if (index > -1) {
        this.connections.splice(index, 1);
        this.closeConnection(connection);
      }
    }
  }
}

/**
 * Pooled database connection wrapper
 */
class PooledDatabaseConnection implements IDatabaseConnection {
  private connection: PooledConnection;
  private pool: ConnectionPool;
  private inTransaction = false;

  constructor(connection: PooledConnection, pool: ConnectionPool) {
    this.connection = connection;
    this.pool = pool;
  }

  async run(sql: string, params: any[] = []): Promise<DatabaseResult> {
    return new Promise((resolve, reject) => {
      this.connection.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.connection.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.connection.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Transaction already in progress');
    }
    await this.run('BEGIN TRANSACTION');
    this.inTransaction = true;
  }

  async commit(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress');
    }
    await this.run('COMMIT');
    this.inTransaction = false;
  }

  async rollback(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress');
    }
    await this.run('ROLLBACK');
    this.inTransaction = false;
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.beginTransaction();
    try {
      const result = await callback();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Get or create a prepared statement
   */
  async prepare(sql: string): Promise<Statement> {
    let stmt = this.connection.preparedStatements.get(sql);
    
    if (!stmt) {
      stmt = this.connection.db.prepare(sql);
      
      // Limit the number of prepared statements
      if (this.connection.preparedStatements.size >= 50) {
        // Remove oldest prepared statement
        const firstKey = this.connection.preparedStatements.keys().next().value;
        const oldStmt = this.connection.preparedStatements.get(firstKey);
        if (oldStmt) {
          oldStmt.finalize();
          this.connection.preparedStatements.delete(firstKey);
        }
      }
      
      this.connection.preparedStatements.set(sql, stmt);
    }
    
    return stmt;
  }

  /**
   * Execute a prepared statement
   */
  async runPrepared(sql: string, params: any[] = []): Promise<DatabaseResult> {
    const stmt = await this.prepare(sql);
    
    return new Promise((resolve, reject) => {
      stmt.run(params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Release the connection back to the pool
   */
  release(): void {
    if (!this.inTransaction) {
      this.pool.releaseConnection(this.connection);
    }
  }
}

export { PooledDatabaseConnection };