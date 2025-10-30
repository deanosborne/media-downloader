import { IntegrationTestSetup, TestDataFactory, testHelpers } from './setup.js';

describe('Queue API Integration Tests', () => {
  let setup: IntegrationTestSetup;

  beforeAll(async () => {
    setup = IntegrationTestSetup.getInstance();
    await setup.setup();
  });

  afterAll(async () => {
    await setup.teardown();
  });

  beforeEach(async () => {
    await setup.resetDatabase();
  });

  describe('POST /api/queue', () => {
    it('should add a movie to the queue', async () => {
      const movieData = TestDataFactory.createQueueItem({
        name: 'The Matrix',
        type: 'movie',
        year: 1999,
        tmdbId: 603
      });

      const response = await setup.getRequest()
        .post('/api/queue')
        .send(movieData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'The Matrix',
        type: 'movie',
        year: 1999,
        tmdbId: 603,
        status: 'not_started',
        progress: 0
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should add a TV show episode to the queue', async () => {
      const tvData = TestDataFactory.createTVQueueItem({
        name: 'Breaking Bad',
        season: 1,
        episode: 1,
        episodeName: 'Pilot'
      });

      const response = await setup.getRequest()
        .post('/api/queue')
        .send(tvData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'Breaking Bad',
        type: 'tv_show',
        season: 1,
        episode: 1,
        episodeName: 'Pilot',
        isSeasonPack: false
      });
    });

    it('should add a season pack to the queue', async () => {
      const seasonData = TestDataFactory.createSeasonPackItem({
        name: 'Breaking Bad Season 1',
        season: 1
      });

      const response = await setup.getRequest()
        .post('/api/queue')
        .send(seasonData)
        .expect(201);

      expect(response.body.data.isSeasonPack).toBe(true);
      expect(response.body.data.episode).toBeUndefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        type: 'movie'
        // missing name
      };

      const response = await setup.getRequest()
        .post('/api/queue')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('ValidationError');
    });

    it('should prevent duplicate entries', async () => {
      const movieData = TestDataFactory.createQueueItem({
        name: 'Duplicate Movie',
        tmdbId: 12345
      });

      // Add first item
      await setup.getRequest()
        .post('/api/queue')
        .send(movieData)
        .expect(201);

      // Try to add duplicate
      const response = await setup.getRequest()
        .post('/api/queue')
        .send(movieData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('GET /api/queue', () => {
    beforeEach(async () => {
      // Add test data
      await testHelpers.createQueueItem(setup, { name: 'Movie 1', status: 'completed' });
      await testHelpers.createQueueItem(setup, { name: 'Movie 2', status: 'in_progress' });
      await testHelpers.createQueueItem(setup, { name: 'Movie 3', status: 'not_started' });
    });

    it('should return all queue items', async () => {
      const response = await setup.getRequest()
        .get('/api/queue')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await setup.getRequest()
        .get('/api/queue?status=in_progress')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('in_progress');
    });

    it('should support pagination', async () => {
      const response = await setup.getRequest()
        .get('/api/queue?page=1&limit=2')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2
      });
    });

    it('should sort by creation date by default', async () => {
      const response = await setup.getRequest()
        .get('/api/queue')
        .expect(200);

      const items = response.body.data;
      for (let i = 1; i < items.length; i++) {
        const prev = new Date(items[i - 1].createdAt);
        const curr = new Date(items[i].createdAt);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });
  });

  describe('GET /api/queue/:id', () => {
    let queueItem: any;

    beforeEach(async () => {
      queueItem = await testHelpers.createQueueItem(setup, {
        name: 'Test Movie',
        status: 'in_progress',
        progress: 50
      });
    });

    it('should return a specific queue item', async () => {
      const response = await setup.getRequest()
        .get(`/api/queue/${queueItem.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: queueItem.id,
        name: 'Test Movie',
        status: 'in_progress',
        progress: 50
      });
    });

    it('should return 404 for non-existent item', async () => {
      const response = await setup.getRequest()
        .get('/api/queue/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NotFoundError');
    });
  });

  describe('PUT /api/queue/:id', () => {
    let queueItem: any;

    beforeEach(async () => {
      queueItem = await testHelpers.createQueueItem(setup, {
        name: 'Original Name',
        status: 'not_started',
        progress: 0
      });
    });

    it('should update queue item status', async () => {
      const updateData = {
        status: 'in_progress',
        progress: 25
      };

      const response = await setup.getRequest()
        .put(`/api/queue/${queueItem.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: queueItem.id,
        status: 'in_progress',
        progress: 25
      });
    });

    it('should update progress and download speed', async () => {
      const updateData = {
        progress: 75,
        downloadSpeed: '5.2 MB/s'
      };

      const response = await setup.getRequest()
        .put(`/api/queue/${queueItem.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.progress).toBe(75);
      expect(response.body.data.downloadSpeed).toBe('5.2 MB/s');
    });

    it('should handle completion', async () => {
      const updateData = {
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString()
      };

      const response = await setup.getRequest()
        .put(`/api/queue/${queueItem.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.progress).toBe(100);
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('should handle errors', async () => {
      const updateData = {
        status: 'error',
        error: 'Download failed: Connection timeout'
      };

      const response = await setup.getRequest()
        .put(`/api/queue/${queueItem.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.status).toBe('error');
      expect(response.body.data.error).toBe('Download failed: Connection timeout');
    });

    it('should return 404 for non-existent item', async () => {
      const response = await setup.getRequest()
        .put('/api/queue/non-existent-id')
        .send({ status: 'completed' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/queue/:id', () => {
    let queueItem: any;

    beforeEach(async () => {
      queueItem = await testHelpers.createQueueItem(setup);
    });

    it('should delete a queue item', async () => {
      const response = await setup.getRequest()
        .delete(`/api/queue/${queueItem.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify item is deleted
      await setup.getRequest()
        .get(`/api/queue/${queueItem.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await setup.getRequest()
        .delete('/api/queue/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should not delete items that are currently downloading', async () => {
      // Update item to in_progress
      await setup.getRequest()
        .put(`/api/queue/${queueItem.id}`)
        .send({ status: 'in_progress' });

      const response = await setup.getRequest()
        .delete(`/api/queue/${queueItem.id}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('cannot be deleted');
    });
  });

  describe('POST /api/queue/bulk', () => {
    it('should add multiple items to queue', async () => {
      const bulkData = [
        TestDataFactory.createQueueItem({ name: 'Movie 1' }),
        TestDataFactory.createQueueItem({ name: 'Movie 2' }),
        TestDataFactory.createTVQueueItem({ name: 'TV Show 1' })
      ];

      const response = await setup.getRequest()
        .post('/api/queue/bulk')
        .send({ items: bulkData })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].name).toBe('Movie 1');
      expect(response.body.data[1].name).toBe('Movie 2');
      expect(response.body.data[2].name).toBe('TV Show 1');
    });

    it('should handle partial failures in bulk operations', async () => {
      // Add one item first to create a duplicate scenario
      await testHelpers.createQueueItem(setup, { name: 'Existing Movie', tmdbId: 999 });

      const bulkData = [
        TestDataFactory.createQueueItem({ name: 'New Movie 1' }),
        TestDataFactory.createQueueItem({ name: 'Existing Movie', tmdbId: 999 }), // duplicate
        TestDataFactory.createQueueItem({ name: 'New Movie 2' })
      ];

      const response = await setup.getRequest()
        .post('/api/queue/bulk')
        .send({ items: bulkData })
        .expect(207); // Multi-status

      expect(response.body.success).toBe(true);
      expect(response.body.data.successful).toHaveLength(2);
      expect(response.body.data.failed).toHaveLength(1);
      expect(response.body.data.failed[0].error).toContain('already exists');
    });
  });

  describe('Queue Processing Integration', () => {
    it('should process queue items automatically', async () => {
      // Mock external services
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        { data: { results: [{ id: 603, title: 'The Matrix', release_date: '1999-03-31' }] } }
      ]);

      try {
        const queueItem = await testHelpers.createQueueItem(setup, {
          name: 'The Matrix',
          tmdbId: 603,
          status: 'not_started'
        });

        // Trigger processing (this would normally be done by a background job)
        await setup.getRequest()
          .post(`/api/queue/${queueItem.id}/process`)
          .expect(200);

        // Wait for processing to complete
        const processed = await testHelpers.waitForCondition(async () => {
          const response = await setup.getRequest()
            .get(`/api/queue/${queueItem.id}`)
            .expect(200);
          return response.body.data.status !== 'not_started';
        });

        expect(processed).toBe(true);
      } finally {
        restoreMocks();
      }
    });
  });
});