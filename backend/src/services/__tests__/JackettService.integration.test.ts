/**
 * Integration tests for JackettService
 */

import { JackettService } from '../jackettService.js';
import { IConfigManager } from '../../config/types.js';
import { ILogger } from '../../types/service.js';
import axios from 'axios';

// Mock axios for controlled testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create mock implementations
const createMockConfig = (): jest.Mocked<IConfigManager> => ({
  get: jest.fn(),
  set: jest.fn(),
  getRequired: jest.fn(),
  validate: jest.fn(),
  onConfigChange: jest.fn(),
  getAllConfig: jest.fn(),
});

const createMockLogger = (): jest.Mocked<ILogger> => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  createChildLogger: jest.fn().mockReturnThis(),
});

describe('JackettService Integration Tests', () => {
  let service: JackettService;
  let mockConfig: jest.Mocked<IConfigManager>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockConfig = createMockConfig();
    mockLogger = createMockLogger();
    
    // Setup default config
    mockConfig.get.mockImplementation((key: string) => {
      switch (key) {
        case 'jackett.url':
          return 'http://localhost:9117';
        case 'jackett.apiKey':
          return 'test-api-key-123';
        default:
          return undefined;
      }
    });

    // Create axios instance mock
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

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    service = new JackettService(mockConfig, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Real Jackett API Integration', () => {
    const mockJackettSearchResponse = {
      data: {
        Results: [
          {
            Title: 'The Matrix 1999 1080p BluRay x264-GROUP',
            MagnetUri: 'magnet:?xt=urn:btih:abcd1234567890abcd1234567890abcd12345678',
            Link: null,
            Size: 8589934592, // 8GB
            Seeders: 150,
            Peers: 25,
            Tracker: 'TestTracker',
            PublishDate: '2023-01-15T10:30:00Z'
          },
          {
            Title: 'The Matrix 1999 720p BluRay x265-HEVC',
            MagnetUri: null,
            Link: 'http://example.com/torrent/matrix720p.torrent',
            Size: 4294967296, // 4GB
            Seeders: 75,
            Peers: 12,
            Tracker: 'AnotherTracker',
            PublishDate: '2023-01-14T15:45:00Z'
          },
          {
            Title: 'The Matrix 1999 2160p UHD BluRay x265 HDR10-ULTRA',
            MagnetUri: 'magnet:?xt=urn:btih:efgh5678901234efgh5678901234efgh56789012',
            Link: null,
            Size: 21474836480, // 20GB
            Seeders: 45,
            Peers: 8,
            Tracker: 'UltraTracker',
            PublishDate: '2023-01-16T08:20:00Z'
          }
        ]
      }
    };

    beforeEach(() => {
      // Mock the HTTP client get method
      const mockHttpClient = service.getHttpClient();
      jest.spyOn(mockHttpClient, 'get').mockResolvedValue(mockJackettSearchResponse);
    });

    it('should perform a complete search workflow', async () => {
      const searchParams = {
        query: 'The Matrix',
        type: 'Movie' as const,
        qualityPrefs: {
          minSeeders: 40,
          maxResults: 10
        }
      };

      const results = await service.searchTorrents(searchParams);

      // Verify results structure
      expect(results).toHaveLength(3);
      
      // Check first result (should be sorted by seeders - highest first)
      const topResult = results[0]!;
      expect(topResult.name).toBe('The Matrix 1999 1080p BluRay x264-GROUP');
      expect(topResult.seeders).toBe(150);
      expect(topResult.resolution).toBe('1080p');
      expect(topResult.codec).toBe('x264');
      expect(topResult.hdr).toBe(false);
      expect(topResult.sizeFormatted).toBe('8.00 GB');
      expect(topResult.magnet).toContain('magnet:?xt=urn:btih:');

      // Check second result
      const secondResult = results[1]!;
      expect(secondResult.seeders).toBe(75);
      expect(secondResult.resolution).toBe('720p');
      expect(secondResult.codec).toBe('x265');

      // Check third result (4K HDR)
      const thirdResult = results[2]!;
      expect(thirdResult.resolution).toBe('2160p');
      expect(thirdResult.hdr).toBe(true);
      expect(thirdResult.qualityScore).toBeGreaterThan(topResult.qualityScore); // Higher quality but fewer seeders
    });

    it('should handle quality filtering correctly', async () => {
      const searchParams = {
        query: 'The Matrix',
        type: 'Movie' as const,
        qualityPrefs: {
          resolution: '1080p',
          minSeeders: 100
        }
      };

      const results = await service.searchTorrents(searchParams);

      expect(results).toHaveLength(1);
      expect(results[0]!.resolution).toBe('1080p');
      expect(results[0]!.seeders).toBeGreaterThanOrEqual(100);
    });

    it('should handle empty results gracefully', async () => {
      const mockHttpClient = service.getHttpClient();
      jest.spyOn(mockHttpClient, 'get').mockResolvedValue({ data: { Results: [] } });

      const results = await service.searchTorrents({ query: 'NonexistentMovie12345' });

      expect(results).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('No torrents found', 
        expect.objectContaining({ query: 'NonexistentMovie12345' }));
    });

    it('should respect maxResults limit', async () => {
      const searchParams = {
        query: 'The Matrix',
        qualityPrefs: { maxResults: 2 }
      };

      const results = await service.searchTorrents(searchParams);

      expect(results).toHaveLength(2);
    });

    it('should handle different media types with correct categories', async () => {
      const mockHttpClient = service.getHttpClient();
      const getSpy = jest.spyOn(mockHttpClient, 'get');

      // Test Movie category
      await service.searchTorrents({ query: 'Avengers', type: 'Movie' });
      expect(getSpy).toHaveBeenCalledWith('/api/v2.0/indexers/all/results', 
        { params: expect.objectContaining({ Category: '2000' }) });

      // Test TV Show category
      await service.searchTorrents({ query: 'Breaking Bad', type: 'TV Show' });
      expect(getSpy).toHaveBeenCalledWith('/api/v2.0/indexers/all/results', 
        { params: expect.objectContaining({ Category: '5000' }) });

      // Test Book category
      await service.searchTorrents({ query: 'Programming Book', type: 'Book' });
      expect(getSpy).toHaveBeenCalledWith('/api/v2.0/indexers/all/results', 
        { params: expect.objectContaining({ Category: '7000,8000' }) });
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const mockHttpClient = service.getHttpClient();
      jest.spyOn(mockHttpClient, 'get').mockResolvedValue({ 
        data: { indexers: [{ id: 'test', name: 'Test Indexer' }] } 
      });

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Jackett connection successful');
    });

    it('should handle connection test failure', async () => {
      const mockHttpClient = service.getHttpClient();
      jest.spyOn(mockHttpClient, 'get').mockRejectedValue(new Error('Network error'));

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error in Jackett: Network error');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle 401 authentication errors', async () => {
      const mockHttpClient = service.getHttpClient();
      const authError = new Error('Unauthorized') as any;
      authError.response = { status: 401, data: { error: 'Invalid API key' } };
      
      jest.spyOn(mockHttpClient, 'get').mockRejectedValue(authError);

      await expect(service.searchTorrents({ query: 'test' }))
        .rejects.toThrow('Authentication failed for Jackett: Invalid API key');
    });

    it('should handle connection refused errors', async () => {
      const mockHttpClient = service.getHttpClient();
      const connError = new Error('Connection refused') as any;
      connError.code = 'ECONNREFUSED';
      
      jest.spyOn(mockHttpClient, 'get').mockRejectedValue(connError);

      await expect(service.searchTorrents({ query: 'test' }))
        .rejects.toThrow('Network error in Jackett: Connection refused');
    });

    it('should handle timeout errors', async () => {
      const mockHttpClient = service.getHttpClient();
      const timeoutError = new Error('Timeout') as any;
      timeoutError.code = 'ECONNABORTED';
      
      jest.spyOn(mockHttpClient, 'get').mockRejectedValue(timeoutError);

      await expect(service.searchTorrents({ query: 'test' }))
        .rejects.toThrow(/timeout/i);
    });
  });

  describe('Retry Mechanism Integration', () => {
    it('should retry on server errors', async () => {
      const mockHttpClient = service.getHttpClient();
      const serverError = new Error('Server Error') as any;
      serverError.response = { status: 500, data: { error: 'Internal server error' } };
      
      const getSpy = jest.spyOn(mockHttpClient, 'get')
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ data: { Results: [] } });

      const results = await service.searchTorrents({ query: 'test' });

      expect(getSpy).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(results).toHaveLength(0);
    });

    it('should not retry on client errors', async () => {
      const mockHttpClient = service.getHttpClient();
      const clientError = new Error('Bad Request') as any;
      clientError.response = { status: 400, data: { error: 'Bad request' } };
      
      const getSpy = jest.spyOn(mockHttpClient, 'get').mockRejectedValue(clientError);

      await expect(service.searchTorrents({ query: 'test' }))
        .rejects.toThrow();

      expect(getSpy).toHaveBeenCalledTimes(1); // No retries for 4xx errors
    });
  });

  describe('Logging Integration', () => {
    it('should log search operations', async () => {
      const mockHttpClient = service.getHttpClient();
      jest.spyOn(mockHttpClient, 'get').mockResolvedValue({ data: { Results: [] } });

      await service.searchTorrents({ 
        query: 'Test Movie', 
        type: 'Movie',
        qualityPrefs: { minSeeders: 10 }
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Searching torrents', 
        expect.objectContaining({
          query: 'Test Movie',
          type: 'Movie',
          qualityPrefs: { minSeeders: 10 },
          service: 'Jackett'
        }));

      expect(mockLogger.info).toHaveBeenCalledWith('No torrents found',
        expect.objectContaining({
          query: 'Test Movie',
          type: 'Movie'
        }));
    });

    it('should log errors appropriately', async () => {
      const mockHttpClient = service.getHttpClient();
      const error = new Error('Test error');
      jest.spyOn(mockHttpClient, 'get').mockRejectedValue(error);

      await expect(service.searchTorrents({ query: 'test' }))
        .rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith('Torrent search failed',
        expect.objectContaining({
          query: 'test',
          error: 'Network error in Jackett: Test error'
        }));
    });
  });

  describe('Configuration Integration', () => {
    it('should use custom Jackett URL from config', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        switch (key) {
          case 'jackett.url':
            return 'http://custom-jackett:9117';
          case 'jackett.apiKey':
            return 'custom-api-key';
          default:
            return undefined;
        }
      });

      const customService = new JackettService(mockConfig, mockLogger);
      const mockHttpClient = customService.getHttpClient();
      jest.spyOn(mockHttpClient, 'get').mockResolvedValue({ data: { Results: [] } });

      await customService.searchTorrents({ query: 'test' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v2.0/indexers/all/results',
        { params: expect.objectContaining({ apikey: 'custom-api-key' }) });
    });

    it('should handle missing configuration gracefully', async () => {
      mockConfig.get.mockReturnValue(undefined);

      await expect(service.searchTorrents({ query: 'test' }))
        .rejects.toThrow('Jackett API key not configured');
    });
  });
});