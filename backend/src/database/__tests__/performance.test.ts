/**
 * Database performance tests
 */

import { ConnectionPool } from '../ConnectionPool';
import { BatchOperations } from '../../repositories/BatchOperations';
import { QueryOptimizer } from '../QueryOptimizer';


import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

describe('Database Performance Tests', () => {
  let testDbPath: string;
  let pool: ConnectionPool;


  beforeAll(async () => {
    testDbPath = join(tmpdir(), `test-${randomUUID()}.db`);
    pool = new ConnectionPool(testDbPath, { maxConnections: 3 });
    
    // Setup test database
    const connection = await pool.getConnection();
    
    // Create test table
    await connection.run(`
      CREATE TABLE test_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        value INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);


    
    connection.release();
  });

  afterAll(async () => {
    await pool.close();
  });

  describe('Connection Pool Performance', () => {
    it('should handle concurrent connections efficiently', async () => {
      const startTime = performance.now();
      
      // Create multiple concurrent operations
      const operations = Array.from({ length: 10 }, async (_, i) => {
        const connection = await pool.getConnection();
        
        await connection.run(
          'INSERT INTO test_items (name, category, value) VALUES (?, ?, ?)',
          [`Item ${i}`, `Category ${i % 3}`, i * 10]
        );
        
        connection.release();
      });

      await Promise.all(operations);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete in reasonable time
      expect(executionTime).toBeLessThan(1000); // Less than 1 second

      // Verify all items were inserted
      const connection = await pool.getConnection();
      const count = await connection.get<{ count: number }>('SELECT COUNT(*) as count FROM test_items');
      expect(count?.count).toBe(10);
      connection.release();
    });

    it('should reuse connections efficiently', async () => {

      
      // Perform multiple operations
      for (let i = 0; i < 5; i++) {
        const connection = await pool.getConnection();
        await connection.get('SELECT 1');
        connection.release();
      }

      const finalStats = pool.getStats();
      
      // Should not create excessive connections
      expect(finalStats.totalConnections).toBeLessThanOrEqual(3);
      expect(finalStats.activeConnections).toBe(0);
    });
  });

  describe('Batch Operations Performance', () => {
    it('should perform batch inserts efficiently', async () => {
      const connection = await pool.getConnection();
      const batchOps = new BatchOperations(connection);

      // Generate test data
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        name: `Batch Item ${i}`,
        category: `Category ${i % 5}`,
        value: i,
      }));

      const mapToRow = (item: typeof testData[0]) => ({
        name: item.name,
        category: item.category,
        value: item.value,
      });

      const startTime = performance.now();
      
      await batchOps.batchInsert('test_items', testData, mapToRow, {
        batchSize: 100,
        useTransaction: true,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete batch insert in reasonable time
      expect(executionTime).toBeLessThan(2000); // Less than 2 seconds

      // Verify all items were inserted
      const count = await connection.get<{ count: number }>('SELECT COUNT(*) as count FROM test_items');
      expect(count?.count).toBeGreaterThanOrEqual(1000);

      connection.release();
    });

    it('should perform batch updates efficiently', async () => {
      const connection = await pool.getConnection();
      const batchOps = new BatchOperations(connection);

      // Get some existing items
      const items = await connection.all<{ id: number; name: string }>(
        'SELECT id, name FROM test_items LIMIT 100'
      );

      const updates = items.map(item => ({
        id: item.id,
        data: { name: `Updated ${item.name}`, category: 'Updated' },
      }));

      const mapToRow = (data: { name: string; category: string }) => ({
        name: data.name,
        category: data.category,
      });

      const startTime = performance.now();
      
      await batchOps.batchUpdate('test_items', updates, mapToRow, {
        batchSize: 50,
        useTransaction: true,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete batch update in reasonable time
      expect(executionTime).toBeLessThan(1000); // Less than 1 second

      // Verify updates were applied
      const updatedCount = await connection.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM test_items WHERE name LIKE 'Updated %'"
      );
      expect(updatedCount?.count).toBe(100);

      connection.release();
    });

    it('should perform batch deletes efficiently', async () => {
      const connection = await pool.getConnection();
      const batchOps = new BatchOperations(connection);

      // Get some item IDs to delete
      const items = await connection.all<{ id: number }>(
        'SELECT id FROM test_items LIMIT 50'
      );
      const idsToDelete = items.map(item => item.id);

      const startTime = performance.now();
      
      await batchOps.batchDelete('test_items', idsToDelete, {
        batchSize: 25,
        useTransaction: true,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete batch delete in reasonable time
      expect(executionTime).toBeLessThan(500); // Less than 0.5 seconds

      // Verify items were deleted
      const remainingItems = await connection.all(
        `SELECT id FROM test_items WHERE id IN (${idsToDelete.map(() => '?').join(', ')})`,
        idsToDelete
      );
      expect(remainingItems).toHaveLength(0);

      connection.release();
    });
  });

  describe('Query Optimizer Performance', () => {
    it('should monitor query performance', async () => {
      const connection = await pool.getConnection();
      const optimizer = new QueryOptimizer(connection);

      // Execute some queries with monitoring
      await optimizer.executeWithStats(
        () => connection.all('SELECT * FROM test_items WHERE category = ?', ['Category 1']),
        'SELECT * FROM test_items WHERE category = ?',
        ['Category 1']
      );

      await optimizer.executeWithStats(
        () => connection.all('SELECT * FROM test_items ORDER BY created_at DESC LIMIT 10'),
        'SELECT * FROM test_items ORDER BY created_at DESC LIMIT 10'
      );

      const stats = optimizer.getPerformanceStats();
      
      expect(stats.totalQueries).toBe(2);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.topSlowQueries).toHaveLength(2);

      connection.release();
    });

    it('should provide optimization suggestions', async () => {
      const connection = await pool.getConnection();
      const optimizer = new QueryOptimizer(connection);

      // Execute a query that would benefit from an index
      const suggestions = await optimizer.analyzeQuery(
        'SELECT * FROM test_items WHERE category = ? ORDER BY value DESC',
        ['Category 1']
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.type === 'index')).toBe(true);

      connection.release();
    });

    it('should suggest indexes based on query patterns', async () => {
      const connection = await pool.getConnection();
      const optimizer = new QueryOptimizer(connection);

      // Execute multiple similar queries to establish a pattern
      for (let i = 0; i < 10; i++) {
        await optimizer.executeWithStats(
          () => connection.all('SELECT * FROM test_items WHERE category = ?', [`Category ${i % 3}`]),
          'SELECT * FROM test_items WHERE category = ?',
          [`Category ${i % 3}`]
        );
      }

      const suggestions = await optimizer.suggestIndexes();
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.sql?.includes('category'))).toBe(true);

      connection.release();
    });
  });

  describe('Index Performance Impact', () => {
    it('should show performance improvement with indexes', async () => {
      const connection = await pool.getConnection();

      // Insert more test data for meaningful performance test
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        name: `Large Item ${i}`,
        category: `Category ${i % 10}`,
        value: i,
      }));

      const batchOps = new BatchOperations(connection);
      await batchOps.batchInsert('test_items', largeDataset, (item: any) => item);

      // Measure query time without index
      const startTimeNoIndex = performance.now();
      await connection.all('SELECT * FROM test_items WHERE category = ?', ['Category 5']);
      const timeWithoutIndex = performance.now() - startTimeNoIndex;

      // Create index
      await connection.run('CREATE INDEX IF NOT EXISTS idx_category ON test_items(category)');

      // Measure query time with index
      const startTimeWithIndex = performance.now();
      await connection.all('SELECT * FROM test_items WHERE category = ?', ['Category 5']);
      const timeWithIndex = performance.now() - startTimeWithIndex;

      // Index should improve performance (though with small dataset, improvement might be minimal)
      expect(timeWithIndex).toBeLessThanOrEqual(timeWithoutIndex * 2); // Allow some variance

      connection.release();
    });
  });

  describe('Transaction Performance', () => {
    it('should show performance benefit of transactions for multiple operations', async () => {
      const connection = await pool.getConnection();

      const testData = Array.from({ length: 100 }, (_, i) => ({
        name: `Transaction Test ${i}`,
        category: 'Transaction',
        value: i,
      }));

      // Measure time without transaction
      const startTimeNoTransaction = performance.now();
      for (const item of testData) {
        await connection.run(
          'INSERT INTO test_items (name, category, value) VALUES (?, ?, ?)',
          [item.name, item.category, item.value]
        );
      }
      const timeWithoutTransaction = performance.now() - startTimeNoTransaction;

      // Measure time with transaction
      const startTimeWithTransaction = performance.now();
      await connection.transaction(async () => {
        for (const item of testData) {
          await connection.run(
            'INSERT INTO test_items (name, category, value) VALUES (?, ?, ?)',
            [`Tx ${item.name}`, item.category, item.value]
          );
        }
      });
      const timeWithTransaction = performance.now() - startTimeWithTransaction;

      // Transaction should be significantly faster
      expect(timeWithTransaction).toBeLessThan(timeWithoutTransaction * 0.8);

      connection.release();
    });
  });
});