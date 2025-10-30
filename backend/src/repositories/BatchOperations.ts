/**
 * Batch operations for improved database performance
 */

import { IDatabaseConnection } from './interfaces/IDatabaseConnection.js';

export interface BatchInsertOptions {
  batchSize?: number;
  useTransaction?: boolean;
}

export interface BatchUpdateOptions {
  batchSize?: number;
  useTransaction?: boolean;
}

export class BatchOperations {
  private db: IDatabaseConnection;

  constructor(db: IDatabaseConnection) {
    this.db = db;
  }

  /**
   * Batch insert multiple records
   */
  async batchInsert<T>(
    tableName: string,
    records: T[],
    mapToRow: (record: T) => Record<string, any>,
    options: BatchInsertOptions = {}
  ): Promise<void> {
    if (records.length === 0) return;

    const { batchSize = 100, useTransaction = true } = options;
    
    // Get column names from first record
    const firstRow = mapToRow(records[0]);
    const columns = Object.keys(firstRow);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    const processBatch = async (batch: T[]) => {
      if (useTransaction) {
        await this.db.transaction(async () => {
          for (const record of batch) {
            const row = mapToRow(record);
            const values = columns.map(col => row[col]);
            await this.db.run(sql, values);
          }
        });
      } else {
        for (const record of batch) {
          const row = mapToRow(record);
          const values = columns.map(col => row[col]);
          await this.db.run(sql, values);
        }
      }
    };

    // Process records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await processBatch(batch);
    }
  }

  /**
   * Batch update multiple records
   */
  async batchUpdate<T>(
    tableName: string,
    records: Array<{ id: string | number; data: T }>,
    mapToRow: (record: T) => Record<string, any>,
    options: BatchUpdateOptions = {}
  ): Promise<void> {
    if (records.length === 0) return;

    const { batchSize = 100, useTransaction = true } = options;

    const processBatch = async (batch: Array<{ id: string | number; data: T }>) => {
      if (useTransaction) {
        await this.db.transaction(async () => {
          for (const { id, data } of batch) {
            const row = mapToRow(data);
            const columns = Object.keys(row);
            const setClause = columns.map(col => `${col} = ?`).join(', ');
            const sql = `UPDATE ${tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            const values = [...columns.map(col => row[col]), id];
            await this.db.run(sql, values);
          }
        });
      } else {
        for (const { id, data } of batch) {
          const row = mapToRow(data);
          const columns = Object.keys(row);
          const setClause = columns.map(col => `${col} = ?`).join(', ');
          const sql = `UPDATE ${tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
          const values = [...columns.map(col => row[col]), id];
          await this.db.run(sql, values);
        }
      }
    };

    // Process records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await processBatch(batch);
    }
  }

  /**
   * Batch delete multiple records
   */
  async batchDelete(
    tableName: string,
    ids: Array<string | number>,
    options: { batchSize?: number; useTransaction?: boolean } = {}
  ): Promise<void> {
    if (ids.length === 0) return;

    const { batchSize = 100, useTransaction = true } = options;

    const processBatch = async (batch: Array<string | number>) => {
      const placeholders = batch.map(() => '?').join(', ');
      const sql = `DELETE FROM ${tableName} WHERE id IN (${placeholders})`;

      if (useTransaction) {
        await this.db.transaction(async () => {
          await this.db.run(sql, batch);
        });
      } else {
        await this.db.run(sql, batch);
      }
    };

    // Process IDs in batches
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      await processBatch(batch);
    }
  }

  /**
   * Upsert (insert or update) multiple records
   */
  async batchUpsert<T>(
    tableName: string,
    records: T[],
    mapToRow: (record: T) => Record<string, any>,
    conflictColumns: string[],
    options: BatchInsertOptions = {}
  ): Promise<void> {
    if (records.length === 0) return;

    const { batchSize = 100, useTransaction = true } = options;
    
    // Get column names from first record
    const firstRow = mapToRow(records[0]);
    const columns = Object.keys(firstRow);
    const placeholders = columns.map(() => '?').join(', ');
    
    // Build upsert SQL
    const updateColumns = columns.filter(col => !conflictColumns.includes(col));
    const updateClause = updateColumns.map(col => `${col} = excluded.${col}`).join(', ');
    
    const sql = `
      INSERT INTO ${tableName} (${columns.join(', ')}) 
      VALUES (${placeholders})
      ON CONFLICT(${conflictColumns.join(', ')}) 
      DO UPDATE SET ${updateClause}, updated_at = CURRENT_TIMESTAMP
    `;

    const processBatch = async (batch: T[]) => {
      if (useTransaction) {
        await this.db.transaction(async () => {
          for (const record of batch) {
            const row = mapToRow(record);
            const values = columns.map(col => row[col]);
            await this.db.run(sql, values);
          }
        });
      } else {
        for (const record of batch) {
          const row = mapToRow(record);
          const values = columns.map(col => row[col]);
          await this.db.run(sql, values);
        }
      }
    };

    // Process records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await processBatch(batch);
    }
  }

  /**
   * Execute multiple SQL statements in a single transaction
   */
  async executeBatch(
    statements: Array<{ sql: string; params?: any[] }>,
    options: { batchSize?: number } = {}
  ): Promise<void> {
    if (statements.length === 0) return;

    const { batchSize = 100 } = options;

    const processBatch = async (batch: Array<{ sql: string; params?: any[] }>) => {
      await this.db.transaction(async () => {
        for (const { sql, params = [] } of batch) {
          await this.db.run(sql, params);
        }
      });
    };

    // Process statements in batches
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      await processBatch(batch);
    }
  }

  /**
   * Bulk copy data from one table to another
   */
  async bulkCopy(
    sourceTable: string,
    targetTable: string,
    columnMapping: Record<string, string> = {},
    whereClause?: string,
    params?: any[]
  ): Promise<number> {
    const sourceColumns = Object.keys(columnMapping).length > 0 
      ? Object.keys(columnMapping) 
      : ['*'];
    
    const targetColumns = Object.keys(columnMapping).length > 0 
      ? Object.values(columnMapping) 
      : [];

    const selectClause = sourceColumns.join(', ');
    const insertClause = targetColumns.length > 0 
      ? `(${targetColumns.join(', ')})` 
      : '';

    const sql = `
      INSERT INTO ${targetTable} ${insertClause}
      SELECT ${selectClause} FROM ${sourceTable}
      ${whereClause ? `WHERE ${whereClause}` : ''}
    `;

    const result = await this.db.run(sql, params || []);
    return result.changes || 0;
  }

  /**
   * Analyze table statistics for query optimization
   */
  async analyzeTable(tableName: string): Promise<void> {
    await this.db.run(`ANALYZE ${tableName}`);
  }

  /**
   * Vacuum database to reclaim space and optimize performance
   */
  async vacuum(): Promise<void> {
    await this.db.run('VACUUM');
  }

  /**
   * Get table statistics
   */
  async getTableStats(tableName: string): Promise<{
    rowCount: number;
    pageCount: number;
    pageSize: number;
    totalSize: number;
  }> {
    const countResult = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );

    const pageInfo = await this.db.get<{ page_count: number; page_size: number }>(
      `PRAGMA page_count; PRAGMA page_size;`
    );

    return {
      rowCount: countResult?.count || 0,
      pageCount: pageInfo?.page_count || 0,
      pageSize: pageInfo?.page_size || 0,
      totalSize: (pageInfo?.page_count || 0) * (pageInfo?.page_size || 0),
    };
  }
}