/**
 * Database connection pool management
 */

import sqlite3 from 'sqlite3';
import { DatabaseConnection } from './DatabaseConnection.js';
import { IDatabaseConnection } from './interfaces/IDatabaseConnection.js';

export interface ConnectionPoolOptions {
  filename: string;
  maxConnections?: number;
  acquireTimeoutMs?: number;
  idleTimeoutMs?: number;
}

export class ConnectionPool {
  private connections: DatabaseConnection[] = [];
  private availableConnections: DatabaseConnection[] = [];
  private pendingAcquires: Array<{
    resolve: (connection: DatabaseConnection) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private options: Required<ConnectionPoolOptions>;
  private isShuttingDown = false;

  constructor(options: ConnectionPoolOptions) {
    this.options = {
      maxConnections: 10,
      acquireTimeoutMs: 30000,
      idleTimeoutMs: 300000, // 5 minutes
      ...options
    };
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    // Create initial connection to verify database accessibility
    const testDb = new sqlite3.Database(this.options.filename);
    await new Promise<void>((resolve, reject) => {
      testDb.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Start idle connection cleanup
    this.startIdleCleanup();
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<DatabaseConnection> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    // Return available connection if exists
    if (this.availableConnections.length > 0) {
      return this.availableConnections.pop()!;
    }

    // Create new connection if under limit
    if (this.connections.length < this.options.maxConnections) {
      const connection = await this.createConnection();
      this.connections.push(connection);
      return connection;
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pendingAcquires.findIndex(p => p.resolve === resolve);
        if (index >= 0) {
          this.pendingAcquires.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.options.acquireTimeoutMs);

      this.pendingAcquires.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: Date.now()
      });
    });
  }

  /**
   * Release a connection back to the pool
   */
  release(connection: DatabaseConnection): void {
    if (this.isShuttingDown) {
      this.destroyConnection(connection);
      return;
    }

    // Serve pending acquire if any
    if (this.pendingAcquires.length > 0) {
      const pending = this.pendingAcquires.shift()!;
      pending.resolve(connection);
      return;
    }

    // Return to available pool
    this.availableConnections.push(connection);
  }

  /**
   * Execute a callback with a connection from the pool
   */
  async withConnection<T>(callback: (connection: IDatabaseConnection) => Promise<T>): Promise<T> {
    const connection = await this.acquire();
    try {
      return await callback(connection);
    } finally {
      this.release(connection);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    available: number;
    pending: number;
  } {
    return {
      total: this.connections.length,
      available: this.availableConnections.length,
      pending: this.pendingAcquires.length
    };
  }

  /**
   * Shutdown the connection pool
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Reject all pending acquires
    this.pendingAcquires.forEach(pending => {
      pending.reject(new Error('Connection pool is shutting down'));
    });
    this.pendingAcquires.length = 0;

    // Close all connections
    const closePromises = this.connections.map(connection => 
      this.destroyConnection(connection)
    );
    
    await Promise.all(closePromises);
    this.connections.length = 0;
    this.availableConnections.length = 0;
  }

  /**
   * Create a new database connection
   */
  private async createConnection(): Promise<DatabaseConnection> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.options.filename, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(new DatabaseConnection(db));
        }
      });
    });
  }

  /**
   * Destroy a database connection
   */
  private async destroyConnection(connection: DatabaseConnection): Promise<void> {
    // Remove from connections array
    const index = this.connections.indexOf(connection);
    if (index >= 0) {
      this.connections.splice(index, 1);
    }

    // Remove from available connections
    const availableIndex = this.availableConnections.indexOf(connection);
    if (availableIndex >= 0) {
      this.availableConnections.splice(availableIndex, 1);
    }

    // Close the underlying database connection
    // Note: We'd need to expose the close method on DatabaseConnection
    // For now, this is a placeholder
  }

  /**
   * Start periodic cleanup of idle connections
   */
  private startIdleCleanup(): void {
    setInterval(() => {
      if (this.isShuttingDown) return;

      // Clean up timed-out pending acquires
      const now = Date.now();
      this.pendingAcquires = this.pendingAcquires.filter(pending => {
        if (now - pending.timestamp > this.options.acquireTimeoutMs) {
          pending.reject(new Error('Connection acquire timeout'));
          return false;
        }
        return true;
      });

      // TODO: Implement idle connection cleanup
      // This would require tracking last used time for connections
    }, 60000); // Check every minute
  }
}