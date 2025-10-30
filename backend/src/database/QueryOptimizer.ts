/**
 * Query optimizer and performance monitoring for database operations
 */

import { IDatabaseConnection } from '../repositories/interfaces/IDatabaseConnection.js';

export interface QueryStats {
  sql: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
  params?: any[];
}

export interface QueryPlan {
  id: number;
  parent: number;
  notused: number;
  detail: string;
}

export interface OptimizationSuggestion {
  type: 'index' | 'query_rewrite' | 'schema_change';
  description: string;
  sql?: string;
  impact: 'low' | 'medium' | 'high';
}

export class QueryOptimizer {
  private db: IDatabaseConnection;
  private queryStats: QueryStats[] = [];
  private maxStatsHistory = 1000;
  private slowQueryThreshold = 100; // milliseconds

  constructor(db: IDatabaseConnection) {
    this.db = db;
  }

  /**
   * Execute a query with performance monitoring
   */
  async executeWithStats<T>(
    operation: () => Promise<T>,
    sql: string,
    params?: any[]
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const executionTime = performance.now() - startTime;
      
      // Record stats
      this.recordQueryStats({
        sql,
        executionTime,
        rowsAffected: this.getRowsAffected(result),
        timestamp: new Date(),
        params,
      });

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        console.warn(`Slow query detected (${executionTime.toFixed(2)}ms):`, sql);
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      // Record failed query stats
      this.recordQueryStats({
        sql,
        executionTime,
        rowsAffected: 0,
        timestamp: new Date(),
        params,
      });

      throw error;
    }
  }

  /**
   * Get query execution plan
   */
  async getQueryPlan(sql: string, params?: any[]): Promise<QueryPlan[]> {
    const explainSql = `EXPLAIN QUERY PLAN ${sql}`;
    const plan = await this.db.all<QueryPlan>(explainSql, params);
    return plan;
  }

  /**
   * Analyze query and provide optimization suggestions
   */
  async analyzeQuery(sql: string, params?: any[]): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    const plan = await this.getQueryPlan(sql, params);

    // Check for table scans
    const hasTableScan = plan.some(step => 
      step.detail.includes('SCAN TABLE') && !step.detail.includes('USING INDEX')
    );

    if (hasTableScan) {
      suggestions.push({
        type: 'index',
        description: 'Query performs table scan. Consider adding appropriate indexes.',
        impact: 'high',
      });
    }

    // Check for missing indexes on WHERE clauses
    const whereMatch = sql.match(/WHERE\s+(\w+)\s*[=<>]/i);
    if (whereMatch && hasTableScan) {
      const column = whereMatch[1];
      suggestions.push({
        type: 'index',
        description: `Consider adding index on column '${column}'`,
        sql: `CREATE INDEX IF NOT EXISTS idx_${column} ON table_name(${column})`,
        impact: 'high',
      });
    }

    // Check for ORDER BY without index
    const orderByMatch = sql.match(/ORDER BY\s+(\w+)/i);
    if (orderByMatch) {
      const column = orderByMatch[1];
      const hasOrderIndex = plan.some(step => 
        step.detail.includes('USING INDEX') && step.detail.includes(column)
      );

      if (!hasOrderIndex) {
        suggestions.push({
          type: 'index',
          description: `Consider adding index for ORDER BY on column '${column}'`,
          sql: `CREATE INDEX IF NOT EXISTS idx_${column}_order ON table_name(${column})`,
          impact: 'medium',
        });
      }
    }

    // Check for SELECT *
    if (sql.includes('SELECT *')) {
      suggestions.push({
        type: 'query_rewrite',
        description: 'Avoid SELECT *. Specify only needed columns for better performance.',
        impact: 'low',
      });
    }

    // Check for N+1 query patterns
    const stats = this.getRecentStats(100);
    const similarQueries = stats.filter(stat => 
      this.isSimilarQuery(stat.sql, sql)
    );

    if (similarQueries.length > 10) {
      suggestions.push({
        type: 'query_rewrite',
        description: 'Potential N+1 query pattern detected. Consider using JOINs or batch operations.',
        impact: 'high',
      });
    }

    return suggestions;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: number;
    topSlowQueries: QueryStats[];
    mostFrequentQueries: Array<{ sql: string; count: number; avgTime: number }>;
  } {
    const totalQueries = this.queryStats.length;
    const averageExecutionTime = totalQueries > 0 
      ? this.queryStats.reduce((sum, stat) => sum + stat.executionTime, 0) / totalQueries 
      : 0;

    const slowQueries = this.queryStats.filter(
      stat => stat.executionTime > this.slowQueryThreshold
    ).length;

    const topSlowQueries = [...this.queryStats]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    // Group by SQL and calculate frequency
    const queryGroups = new Map<string, { count: number; totalTime: number }>();
    
    for (const stat of this.queryStats) {
      const normalized = this.normalizeQuery(stat.sql);
      const existing = queryGroups.get(normalized) || { count: 0, totalTime: 0 };
      queryGroups.set(normalized, {
        count: existing.count + 1,
        totalTime: existing.totalTime + stat.executionTime,
      });
    }

    const mostFrequentQueries = Array.from(queryGroups.entries())
      .map(([sql, stats]) => ({
        sql,
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalQueries,
      averageExecutionTime,
      slowQueries,
      topSlowQueries,
      mostFrequentQueries,
    };
  }

  /**
   * Optimize database settings
   */
  async optimizeDatabase(): Promise<void> {
    // Enable WAL mode for better concurrency
    await this.db.run('PRAGMA journal_mode=WAL');
    
    // Optimize synchronous mode
    await this.db.run('PRAGMA synchronous=NORMAL');
    
    // Increase cache size
    await this.db.run('PRAGMA cache_size=10000');
    
    // Use memory for temporary storage
    await this.db.run('PRAGMA temp_store=MEMORY');
    
    // Enable memory mapping
    await this.db.run('PRAGMA mmap_size=268435456'); // 256MB
    
    // Optimize page size (only effective on new databases)
    await this.db.run('PRAGMA page_size=4096');
    
    // Enable automatic index creation
    await this.db.run('PRAGMA automatic_index=ON');
  }

  /**
   * Suggest missing indexes based on query patterns
   */
  async suggestIndexes(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    const recentStats = this.getRecentStats(500);

    // Analyze WHERE clauses
    const whereColumns = new Map<string, number>();
    const orderByColumns = new Map<string, number>();

    for (const stat of recentStats) {
      // Extract WHERE columns
      const whereMatches = stat.sql.match(/WHERE\s+(\w+)\s*[=<>]/gi);
      if (whereMatches) {
        for (const match of whereMatches) {
          const column = match.replace(/WHERE\s+(\w+)\s*[=<>]/i, '$1');
          whereColumns.set(column, (whereColumns.get(column) || 0) + 1);
        }
      }

      // Extract ORDER BY columns
      const orderMatches = stat.sql.match(/ORDER BY\s+(\w+)/gi);
      if (orderMatches) {
        for (const match of orderMatches) {
          const column = match.replace(/ORDER BY\s+(\w+)/i, '$1');
          orderByColumns.set(column, (orderByColumns.get(column) || 0) + 1);
        }
      }
    }

    // Suggest indexes for frequently used WHERE columns
    for (const [column, count] of whereColumns.entries()) {
      if (count >= 5) { // Used in at least 5 queries
        suggestions.push({
          type: 'index',
          description: `Frequently used in WHERE clauses (${count} times)`,
          sql: `CREATE INDEX IF NOT EXISTS idx_${column} ON queue(${column})`,
          impact: count > 20 ? 'high' : 'medium',
        });
      }
    }

    // Suggest indexes for frequently used ORDER BY columns
    for (const [column, count] of orderByColumns.entries()) {
      if (count >= 3) { // Used in at least 3 queries
        suggestions.push({
          type: 'index',
          description: `Frequently used in ORDER BY clauses (${count} times)`,
          sql: `CREATE INDEX IF NOT EXISTS idx_${column}_order ON queue(${column})`,
          impact: count > 10 ? 'high' : 'medium',
        });
      }
    }

    return suggestions;
  }

  /**
   * Clear performance statistics
   */
  clearStats(): void {
    this.queryStats = [];
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(milliseconds: number): void {
    this.slowQueryThreshold = milliseconds;
  }

  private recordQueryStats(stats: QueryStats): void {
    this.queryStats.push(stats);
    
    // Limit history size
    if (this.queryStats.length > this.maxStatsHistory) {
      this.queryStats.shift();
    }
  }

  private getRowsAffected(result: any): number {
    if (typeof result === 'object' && result !== null) {
      if ('changes' in result) return result.changes;
      if (Array.isArray(result)) return result.length;
    }
    return 0;
  }

  private getRecentStats(limit: number): QueryStats[] {
    return this.queryStats.slice(-limit);
  }

  private normalizeQuery(sql: string): string {
    // Remove parameters and normalize whitespace for grouping
    return sql
      .replace(/\?/g, '?')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private isSimilarQuery(sql1: string, sql2: string): boolean {
    const normalized1 = this.normalizeQuery(sql1);
    const normalized2 = this.normalizeQuery(sql2);
    return normalized1 === normalized2;
  }
}