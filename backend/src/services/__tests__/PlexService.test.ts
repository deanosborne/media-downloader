/**
 * Unit tests for PlexService
 */

import { PlexService, MoveToPlexOptions, SeasonPackMoveOptions } from '../plexService.js';
import { IConfigManager } from '../../config/types.js';
import { ILogger } from '../../types/service.js';
import fs from 'fs-extra';
import path from 'path';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('PlexService', () => {
  let service: PlexService;
  let mockConfig: jest.Mocked<IConfigManager>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock config
    mockConfig = {
      get: jest.fn(),
      getRequired: jest.fn(),
      set: jest.fn(),
      validate: jest.fn(),
      onConfigChange: jest.fn()
    } as jest.Mocked<IConfigManager>;

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      createChildLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      })
    } as jest.Mocked<ILogger>;

    // Setup default config values
    mockConfig.getRequired.mockImplementation((key: string) => {
      switch (key) {
        case 'plex.url':
          return 'http://localhost:32400';
        case 'plex.token':
          return 'test-token';
        case 'plex.paths':
          return {
            movies: '/movies',
            tvShows: '/tv',
            books: '/books',
            audiobooks: '/audiobooks'
          };
        default:
          throw new Error(`Config key not found: ${key}`);
      }
    });

    mockConfig.get.mockImplementation((key: string) => {
      switch (key) {
        case 'plex.token':
          return 'test-token';
        case 'download.path':
          return '/downloads';
        default:
          return undefined;
      }
    });

    service = new PlexService(mockConfig, mockLogger);
  });

  describe('constructor', () => {
    it('should create service with correct configuration', () => {
      expect(service).toBeInstanceOf(PlexService);
      expect(service.serviceName).toBe('Plex');
      expect(mockLogger.createChildLogger).toHaveBeenCalledWith('Plex');
    });
  });

  describe('refreshLibrary', () => {
    it('should refresh library successfully', async () => {
      // Mock successful HTTP request
      const mockGet = jest.spyOn(service as any, 'get').mockResolvedValue({});

      await service.refreshLibrary();

      expect(mockGet).toHaveBeenCalledWith('/library/sections/all/refresh');
      expect(mockLogger.createChildLogger().info).toHaveBeenCalledWith(
        'Plex library refresh triggered successfully'
      );
    });

    it('should skip refresh when token is not configured', async () => {
      mockConfig.get.mockReturnValue(undefined);

      await service.refreshLibrary();

      expect(mockLogger.createChildLogger().warn).toHaveBeenCalledWith(
        'Plex token not configured, skipping library refresh'
      );
    });

    it('should handle refresh errors', async () => {
      const error = new Error('Network error');
      const mockGet = jest.spyOn(service as any, 'get').mockRejectedValue(error);

      await expect(service.refreshLibrary()).rejects.toThrow('Network error');
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Failed to refresh Plex library',
        { error }
      );
    });
  });

  describe('moveToPlexLibrary', () => {
    const mockOptions: MoveToPlexOptions = {
      filePath: '/downloads/test-movie.mkv',
      type: 'Movie',
      name: 'Test Movie',
      year: 2023
    };

    beforeEach(() => {
      mockPath.dirname.mockReturnValue('/movies/Test Movie (2023)');
      mockPath.join.mockReturnValue('/movies/Test Movie (2023)/Test Movie (2023).mkv');
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.move.mockResolvedValue(undefined);
    });

    it('should move movie file successfully', async () => {
      const mockRefreshLibrary = jest.spyOn(service, 'refreshLibrary').mockResolvedValue();

      const result = await service.moveToPlexLibrary(mockOptions);

      expect(mockFs.ensureDir).toHaveBeenCalledWith('/movies/Test Movie (2023)');
      expect(mockFs.move).toHaveBeenCalledWith(
        '/downloads/test-movie.mkv',
        '/movies/Test Movie (2023)/Test Movie (2023).mkv',
        { overwrite: false }
      );
      expect(mockRefreshLibrary).toHaveBeenCalled();
      expect(result).toBe('/movies/Test Movie (2023)/Test Movie (2023).mkv');
    });

    it('should move TV show episode successfully', async () => {
      const tvOptions: MoveToPlexOptions = {
        filePath: '/downloads/test-show-s01e01.mkv',
        type: 'TV Show',
        name: 'Test Show',
        season: 1,
        episode: 1,
        episodeName: 'Pilot'
      };

      mockPath.join.mockReturnValue('/tv/Test Show/Season 01/Test Show - S01E01 - Pilot.mkv');
      const mockRefreshLibrary = jest.spyOn(service, 'refreshLibrary').mockResolvedValue();

      const result = await service.moveToPlexLibrary(tvOptions);

      expect(result).toBe('/tv/Test Show/Season 01/Test Show - S01E01 - Pilot.mkv');
      expect(mockRefreshLibrary).toHaveBeenCalled();
    });

    it('should throw error for TV show without season/episode', async () => {
      const invalidOptions: MoveToPlexOptions = {
        filePath: '/downloads/test-show.mkv',
        type: 'TV Show',
        name: 'Test Show'
      };

      await expect(service.moveToPlexLibrary(invalidOptions)).rejects.toThrow(
        'Season and episode are required for TV shows'
      );
    });

    it('should handle file move errors', async () => {
      const error = new Error('File move failed');
      mockFs.move.mockRejectedValue(error);

      await expect(service.moveToPlexLibrary(mockOptions)).rejects.toThrow('File move failed');
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Failed to move file to Plex library',
        { error, options: mockOptions }
      );
    });
  });

  describe('moveSeasonPackToPlexLibrary', () => {
    const mockOptions: SeasonPackMoveOptions = {
      directoryPath: '/downloads/test-show-season-1',
      showName: 'Test Show',
      season: 1,
      episodes: [
        { episode_number: 1, name: 'Pilot' },
        { episode_number: 2, name: 'Episode 2' }
      ]
    };

    beforeEach(() => {
      mockFs.readdir.mockResolvedValue(['test-show-s01e01.mkv', 'test-show-s01e02.mkv', 'readme.txt'] as any);
      mockPath.extname.mockImplementation((file: string) => {
        if (file.endsWith('.mkv')) return '.mkv';
        if (file.endsWith('.txt')) return '.txt';
        return '';
      });
      mockPath.join.mockImplementation((...paths: string[]) => paths.join('/'));
      mockPath.dirname.mockReturnValue('/tv/Test Show/Season 01');
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.move.mockResolvedValue(undefined);
    });

    it('should move season pack successfully', async () => {
      const mockRefreshLibrary = jest.spyOn(service, 'refreshLibrary').mockResolvedValue();

      const result = await service.moveSeasonPackToPlexLibrary(mockOptions);

      expect(mockFs.readdir).toHaveBeenCalledWith('/downloads/test-show-season-1');
      expect(mockFs.move).toHaveBeenCalledTimes(2); // Only video files
      expect(mockRefreshLibrary).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should skip non-video files', async () => {
      const mockRefreshLibrary = jest.spyOn(service, 'refreshLibrary').mockResolvedValue();

      await service.moveSeasonPackToPlexLibrary(mockOptions);

      // Should only move .mkv files, not .txt
      expect(mockFs.move).toHaveBeenCalledTimes(2);
      expect(mockLogger.createChildLogger().debug).toHaveBeenCalledWith(
        'Skipping non-video file',
        { file: 'readme.txt' }
      );
    });

    it('should handle directory read errors', async () => {
      const error = new Error('Directory read failed');
      mockFs.readdir.mockRejectedValue(error);

      await expect(service.moveSeasonPackToPlexLibrary(mockOptions)).rejects.toThrow(
        'Directory read failed'
      );
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Failed to move season pack to Plex library',
        { error, options: mockOptions }
      );
    });
  });

  describe('checkConnection', () => {
    it('should return true for successful connection', async () => {
      const mockGet = jest.spyOn(service as any, 'get').mockResolvedValue({});

      const result = await service.checkConnection();

      expect(result).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('/');
    });

    it('should return false for failed connection', async () => {
      const error = new Error('Connection failed');
      const mockGet = jest.spyOn(service as any, 'get').mockRejectedValue(error);

      const result = await service.checkConnection();

      expect(result).toBe(false);
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Plex connection check failed',
        { error }
      );
    });
  });

  describe('getServerInfo', () => {
    it('should return server info successfully', async () => {
      const mockServerInfo = { name: 'Test Plex Server' };
      const mockGet = jest.spyOn(service as any, 'get').mockResolvedValue(mockServerInfo);

      const result = await service.getServerInfo();

      expect(result).toEqual(mockServerInfo);
      expect(mockGet).toHaveBeenCalledWith('/');
    });

    it('should handle server info errors', async () => {
      const error = new Error('Server info failed');
      const mockGet = jest.spyOn(service as any, 'get').mockRejectedValue(error);

      await expect(service.getServerInfo()).rejects.toThrow('Server info failed');
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Failed to get Plex server info',
        { error }
      );
    });
  });

  describe('getLibrarySections', () => {
    it('should return library sections successfully', async () => {
      const mockSections = { sections: [] };
      const mockGet = jest.spyOn(service as any, 'get').mockResolvedValue(mockSections);

      const result = await service.getLibrarySections();

      expect(result).toEqual(mockSections);
      expect(mockGet).toHaveBeenCalledWith('/library/sections');
    });

    it('should handle library sections errors', async () => {
      const error = new Error('Library sections failed');
      const mockGet = jest.spyOn(service as any, 'get').mockRejectedValue(error);

      await expect(service.getLibrarySections()).rejects.toThrow('Library sections failed');
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Failed to get library sections',
        { error }
      );
    });
  });
});