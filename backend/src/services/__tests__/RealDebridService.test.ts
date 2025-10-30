/**
 * Unit tests for RealDebridService
 */

import { jest } from '@jest/globals';
import { RealDebridService } from '../realDebridService.js';
import { IConfigManager } from '../../config/types.js';
import { ILogger } from '../../types/service.js';
import {
  RealDebridTorrent,
  RealDebridAddMagnetResponse,
  RealDebridUnrestrictedLink,
  RealDebridUser
} from '../../types/realDebrid.js';

// Mock dependencies
const mockConfig = {
  get: jest.fn(),
  set: jest.fn(),
  getRequired: jest.fn(),
  validate: jest.fn(),
  onConfigChange: jest.fn(),
  getAllConfig: jest.fn()
} as jest.Mocked<IConfigManager>;

const mockLogger = {
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

// Mock axios
const mockAxiosInstance = {
  get: jest.fn() as jest.MockedFunction<any>,
  post: jest.fn() as jest.MockedFunction<any>,
  put: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  default: {
    create: jest.fn(() => mockAxiosInstance)
  }
}));

describe('RealDebridService', () => {
  let service: RealDebridService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default config mocks
    mockConfig.getRequired.mockImplementation(<T>(key: string): T => {
      switch (key) {
        case 'realDebrid.apiKey':
          return 'test-api-key' as T;
        default:
          throw new Error(`Config key ${key} not found`);
      }
    });

    mockConfig.get.mockImplementation(<T>(key: string): T | undefined => {
      switch (key) {
        case 'realDebrid.baseUrl':
          return undefined; // Use default
        default:
          return undefined;
      }
    });

    service = new RealDebridService(mockConfig, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockConfig.getRequired).toHaveBeenCalledWith('realDebrid.apiKey');
      expect(service.serviceName).toBe('RealDebrid');
    });

    it('should use custom base URL if provided', () => {
      mockConfig.get.mockReturnValue('https://custom.real-debrid.com/api');
      const customService = new RealDebridService(mockConfig, mockLogger);
      expect(customService).toBeDefined();
    });
  });

  describe('addMagnet', () => {
    const mockMagnetLink = 'magnet:?xt=urn:btih:test123';
    const mockResponse: RealDebridAddMagnetResponse = {
      id: 'torrent123',
      uri: 'https://real-debrid.com/torrent/torrent123'
    };

    it('should add magnet link successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await service.addMagnet(mockMagnetLink);

      expect(result).toEqual(mockResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/torrents/addMagnet',
        `magnet=${encodeURIComponent(mockMagnetLink)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/torrents/addMagnet',
        `magnet=${encodeURIComponent(mockMagnetLink)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should handle authentication error', async () => {
      // Mock the BaseService handleRequest to throw an error
      jest.spyOn(service, 'handleRequest').mockRejectedValue(
        new Error('Authentication failed')
      );

      await expect(service.addMagnet(mockMagnetLink)).rejects.toThrow();
      
      // Restore the original method
      jest.restoreAllMocks();
    });

    it('should handle quota exceeded error', async () => {
      // Mock the BaseService handleRequest to throw an error
      jest.spyOn(service, 'handleRequest').mockRejectedValue(
        new Error('Quota exceeded')
      );

      await expect(service.addMagnet(mockMagnetLink)).rejects.toThrow();
      
      // Restore the original method
      jest.restoreAllMocks();
    });
  });

  describe('selectFiles', () => {
    const torrentId = 'torrent123';

    it('should select all files by default', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: null });

      await service.selectFiles(torrentId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/torrents/selectFiles/${torrentId}`,
        'files=all',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should select specific files by ID array', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: null });

      await service.selectFiles(torrentId, [1, 2, 3]);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/torrents/selectFiles/${torrentId}`,
        'files=1,2,3',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should handle torrent error', async () => {
      // Mock the BaseService handleRequest to throw an error
      jest.spyOn(service, 'handleRequest').mockRejectedValue(
        new Error('Invalid torrent ID')
      );

      await expect(service.selectFiles(torrentId)).rejects.toThrow();
      
      // Restore the original method
      jest.restoreAllMocks();
    });
  });

  describe('getTorrentInfo', () => {
    const torrentId = 'torrent123';
    const mockTorrent: RealDebridTorrent = {
      id: torrentId,
      filename: 'test-movie.mkv',
      original_filename: 'test-movie.mkv',
      hash: 'abc123',
      bytes: 1000000000,
      original_bytes: 1000000000,
      host: 'real-debrid.com',
      split: 1,
      progress: 50,
      status: 'downloading',
      added: '2023-01-01T00:00:00Z',
      files: [],
      links: [],
      speed: 1000000
    };

    it('should get torrent info successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockTorrent });

      const result = await service.getTorrentInfo(torrentId);

      expect(result).toEqual(mockTorrent);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/torrents/info/${torrentId}`);
    });

    it('should handle not found error', async () => {
      // Mock the BaseService handleRequest to throw an error
      jest.spyOn(service, 'handleRequest').mockRejectedValue(
        new Error('Torrent not found')
      );

      await expect(service.getTorrentInfo(torrentId)).rejects.toThrow();
      
      // Restore the original method
      jest.restoreAllMocks();
    });
  });

  describe('unrestrict', () => {
    const testLink = 'https://example.com/file.zip';
    const mockUnrestrictedLink: RealDebridUnrestrictedLink = {
      id: 'link123',
      filename: 'file.zip',
      mimeType: 'application/zip',
      filesize: 1000000,
      link: testLink,
      host: 'example.com',
      host_icon: 'https://example.com/icon.png',
      chunks: 1,
      crc: 123456,
      download: 'https://real-debrid.com/download/link123',
      streamable: 0
    };

    it('should unrestrict link successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockUnrestrictedLink });

      const result = await service.unrestrict(testLink);

      expect(result).toEqual(mockUnrestrictedLink);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/unrestrict/link',
        `link=${encodeURIComponent(testLink)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });
  });

  describe('getUserInfo', () => {
    const mockUser: RealDebridUser = {
      id: 123,
      username: 'testuser',
      email: 'test@example.com',
      points: 1000,
      locale: 'en',
      avatar: 'https://example.com/avatar.png',
      type: 'premium',
      premium: 1,
      expiration: '2024-12-31T23:59:59Z'
    };

    it('should get user info successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockUser });

      const result = await service.getUserInfo();

      expect(result).toEqual(mockUser);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user');
    });
  });

  describe('deleteTorrent', () => {
    const torrentId = 'torrent123';

    it('should delete torrent successfully', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: null });

      await service.deleteTorrent(torrentId);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/torrents/delete/${torrentId}`);
    });
  });

  describe('getAllTorrents', () => {
    const mockTorrents: RealDebridTorrent[] = [
      {
        id: 'torrent1',
        filename: 'movie1.mkv',
        original_filename: 'movie1.mkv',
        hash: 'hash1',
        bytes: 1000000000,
        original_bytes: 1000000000,
        host: 'real-debrid.com',
        split: 1,
        progress: 100,
        status: 'downloaded',
        added: '2023-01-01T00:00:00Z',
        files: [],
        links: []
      }
    ];

    it('should get all torrents successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockTorrents });

      const result = await service.getAllTorrents();

      expect(result).toEqual(mockTorrents);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/torrents');
    });
  });

  describe('download management', () => {
    const magnetLink = 'magnet:?xt=urn:btih:test123';
    const outputPath = '/downloads/test-movie.mkv';

    it('should add download task successfully', async () => {
      const mockAddResponse: RealDebridAddMagnetResponse = {
        id: 'torrent123',
        uri: 'https://real-debrid.com/torrent/torrent123'
      };

      const mockTorrent: RealDebridTorrent = {
        id: 'torrent123',
        filename: 'test-movie.mkv',
        original_filename: 'test-movie.mkv',
        hash: 'abc123',
        bytes: 1000000000,
        original_bytes: 1000000000,
        host: 'real-debrid.com',
        split: 1,
        progress: 0,
        status: 'waiting_files_selection',
        added: '2023-01-01T00:00:00Z',
        files: [],
        links: []
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockAddResponse }) // addMagnet
        .mockResolvedValueOnce({ data: null }); // selectFiles

      mockAxiosInstance.get.mockResolvedValue({ data: mockTorrent }); // getTorrentInfo

      const task = await service.addDownload(magnetLink, outputPath);

      expect(task.magnetLink).toBe(magnetLink);
      expect(task.outputPath).toBe(outputPath);
      expect(task.torrentId).toBe('torrent123');
      expect(task.filename).toBe('test-movie.mkv');
      expect(task.status).toBe('pending');
    });

    it('should get download task by ID', async () => {
      // First add a download
      const mockAddResponse: RealDebridAddMagnetResponse = {
        id: 'torrent123',
        uri: 'https://real-debrid.com/torrent/torrent123'
      };

      const mockTorrent: RealDebridTorrent = {
        id: 'torrent123',
        filename: 'test-movie.mkv',
        original_filename: 'test-movie.mkv',
        hash: 'abc123',
        bytes: 1000000000,
        original_bytes: 1000000000,
        host: 'real-debrid.com',
        split: 1,
        progress: 0,
        status: 'waiting_files_selection',
        added: '2023-01-01T00:00:00Z',
        files: [],
        links: []
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockAddResponse })
        .mockResolvedValueOnce({ data: null });

      mockAxiosInstance.get.mockResolvedValue({ data: mockTorrent });

      const task = await service.addDownload(magnetLink, outputPath);
      const retrievedTask = await service.getDownload(task.id);

      expect(retrievedTask).toEqual(task);
    });

    it('should return null for non-existent download task', async () => {
      const task = await service.getDownload('non-existent-id');
      expect(task).toBeNull();
    });

    it('should get all downloads', async () => {
      const downloads = await service.getAllDownloads();
      expect(Array.isArray(downloads)).toBe(true);
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring', () => {
      service.monitorDownloads();
      service.stopMonitoring();
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should support event listeners', () => {
      const mockListener = jest.fn();
      
      service.on('test-event', mockListener);
      service.off('test-event', mockListener);
      service.once('test-event', mockListener);
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});