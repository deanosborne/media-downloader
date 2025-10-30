/**
 * Unit tests for TVShowParserService
 */

import { TVShowParserService, EpisodeInfo, TVSearchQuery } from '../tvShowParserService.js';
import { TorrentParserService } from '../torrentParserService.js';
import { IConfigManager } from '../../config/types.js';
import { ILogger } from '../../types/service.js';

// Mock TorrentParserService
jest.mock('../torrentParserService.js');

describe('TVShowParserService', () => {
  let service: TVShowParserService;
  let mockConfig: jest.Mocked<IConfigManager>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockTorrentParser: jest.Mocked<TorrentParserService>;

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

    // Mock TorrentParserService
    mockTorrentParser = {
      parseTorrentTitle: jest.fn(),
      getQualityScore: jest.fn(),
      groupByQuality: jest.fn(),
      filterByQuality: jest.fn(),
      sortByQuality: jest.fn(),
      getBestTorrent: jest.fn(),
      extractYear: jest.fn(),
      isHDR: jest.fn(),
      getCodec: jest.fn(),
      getResolution: jest.fn(),
      validateTorrent: jest.fn()
    } as jest.Mocked<TorrentParserService>;

    (TorrentParserService as jest.MockedClass<typeof TorrentParserService>).mockImplementation(() => mockTorrentParser);

    service = new TVShowParserService(mockConfig, mockLogger);
  });

  describe('constructor', () => {
    it('should create service with torrent parser', () => {
      expect(service).toBeInstanceOf(TVShowParserService);
      expect(mockLogger.createChildLogger).toHaveBeenCalledWith('TVShowParser');
      expect(TorrentParserService).toHaveBeenCalledWith(mockConfig, mockLogger);
    });
  });

  describe('detectSeasonPack', () => {
    it('should detect season pack patterns', () => {
      const testCases = [
        { name: 'Show.Name.S01.Complete.1080p', expected: true },
        { name: 'Show.Name.Season.1.Complete.720p', expected: true },
        { name: 'Show.Name.S01.1080p', expected: true },
        { name: 'Show.Name.Complete.Season.1', expected: true },
        { name: 'Show.Name.Full.Season.1', expected: true }
      ];

      testCases.forEach(({ name, expected }) => {
        const result = service.detectSeasonPack(name);
        expect(result).toBe(expected);
      });
    });

    it('should not detect season pack when episode is present', () => {
      const testCases = [
        'Show.Name.S01E01.Complete.1080p',
        'Show.Name.Season.1.Episode.1.Complete',
        'Show.Name.S01E01E02.Complete'
      ];

      testCases.forEach(name => {
        const result = service.detectSeasonPack(name);
        expect(result).toBe(false);
      });
    });

    it('should not detect season pack for regular episodes', () => {
      const testCases = [
        'Show.Name.S01E01.1080p',
        'Show.Name.1x01.720p',
        'Show.Name.Episode.1'
      ];

      testCases.forEach(name => {
        const result = service.detectSeasonPack(name);
        expect(result).toBe(false);
      });
    });
  });

  describe('detectEpisodeRange', () => {
    beforeEach(() => {
      mockTorrentParser.parseTorrentTitle.mockReturnValue({
        resolution: '1080p',
        quality: 'WEB-DL',
        codec: 'x264',
        audio: 'AAC',
        hdr: false,
        season: 1,
        episode: null,
        group: 'GROUP',
        year: 2023,
        title: 'Show Name'
      });
    });

    it('should detect single episode', () => {
      mockTorrentParser.parseTorrentTitle.mockReturnValue({
        resolution: '1080p',
        quality: 'WEB-DL',
        codec: 'x264',
        audio: 'AAC',
        hdr: false,
        season: 1,
        episode: 5,
        group: 'GROUP',
        year: 2023,
        title: 'Show Name'
      });

      const result = service.detectEpisodeRange('Show.Name.S01E05.1080p');

      expect(result).toEqual({
        type: 'single',
        season: 1,
        episode: 5
      });
    });

    it('should detect episode array', () => {
      mockTorrentParser.parseTorrentTitle.mockReturnValue({
        resolution: '1080p',
        quality: 'WEB-DL',
        codec: 'x264',
        audio: 'AAC',
        hdr: false,
        season: 1,
        episode: [1, 2, 3],
        group: 'GROUP',
        year: 2023,
        title: 'Show Name'
      });

      const result = service.detectEpisodeRange('Show.Name.S01E01E02E03.1080p');

      expect(result).toEqual({
        type: 'range',
        season: 1,
        episodes: [1, 2, 3]
      });
    });

    it('should detect episode range format E01-E05', () => {
      const result = service.detectEpisodeRange('Show.Name.S01E01-E05.1080p');

      expect(result).toEqual({
        type: 'range',
        season: 1,
        episodes: [1, 2, 3, 4, 5]
      });
    });

    it('should detect multi-episode format E01E02E03', () => {
      const result = service.detectEpisodeRange('Show.Name.S01E01E02E03.1080p');

      expect(result).toEqual({
        type: 'range',
        season: 1,
        episodes: [1, 2, 3]
      });
    });

    it('should detect season pack', () => {
      jest.spyOn(service, 'detectSeasonPack').mockReturnValue(true);

      const result = service.detectEpisodeRange('Show.Name.S01.Complete.1080p');

      expect(result).toEqual({
        type: 'season',
        season: 1
      });
    });

    it('should return null for unparseable torrents', () => {
      const result = service.detectEpisodeRange('Invalid.Torrent.Name');

      expect(result).toBeNull();
    });

    it('should handle parsing errors', () => {
      mockTorrentParser.parseTorrentTitle.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const result = service.detectEpisodeRange('Show.Name.S01E01.1080p');

      expect(result).toBeNull();
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Failed to detect episode range',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('formatEpisodeForPlex', () => {
    it('should format episode with name', () => {
      const result = service.formatEpisodeForPlex('Test Show', 1, 5, 'Episode Title');
      expect(result).toBe('Test Show - S01E05 - Episode Title');
    });

    it('should format episode without name', () => {
      const result = service.formatEpisodeForPlex('Test Show', 1, 5);
      expect(result).toBe('Test Show - S01E05');
    });

    it('should sanitize show name', () => {
      const result = service.formatEpisodeForPlex('Test<Show>', 1, 5, 'Episode:Title');
      expect(result).toBe('TestShow - S01E05 - EpisodeTitle');
    });

    it('should pad season and episode numbers', () => {
      const result = service.formatEpisodeForPlex('Test Show', 1, 5);
      expect(result).toBe('Test Show - S01E05');
    });
  });

  describe('buildTVSearchQuery', () => {
    it('should build query with show name only', () => {
      const options: TVSearchQuery = { showName: 'Test Show' };
      const result = service.buildTVSearchQuery(options);
      expect(result).toBe('Test Show');
    });

    it('should build query with season', () => {
      const options: TVSearchQuery = { showName: 'Test Show', season: 1 };
      const result = service.buildTVSearchQuery(options);
      expect(result).toBe('Test Show S01');
    });

    it('should build query with season and episode', () => {
      const options: TVSearchQuery = { showName: 'Test Show', season: 1, episode: 5 };
      const result = service.buildTVSearchQuery(options);
      expect(result).toBe('Test Show S01E05');
    });

    it('should pad season and episode numbers', () => {
      const options: TVSearchQuery = { showName: 'Test Show', season: 1, episode: 5 };
      const result = service.buildTVSearchQuery(options);
      expect(result).toBe('Test Show S01E05');
    });
  });

  describe('filterTVTorrents', () => {
    const mockTorrents = [
      { name: 'Show.S01E01.1080p', seeders: 10 },
      { name: 'Show.S01E02.1080p', seeders: 15 },
      { name: 'Show.S01.Complete.1080p', seeders: 20 },
      { name: 'Show.S02E01.1080p', seeders: 5 }
    ];

    beforeEach(() => {
      jest.spyOn(service, 'detectEpisodeRange').mockImplementation((name: string) => {
        if (name.includes('S01E01')) return { type: 'single', season: 1, episode: 1 };
        if (name.includes('S01E02')) return { type: 'single', season: 1, episode: 2 };
        if (name.includes('S01.Complete')) return { type: 'season', season: 1 };
        if (name.includes('S02E01')) return { type: 'single', season: 2, episode: 1 };
        return null;
      });
    });

    it('should filter torrents for specific episode', () => {
      const result = service.filterTVTorrents(mockTorrents, 1, 1);
      
      expect(result).toHaveLength(2); // Single episode + season pack
      expect(result.map(t => t.name)).toContain('Show.S01E01.1080p');
      expect(result.map(t => t.name)).toContain('Show.S01.Complete.1080p');
    });

    it('should filter torrents for season pack only', () => {
      const result = service.filterTVTorrents(mockTorrents, 1);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Show.S01.Complete.1080p');
    });

    it('should filter by season', () => {
      const result = service.filterTVTorrents(mockTorrents, 2, 1);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Show.S02E01.1080p');
    });

    it('should return empty array for no matches', () => {
      const result = service.filterTVTorrents(mockTorrents, 3, 1);
      expect(result).toHaveLength(0);
    });
  });

  describe('extractSeasonEpisode', () => {
    beforeEach(() => {
      jest.spyOn(service, 'detectEpisodeRange').mockImplementation((name: string) => {
        if (name.includes('S01E05')) return { type: 'single', season: 1, episode: 5 };
        if (name.includes('S02')) return { type: 'season', season: 2 };
        return null;
      });
    });

    it('should extract season and episode for single episode', () => {
      const result = service.extractSeasonEpisode('Show.S01E05.1080p');
      expect(result).toEqual({ season: 1, episode: 5 });
    });

    it('should extract season only for season pack', () => {
      const result = service.extractSeasonEpisode('Show.S02.Complete.1080p');
      expect(result).toEqual({ season: 2 });
    });

    it('should return empty object for unparseable filename', () => {
      const result = service.extractSeasonEpisode('Invalid.Filename');
      expect(result).toEqual({});
    });
  });

  describe('matchesTVCriteria', () => {
    beforeEach(() => {
      jest.spyOn(service, 'detectEpisodeRange').mockImplementation((name: string) => {
        if (name.includes('test.show') && name.includes('s01e05')) {
          return { type: 'single', season: 1, episode: 5 };
        }
        if (name.includes('test.show') && name.includes('s01')) {
          return { type: 'season', season: 1 };
        }
        return null;
      });
    });

    it('should match show name, season, and episode', () => {
      const result = service.matchesTVCriteria('Test.Show.S01E05.1080p', 'Test Show', 1, 5);
      expect(result).toBe(true);
    });

    it('should match show name and season only', () => {
      const result = service.matchesTVCriteria('Test.Show.S01.Complete.1080p', 'Test Show', 1);
      expect(result).toBe(true);
    });

    it('should not match different show name', () => {
      const result = service.matchesTVCriteria('Other.Show.S01E05.1080p', 'Test Show', 1, 5);
      expect(result).toBe(false);
    });

    it('should not match different season', () => {
      const result = service.matchesTVCriteria('Test.Show.S02E05.1080p', 'Test Show', 1, 5);
      expect(result).toBe(false);
    });
  });

  describe('getPreferredTorrent', () => {
    const mockTorrents = [
      { name: 'Show.S01E01.720p', seeders: 5 },
      { name: 'Show.S01E01.1080p', seeders: 15 },
      { name: 'Show.S01E01.2160p', seeders: 10 }
    ];

    beforeEach(() => {
      mockTorrentParser.getQualityScore.mockImplementation((torrent) => {
        if (torrent.name.includes('2160p')) return 100;
        if (torrent.name.includes('1080p')) return 80;
        if (torrent.name.includes('720p')) return 60;
        return 0;
      });
    });

    it('should return torrent with most seeders', () => {
      const result = service.getPreferredTorrent(mockTorrents);
      expect(result?.name).toBe('Show.S01E01.1080p');
    });

    it('should return null for empty array', () => {
      const result = service.getPreferredTorrent([]);
      expect(result).toBeNull();
    });

    it('should use quality score as tiebreaker', () => {
      const torrentsWithSameSeeders = [
        { name: 'Show.S01E01.720p', seeders: 10 },
        { name: 'Show.S01E01.1080p', seeders: 10 }
      ];

      const result = service.getPreferredTorrent(torrentsWithSameSeeders);
      expect(result?.name).toBe('Show.S01E01.1080p');
    });
  });

  describe('validateTVSearchParams', () => {
    it('should validate correct parameters', () => {
      const params: TVSearchQuery = { showName: 'Test Show', season: 1, episode: 5 };
      const result = service.validateTVSearchParams(params);
      expect(result).toBe(true);
    });

    it('should reject empty show name', () => {
      const params: TVSearchQuery = { showName: '' };
      const result = service.validateTVSearchParams(params);
      expect(result).toBe(false);
    });

    it('should reject invalid season', () => {
      const params: TVSearchQuery = { showName: 'Test Show', season: 0 };
      const result = service.validateTVSearchParams(params);
      expect(result).toBe(false);
    });

    it('should reject invalid episode', () => {
      const params: TVSearchQuery = { showName: 'Test Show', season: 1, episode: 0 };
      const result = service.validateTVSearchParams(params);
      expect(result).toBe(false);
    });

    it('should accept parameters without season/episode', () => {
      const params: TVSearchQuery = { showName: 'Test Show' };
      const result = service.validateTVSearchParams(params);
      expect(result).toBe(true);
    });
  });
});