/**
 * Tests for TMDBService caching functionality
 */

import { TMDBService } from '../TMDBService';
import { ServiceCache } from '../../utils/ServiceCache';
import { IConfigManager } from '../../config/types';
import { ILogger } from '../../types/service';
// Mock dependencies
const mockConfig: jest.Mocked<IConfigManager> = {
  get: jest.fn(),
  getRequired: jest.fn(),
  set: jest.fn(),
  validate: jest.fn(),
  onConfigChange: jest.fn(),
  getAllConfig: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  createChildLogger: jest.fn().mockReturnThis(),
};

// Mock axios
jest.mock('axios');

describe('TMDBService Caching', () => {
  let tmdbService: TMDBService;
  let cache: ServiceCache;
  let mockAxiosGet: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup config mocks
    mockConfig.get.mockImplementation((key: string) => {
      switch (key) {
        case 'tmdb.baseUrl':
          return 'https://api.themoviedb.org/3';
        default:
          return undefined;
      }
    });
    
    mockConfig.getRequired.mockImplementation((key: string) => {
      switch (key) {
        case 'tmdb.apiKey':
          return 'test-api-key';
        default:
          throw new Error(`Required config ${key} not found`);
      }
    });

    // Create fresh cache and service instances
    cache = new ServiceCache(5000, 100); // 5 second TTL for testing
    tmdbService = new TMDBService(mockConfig, mockLogger, cache);

    // Mock axios instance
    const axios = require('axios');
    mockAxiosGet = jest.fn();
    const mockAxiosInstance = {
      get: mockAxiosGet,
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    cache.stopCleanup();
  });

  afterAll(() => {
    // Ensure all timers are cleared
    jest.clearAllTimers();
  });

  describe('Search Media Caching', () => {
    const mockSearchResponse = {
      data: {
        results: [
          {
            id: 123,
            title: 'Test Movie',
            release_date: '2023-01-01',
            overview: 'A test movie',
            poster_path: '/test.jpg'
          }
        ],
        total_results: 1,
        total_pages: 1
      }
    };

    it('should cache search results', async () => {
      mockAxiosGet.mockResolvedValueOnce(mockSearchResponse);

      // First call - should hit API
      const result1 = await tmdbService.searchMedia('test query', 'Movie');
      
      // Second call - should hit cache
      const result2 = await tmdbService.searchMedia('test query', 'Movie');

      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
      expect(result1).toHaveLength(1);
      expect(result1[0]?.name).toBe('Test Movie');
    });

    it('should use different cache keys for different queries', async () => {
      mockAxiosGet.mockResolvedValue(mockSearchResponse);

      await tmdbService.searchMedia('query1', 'Movie');
      await tmdbService.searchMedia('query2', 'Movie');

      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });

    it('should use different cache keys for different media types', async () => {
      mockAxiosGet.mockResolvedValue(mockSearchResponse);

      await tmdbService.searchMedia('test', 'Movie');
      await tmdbService.searchMedia('test', 'TV Show');

      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });

    it('should cache multi-search differently from specific type search', async () => {
      mockAxiosGet.mockResolvedValue(mockSearchResponse);

      await tmdbService.searchMedia('test'); // multi-search
      await tmdbService.searchMedia('test', 'Movie'); // movie search

      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });

    it('should not cache non-TMDB media types', async () => {
      // These should return empty arrays without API calls
      const bookResults = await tmdbService.searchMedia('test', 'Book');
      const audiobookResults = await tmdbService.searchMedia('test', 'Audiobook');
      const appResults = await tmdbService.searchMedia('test', 'Application');

      expect(bookResults).toEqual([]);
      expect(audiobookResults).toEqual([]);
      expect(appResults).toEqual([]);
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });
  });

  describe('TV Show Details Caching', () => {
    const mockTVShowResponse = {
      data: {
        id: 456,
        name: 'Test TV Show',
        overview: 'A test TV show',
        first_air_date: '2023-01-01',
        number_of_seasons: 2,
        number_of_episodes: 20,
        seasons: [
          {
            id: 1,
            season_number: 1,
            name: 'Season 1',
            episode_count: 10,
            air_date: '2023-01-01'
          }
        ]
      }
    };

    it('should cache TV show details', async () => {
      mockAxiosGet.mockResolvedValueOnce(mockTVShowResponse);

      const result1 = await tmdbService.getTVShowDetails(456);
      const result2 = await tmdbService.getTVShowDetails(456);

      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
      expect(result1.name).toBe('Test TV Show');
    });

    it('should use different cache keys for different TV show IDs', async () => {
      mockAxiosGet.mockResolvedValue(mockTVShowResponse);

      await tmdbService.getTVShowDetails(456);
      await tmdbService.getTVShowDetails(789);

      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('Season Details Caching', () => {
    const mockSeasonResponse = {
      data: {
        season_number: 1,
        name: 'Season 1',
        overview: 'First season',
        air_date: '2023-01-01',
        episodes: [
          {
            id: 1,
            episode_number: 1,
            name: 'Episode 1',
            overview: 'First episode',
            air_date: '2023-01-01',
            runtime: 45
          }
        ]
      }
    };

    it('should cache season details', async () => {
      mockAxiosGet.mockResolvedValueOnce(mockSeasonResponse);

      const result1 = await tmdbService.getSeasonDetails(456, 1);
      const result2 = await tmdbService.getSeasonDetails(456, 1);

      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
      expect(result1.name).toBe('Season 1');
    });

    it('should use different cache keys for different seasons', async () => {
      mockAxiosGet.mockResolvedValue(mockSeasonResponse);

      await tmdbService.getSeasonDetails(456, 1);
      await tmdbService.getSeasonDetails(456, 2);

      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('Episode Details Caching', () => {
    const mockEpisodeResponse = {
      data: {
        episode_number: 1,
        season_number: 1,
        name: 'Episode 1',
        overview: 'First episode',
        air_date: '2023-01-01',
        runtime: 45
      }
    };

    it('should cache episode details', async () => {
      mockAxiosGet.mockResolvedValueOnce(mockEpisodeResponse);

      const result1 = await tmdbService.getEpisodeDetails(456, 1, 1);
      const result2 = await tmdbService.getEpisodeDetails(456, 1, 1);

      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
      expect(result1.name).toBe('Episode 1');
    });

    it('should use different cache keys for different episodes', async () => {
      mockAxiosGet.mockResolvedValue(mockEpisodeResponse);

      await tmdbService.getEpisodeDetails(456, 1, 1);
      await tmdbService.getEpisodeDetails(456, 1, 2);

      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Management', () => {
    it('should clear all cached data', async () => {
      const mockResponse = { data: { results: [] } };
      mockAxiosGet.mockResolvedValue(mockResponse);

      // Cache some data
      await tmdbService.searchMedia('test1');
      await tmdbService.searchMedia('test2');

      // Verify cache has data
      const statsBefore = cache.getStats();
      expect(statsBefore.size).toBeGreaterThan(0);

      // Clear cache
      await tmdbService.clearCache();

      // Verify cache is empty
      const statsAfter = cache.getStats();
      expect(statsAfter.size).toBe(0);
    });

    it('should provide cache statistics', async () => {
      const mockResponse = { data: { results: [] } };
      mockAxiosGet.mockResolvedValue(mockResponse);

      // Cache some data
      await tmdbService.searchMedia('test');

      const stats = tmdbService.getCacheStats();
      expect(stats).not.toBeNull();
      expect(stats!.size).toBeGreaterThan(0);
      expect(stats!.keys.length).toBeGreaterThan(0);
    });
  });

  describe('Cache TTL Behavior', () => {
    it('should respect different TTL for different operations', async () => {
      // Create cache with very short TTL for testing
      const shortCache = new ServiceCache(100); // 100ms
      const shortTmdbService = new TMDBService(mockConfig, mockLogger, shortCache);

      const mockResponse = { data: { results: [] } };
      mockAxiosGet.mockResolvedValue(mockResponse);

      // First call
      await shortTmdbService.searchMedia('test');
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);

      // Second call immediately - should hit cache
      await shortTmdbService.searchMedia('test');
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third call - should hit API again
      await shortTmdbService.searchMedia('test');
      expect(mockAxiosGet).toHaveBeenCalledTimes(2);

      shortCache.stopCleanup();
    });
  });

  describe('Error Handling with Cache', () => {
    it('should not cache failed requests', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('API Error'));

      // First call should fail
      await expect(tmdbService.searchMedia('test')).rejects.toThrow();

      // Setup successful response for retry
      const mockResponse = { data: { results: [] } };
      mockAxiosGet.mockResolvedValueOnce(mockResponse);

      // Second call should hit API again (not cache)
      const result = await tmdbService.searchMedia('test');
      expect(result).toEqual([]);
      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });
  });
});