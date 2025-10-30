import { ServiceFactory } from '../ServiceFactory.js';
import { MockFactory } from '../../__tests__/mocks/factory.js';
import { TMDBService } from '../TMDBService.js';
import { JackettService } from '../jackettService.js';
import { RealDebridService } from '../realDebridService.js';
import { PlexService } from '../plexService.js';
import { BookService } from '../bookService.js';

describe('ServiceFactory', () => {
  let mockConfig: any;
  let mockLogger: any;
  let mockCache: any;
  let factory: ServiceFactory;

  beforeEach(() => {
    mockConfig = MockFactory.createMockConfig();
    mockLogger = MockFactory.createMockLogger();
    mockCache = MockFactory.createMockCache();
    factory = new ServiceFactory(mockConfig, mockLogger, mockCache);
  });

  describe('constructor', () => {
    it('should initialize with required dependencies', () => {
      expect(factory).toBeInstanceOf(ServiceFactory);
    });
  });

  describe('createTMDBService', () => {
    it('should create TMDBService instance', () => {
      const service = factory.createTMDBService();
      expect(service).toBeInstanceOf(TMDBService);
    });

    it('should return same instance on subsequent calls (singleton)', () => {
      const service1 = factory.createTMDBService();
      const service2 = factory.createTMDBService();
      expect(service1).toBe(service2);
    });
  });

  describe('createJackettService', () => {
    it('should create JackettService instance', () => {
      const service = factory.createJackettService();
      expect(service).toBeInstanceOf(JackettService);
    });

    it('should return same instance on subsequent calls (singleton)', () => {
      const service1 = factory.createJackettService();
      const service2 = factory.createJackettService();
      expect(service1).toBe(service2);
    });
  });

  describe('createRealDebridService', () => {
    it('should create RealDebridService instance', () => {
      const service = factory.createRealDebridService();
      expect(service).toBeInstanceOf(RealDebridService);
    });

    it('should return same instance on subsequent calls (singleton)', () => {
      const service1 = factory.createRealDebridService();
      const service2 = factory.createRealDebridService();
      expect(service1).toBe(service2);
    });
  });

  describe('createPlexService', () => {
    it('should create PlexService instance', () => {
      const service = factory.createPlexService();
      expect(service).toBeInstanceOf(PlexService);
    });

    it('should return same instance on subsequent calls (singleton)', () => {
      const service1 = factory.createPlexService();
      const service2 = factory.createPlexService();
      expect(service1).toBe(service2);
    });
  });

  describe('createBookService', () => {
    it('should create BookService instance', () => {
      const service = factory.createBookService();
      expect(service).toBeInstanceOf(BookService);
    });

    it('should return same instance on subsequent calls (singleton)', () => {
      const service1 = factory.createBookService();
      const service2 = factory.createBookService();
      expect(service1).toBe(service2);
    });
  });

  describe('getAllServices', () => {
    it('should return all created services', () => {
      // Create some services
      factory.createTMDBService();
      factory.createJackettService();
      factory.createPlexService();

      const services = factory.getAllServices();

      expect(services).toHaveProperty('tmdb');
      expect(services).toHaveProperty('jackett');
      expect(services).toHaveProperty('plex');
      expect(services.tmdb).toBeInstanceOf(TMDBService);
      expect(services.jackett).toBeInstanceOf(JackettService);
      expect(services.plex).toBeInstanceOf(PlexService);
    });

    it('should return empty object when no services created', () => {
      const services = factory.getAllServices();
      expect(services).toEqual({});
    });
  });

  describe('clearServices', () => {
    it('should clear all cached service instances', () => {
      // Create services
      const tmdb1 = factory.createTMDBService();
      const jackett1 = factory.createJackettService();

      // Clear services
      factory.clearServices();

      // Create services again - should be new instances
      const tmdb2 = factory.createTMDBService();
      const jackett2 = factory.createJackettService();

      expect(tmdb1).not.toBe(tmdb2);
      expect(jackett1).not.toBe(jackett2);
    });
  });

  describe('getServiceHealth', () => {
    it('should return health status for all services', async () => {
      // Create some services
      factory.createTMDBService();
      factory.createJackettService();

      const health = await factory.getServiceHealth();

      expect(health).toHaveProperty('tmdb');
      expect(health).toHaveProperty('jackett');
      expect(health.tmdb).toHaveProperty('status');
      expect(health.jackett).toHaveProperty('status');
    });

    it('should handle service health check errors', async () => {
      // Create a service that will fail health check
      const tmdb = factory.createTMDBService();
      jest.spyOn(tmdb, 'healthCheck').mockRejectedValue(new Error('Service unavailable'));

      const health = await factory.getServiceHealth();

      expect(health.tmdb.status).toBe('unhealthy');
      expect(health.tmdb.error).toBe('Service unavailable');
    });
  });

  describe('dependency injection', () => {
    it('should inject config into all services', () => {
      const tmdb = factory.createTMDBService();
      const jackett = factory.createJackettService();

      // Verify services have access to config
      expect((tmdb as any).config).toBe(mockConfig);
      expect((jackett as any).config).toBe(mockConfig);
    });

    it('should inject logger into all services', () => {
      const tmdb = factory.createTMDBService();
      const jackett = factory.createJackettService();

      // Verify services have access to logger
      expect((tmdb as any).logger).toBe(mockLogger);
      expect((jackett as any).logger).toBe(mockLogger);
    });

    it('should inject cache into services that support it', () => {
      const tmdb = factory.createTMDBService();
      const jackett = factory.createJackettService();

      // Verify services have access to cache
      expect((tmdb as any).cache).toBe(mockCache);
      expect((jackett as any).cache).toBe(mockCache);
    });
  });

  describe('error handling', () => {
    it('should handle service creation errors gracefully', () => {
      // Mock config to throw error
      mockConfig.getRequired.mockImplementation(() => {
        throw new Error('Configuration missing');
      });

      expect(() => {
        factory.createTMDBService();
      }).toThrow('Configuration missing');
    });

    it('should not cache failed service creation', () => {
      // Mock config to throw error on first call, succeed on second
      let callCount = 0;
      mockConfig.getRequired.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        return 'valid-config';
      });

      // First call should fail
      expect(() => {
        factory.createTMDBService();
      }).toThrow('First call fails');

      // Second call should succeed and create new instance
      expect(() => {
        factory.createTMDBService();
      }).not.toThrow();
    });
  });
});