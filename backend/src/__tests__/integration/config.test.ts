import { IntegrationTestSetup } from './setup.js';

describe('Configuration API Integration Tests', () => {
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

  describe('GET /api/config', () => {
    it('should return all configuration values', async () => {
      // Set some test configuration
      const context = await setup.setup();
      await context.config.set('tmdb.apiKey', 'test-key');
      await context.config.set('download.path', '/downloads');
      await context.config.set('download.autoDownload', true);

      const response = await setup.getRequest()
        .get('/api/config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        'tmdb.apiKey': 'test-key',
        'download.path': '/downloads',
        'download.autoDownload': true
      });
    });

    it('should mask sensitive configuration values', async () => {
      const context = await setup.setup();
      await context.config.set('tmdb.apiKey', 'secret-api-key');
      await context.config.set('jackett.apiKey', 'secret-jackett-key');

      const response = await setup.getRequest()
        .get('/api/config')
        .expect(200);

      expect(response.body.success).toBe(true);
      // API keys should be masked in the response
      expect(response.body.data['tmdb.apiKey']).toBe('***MASKED***');
      expect(response.body.data['jackett.apiKey']).toBe('***MASKED***');
    });

    it('should return structured configuration', async () => {
      const context = await setup.setup();
      await context.config.set('plex.url', 'http://localhost:32400');
      await context.config.set('plex.token', 'plex-token');
      await context.config.set('plex.paths.movies', '/movies');
      await context.config.set('plex.paths.tvShows', '/tv');

      const response = await setup.getRequest()
        .get('/api/config?structured=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        plex: {
          url: 'http://localhost:32400',
          token: '***MASKED***',
          paths: {
            movies: '/movies',
            tvShows: '/tv'
          }
        }
      });
    });
  });

  describe('GET /api/config/:key', () => {
    it('should return a specific configuration value', async () => {
      const context = await setup.setup();
      await context.config.set('download.path', '/custom/downloads');

      const response = await setup.getRequest()
        .get('/api/config/download.path')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        key: 'download.path',
        value: '/custom/downloads'
      });
    });

    it('should return 404 for non-existent configuration key', async () => {
      const response = await setup.getRequest()
        .get('/api/config/non.existent.key')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NotFoundError');
    });

    it('should mask sensitive configuration values', async () => {
      const context = await setup.setup();
      await context.config.set('realDebrid.apiKey', 'secret-rd-key');

      const response = await setup.getRequest()
        .get('/api/config/realDebrid.apiKey')
        .expect(200);

      expect(response.body.data.value).toBe('***MASKED***');
    });
  });

  describe('PUT /api/config/:key', () => {
    it('should update a configuration value', async () => {
      const updateData = {
        value: '/new/download/path'
      };

      const response = await setup.getRequest()
        .put('/api/config/download.path')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        key: 'download.path',
        value: '/new/download/path'
      });

      // Verify the value was actually updated
      const context = await setup.setup();
      const actualValue = await context.config.get('download.path');
      expect(actualValue).toBe('/new/download/path');
    });

    it('should validate configuration values', async () => {
      const invalidData = {
        value: 'invalid-url'
      };

      const response = await setup.getRequest()
        .put('/api/config/plex.url')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('ValidationError');
    });

    it('should handle boolean values', async () => {
      const updateData = {
        value: false
      };

      const response = await setup.getRequest()
        .put('/api/config/download.autoDownload')
        .send(updateData)
        .expect(200);

      expect(response.body.data.value).toBe(false);
    });

    it('should handle numeric values', async () => {
      const updateData = {
        value: 10
      };

      const response = await setup.getRequest()
        .put('/api/config/download.minSeeders')
        .send(updateData)
        .expect(200);

      expect(response.body.data.value).toBe(10);
    });

    it('should encrypt sensitive configuration values', async () => {
      const updateData = {
        value: 'new-secret-api-key'
      };

      const response = await setup.getRequest()
        .put('/api/config/tmdb.apiKey')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.value).toBe('***MASKED***');

      // Verify the actual value is stored encrypted but can be retrieved
      const context = await setup.setup();
      const actualValue = await context.config.get('tmdb.apiKey');
      expect(actualValue).toBe('new-secret-api-key');
    });
  });

  describe('POST /api/config/bulk', () => {
    it('should update multiple configuration values', async () => {
      const bulkData = {
        values: {
          'download.path': '/bulk/downloads',
          'download.autoDownload': true,
          'download.minSeeders': 5,
          'tmdb.apiKey': 'bulk-api-key'
        }
      };

      const response = await setup.getRequest()
        .post('/api/config/bulk')
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        updated: 4,
        failed: 0
      });

      // Verify values were updated
      const context = await setup.setup();
      expect(await context.config.get('download.path')).toBe('/bulk/downloads');
      expect(await context.config.get('download.autoDownload')).toBe(true);
      expect(await context.config.get('download.minSeeders')).toBe(5);
      expect(await context.config.get('tmdb.apiKey')).toBe('bulk-api-key');
    });

    it('should handle partial failures in bulk updates', async () => {
      const bulkData = {
        values: {
          'download.path': '/valid/path',
          'plex.url': 'invalid-url', // This should fail validation
          'download.autoDownload': true
        }
      };

      const response = await setup.getRequest()
        .post('/api/config/bulk')
        .send(bulkData)
        .expect(207); // Multi-status

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(2);
      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0].key).toBe('plex.url');
    });
  });

  describe('DELETE /api/config/:key', () => {
    it('should delete a configuration value', async () => {
      // Set a value first
      const context = await setup.setup();
      await context.config.set('test.key', 'test-value');

      const response = await setup.getRequest()
        .delete('/api/config/test.key')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify the value was deleted
      const deletedValue = await context.config.get('test.key');
      expect(deletedValue).toBeUndefined();
    });

    it('should return 404 for non-existent configuration key', async () => {
      const response = await setup.getRequest()
        .delete('/api/config/non.existent.key')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should not allow deletion of required configuration keys', async () => {
      const response = await setup.getRequest()
        .delete('/api/config/tmdb.apiKey')
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('required');
    });
  });

  describe('POST /api/config/validate', () => {
    it('should validate all configuration', async () => {
      // Set valid configuration
      const context = await setup.setup();
      await context.config.set('tmdb.apiKey', 'valid-key');
      await context.config.set('plex.url', 'http://localhost:32400');
      await context.config.set('download.path', '/downloads');

      const response = await setup.getRequest()
        .post('/api/config/validate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        valid: true,
        errors: []
      });
    });

    it('should return validation errors for invalid configuration', async () => {
      // Set invalid configuration
      const context = await setup.setup();
      await context.config.set('plex.url', 'invalid-url');
      await context.config.set('download.minSeeders', -1);

      const response = await setup.getRequest()
        .post('/api/config/validate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            key: 'plex.url',
            message: expect.stringContaining('URL')
          }),
          expect.objectContaining({
            key: 'download.minSeeders',
            message: expect.stringContaining('positive')
          })
        ])
      });
    });
  });

  describe('POST /api/config/test-connection', () => {
    it('should test TMDB connection', async () => {
      const context = await setup.setup();
      await context.config.set('tmdb.apiKey', 'valid-test-key');

      // Mock successful TMDB response
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      try {
        const response = await setup.getRequest()
          .post('/api/config/test-connection')
          .send({ service: 'tmdb' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          service: 'tmdb',
          connected: true
        });
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should test Plex connection', async () => {
      const context = await setup.setup();
      await context.config.set('plex.url', 'http://localhost:32400');
      await context.config.set('plex.token', 'valid-token');

      // Mock successful Plex response
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ MediaContainer: { machineIdentifier: 'test' } })
      });

      try {
        const response = await setup.getRequest()
          .post('/api/config/test-connection')
          .send({ service: 'plex' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.connected).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should handle connection failures', async () => {
      const context = await setup.setup();
      await context.config.set('tmdb.apiKey', 'invalid-key');

      // Mock failed TMDB response
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ status_message: 'Invalid API key' })
      });

      try {
        const response = await setup.getRequest()
          .post('/api/config/test-connection')
          .send({ service: 'tmdb' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          service: 'tmdb',
          connected: false,
          error: expect.stringContaining('Invalid API key')
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Configuration Change Notifications', () => {
    it('should notify services when configuration changes', async () => {
      const context = await setup.setup();
      
      // Mock service that listens for config changes
      const mockCallback = jest.fn();
      context.config.onConfigChange(mockCallback);

      // Update configuration
      await setup.getRequest()
        .put('/api/config/tmdb.apiKey')
        .send({ value: 'new-api-key' })
        .expect(200);

      // Verify callback was called
      expect(mockCallback).toHaveBeenCalledWith('tmdb.apiKey', 'new-api-key');
    });
  });
});