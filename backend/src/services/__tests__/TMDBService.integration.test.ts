/**
 * Integration tests for TMDBService
 * These tests make actual HTTP requests to TMDB API (when API key is available)
 */

import { TMDBService } from '../TMDBService.js';
import { ConfigManager } from '../../config/ConfigManager.js';
import { Logger, LogLevel } from '../../utils/Logger.js';
import { ServiceCache } from '../../utils/ServiceCache.js';
import { MediaType } from '../../models/index.js';

// Skip integration tests if no API key is provided
const TMDB_API_KEY = process.env['TMDB_API_KEY'];
const shouldRunIntegrationTests = TMDB_API_KEY && process.env['RUN_INTEGRATION_TESTS'] === 'true';

const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

describeIntegration('TMDBService Integration Tests', () => {
  let service: TMDBService;
  let config: ConfigManager;
  let logger: Logger;
  let cache: ServiceCache;

  beforeAll(async () => {
    // Setup real dependencies
    config = new ConfigManager();
    await config.set('tmdb.apiKey', TMDB_API_KEY!);
    
    logger = new Logger(LogLevel.DEBUG, 'TMDBService-Integration');
    cache = new ServiceCache(5 * 60 * 1000); // 5 minutes

    service = new TMDBService(config, logger, cache);
  });

  afterEach(async () => {
    // Clear cache between tests
    await cache.clear();
  });

  describe('searchMedia', () => {
    it('should search for movies successfully', async () => {
      const results = await service.searchMedia('The Matrix', 'Movie');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('name');
      expect(firstResult.type).toBe(MediaType.MOVIE);
      expect(firstResult.name.toLowerCase()).toContain('matrix');
    }, 10000);

    it('should search for TV shows successfully', async () => {
      const results = await service.searchMedia('Breaking Bad', 'TV Show');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('name');
      expect(firstResult.type).toBe(MediaType.TV_SHOW);
      expect(firstResult.name.toLowerCase()).toContain('breaking');
    }, 10000);

    it('should perform multi-search successfully', async () => {
      const results = await service.searchMedia('Avengers');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Should contain both movies and potentially TV shows
      const hasMovies = results.some(r => r.type === MediaType.MOVIE);
      expect(hasMovies).toBe(true);
    }, 10000);

    it('should return empty array for non-existent content', async () => {
      const results = await service.searchMedia('ThisMovieDoesNotExist12345XYZ');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    }, 10000);

    it('should cache search results', async () => {
      const query = 'The Godfather';
      
      // First request - should hit API
      const startTime1 = Date.now();
      const results1 = await service.searchMedia(query, 'Movie');
      const duration1 = Date.now() - startTime1;

      expect(results1.length).toBeGreaterThan(0);

      // Second request - should hit cache (much faster)
      const startTime2 = Date.now();
      const results2 = await service.searchMedia(query, 'Movie');
      const duration2 = Date.now() - startTime2;

      expect(results2).toEqual(results1);
      expect(duration2).toBeLessThan(duration1 / 2); // Cache should be much faster
    }, 15000);

    it('should handle special characters in search query', async () => {
      const results = await service.searchMedia('Amélie');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Should handle international characters without throwing errors
    }, 10000);
  });

  describe('getTVShowDetails', () => {
    it('should get TV show details for Breaking Bad', async () => {
      // Breaking Bad TMDB ID is 1396
      const details = await service.getTVShowDetails(1396);

      expect(details).toBeDefined();
      expect(details.id).toBe(1396);
      expect(details.name).toBe('Breaking Bad');
      expect(details.number_of_seasons).toBeGreaterThan(0);
      expect(details.number_of_episodes).toBeGreaterThan(0);
      expect(Array.isArray(details.seasons)).toBe(true);
      expect(details.seasons.length).toBeGreaterThan(0);

      // Check season structure
      const firstSeason = details.seasons[0];
      expect(firstSeason).toHaveProperty('id');
      expect(firstSeason).toHaveProperty('season_number');
      expect(firstSeason).toHaveProperty('name');
      expect(firstSeason).toHaveProperty('episode_count');
    }, 10000);

    it('should cache TV show details', async () => {
      const tvShowId = 1396; // Breaking Bad

      // First request
      const startTime1 = Date.now();
      const details1 = await service.getTVShowDetails(tvShowId);
      const duration1 = Date.now() - startTime1;

      // Second request - should be cached
      const startTime2 = Date.now();
      const details2 = await service.getTVShowDetails(tvShowId);
      const duration2 = Date.now() - startTime2;

      expect(details2).toEqual(details1);
      expect(duration2).toBeLessThan(duration1 / 2);
    }, 15000);

    it('should handle non-existent TV show ID', async () => {
      await expect(service.getTVShowDetails(999999999)).rejects.toThrow();
    }, 10000);
  });

  describe('getSeasonDetails', () => {
    it('should get season details for Breaking Bad Season 1', async () => {
      const details = await service.getSeasonDetails(1396, 1);

      expect(details).toBeDefined();
      expect(details.season_number).toBe(1);
      expect(details.name).toBeDefined();
      expect(Array.isArray(details.episodes)).toBe(true);
      expect(details.episodes.length).toBeGreaterThan(0);

      // Check episode structure
      const firstEpisode = details.episodes[0];
      expect(firstEpisode).toHaveProperty('id');
      expect(firstEpisode).toHaveProperty('episode_number');
      expect(firstEpisode).toHaveProperty('name');
      expect(firstEpisode.episode_number).toBe(1);
    }, 10000);

    it('should cache season details', async () => {
      const tvShowId = 1396;
      const seasonNumber = 1;

      // First request
      const startTime1 = Date.now();
      const details1 = await service.getSeasonDetails(tvShowId, seasonNumber);
      const duration1 = Date.now() - startTime1;

      // Second request - should be cached
      const startTime2 = Date.now();
      const details2 = await service.getSeasonDetails(tvShowId, seasonNumber);
      const duration2 = Date.now() - startTime2;

      expect(details2).toEqual(details1);
      expect(duration2).toBeLessThan(duration1 / 2);
    }, 15000);

    it('should handle non-existent season', async () => {
      await expect(service.getSeasonDetails(1396, 999)).rejects.toThrow();
    }, 10000);
  });

  describe('getEpisodeDetails', () => {
    it('should get episode details for Breaking Bad S01E01', async () => {
      const details = await service.getEpisodeDetails(1396, 1, 1);

      expect(details).toBeDefined();
      expect(details.season_number).toBe(1);
      expect(details.episode_number).toBe(1);
      expect(details.name).toBeDefined();
      expect(details.name).toBe('Pilot');
    }, 10000);

    it('should cache episode details', async () => {
      const tvShowId = 1396;
      const seasonNumber = 1;
      const episodeNumber = 1;

      // First request
      const startTime1 = Date.now();
      const details1 = await service.getEpisodeDetails(tvShowId, seasonNumber, episodeNumber);
      const duration1 = Date.now() - startTime1;

      // Second request - should be cached
      const startTime2 = Date.now();
      const details2 = await service.getEpisodeDetails(tvShowId, seasonNumber, episodeNumber);
      const duration2 = Date.now() - startTime2;

      expect(details2).toEqual(details1);
      expect(duration2).toBeLessThan(duration1 / 2);
    }, 15000);

    it('should handle non-existent episode', async () => {
      await expect(service.getEpisodeDetails(1396, 1, 999)).rejects.toThrow();
    }, 10000);
  });

  describe('error handling', () => {
    it('should handle invalid API key gracefully', async () => {
      // Create service with invalid API key
      const invalidConfig = new ConfigManager();
      await invalidConfig.set('tmdb.apiKey', 'invalid-key');
      
      const invalidService = new TMDBService(invalidConfig, logger, cache);

      await expect(invalidService.searchMedia('test')).rejects.toThrow();
    }, 10000);

    it('should handle network timeouts', async () => {
      // Create service with very short timeout
      const timeoutConfig = new ConfigManager();
      await timeoutConfig.set('tmdb.apiKey', TMDB_API_KEY!);
      
      const timeoutService = new TMDBService(timeoutConfig, logger, cache);
      // Override timeout to be very short
      (timeoutService as any).httpClient.defaults.timeout = 1; // 1ms timeout

      await expect(timeoutService.searchMedia('test')).rejects.toThrow();
    }, 10000);
  });

  describe('cache management', () => {
    it('should clear cache successfully', async () => {
      // Add some data to cache first
      await service.searchMedia('The Matrix', 'Movie');
      
      // Verify cache has data
      const stats = service.getCacheStats();
      expect(stats?.size).toBeGreaterThan(0);

      // Clear cache
      await service.clearCache();

      // Verify cache is empty
      const statsAfter = service.getCacheStats();
      expect(statsAfter?.size).toBe(0);
    }, 10000);

    it('should provide cache statistics', async () => {
      // Clear cache first
      await service.clearCache();

      // Add some cached data
      await service.searchMedia('The Matrix', 'Movie');
      await service.searchMedia('Breaking Bad', 'TV Show');

      const stats = service.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats?.size).toBeGreaterThan(0);
      expect(Array.isArray(stats?.keys)).toBe(true);
      expect(stats?.keys.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('rate limiting', () => {
    it('should handle multiple concurrent requests without errors', async () => {
      const queries = [
        'The Matrix',
        'Breaking Bad',
        'The Godfather',
        'Pulp Fiction',
        'The Dark Knight'
      ];

      // Make multiple concurrent requests
      const promises = queries.map(query => service.searchMedia(query));
      const results = await Promise.all(promises);

      // All requests should succeed
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    }, 20000);
  });
});

// Helper function to check if integration tests should run
export function shouldRunIntegrationTests(): boolean {
  return !!(TMDB_API_KEY && process.env['RUN_INTEGRATION_TESTS'] === 'true');
}

// Export for use in other test files
export { TMDB_API_KEY };