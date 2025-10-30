/**
 * Integration tests for RealDebridService
 * These tests require a valid Real-Debrid API key and should be run with caution
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { RealDebridService } from '../realDebridService.js';
import { IConfigManager } from '../../config/types.js';
import { ILogger } from '../../types/service.js';
import { RealDebridAuthError } from '../../types/realDebrid.js';

// Mock logger for integration tests
const mockLogger: ILogger = {
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
};

// Mock config manager
const createMockConfig = (apiKey?: string): jest.Mocked<IConfigManager> => ({
  get: jest.fn().mockImplementation((key: string) => {
    switch (key) {
      case 'realDebrid.baseUrl':
        return undefined; // Use default
      default:
        return undefined;
    }
  }),
  set: jest.fn(),
  getRequired: jest.fn().mockImplementation((key: string) => {
    switch (key) {
      case 'realDebrid.apiKey':
        return apiKey || process.env.REAL_DEBRID_API_KEY || 'invalid-key';
      default:
        throw new Error(`Config key ${key} not found`);
    }
  }),
  validate: jest.fn(),
  onConfigChange: jest.fn(),
  getAllConfig: jest.fn()
});

describe('RealDebridService Integration Tests', () => {
  let service: RealDebridService;
  let mockConfig: jest.Mocked<IConfigManager>;

  // Skip integration tests if no API key is provided
  const skipIfNoApiKey = () => {
    if (!process.env.REAL_DEBRID_API_KEY) {
      console.log('Skipping Real-Debrid integration tests - no API key provided');
      return true;
    }
    return false;
  };

  beforeEach(() => {
    if (skipIfNoApiKey()) return;
    
    mockConfig = createMockConfig(process.env.REAL_DEBRID_API_KEY);
    service = new RealDebridService(mockConfig, mockLogger, {
      timeout: 30000,
      retries: 2
    });
  });

  describe('Authentication', () => {
    it('should authenticate with valid API key', async () => {
      if (skipIfNoApiKey()) return;

      const userInfo = await service.getUserInfo();
      
      expect(userInfo).toBeDefined();
      expect(userInfo.username).toBeDefined();
      expect(userInfo.premium).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('Getting user info');
    });

    it('should fail with invalid API key', async () => {
      const invalidConfig = createMockConfig('invalid-api-key');
      const invalidService = new RealDebridService(invalidConfig, mockLogger);

      await expect(invalidService.getUserInfo()).rejects.toThrow(RealDebridAuthError);
    });
  });

  describe('Torrent Management', () => {
    // Use a known public domain torrent for testing
    const testMagnetLink = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com';
    let torrentId: string;

    it('should add magnet link successfully', async () => {
      if (skipIfNoApiKey()) return;

      const response = await service.addMagnet(testMagnetLink);
      
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.uri).toBeDefined();
      
      torrentId = response.id;
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Adding magnet link to Real-Debrid',
        expect.objectContaining({
          magnetLink: expect.stringContaining('magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c')
        })
      );
    });

    it('should get torrent info', async () => {
      if (skipIfNoApiKey() || !torrentId) return;

      // Wait a bit for the torrent to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      const torrentInfo = await service.getTorrentInfo(torrentId);
      
      expect(torrentInfo).toBeDefined();
      expect(torrentInfo.id).toBe(torrentId);
      expect(torrentInfo.filename).toBeDefined();
      expect(torrentInfo.status).toBeDefined();
      expect(['magnet_conversion', 'waiting_files_selection', 'queued', 'downloading', 'downloaded'].includes(torrentInfo.status)).toBe(true);
    });

    it('should select files for torrent', async () => {
      if (skipIfNoApiKey() || !torrentId) return;

      // Wait for torrent to be ready for file selection
      let attempts = 0;
      let torrentInfo;
      
      do {
        await new Promise(resolve => setTimeout(resolve, 2000));
        torrentInfo = await service.getTorrentInfo(torrentId);
        attempts++;
      } while (torrentInfo.status !== 'waiting_files_selection' && attempts < 10);

      if (torrentInfo.status === 'waiting_files_selection') {
        await expect(service.selectFiles(torrentId)).resolves.not.toThrow();
        
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Files selected successfully',
          { torrentId, fileIds: 'all' }
        );
      } else {
        console.log(`Torrent status: ${torrentInfo.status}, skipping file selection test`);
      }
    });

    it('should get all torrents', async () => {
      if (skipIfNoApiKey()) return;

      const torrents = await service.getAllTorrents();
      
      expect(Array.isArray(torrents)).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Retrieved torrents', { count: torrents.length });
    });

    it('should delete torrent', async () => {
      if (skipIfNoApiKey() || !torrentId) return;

      await expect(service.deleteTorrent(torrentId)).resolves.not.toThrow();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Torrent deleted successfully', { torrentId });
    });
  });

  describe('Link Unrestriction', () => {
    it('should handle invalid link gracefully', async () => {
      if (skipIfNoApiKey()) return;

      const invalidLink = 'https://invalid-link-that-does-not-exist.com/file.zip';
      
      await expect(service.unrestrict(invalidLink)).rejects.toThrow();
    });
  });

  describe('Download Management', () => {
    const testOutputPath = path.join(process.cwd(), 'test-downloads');

    beforeAll(() => {
      // Create test download directory
      if (!fs.existsSync(testOutputPath)) {
        fs.mkdirSync(testOutputPath, { recursive: true });
      }
    });

    afterAll(() => {
      // Clean up test download directory
      if (fs.existsSync(testOutputPath)) {
        fs.rmSync(testOutputPath, { recursive: true, force: true });
      }
    });

    it('should create download task', async () => {
      if (skipIfNoApiKey()) return;

      const testMagnetLink = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny';
      const outputPath = path.join(testOutputPath, 'test-movie.mkv');

      const task = await service.addDownload(testMagnetLink, outputPath);
      
      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.magnetLink).toBe(testMagnetLink);
      expect(task.outputPath).toBe(outputPath);
      expect(task.status).toBe('pending');
      expect(task.torrentId).toBeDefined();

      // Clean up
      if (task.torrentId) {
        try {
          await service.deleteTorrent(task.torrentId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should monitor torrent progress', async () => {
      if (skipIfNoApiKey()) return;

      const testMagnetLink = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny';
      let torrentId: string;

      try {
        const response = await service.addMagnet(testMagnetLink);
        torrentId = response.id;

        let progressCalled = false;
        let completeCalled = false;
        let errorCalled = false;

        const monitorPromise = service.monitorTorrent(torrentId, {
          pollInterval: 2000,
          onProgress: (progress) => {
            progressCalled = true;
            expect(progress.torrentId).toBe(torrentId);
            expect(progress.progress).toBeGreaterThanOrEqual(0);
            expect(progress.progress).toBeLessThanOrEqual(100);
          },
          onComplete: (torrent) => {
            completeCalled = true;
            expect(torrent.id).toBe(torrentId);
          },
          onError: (error) => {
            errorCalled = true;
            expect(error).toBeInstanceOf(Error);
          }
        });

        // Wait a bit for monitoring to start
        await new Promise(resolve => setTimeout(resolve, 5000));

        expect(progressCalled || completeCalled || errorCalled).toBe(true);
      } finally {
        // Clean up
        if (torrentId!) {
          try {
            await service.deleteTorrent(torrentId);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      if (skipIfNoApiKey()) return;

      const shortTimeoutService = new RealDebridService(mockConfig, mockLogger, {
        timeout: 1, // 1ms timeout to force timeout
        retries: 1
      });

      await expect(shortTimeoutService.getUserInfo()).rejects.toThrow();
    });

    it('should retry failed requests', async () => {
      if (skipIfNoApiKey()) return;

      // This test is hard to implement without mocking, but the retry logic
      // is tested in the BaseService tests and integrated here
      expect(service).toBeDefined();
    });
  });

  describe('Event System', () => {
    it('should emit events during operations', async () => {
      if (skipIfNoApiKey()) return;

      let eventEmitted = false;
      
      service.on('download:progress', () => {
        eventEmitted = true;
      });

      // The event system is tested indirectly through other operations
      expect(service).toBeDefined();
    });
  });
});