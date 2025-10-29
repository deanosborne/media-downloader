/**
 * Base repository implementation with common database operations
 */

import { IRepository, QueryCriteria } from './interfaces/IRepository.js';
import { IDatabaseConnection } from './interfaces/IDatabaseConnection.js';

export abstract class BaseRepository<T> implements IRepository<T> {
  protected db: IDatabaseConnection;
  protected tableName: string;

  constructor(db: IDatabaseConnection, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

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
  protected getPrimaryKeyField(): string {
    return 'id';
  }

  /**
   * Build WHERE clause from criteria
   */
  protected buildWhereClause(criteria?: QueryCriteria): { sql: string; params: any[] } {
    if (!criteria?.where || Object.keys(criteria.where).length === 0) {
      return { sql: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    Object.entries(criteria.where).forEach(([key, value]) => {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        const placeholders = value.map(() => '?').join(', ');
        conditions.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    return {
      sql: `WHERE ${conditions.join(' AND ')}`,
      params
    };
  }

  /**
   * Build ORDER BY clause from criteria
   */
  protected buildOrderByClause(criteria?: QueryCriteria): string {
    if (!criteria?.orderBy) {
      return '';
    }
    return `ORDER BY ${criteria.orderBy}`;
  }

  /**
   * Build LIMIT clause from criteria
   */
  protected buildLimitClause(criteria?: QueryCriteria): { sql: string; params: any[] } {
    const params: any[] = [];
    let sql = '';

    if (criteria?.limit) {
      sql = 'LIMIT ?';
      params.push(criteria.limit);

      if (criteria.offset) {
        sql += ' OFFSET ?';
        params.push(criteria.offset);
      }
    }

    return { sql, params };
  }

  async findById(id: string | number): Promise<T | null> {
    const primaryKey = this.getPrimaryKeyField();
    const sql = `SELECT * FROM ${this.tableName} WHERE ${primaryKey} = ?`;
    const row = await this.db.get(sql, [id]);
    return row ? this.mapToEntity(row) : null;
  }

  async findAll(criteria?: QueryCriteria): Promise<T[]> {
    const whereClause = this.buildWhereClause(criteria);
    const orderByClause = this.buildOrderByClause(criteria);
    const limitClause = this.buildLimitClause(criteria);

    const sql = [
      `SELECT * FROM ${this.tableName}`,
      whereClause.sql,
      orderByClause,
      limitClause.sql
    ].filter(Boolean).join(' ');

    const params = [...whereClause.params, ...limitClause.params];
    const rows = await this.db.all(sql, params);
    return rows.map(row => this.mapToEntity(row));
  }

  async findOne(criteria: QueryCriteria): Promise<T | null> {
    const results = await this.findAll({ ...criteria, limit: 1 });
    return results.length > 0 ? results[0]! : null;
  }

  async create(entity: Partial<T>): Promise<T> {
    const row = this.mapToRow(entity);
    const fields = Object.keys(row);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(row);

    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await this.db.run(sql, values);

    const created = await this.findById(result.id);
    if (!created) {
      throw new Error('Failed to retrieve created entity');
    }
    return created;
  }

  async update(id: string | number, updates: Partial<T>): Promise<T> {
    const row = this.mapToRow(updates);
    const fields = Object.keys(row);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = Object.values(row);

    const primaryKey = this.getPrimaryKeyField();
    const sql = `UPDATE ${this.tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${primaryKey} = ?`;
    
    await this.db.run(sql, [...values, id]);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Entity not found after update');
    }
    return updated;
  }

  async delete(id: string | number): Promise<void> {
    const primaryKey = this.getPrimaryKeyField();
    const sql = `DELETE FROM ${this.tableName} WHERE ${primaryKey} = ?`;
    const result = await this.db.run(sql, [id]);
    
    if (result.changes === 0) {
      throw new Error('Entity not found');
    }
  }

  async count(criteria?: QueryCriteria): Promise<number> {
    const whereClause = this.buildWhereClause(criteria);
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause.sql}`;
    const result = await this.db.get<{ count: number }>(sql, whereClause.params);
    return result?.count || 0;
  }

  async exists(id: string | number): Promise<boolean> {
    const primaryKey = this.getPrimaryKeyField();
    const sql = `SELECT 1 FROM ${this.tableName} WHERE ${primaryKey} = ? LIMIT 1`;
    const result = await this.db.get(sql, [id]);
    return !!result;
  }
}