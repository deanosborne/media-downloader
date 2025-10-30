import { Express } from 'express';
import request from 'supertest';
import { ConfigManager } from '../../config/ConfigManager.js';
import { Logger } from '../../utils/Logger.js';
import { DatabaseConnection } from '../../repositories/DatabaseConnection.js';
import { ServiceFactory } from '../../services/ServiceFactory.js';
import { ServiceCache } from '../../utils/ServiceCache.js';
import { ConfigStorage } from '../../config/storage.js';

export interface TestContext {
  app: Express;
  config: ConfigManager;
  logger: Logger;
  db: DatabaseConnection;
  serviceFactory: ServiceFactory;
  cache: ServiceCache;
}

export class IntegrationTestSetup {
  private static instance: IntegrationTestSetup;
  private context: TestContext | null = null;

  static getInstance(): IntegrationTestSetup {
    if (!IntegrationTestSetup.instance) {
      IntegrationTestSetup.instance = new IntegrationTestSetup();
    }
    return IntegrationTestSetup.instance;
  }

  async setup(): Promise<TestContext> {
    if (this.context) {
      return this.context;
    }

    // Create test database
    const db = new DatabaseConnection(':memory:');
    await db.initialize();

    // Create test configuration
    const storage = new ConfigStorage(db);
    const config = new ConfigManager(storage);
    await config.initialize();

    // Set test configuration values
    await config.set('tmdb.apiKey', 'test-tmdb-key');
    await config.set('jackett.url', 'http://localhost:9117');
    await config.set('jackett.apiKey', 'test-jackett-key');
    await config.set('realDebrid.apiKey', 'test-rd-key');
    await config.set('plex.url', 'http://localhost:32400');
    await config.set('plex.token', 'test-plex-token');

    // Create logger
    const logger = new Logger();

    // Create cache
    const cache = new ServiceCache();

    // Create service factory
    const serviceFactory = new ServiceFactory(config, logger, cache);

    // Create Express app (you'll need to import your app setup)
    const { createApp } = await import('../../app.js');
    const app = createApp(config, logger, serviceFactory);

    this.context = {
      app,
      config,
      logger,
      db,
      serviceFactory,
      cache
    };

    return this.context;
  }

  async teardown(): Promise<void> {
    if (this.context) {
      await this.context.db.close();
      this.context = null;
    }
  }

  async resetDatabase(): Promise<void> {
    if (this.context) {
      // Clear all tables
      await this.context.db.run('DELETE FROM queue');
      await this.context.db.run('DELETE FROM config');
    }
  }

  getRequest() {
    if (!this.context) {
      throw new Error('Test context not initialized. Call setup() first.');
    }
    return request(this.context.app);
  }
}

// Test data factories
export class TestDataFactory {
  static createQueueItem(overrides: any = {}) {
    return {
      name: 'Test Movie',
      type: 'movie',
      year: 2023,
      tmdbId: 12345,
      status: 'not_started',
      progress: 0,
      isSeasonPack: false,
      ...overrides
    };
  }

  static createTVQueueItem(overrides: any = {}) {
    return {
      name: 'Test TV Show',
      type: 'tv_show',
      year: 2023,
      tmdbId: 67890,
      season: 1,
      episode: 1,
      episodeName: 'Pilot',
      status: 'not_started',
      progress: 0,
      isSeasonPack: false,
      ...overrides
    };
  }

  static createSeasonPackItem(overrides: any = {}) {
    return {
      name: 'Test TV Show Season 1',
      type: 'tv_show',
      year: 2023,
      tmdbId: 67890,
      season: 1,
      status: 'not_started',
      progress: 0,
      isSeasonPack: true,
      ...overrides
    };
  }
}

// Helper functions for common test operations
export const testHelpers = {
  async createQueueItem(setup: IntegrationTestSetup, data: any = {}) {
    const item = TestDataFactory.createQueueItem(data);
    const response = await setup.getRequest()
      .post('/api/queue')
      .send(item)
      .expect(201);
    return response.body.data;
  },

  async waitForCondition(condition: () => Promise<boolean>, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  },

  mockExternalService(serviceName: string, responses: any[]) {
    // Mock external service responses for testing
    const originalFetch = global.fetch;
    let callCount = 0;

    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      
      return {
        ok: response.ok !== false,
        status: response.status || 200,
        json: async () => response.data || response,
        text: async () => JSON.stringify(response.data || response)
      };
    });

    return () => {
      global.fetch = originalFetch;
    };
  }
};