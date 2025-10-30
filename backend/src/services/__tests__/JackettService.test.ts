/**
 * Unit tests for JackettService
 */

import { JackettService, JackettConnectionError, JackettAuthenticationError } from '../jackettService.js';
import { IConfigManager } from '../../config/types.js';
import { ILogger } from '../../types/service.js';
import { AxiosError } from 'axios';
import axios from 'axios';

// Mock axios
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

describe('JackettService', () => {
  let service: JackettService;
  let mockConfig: jest.Mocked<IConfigManager>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockConfig = createMockConfig();
    mockLogger = createMockLogger();
    
    // Default config values
    mockConfig.get.mockImplementation((key: string) => {
      switch (key) {
        case 'jackett.url':
          return 'http://localhost:9117';
        case 'jackett.apiKey':
          return 'test-api-key';
        default:
          return undefined;
      }
    });

    // Mock axios.create to return a mock axios instance
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

  describe('constructor', () => {
    it('should initialize with correct service name', () => {
      expect(service.serviceName).toBe('Jackett');
    });

    it('should create child logger', () => {
      expect(mockLogger.createChildLogger).toHaveBeenCalledWith('Jackett');
    });
  });

  describe('searchTorrents', () => {
    const mockJackettResponse = {
      Results: [
        {
          Title: 'Test Movie 2023 1080p x264',
          MagnetUri: 'magnet:?xt=urn:btih:test123',
          Size: 1073741824, // 1GB
          Seeders: 10,
          Peers: 5,
          Tracker: 'TestTracker',
          PublishDate: '2023-01-01T00:00:00Z'
        },
        {
          Title: 'Another Movie 2023 720p x265',
          Link: 'http://example.com/torrent',
          Size: 536870912, // 512MB
          Seeders: 20,
          Peers: 8,
          Tracker: 'AnotherTracker',
          PublishDate: '2023-01-02T00:00:00Z'
        }
      ]
    };

    beforeEach(() => {
      // Mock the get method from BaseService to return our test data
      jest.spyOn(service as any, 'get').mockResolvedValue(mockJackettResponse);
    });

    it('should search torrents successfully', async () => {
      const params = {
        query: 'Test Movie',
        type: 'Movie' as const,
        qualityPrefs: { minSeeders: 5 }
      };

      const results = await service.searchTorrents(params);

      expect(results).toHaveLength(2);
      // Results should be sorted by seeders (20 > 10), so "Another Movie" comes first
      expect(results[0]).toMatchObject({
        name: 'Another Movie 2023 720p x265',
        magnet: 'http://example.com/torrent',
        seeders: 20,
        resolution: '720p',
        codec: 'x265'
      });
      expect(results[1]).toMatchObject({
        name: 'Test Movie 2023 1080p x264',
        magnet: 'magnet:?xt=urn:btih:test123',
        seeders: 10,
        resolution: '1080p',
        codec: 'x264'
      });
    });

    it('should sort results by seeders then quality', async () => {
      const params = { query: 'Test Movie' };
      const results = await service.searchTorrents(params);

      // Should be sorted by seeders (20 > 10)
      expect(results[0]!.seeders).toBe(20);
      expect(results[1]!.seeders).toBe(10);
    });

    it('should filter by minimum seeders', async () => {
      const params = {
        query: 'Test Movie',
        qualityPrefs: { minSeeders: 15 }
      };

      const results = await service.searchTorrents(params);

      expect(results).toHaveLength(1);
      expect(results[0]!.seeders).toBe(20);
    });

    it('should filter by resolution', async () => {
      const params = {
        query: 'Test Movie',
        qualityPrefs: { resolution: '1080p' }
      };

      const results = await service.searchTorrents(params);

      expect(results).toHaveLength(1);
      expect(results[0]!.resolution).toBe('1080p');
    });

    it('should limit results by maxResults', async () => {
      const params = {
        query: 'Test Movie',
        qualityPrefs: { maxResults: 1 }
      };

      const results = await service.searchTorrents(params);

      expect(results).toHaveLength(1);
    });

    it('should return empty array when no results found', async () => {
      jest.spyOn(service as any, 'get').mockResolvedValue({ Results: [] });

      const params = { query: 'Nonexistent Movie' };
      const results = await service.searchTorrents(params);

      expect(results).toHaveLength(0);
    });

    it('should validate search parameters', async () => {
      // Test empty query
      await expect(service.searchTorrents({ query: '' }))
        .rejects.toThrow('Search query is required and must be a non-empty string');

      // Test long query
      await expect(service.searchTorrents({ query: 'a'.repeat(201) }))
        .rejects.toThrow('Search query is too long (maximum 200 characters)');

      // Test negative minSeeders
      await expect(service.searchTorrents({ 
        query: 'test', 
        qualityPrefs: { minSeeders: -1 } 
      })).rejects.toThrow('Minimum seeders must be a non-negative number');

      // Test maxResults too low
      await expect(service.searchTorrents({ 
        query: 'test', 
        qualityPrefs: { maxResults: 0 } 
      })).rejects.toThrow('Maximum results must be between 1 and 100');

      // Test maxResults too high
      await expect(service.searchTorrents({ 
        query: 'test', 
        qualityPrefs: { maxResults: 101 } 
      })).rejects.toThrow('Maximum results must be between 1 and 100');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Request failed') as AxiosError;
      authError.response = { status: 401 } as any;
      
      jest.spyOn(service as any, 'get').mockRejectedValue(authError);

      await expect(service.searchTorrents({ query: 'test' }))
        .rejects.toThrow(JackettAuthenticationError);
    });

    it('should handle connection errors', async () => {
      const connError = new Error('Connection refused') as AxiosError;
      connError.code = 'ECONNREFUSED';
      
      jest.spyOn(service as any, 'get').mockRejectedValue(connError);

      await expect(service.searchTorrents({ query: 'test' }))
        .rejects.toThrow(JackettConnectionError);
    });

    it('should handle missing API key', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'jackett.apiKey') return undefined;
        return 'http://localhost:9117';
      });

      await expect(service.searchTorrents({ query: 'test' }))
        .rejects.toThrow(JackettAuthenticationError);
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      jest.spyOn(service as any, 'get').mockResolvedValue({ indexers: [] });

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Jackett connection successful');
    });

    it('should return failure for invalid connection', async () => {
      const error = new Error('Connection failed');
      jest.spyOn(service as any, 'get').mockRejectedValue(error);

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection failed');
    });
  });

  describe('torrent title parsing', () => {
    it('should parse resolution correctly', async () => {
      const mockResponse = {
        Results: [{
          Title: 'Movie 2160p UHD BluRay x265',
          MagnetUri: 'magnet:test',
          Size: 1000000000,
          Seeders: 10,
          Peers: 5,
          Tracker: 'Test',
          PublishDate: '2023-01-01'
        }]
      };

      jest.spyOn(service as any, 'get').mockResolvedValue(mockResponse);

      const results = await service.searchTorrents({ query: 'test' });
      expect(results[0]!.resolution).toBe('2160p');
    });

    it('should parse codec correctly', async () => {
      const mockResponse = {
        Results: [{
          Title: 'Movie 1080p x265 HEVC',
          MagnetUri: 'magnet:test',
          Size: 1000000000,
          Seeders: 10,
          Peers: 5,
          Tracker: 'Test',
          PublishDate: '2023-01-01'
        }]
      };

      jest.spyOn(service as any, 'get').mockResolvedValue(mockResponse);

      const results = await service.searchTorrents({ query: 'test' });
      expect(results[0]!.codec).toBe('x265');
    });

    it('should detect HDR content', async () => {
      const mockResponse = {
        Results: [{
          Title: 'Movie 2160p HDR10 x265',
          MagnetUri: 'magnet:test',
          Size: 1000000000,
          Seeders: 10,
          Peers: 5,
          Tracker: 'Test',
          PublishDate: '2023-01-01'
        }]
      };

      jest.spyOn(service as any, 'get').mockResolvedValue(mockResponse);

      const results = await service.searchTorrents({ query: 'test' });
      expect(results[0]!.hdr).toBe(true);
    });
  });

  describe('quality scoring', () => {
    it('should score higher resolution better', async () => {
      const mockResponse = {
        Results: [
          {
            Title: 'Movie 720p x264',
            MagnetUri: 'magnet:test1',
            Size: 1000000000,
            Seeders: 10,
            Peers: 5,
            Tracker: 'Test',
            PublishDate: '2023-01-01'
          },
          {
            Title: 'Movie 1080p x264',
            MagnetUri: 'magnet:test2',
            Size: 2000000000,
            Seeders: 10, // Same seeders to test quality scoring
            Peers: 5,
            Tracker: 'Test',
            PublishDate: '2023-01-01'
          }
        ]
      };

      jest.spyOn(service as any, 'get').mockResolvedValue(mockResponse);

      const results = await service.searchTorrents({ query: 'test' });
      
      // 1080p should have higher quality score than 720p
      const result1080p = results.find(r => r.resolution === '1080p');
      const result720p = results.find(r => r.resolution === '720p');
      
      expect(result1080p!.qualityScore).toBeGreaterThan(result720p!.qualityScore);
    });

    it('should score x265 codec higher than x264', async () => {
      const mockResponse = {
        Results: [
          {
            Title: 'Movie 1080p x264',
            MagnetUri: 'magnet:test1',
            Size: 1000000000,
            Seeders: 10,
            Peers: 5,
            Tracker: 'Test',
            PublishDate: '2023-01-01'
          },
          {
            Title: 'Movie 1080p x265',
            MagnetUri: 'magnet:test2',
            Size: 1000000000,
            Seeders: 10,
            Peers: 5,
            Tracker: 'Test',
            PublishDate: '2023-01-01'
          }
        ]
      };

      jest.spyOn(service as any, 'get').mockResolvedValue(mockResponse);

      const results = await service.searchTorrents({ query: 'test' });
      
      const resultx265 = results.find(r => r.codec === 'x265');
      const resultx264 = results.find(r => r.codec === 'x264');
      
      expect(resultx265!.qualityScore).toBeGreaterThan(resultx264!.qualityScore);
    });
  });

  describe('category mapping', () => {
    it('should map media types to correct categories', async () => {
      const mockHttpClient = service.getHttpClient();
      const getSpy = jest.spyOn(mockHttpClient, 'get').mockResolvedValue({ data: { Results: [] } });
      
      await service.searchTorrents({ query: 'test', type: 'Movie' });
      expect(getSpy).toHaveBeenCalledWith('/api/v2.0/indexers/all/results', 
        { params: expect.objectContaining({ Category: '2000' }) });

      await service.searchTorrents({ query: 'test', type: 'TV Show' });
      expect(getSpy).toHaveBeenCalledWith('/api/v2.0/indexers/all/results', 
        { params: expect.objectContaining({ Category: '5000' }) });

      await service.searchTorrents({ query: 'test', type: 'Book' });
      expect(getSpy).toHaveBeenCalledWith('/api/v2.0/indexers/all/results', 
        { params: expect.objectContaining({ Category: '7000,8000' }) });
    });
  });

  describe('size formatting', () => {
    it('should format bytes correctly', async () => {
      const mockResponse = {
        Results: [{
          Title: 'Test Movie',
          MagnetUri: 'magnet:test',
          Size: 1073741824, // 1GB
          Seeders: 10,
          Peers: 5,
          Tracker: 'Test',
          PublishDate: '2023-01-01'
        }]
      };

      jest.spyOn(service as any, 'get').mockResolvedValue(mockResponse);

      const results = await service.searchTorrents({ query: 'test' });
      expect(results[0]!.sizeFormatted).toBe('1.00 GB');
    });

    it('should handle unknown size', async () => {
      const mockResponse = {
        Results: [{
          Title: 'Test Movie',
          MagnetUri: 'magnet:test',
          Size: 0,
          Seeders: 10,
          Peers: 5,
          Tracker: 'Test',
          PublishDate: '2023-01-01'
        }]
      };

      jest.spyOn(service as any, 'get').mockResolvedValue(mockResponse);

      const results = await service.searchTorrents({ query: 'test' });
      expect(results[0]!.sizeFormatted).toBe('Unknown');
    });
  });
});