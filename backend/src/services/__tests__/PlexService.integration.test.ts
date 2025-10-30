/**
 * Integration tests for PlexService
 */

import { PlexService } from '../plexService.js';
import { ConfigManager } from '../../config/ConfigManager.js';
import { Logger } from '../../utils/Logger.js';
import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';

// Mock fs-extra for file operations
jest.mock('fs-extra');

describe('PlexService Integration Tests', () => {
  let service: PlexService;
  let config: ConfigManager;
  let logger: Logger;
  let tempDir: string;

  beforeAll(async () => {
    // Setup test configuration
    config = new ConfigManager();
    logger = new Logger();
    tempDir = path.join(tmpdir(), 'plex-service-test');

    // Set test configuration
    await config.set('plex.url', 'http://localhost:32400');
    await config.set('plex.token', 'test-token-123');
    await config.set('plex.paths', {
      movies: path.join(tempDir, 'movies'),
      tvShows: path.join(tempDir, 'tv'),
      books: path.join(tempDir, 'books'),
      audiobooks: path.join(tempDir, 'audiobooks')
    });
    await config.set('download.path', path.join(tempDir, 'downloads'));

    service = new PlexService(config, logger);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs operations
    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.move as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);
  });

  describe('Service Integration', () => {
    it('should initialize with proper configuration', () => {
      expect(service.serviceName).toBe('Plex');
      expect(service).toBeInstanceOf(PlexService);
    });

    it('should handle configuration changes', async () => {
      const newUrl = 'http://plex.example.com:32400';
      await config.set('plex.url', newUrl);
      
      // Service should use updated configuration
      expect(config.get('plex.url')).toBe(newUrl);
    });
  });

  describe('File Operations Integration', () => {
    it('should move movie file with proper directory structure', async () => {
      const mockOptions = {
        filePath: path.join(tempDir, 'downloads', 'test-movie.mkv'),
        type: 'Movie' as const,
        name: 'Test Movie',
        year: 2023
      };

      // Mock successful refresh
      jest.spyOn(service, 'refreshLibrary').mockResolvedValue();

      const result = await service.moveToPlexLibrary(mockOptions);

      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.move).toHaveBeenCalledWith(
        mockOptions.filePath,
        expect.stringContaining('Test Movie (2023)'),
        { overwrite: false }
      );
      expect(result).toContain('Test Movie (2023)');
    });

    it('should move TV show episode with season structure', async () => {
      const mockOptions = {
        filePath: path.join(tempDir, 'downloads', 'test-show-s01e01.mkv'),
        type: 'TV Show' as const,
        name: 'Test Show',
        season: 1,
        episode: 1,
        episodeName: 'Pilot'
      };

      jest.spyOn(service, 'refreshLibrary').mockResolvedValue();

      const result = await service.moveToPlexLibrary(mockOptions);

      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.move).toHaveBeenCalled();
      expect(result).toContain('Season 01');
      expect(result).toContain('S01E01');
    });

    it('should handle season pack with multiple episodes', async () => {
      const mockFiles = [
        'show.s01e01.mkv',
        'show.s01e02.mkv',
        'show.s01e03.mkv',
        'readme.txt'
      ];

      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      jest.spyOn(service, 'refreshLibrary').mockResolvedValue();

      const mockOptions = {
        directoryPath: path.join(tempDir, 'downloads', 'show-season-1'),
        showName: 'Test Show',
        season: 1,
        episodes: [
          { episode_number: 1, name: 'Episode 1' },
          { episode_number: 2, name: 'Episode 2' },
          { episode_number: 3, name: 'Episode 3' }
        ]
      };

      const result = await service.moveSeasonPackToPlexLibrary(mockOptions);

      expect(fs.readdir).toHaveBeenCalledWith(mockOptions.directoryPath);
      expect(fs.move).toHaveBeenCalledTimes(3); // Only video files
      expect(result).toHaveLength(3);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle file system errors gracefully', async () => {
      const mockOptions = {
        filePath: '/nonexistent/file.mkv',
        type: 'Movie' as const,
        name: 'Test Movie',
        year: 2023
      };

      (fs.move as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(service.moveToPlexLibrary(mockOptions)).rejects.toThrow('File not found');
    });

    it('should handle directory read errors', async () => {
      const mockOptions = {
        directoryPath: '/nonexistent/directory',
        showName: 'Test Show',
        season: 1
      };

      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Directory not found'));

      await expect(service.moveSeasonPackToPlexLibrary(mockOptions)).rejects.toThrow('Directory not found');
    });

    it('should handle missing season/episode for TV shows', async () => {
      const mockOptions = {
        filePath: '/test/file.mkv',
        type: 'TV Show' as const,
        name: 'Test Show'
        // Missing season and episode
      };

      await expect(service.moveToPlexLibrary(mockOptions)).rejects.toThrow(
        'Season and episode are required for TV shows'
      );
    });
  });

  describe('Configuration Integration', () => {
    it('should use different paths for different media types', async () => {
      const testCases = [
        {
          options: {
            filePath: '/test/movie.mkv',
            type: 'Movie' as const,
            name: 'Test Movie',
            year: 2023
          },
          expectedPath: 'movies'
        },
        {
          options: {
            filePath: '/test/book.epub',
            type: 'Book' as const,
            name: 'Test Book'
          },
          expectedPath: 'books'
        },
        {
          options: {
            filePath: '/test/audiobook.m4b',
            type: 'Audiobook' as const,
            name: 'Test Audiobook'
          },
          expectedPath: 'audiobooks'
        }
      ];

      jest.spyOn(service, 'refreshLibrary').mockResolvedValue();

      for (const testCase of testCases) {
        await service.moveToPlexLibrary(testCase.options);
        
        const moveCall = (fs.move as jest.Mock).mock.calls.find(call => 
          call[1].includes(testCase.expectedPath)
        );
        expect(moveCall).toBeDefined();
      }
    });

    it('should handle missing configuration gracefully', async () => {
      // Create service with minimal config
      const minimalConfig = new ConfigManager();
      await minimalConfig.set('plex.url', 'http://localhost:32400');
      await minimalConfig.set('plex.token', 'test-token');
      await minimalConfig.set('plex.paths', {
        movies: '/movies',
        tvShows: '/tv',
        books: '/books',
        audiobooks: '/audiobooks'
      });

      const minimalService = new PlexService(minimalConfig, logger);

      const mockOptions = {
        filePath: '/test/movie.mkv',
        type: 'Movie' as const,
        name: 'Test Movie',
        year: 2023
      };

      jest.spyOn(minimalService, 'refreshLibrary').mockResolvedValue();

      // Should still work with default download path
      await expect(minimalService.moveToPlexLibrary(mockOptions)).resolves.toBeDefined();
    });
  });

  describe('Logging Integration', () => {
    it('should log file operations', async () => {
      const mockOptions = {
        filePath: '/test/movie.mkv',
        type: 'Movie' as const,
        name: 'Test Movie',
        year: 2023
      };

      jest.spyOn(service, 'refreshLibrary').mockResolvedValue();
      const loggerSpy = jest.spyOn(logger, 'info');

      await service.moveToPlexLibrary(mockOptions);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Moving file to Plex library'),
        expect.any(Object)
      );
    });

    it('should log errors appropriately', async () => {
      const mockOptions = {
        filePath: '/test/movie.mkv',
        type: 'Movie' as const,
        name: 'Test Movie',
        year: 2023
      };

      (fs.move as jest.Mock).mockRejectedValue(new Error('Test error'));
      const loggerSpy = jest.spyOn(logger, 'error');

      await expect(service.moveToPlexLibrary(mockOptions)).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to move file'),
        expect.any(Object)
      );
    });
  });

  afterAll(async () => {
    // Cleanup
    jest.restoreAllMocks();
  });
});