import { IntegrationTestSetup, TestDataFactory } from './setup.js';
import { QueueRepository } from '../../repositories/QueueRepository.js';
import { ConfigRepository } from '../../repositories/ConfigRepository.js';
import { DatabaseConnection } from '../../repositories/DatabaseConnection.js';

describe('Database Integration Tests', () => {
  let setup: IntegrationTestSetup;
  let db: DatabaseConnection;
  let queueRepo: QueueRepository;
  let configRepo: ConfigRepository;

  beforeAll(async () => {
    setup = IntegrationTestSetup.getInstance();
    const context = await setup.setup();
    db = context.db;
    queueRepo = new QueueRepository(db);
    configRepo = new ConfigRepository(db);
  });

  afterAll(async () => {
    await setup.teardown();
  });

  beforeEach(async () => {
    await setup.resetDatabase();
  });

  describe('QueueRepository Integration', () => {
    it('should perform CRUD operations on queue items', async () => {
      const itemData = TestDataFactory.createQueueItem({
        name: 'Test Movie',
        type: 'movie',
        tmdbId: 12345
      });

      // Create
      const created = await queueRepo.create(itemData);
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Test Movie');
      expect(created.createdAt).toBeInstanceOf(Date);

      // Read
      const found = await queueRepo.findById(created.id);
      expect(found).toMatchObject({
        id: created.id,
        name: 'Test Movie',
        type: 'movie',
        tmdbId: 12345
      });

      // Update
      const updated = await queueRepo.update(created.id, {
        status: 'in_progress',
        progress: 50
      });
      expect(updated.status).toBe('in_progress');
      expect(updated.progress).toBe(50);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());

      // Delete
      await queueRepo.delete(created.id);
      const deleted = await queueRepo.findById(created.id);
      expect(deleted).toBeNull();
    });

    it('should find items by status', async () => {
      // Create items with different statuses
      await queueRepo.create(TestDataFactory.createQueueItem({ name: 'Movie 1', status: 'completed' }));
      await queueRepo.create(TestDataFactory.createQueueItem({ name: 'Movie 2', status: 'in_progress' }));
      await queueRepo.create(TestDataFactory.createQueueItem({ name: 'Movie 3', status: 'in_progress' }));

      const inProgressItems = await queueRepo.findByStatus('in_progress');
      expect(inProgressItems).toHaveLength(2);
      expect(inProgressItems.every(item => item.status === 'in_progress')).toBe(true);

      const completedItems = await queueRepo.findByStatus('completed');
      expect(completedItems).toHaveLength(1);
      expect(completedItems[0].name).toBe('Movie 1');
    });

    it('should update progress with speed', async () => {
      const item = await queueRepo.create(TestDataFactory.createQueueItem());
      
      await queueRepo.updateProgress(item.id, 75, '2.5 MB/s');
      
      const updated = await queueRepo.findById(item.id);
      expect(updated?.progress).toBe(75);
      expect(updated?.downloadSpeed).toBe('2.5 MB/s');
    });

    it('should handle concurrent updates correctly', async () => {
      const item = await queueRepo.create(TestDataFactory.createQueueItem());
      
      // Simulate concurrent updates
      const updates = [
        queueRepo.update(item.id, { progress: 25 }),
        queueRepo.update(item.id, { progress: 50 }),
        queueRepo.update(item.id, { progress: 75 })
      ];

      await Promise.all(updates);
      
      const final = await queueRepo.findById(item.id);
      expect(final?.progress).toBeGreaterThanOrEqual(25);
    });

    it('should support complex queries with pagination', async () => {
      // Create test data
      for (let i = 1; i <= 15; i++) {
        await queueRepo.create(TestDataFactory.createQueueItem({
          name: `Movie ${i}`,
          status: i % 3 === 0 ? 'completed' : 'not_started'
        }));
      }

      // Test pagination
      const page1 = await queueRepo.findAll({
        limit: 5,
        offset: 0,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      expect(page1).toHaveLength(5);

      const page2 = await queueRepo.findAll({
        limit: 5,
        offset: 5,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      expect(page2).toHaveLength(5);
      expect(page2[0].id).not.toBe(page1[0].id);

      // Test filtering with pagination
      const completedPage1 = await queueRepo.findAll({
        where: { status: 'completed' },
        limit: 3,
        offset: 0
      });
      expect(completedPage1.length).toBeLessThanOrEqual(3);
      expect(completedPage1.every(item => item.status === 'completed')).toBe(true);
    });
  });

  describe('ConfigRepository Integration', () => {
    it('should store and retrieve configuration values', async () => {
      // Set configuration
      await configRepo.set('test.key', 'test-value');
      
      // Get configuration
      const value = await configRepo.get('test.key');
      expect(value).toBe('test-value');
    });

    it('should handle different data types', async () => {
      // String
      await configRepo.set('string.key', 'string-value');
      expect(await configRepo.get('string.key')).toBe('string-value');

      // Number
      await configRepo.set('number.key', 42);
      expect(await configRepo.get('number.key')).toBe(42);

      // Boolean
      await configRepo.set('boolean.key', true);
      expect(await configRepo.get('boolean.key')).toBe(true);

      // Object
      const objectValue = { nested: { key: 'value' }, array: [1, 2, 3] };
      await configRepo.set('object.key', objectValue);
      expect(await configRepo.get('object.key')).toEqual(objectValue);
    });

    it('should return all configuration as flat object', async () => {
      await configRepo.set('app.name', 'Media Downloader');
      await configRepo.set('app.version', '1.0.0');
      await configRepo.set('tmdb.apiKey', 'secret-key');
      await configRepo.set('download.path', '/downloads');

      const allConfig = await configRepo.getAllConfig();
      expect(allConfig).toMatchObject({
        'app.name': 'Media Downloader',
        'app.version': '1.0.0',
        'tmdb.apiKey': 'secret-key',
        'download.path': '/downloads'
      });
    });

    it('should delete configuration values', async () => {
      await configRepo.set('temp.key', 'temp-value');
      expect(await configRepo.get('temp.key')).toBe('temp-value');

      await configRepo.delete('temp.key');
      expect(await configRepo.get('temp.key')).toBeUndefined();
    });

    it('should handle configuration updates', async () => {
      await configRepo.set('update.key', 'original-value');
      expect(await configRepo.get('update.key')).toBe('original-value');

      await configRepo.set('update.key', 'updated-value');
      expect(await configRepo.get('update.key')).toBe('updated-value');
    });
  });

  describe('Database Transactions', () => {
    it('should support transactions for atomic operations', async () => {
      const item1Data = TestDataFactory.createQueueItem({ name: 'Movie 1' });
      const item2Data = TestDataFactory.createQueueItem({ name: 'Movie 2' });

      await db.transaction(async () => {
        await queueRepo.create(item1Data);
        await queueRepo.create(item2Data);
      });

      const allItems = await queueRepo.findAll();
      expect(allItems).toHaveLength(2);
    });

    it('should rollback transactions on error', async () => {
      const item1Data = TestDataFactory.createQueueItem({ name: 'Movie 1' });
      
      try {
        await db.transaction(async () => {
          await queueRepo.create(item1Data);
          // Simulate an error
          throw new Error('Transaction error');
        });
      } catch (error) {
        expect(error.message).toBe('Transaction error');
      }

      // Verify rollback - no items should exist
      const allItems = await queueRepo.findAll();
      expect(allItems).toHaveLength(0);
    });

    it('should handle nested transactions', async () => {
      const item1Data = TestDataFactory.createQueueItem({ name: 'Movie 1' });
      const item2Data = TestDataFactory.createQueueItem({ name: 'Movie 2' });

      await db.transaction(async () => {
        await queueRepo.create(item1Data);
        
        await db.transaction(async () => {
          await queueRepo.create(item2Data);
        });
      });

      const allItems = await queueRepo.findAll();
      expect(allItems).toHaveLength(2);
    });
  });

  describe('Database Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();
      
      // Create 1000 queue items
      const items = Array.from({ length: 1000 }, (_, i) => 
        TestDataFactory.createQueueItem({ name: `Movie ${i + 1}` })
      );

      // Batch insert
      for (const item of items) {
        await queueRepo.create(item);
      }

      const insertTime = Date.now() - startTime;
      console.log(`Inserted 1000 items in ${insertTime}ms`);

      // Query performance
      const queryStartTime = Date.now();
      const allItems = await queueRepo.findAll({ limit: 100 });
      const queryTime = Date.now() - queryStartTime;
      
      console.log(`Queried 100 items in ${queryTime}ms`);
      expect(allItems).toHaveLength(100);
      expect(queryTime).toBeLessThan(100); // Should be fast
    });

    it('should use indexes for efficient queries', async () => {
      // Create items with different statuses
      for (let i = 0; i < 100; i++) {
        await queueRepo.create(TestDataFactory.createQueueItem({
          name: `Movie ${i}`,
          status: i % 4 === 0 ? 'completed' : 'not_started'
        }));
      }

      const startTime = Date.now();
      const completedItems = await queueRepo.findByStatus('completed');
      const queryTime = Date.now() - startTime;

      console.log(`Status query took ${queryTime}ms`);
      expect(completedItems.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(50); // Should be very fast with index
    });
  });

  describe('Database Migrations', () => {
    it('should handle schema migrations', async () => {
      // Test that the current schema is properly set up
      const tables = await db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);

      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('queue');
      expect(tableNames).toContain('config');
    });

    it('should have proper indexes', async () => {
      const indexes = await db.all(`
        SELECT name, tbl_name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `);

      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_queue_status');
      expect(indexNames).toContain('idx_queue_created_at');
      expect(indexNames).toContain('idx_config_key');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle constraint violations', async () => {
      const item = await queueRepo.create(TestDataFactory.createQueueItem({
        name: 'Unique Movie',
        tmdbId: 99999
      }));

      // Try to create duplicate
      await expect(
        queueRepo.create(TestDataFactory.createQueueItem({
          name: 'Unique Movie',
          tmdbId: 99999
        }))
      ).rejects.toThrow();
    });

    it('should handle database connection errors gracefully', async () => {
      // Close the database connection
      await db.close();

      // Try to perform an operation
      await expect(
        queueRepo.findAll()
      ).rejects.toThrow();

      // Reconnect for cleanup
      await db.initialize();
    });
  });
});