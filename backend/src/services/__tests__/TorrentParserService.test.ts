/**
 * Unit tests for TorrentParserService
 */

import { TorrentParserService, ParsedTorrentInfo, TorrentWithScore } from '../torrentParserService.js';
import { IConfigManager } from '../../config/types.js';
import { ILogger } from '../../types/service.js';
import ptt from 'parse-torrent-title';

// Mock parse-torrent-title
jest.mock('parse-torrent-title');

describe('TorrentParserService', () => {
  let service: TorrentParserService;
  let mockConfig: jest.Mocked<IConfigManager>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockPtt: jest.Mocked<typeof ptt>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock config
    mockConfig = {
      get: jest.fn(),
      getRequired: jest.fn(),
      set: jest.fn(),
      validate: jest.fn(),
      onConfigChange: jest.fn(),
      getAllConfig: jest.fn()
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

    mockPtt = ptt as jest.Mocked<typeof ptt>;

    service = new TorrentParserService(mockConfig, mockLogger);
  });

  describe('constructor', () => {
    it('should create service with logger', () => {
      expect(service).toBeInstanceOf(TorrentParserService);
      expect(mockLogger.createChildLogger).toHaveBeenCalledWith('TorrentParser');
    });
  });

  describe('parseTorrentTitle', () => {
    it('should parse torrent title successfully', () => {
      const mockParsed = {
        resolution: '1080p',
        quality: 'BluRay',
        codec: 'x264',
        audio: ['DTS', 'AC3'],
        hdr: true,
        season: 1,
        episode: 5,
        group: 'GROUP',
        year: 2023,
        title: 'Test Movie'
      };

      mockPtt.parse.mockReturnValue(mockParsed);

      const result = service.parseTorrentTitle('Test.Movie.2023.1080p.BluRay.x264-GROUP');

      expect(result).toEqual({
        resolution: '1080p',
        quality: 'BluRay',
        codec: 'x264',
        audio: 'DTS, AC3',
        hdr: true,
        season: 1,
        episode: 5,
        group: 'GROUP',
        year: 2023,
        title: 'Test Movie'
      });
    });

    it('should handle single audio codec', () => {
      const mockParsed = {
        audio: 'DTS',
        codec: 'x264'
      };

      mockPtt.parse.mockReturnValue(mockParsed);

      const result = service.parseTorrentTitle('Test.Movie.DTS.x264');

      expect(result.audio).toBe('DTS');
    });

    it('should handle missing audio', () => {
      const mockParsed = {
        codec: 'x264'
      };

      mockPtt.parse.mockReturnValue(mockParsed);

      const result = service.parseTorrentTitle('Test.Movie.x264');

      expect(result.audio).toBe('Unknown');
    });

    it('should handle missing codec', () => {
      const mockParsed = {};

      mockPtt.parse.mockReturnValue(mockParsed);

      const result = service.parseTorrentTitle('Test.Movie');

      expect(result.codec).toBe('Unknown');
    });

    it('should handle parsing errors', () => {
      mockPtt.parse.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const result = service.parseTorrentTitle('Invalid.Torrent.Name');

      expect(result).toEqual({
        resolution: 'Unknown',
        quality: 'Unknown',
        codec: 'Unknown',
        audio: 'Unknown',
        hdr: false,
        season: null,
        episode: null,
        group: 'Unknown',
        year: null,
        title: 'Invalid.Torrent.Name'
      });

      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Failed to parse torrent title',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should provide default values for missing fields', () => {
      mockPtt.parse.mockReturnValue({});

      const result = service.parseTorrentTitle('Test.Movie');

      expect(result.resolution).toBe('Unknown');
      expect(result.quality).toBe('Unknown');
      expect(result.codec).toBe('Unknown');
      expect(result.audio).toBe('Unknown');
      expect(result.hdr).toBe(false);
      expect(result.season).toBeNull();
      expect(result.episode).toBeNull();
      expect(result.group).toBe('Unknown');
      expect(result.year).toBeNull();
      expect(result.title).toBe('Test.Movie');
    });
  });

  describe('groupByQuality', () => {
    const mockTorrents = [
      { name: 'Movie.1080p.BluRay.x264', seeders: 10 },
      { name: 'Movie.1080p.WEB-DL.x264', seeders: 15 },
      { name: 'Movie.720p.BluRay.x264', seeders: 8 },
      { name: 'Movie.1080p.BluRay.x265', seeders: 12 }
    ];

    beforeEach(() => {
      jest.spyOn(service, 'parseTorrentTitle').mockImplementation((name: string) => {
        if (name.includes('1080p') && name.includes('BluRay')) {
          return { resolution: '1080p', quality: 'BluRay' } as ParsedTorrentInfo;
        }
        if (name.includes('1080p') && name.includes('WEB-DL')) {
          return { resolution: '1080p', quality: 'WEB-DL' } as ParsedTorrentInfo;
        }
        if (name.includes('720p') && name.includes('BluRay')) {
          return { resolution: '720p', quality: 'BluRay' } as ParsedTorrentInfo;
        }
        return { resolution: 'Unknown', quality: 'Unknown' } as ParsedTorrentInfo;
      });
    });

    it('should group torrents by quality and resolution', () => {
      const result = service.groupByQuality(mockTorrents);

      expect(result).toHaveLength(3);
      expect(result.find(g => g.resolution === '1080p' && g.quality === 'BluRay')?.torrents).toHaveLength(2);
      expect(result.find(g => g.resolution === '1080p' && g.quality === 'WEB-DL')?.torrents).toHaveLength(1);
      expect(result.find(g => g.resolution === '720p' && g.quality === 'BluRay')?.torrents).toHaveLength(1);
    });

    it('should sort groups by resolution priority', () => {
      const result = service.groupByQuality(mockTorrents);

      // 1080p groups should come before 720p
      const resolutions = result.map(g => g.resolution);
      const firstNon1080pIndex = resolutions.findIndex(r => r !== '1080p');
      const last1080pIndex = resolutions.lastIndexOf('1080p');
      
      if (firstNon1080pIndex !== -1 && last1080pIndex !== -1) {
        expect(last1080pIndex).toBeLessThan(firstNon1080pIndex);
      }
    });

    it('should sort torrents within groups by seeders', () => {
      const result = service.groupByQuality(mockTorrents);
      const bluray1080pGroup = result.find(g => g.resolution === '1080p' && g.quality === 'BluRay');

      expect(bluray1080pGroup?.torrents[0].seeders).toBeGreaterThanOrEqual(
        bluray1080pGroup?.torrents[1].seeders || 0
      );
    });
  });

  describe('getQualityScore', () => {
    it('should calculate quality score correctly', () => {
      const torrent: TorrentWithScore = {
        name: 'Movie.2160p.REMUX.x265.HDR',
        seeders: 50,
        resolution: '2160p',
        quality: 'REMUX',
        codec: 'x265',
        hdr: true
      };

      const score = service.getQualityScore(torrent);

      // Seeders: 50 * 2 = 100
      // Resolution (2160p): 80
      // Quality (REMUX): 25
      // HDR bonus: 5
      // Codec bonus (x265): 3
      // Total: 213
      expect(score).toBe(213);
    });

    it('should cap seeders contribution', () => {
      const torrent: TorrentWithScore = {
        name: 'Movie.1080p.BluRay.x264',
        seeders: 1000, // Very high seeders
        resolution: '1080p',
        quality: 'BluRay',
        codec: 'x264',
        hdr: false
      };

      const score = service.getQualityScore(torrent);

      // Seeders should be capped at 500 points
      expect(score).toBeLessThanOrEqual(500 + 60 + 20); // Max seeders + resolution + quality
    });

    it('should handle unknown values', () => {
      const torrent: TorrentWithScore = {
        name: 'Movie.Unknown.Quality',
        seeders: 10,
        resolution: 'Unknown',
        quality: 'Unknown',
        codec: 'Unknown',
        hdr: false
      };

      const score = service.getQualityScore(torrent);

      // Seeders: 10 * 2 = 20
      // Resolution (Unknown): 10
      // Quality (Unknown): 0
      // Total: 30
      expect(score).toBe(30);
    });

    it('should handle missing seeders', () => {
      const torrent: TorrentWithScore = {
        name: 'Movie.1080p.BluRay.x264',
        seeders: 0,
        resolution: '1080p',
        quality: 'BluRay',
        codec: 'x264',
        hdr: false
      };

      const score = service.getQualityScore(torrent);

      // Should not crash and should calculate based on other factors
      expect(score).toBe(80); // Resolution + Quality
    });
  });

  describe('filterByQuality', () => {
    const mockTorrents = [
      { name: 'Movie.2160p.BluRay', seeders: 20 },
      { name: 'Movie.1080p.WEB-DL', seeders: 15 },
      { name: 'Movie.720p.BluRay', seeders: 10 },
      { name: 'Movie.480p.DVDRip', seeders: 5 }
    ];

    beforeEach(() => {
      jest.spyOn(service, 'parseTorrentTitle').mockImplementation((name: string) => {
        if (name.includes('2160p')) return { resolution: '2160p', codec: 'x264' } as ParsedTorrentInfo;
        if (name.includes('1080p')) return { resolution: '1080p', codec: 'x264' } as ParsedTorrentInfo;
        if (name.includes('720p')) return { resolution: '720p', codec: 'x264' } as ParsedTorrentInfo;
        if (name.includes('480p')) return { resolution: '480p', codec: 'x264' } as ParsedTorrentInfo;
        return { resolution: 'Unknown', codec: 'Unknown' } as ParsedTorrentInfo;
      });
    });

    it('should filter by minimum resolution', () => {
      const result = service.filterByQuality(mockTorrents, '1080p');

      expect(result).toHaveLength(2); // 2160p and 1080p
      expect(result.every(t => t.name.includes('1080p') || t.name.includes('2160p'))).toBe(true);
    });

    it('should filter by minimum seeders', () => {
      const result = service.filterByQuality(mockTorrents, undefined, 12);

      expect(result).toHaveLength(2); // Only torrents with 15+ and 20 seeders
      expect(result.every(t => t.seeders >= 12)).toBe(true);
    });

    it('should filter by preferred codec', () => {
      jest.spyOn(service, 'parseTorrentTitle').mockImplementation((name: string) => {
        const codec = name.includes('x265') ? 'x265' : 'x264';
        return { resolution: '1080p', codec } as ParsedTorrentInfo;
      });

      const torrentsWithCodec = [
        { name: 'Movie.1080p.x264', seeders: 10 },
        { name: 'Movie.1080p.x265', seeders: 15 }
      ];

      const result = service.filterByQuality(torrentsWithCodec, undefined, undefined, 'x265');

      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('x265');
    });

    it('should apply all filters together', () => {
      const result = service.filterByQuality(mockTorrents, '1080p', 12);

      expect(result).toHaveLength(2);
      expect(result.every(t => t.seeders >= 12)).toBe(true);
      expect(result.every(t => t.name.includes('1080p') || t.name.includes('2160p'))).toBe(true);
    });
  });

  describe('sortByQuality', () => {
    const mockTorrents = [
      { name: 'Movie.720p.BluRay', seeders: 10 },
      { name: 'Movie.1080p.WEB-DL', seeders: 15 },
      { name: 'Movie.2160p.BluRay', seeders: 5 }
    ];

    beforeEach(() => {
      jest.spyOn(service, 'parseTorrentTitle').mockReturnValue({} as ParsedTorrentInfo);
      jest.spyOn(service, 'getQualityScore').mockImplementation((torrent) => {
        if (torrent.name.includes('2160p')) return 100;
        if (torrent.name.includes('1080p')) return 80;
        if (torrent.name.includes('720p')) return 60;
        return 0;
      });
    });

    it('should sort torrents by quality score descending', () => {
      const result = service.sortByQuality(mockTorrents);

      expect(result[0].name).toContain('2160p');
      expect(result[1].name).toContain('1080p');
      expect(result[2].name).toContain('720p');
    });

    it('should add quality score to torrent objects', () => {
      const result = service.sortByQuality(mockTorrents);

      expect(result[0].qualityScore).toBe(100);
      expect(result[1].qualityScore).toBe(80);
      expect(result[2].qualityScore).toBe(60);
    });
  });

  describe('getBestTorrent', () => {
    it('should return best torrent from sorted list', () => {
      const mockTorrents = [
        { name: 'Movie.720p.BluRay', seeders: 10 },
        { name: 'Movie.1080p.WEB-DL', seeders: 15 }
      ];

      jest.spyOn(service, 'sortByQuality').mockReturnValue([
        { name: 'Movie.1080p.WEB-DL', seeders: 15, qualityScore: 80 },
        { name: 'Movie.720p.BluRay', seeders: 10, qualityScore: 60 }
      ]);

      const result = service.getBestTorrent(mockTorrents);

      expect(result?.name).toBe('Movie.1080p.WEB-DL');
      expect(mockLogger.createChildLogger().info).toHaveBeenCalledWith(
        'Selected best torrent',
        expect.objectContaining({
          torrentName: 'Movie.1080p.WEB-DL',
          qualityScore: 80,
          seeders: 15
        })
      );
    });

    it('should return null for empty array', () => {
      const result = service.getBestTorrent([]);
      expect(result).toBeNull();
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      jest.spyOn(service, 'parseTorrentTitle').mockReturnValue({
        year: 2023,
        hdr: true,
        codec: 'x265',
        resolution: '1080p'
      } as ParsedTorrentInfo);
    });

    it('should extract year', () => {
      const result = service.extractYear('Movie.2023.1080p');
      expect(result).toBe(2023);
    });

    it('should check HDR', () => {
      const result = service.isHDR('Movie.HDR.1080p');
      expect(result).toBe(true);
    });

    it('should get codec', () => {
      const result = service.getCodec('Movie.x265.1080p');
      expect(result).toBe('x265');
    });

    it('should get resolution', () => {
      const result = service.getResolution('Movie.1080p.BluRay');
      expect(result).toBe('1080p');
    });
  });

  describe('validateTorrent', () => {
    const mockTorrent = {
      name: 'Movie.1080p.BluRay.x264',
      seeders: 15,
      size: 2 * 1024 * 1024 * 1024 // 2GB
    };

    beforeEach(() => {
      jest.spyOn(service, 'parseTorrentTitle').mockReturnValue({
        resolution: '1080p',
        codec: 'x264'
      } as ParsedTorrentInfo);
    });

    it('should validate torrent that meets all requirements', () => {
      const requirements = {
        minSeeders: 10,
        minResolution: '720p',
        maxSize: 5,
        requiredCodec: 'x264'
      };

      const result = service.validateTorrent(mockTorrent, requirements);

      expect(result.valid).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should reject torrent with insufficient seeders', () => {
      const requirements = { minSeeders: 20 };

      const result = service.validateTorrent(mockTorrent, requirements);

      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Insufficient seeders: 15 < 20');
    });

    it('should reject torrent with low resolution', () => {
      jest.spyOn(service, 'parseTorrentTitle').mockReturnValue({
        resolution: '480p',
        codec: 'x264'
      } as ParsedTorrentInfo);

      const requirements = { minResolution: '1080p' };

      const result = service.validateTorrent(mockTorrent, requirements);

      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Resolution too low: 480p < 1080p');
    });

    it('should reject torrent that is too large', () => {
      const largeTorrent = {
        ...mockTorrent,
        size: 10 * 1024 * 1024 * 1024 // 10GB
      };

      const requirements = { maxSize: 5 };

      const result = service.validateTorrent(largeTorrent, requirements);

      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('File too large: 10.00GB > 5GB');
    });

    it('should reject torrent with wrong codec', () => {
      const requirements = { requiredCodec: 'x265' };

      const result = service.validateTorrent(mockTorrent, requirements);

      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Wrong codec: x264 != x265');
    });

    it('should handle multiple validation failures', () => {
      const badTorrent = {
        name: 'Movie.480p.CAM.x264',
        seeders: 2,
        size: 10 * 1024 * 1024 * 1024
      };

      jest.spyOn(service, 'parseTorrentTitle').mockReturnValue({
        resolution: '480p',
        codec: 'x264'
      } as ParsedTorrentInfo);

      const requirements = {
        minSeeders: 10,
        minResolution: '1080p',
        maxSize: 5,
        requiredCodec: 'x265'
      };

      const result = service.validateTorrent(badTorrent, requirements);

      expect(result.valid).toBe(false);
      expect(result.reasons).toHaveLength(4);
    });
  });
});