/**
 * Unit tests for TMDBService
 */

import { TMDBService, MediaSearchResult, TVShowDetails, SeasonDetails, EpisodeDetails } from '../TMDBService';
import { IConfigManager } from '../../config/types';
import { ILogger, IServiceCache, ExternalServiceError, AuthenticationError } from '../../types/service';
import { MediaType } from '../../models/index';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock implementations
const mockConfig: jest.Mocked<IConfigManager> = {
  get: jest.fn(),
  getRequired: jest.fn(),
  set: jest.fn(),
  validate: jest.fn(),
  onConfigChange: jest.fn(),
  getAllConfig: jest.fn()
};

const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  createChildLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  } as ILogger)
};

const mockCache: jest.Mocked<IServiceCache> = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn()
};

// Mock axios instance
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

describe('TMDBService', () => {
  let service: TMDBService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default config mocks
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'tmdb.baseUrl') return 'https://api.themoviedb.org/3';
      return undefined;
    });
    mockConfig.getRequired.mockImplementation((key: string) => {
      if (key === 'tmdb.apiKey') return 'test-api-key';
      throw new Error(`Required config key not found: ${key}`);
    });

    // Setup cache mocks
    mockCache.get.mockResolvedValue(null); // No cache by default
    mockCache.set.mockResolvedValue();

    // Setup axios create mock
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    // Setup logger child logger mock
    (mockLogger.createChildLogger as jest.Mock).mockReturnValue(mockLogger);

    service = new TMDBService(mockConfig, mockLogger, mockCache);
  });

  describe('constructor', () => {
    it('should initialize with correct service name and configuration', () => {
      expect(service.serviceName).toBe('TMDB');
      expect(mockConfig.getRequired).toHaveBeenCalledWith('tmdb.apiKey');
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.themoviedb.org/3',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        }
      });
    });

    it('should use custom base URL from config', () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'tmdb.baseUrl') return 'https://custom.tmdb.url';
        return undefined;
      });

      new TMDBService(mockConfig, mockLogger, mockCache);

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom.tmdb.url'
        })
      );
    });
  });

  describe('searchMedia', () => {
    const mockSearchResponse = {
      results: [
        {
          id: 1,
          title: 'Test Movie',
          release_date: '2023-01-01',
          overview: 'A test movie',
          poster_path: '/test-poster.jpg',
          media_type: 'movie'
        },
        {
          id: 2,
          name: 'Test TV Show',
          first_air_date: '2023-02-01',
          overview: 'A test TV show',
          poster_path: '/test-tv-poster.jpg',
          media_type: 'tv'
        }
      ],
      total_results: 2,
      total_pages: 1
    };

    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSearchResponse });
    });

    it('should search for movies successfully', async () => {
      const results = await service.searchMedia('test query', 'Movie');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search/movie', {
        params: { query: 'test query', language: 'en-US' }
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 1,
        name: 'Test Movie',
        year: 2023,
        overview: 'A test movie',
        poster: 'https://image.tmdb.org/t/p/w200/test-poster.jpg',
        type: MediaType.MOVIE
      });
    });

    it('should search for TV shows successfully', async () => {
      const results = await service.searchMedia('test query', 'TV Show');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search/tv', {
        params: { query: 'test query', language: 'en-US' }
      });

      expect(results).toHaveLength(2);
      expect(results[1]).toEqual({
        id: 2,
        name: 'Test TV Show',
        year: 2023,
        overview: 'A test TV show',
        poster: 'https://image.tmdb.org/t/p/w200/test-tv-poster.jpg',
        type: MediaType.TV_SHOW
      });
    });

    it('should perform multi-search when no type specified', async () => {
      await service.searchMedia('test query');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search/multi', {
        params: { query: 'test query', language: 'en-US' }
      });
    });

    it('should handle items without poster images', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          results: [{
            id: 1,
            title: 'Test Movie',
            release_date: '2023-01-01',
            overview: 'A test movie',
            poster_path: null,
            media_type: 'movie'
          }],
          total_results: 1,
          total_pages: 1
        }
      });

      const results = await service.searchMedia('test query');

      expect(results[0]?.poster).toBeNull();
    });

    it('should return cached results when available', async () => {
      const cachedResults: MediaSearchResult[] = [{
        id: 1,
        name: 'Cached Movie',
        year: 2022,
        overview: 'Cached result',
        poster: null,
        type: MediaType.MOVIE
      }];

      mockCache.get.mockResolvedValue(cachedResults);

      const results = await service.searchMedia('test query', 'Movie');

      expect(mockCache.get).toHaveBeenCalledWith('search:Movie:test query');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(results).toEqual(cachedResults);
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache hit for search', {
        query: 'test query',
        type: 'Movie',
        cacheKey: 'search:Movie:test query'
      });
    });

    it('should cache search results', async () => {
      await service.searchMedia('test query', 'Movie');

      expect(mockCache.set).toHaveBeenCalledWith(
        'search:Movie:test query',
        expect.any(Array),
        10 * 60 * 1000 // 10 minutes
      );
    });

    it('should handle non-TMDB media types', async () => {
      const bookResults = await service.searchMedia('test book', 'Book');
      const audiobookResults = await service.searchMedia('test audiobook', 'Audiobook');
      const appResults = await service.searchMedia('test app', 'Application');

      expect(bookResults).toEqual([]);
      expect(audiobookResults).toEqual([]);
      expect(appResults).toEqual([]);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      (apiError as any).response = { status: 500, data: { message: 'Internal Server Error' } };
      mockAxiosInstance.get.mockRejectedValue(apiError);

      await expect(service.searchMedia('test query')).rejects.toThrow(ExternalServiceError);
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).response = { status: 401, data: { message: 'Invalid API key' } };
      mockAxiosInstance.get.mockRejectedValue(authError);

      await expect(service.searchMedia('test query')).rejects.toThrow(AuthenticationError);
    });
  });

  describe('getTVShowDetails', () => {
    const mockTVShowResponse = {
      id: 1,
      name: 'Test TV Show',
      overview: 'A test TV show',
      first_air_date: '2023-01-01',
      number_of_seasons: 2,
      number_of_episodes: 20,
      seasons: [
        {
          id: 101,
          season_number: 1,
          name: 'Season 1',
          episode_count: 10,
          air_date: '2023-01-01',
          overview: 'First season',
          poster_path: '/season1.jpg'
        },
        {
          id: 102,
          season_number: 2,
          name: 'Season 2',
          episode_count: 10,
          air_date: '2023-06-01',
          overview: 'Second season',
          poster_path: '/season2.jpg'
        }
      ]
    };

    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockTVShowResponse });
    });

    it('should get TV show details successfully', async () => {
      const details = await service.getTVShowDetails(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tv/1', {
        params: { language: 'en-US' }
      });

      expect(details).toEqual({
        id: 1,
        name: 'Test TV Show',
        overview: 'A test TV show',
        first_air_date: '2023-01-01',
        number_of_seasons: 2,
        number_of_episodes: 20,
        seasons: [
          {
            id: 101,
            season_number: 1,
            name: 'Season 1',
            episode_count: 10,
            air_date: '2023-01-01',
            overview: 'First season',
            poster_path: '/season1.jpg'
          },
          {
            id: 102,
            season_number: 2,
            name: 'Season 2',
            episode_count: 10,
            air_date: '2023-06-01',
            overview: 'Second season',
            poster_path: '/season2.jpg'
          }
        ]
      });
    });

    it('should return cached TV show details when available', async () => {
      const cachedDetails: TVShowDetails = {
        id: 1,
        name: 'Cached TV Show',
        number_of_seasons: 1,
        number_of_episodes: 10,
        seasons: []
      };

      mockCache.get.mockResolvedValue(cachedDetails);

      const details = await service.getTVShowDetails(1);

      expect(mockCache.get).toHaveBeenCalledWith('tv:1');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(details).toEqual(cachedDetails);
    });

    it('should cache TV show details', async () => {
      await service.getTVShowDetails(1);

      expect(mockCache.set).toHaveBeenCalledWith(
        'tv:1',
        expect.any(Object),
        60 * 60 * 1000 // 1 hour
      );
    });
  });

  describe('getSeasonDetails', () => {
    const mockSeasonResponse = {
      season_number: 1,
      name: 'Season 1',
      overview: 'First season',
      air_date: '2023-01-01',
      episodes: [
        {
          id: 1001,
          episode_number: 1,
          name: 'Episode 1',
          overview: 'First episode',
          air_date: '2023-01-01',
          runtime: 45
        },
        {
          id: 1002,
          episode_number: 2,
          name: 'Episode 2',
          overview: 'Second episode',
          air_date: '2023-01-08',
          runtime: 45
        }
      ]
    };

    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSeasonResponse });
    });

    it('should get season details successfully', async () => {
      const details = await service.getSeasonDetails(1, 1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tv/1/season/1', {
        params: { language: 'en-US' }
      });

      expect(details).toEqual({
        season_number: 1,
        name: 'Season 1',
        overview: 'First season',
        air_date: '2023-01-01',
        episodes: [
          {
            id: 1001,
            episode_number: 1,
            name: 'Episode 1',
            overview: 'First episode',
            air_date: '2023-01-01',
            runtime: 45
          },
          {
            id: 1002,
            episode_number: 2,
            name: 'Episode 2',
            overview: 'Second episode',
            air_date: '2023-01-08',
            runtime: 45
          }
        ]
      });
    });

    it('should return cached season details when available', async () => {
      const cachedDetails: SeasonDetails = {
        season_number: 1,
        name: 'Cached Season',
        episodes: []
      };

      mockCache.get.mockResolvedValue(cachedDetails);

      const details = await service.getSeasonDetails(1, 1);

      expect(mockCache.get).toHaveBeenCalledWith('season:1:1');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(details).toEqual(cachedDetails);
    });

    it('should cache season details', async () => {
      await service.getSeasonDetails(1, 1);

      expect(mockCache.set).toHaveBeenCalledWith(
        'season:1:1',
        expect.any(Object),
        60 * 60 * 1000 // 1 hour
      );
    });
  });

  describe('getEpisodeDetails', () => {
    const mockEpisodeResponse = {
      episode_number: 1,
      season_number: 1,
      name: 'Episode 1',
      overview: 'First episode',
      air_date: '2023-01-01',
      runtime: 45
    };

    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockEpisodeResponse });
    });

    it('should get episode details successfully', async () => {
      const details = await service.getEpisodeDetails(1, 1, 1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tv/1/season/1/episode/1', {
        params: { language: 'en-US' }
      });

      expect(details).toEqual({
        episode_number: 1,
        season_number: 1,
        name: 'Episode 1',
        overview: 'First episode',
        air_date: '2023-01-01',
        runtime: 45
      });
    });

    it('should return cached episode details when available', async () => {
      const cachedDetails: EpisodeDetails = {
        episode_number: 1,
        season_number: 1,
        name: 'Cached Episode'
      };

      mockCache.get.mockResolvedValue(cachedDetails);

      const details = await service.getEpisodeDetails(1, 1, 1);

      expect(mockCache.get).toHaveBeenCalledWith('episode:1:1:1');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(details).toEqual(cachedDetails);
    });

    it('should cache episode details', async () => {
      await service.getEpisodeDetails(1, 1, 1);

      expect(mockCache.set).toHaveBeenCalledWith(
        'episode:1:1:1',
        expect.any(Object),
        60 * 60 * 1000 // 1 hour
      );
    });
  });

  describe('cache management', () => {
    it('should clear all cached data', async () => {
      await service.clearCache();

      expect(mockCache.clear).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('TMDB cache cleared');
    });

    it('should return cache statistics when available', () => {
      const mockStats = { size: 5, keys: ['key1', 'key2'] };
      (mockCache as any).getStats = jest.fn().mockReturnValue(mockStats);

      const stats = service.getCacheStats();

      expect(stats).toEqual(mockStats);
    });

    it('should return null when cache stats not available', () => {
      // Remove getStats method from cache mock for this test
      delete (mockCache as any).getStats;
      
      const stats = service.getCacheStats();

      expect(stats).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should retry failed requests according to configuration', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({ data: { results: [], total_results: 0, total_pages: 0 } });

      await service.searchMedia('test query');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).response = { status: 401, data: { message: 'Invalid API key' } };
      mockAxiosInstance.get.mockRejectedValue(authError);

      await expect(service.searchMedia('test query')).rejects.toThrow(AuthenticationError);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should log successful requests', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { results: [], total_results: 0, total_pages: 0 }
      });

      await service.searchMedia('test query');

      expect(mockLogger.info).toHaveBeenCalledWith('Media search completed', {
        query: 'test query',
        type: undefined,
        resultCount: 0
      });
    });
  });
});