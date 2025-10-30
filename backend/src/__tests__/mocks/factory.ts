import { jest } from '@jest/globals';
import { IConfigManager } from '../../config/types.js';
import { ILogger } from '../../types/service.js';
import { IServiceCache } from '../../types/service.js';
import { TorrentParserService } from '../../services/torrentParserService.js';

/**
 * Mock factory for creating consistent test mocks
 */
export class MockFactory {
  /**
   * Create a mock ConfigManager
   */
  static createMockConfig(overrides: Partial<IConfigManager> = {}): jest.Mocked<IConfigManager> {
    return {
      get: jest.fn(),
      set: jest.fn(),
      getRequired: jest.fn(),
      validate: jest.fn(),
      onConfigChange: jest.fn(),
      getAllConfig: jest.fn(),
      ...overrides
    } as jest.Mocked<IConfigManager>;
  }

  /**
   * Create a mock Logger
   */
  static createMockLogger(overrides: Partial<ILogger> = {}): jest.Mocked<ILogger> {
    const mockChildLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      createChildLogger: jest.fn()
    };

    return {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      createChildLogger: jest.fn().mockReturnValue(mockChildLogger),
      ...overrides
    } as jest.Mocked<ILogger>;
  }

  /**
   * Create a mock ServiceCache
   */
  static createMockCache(): jest.Mocked<IServiceCache> {
    return {
      get: jest.fn().mockImplementation(async () => null),
      set: jest.fn().mockImplementation(async () => {}),
      delete: jest.fn().mockImplementation(async () => {}),
      clear: jest.fn().mockImplementation(async () => {})
    } as jest.Mocked<IServiceCache>;
  }

  /**
   * Create a mock TorrentParserService
   */
  static createMockTorrentParser(overrides: Partial<TorrentParserService> = {}): jest.Mocked<TorrentParserService> {
    return {
      parseTorrentTitle: jest.fn(),
      getQualityScore: jest.fn(),
      groupByQuality: jest.fn(),
      filterByQuality: jest.fn(),
      sortByQuality: jest.fn(),
      extractSeasonEpisode: jest.fn(),
      isSeasonPack: jest.fn(),
      validateTorrent: jest.fn(),
      logger: MockFactory.createMockLogger(),
      ...overrides
    } as unknown as jest.Mocked<TorrentParserService>;
  }

  /**
   * Create mock axios response
   */
  static createMockAxiosResponse<T>(data: T, status = 200) {
    return {
      data,
      status,
      statusText: 'OK',
      headers: {},
      config: {}
    };
  }

  /**
   * Create mock axios error
   */
  static createMockAxiosError(message: string, status = 500, code?: string) {
    const error = new Error(message) as any;
    error.response = {
      status,
      statusText: 'Internal Server Error',
      data: { error: message }
    };
    error.code = code;
    return error;
  }
}