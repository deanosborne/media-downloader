/**
 * Jackett service extending BaseService for torrent search functionality
 */

import { BaseService } from './BaseService.js';
import { IConfigManager } from '../config/types.js';
import { ILogger, ValidationError, ExternalServiceError, IServiceCache } from '../types/service.js';

// Jackett-specific error types
export class JackettConnectionError extends ExternalServiceError {
  constructor(message: string, originalError?: Error) {
    super(message, 'Jackett', originalError);
  }
}

export class JackettAuthenticationError extends ExternalServiceError {
  constructor(message: string, originalError?: Error) {
    super(message, 'Jackett', originalError);
  }
}

export class JackettValidationError extends ValidationError {
  constructor(message: string, originalError?: Error) {
    super(message, 'Jackett', originalError);
  }
}

// Jackett API interfaces
export interface JackettSearchParams {
  query: string;
  type?: MediaType;
  qualityPrefs?: QualityPreferences;
}

export interface QualityPreferences {
  resolution?: string;
  minSeeders?: number;
  maxResults?: number;
}

export interface TorrentResult {
  name: string;
  magnet: string;
  size: number;
  sizeFormatted: string;
  seeders: number;
  peers: number;
  indexer: string;
  publishDate: string;
  resolution: string;
  codec: string;
  hdr: boolean;
  qualityScore: number;
}

export interface JackettApiResponse {
  Results: JackettRawResult[];
}

export interface JackettRawResult {
  Title: string;
  MagnetUri?: string;
  Link?: string;
  Size: number;
  Seeders: number;
  Peers: number;
  Tracker: string;
  PublishDate: string;
}

export type MediaType = 'Movie' | 'TV Show' | 'Book' | 'Audiobook' | 'Application';

export class JackettService extends BaseService {
  private cache: IServiceCache;

  constructor(config: IConfigManager, logger: ILogger, cache: IServiceCache) {
    super('Jackett', config, logger, {
      timeout: 30000,
      retries: 2,
      retryDelay: 2000
    });
    this.cache = cache;
  }

  protected getBaseUrl(): string {
    return this.config.get<string>('jackett.url') || 'http://localhost:9117';
  }

  protected getAuthHeaders(): Record<string, string> {
    // Jackett uses API key in query params, not headers
    return {};
  }

  private getApiKey(): string {
    const apiKey = this.config.get<string>('jackett.apiKey');
    if (!apiKey) {
      throw new JackettAuthenticationError('Jackett API key not configured');
    }
    return apiKey;
  }

  /**
   * Search for torrents using Jackett API
   */
  async searchTorrents(params: JackettSearchParams): Promise<TorrentResult[]> {
    this.validateSearchParams(params);

    const { query, type, qualityPrefs = {} } = params;
    const maxResults = qualityPrefs.maxResults || 20;

    // Create cache key based on search parameters
    const cacheKey = `jackett:search:${query}:${type || 'all'}:${JSON.stringify(qualityPrefs)}`;
    
    // Check cache first (shorter TTL for torrent results - 2 minutes)
    const cached = await this.cache.get<TorrentResult[]>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for torrent search', { query, type, cacheKey });
      return cached.slice(0, maxResults);
    }

    this.logger.info('Searching torrents', { 
      query, 
      type, 
      qualityPrefs,
      service: this.serviceName 
    });

    try {
      const response = await this.get<JackettApiResponse>('/api/v2.0/indexers/all/results', {
        apikey: this.getApiKey(),
        Query: query,
        Category: this.getCategoryForType(type),
      });

      const results = response.Results || [];

      if (results.length === 0) {
        this.logger.info('No torrents found', { query, type });
        return [];
      }

      // Parse and enrich each torrent with quality information
      const enrichedResults = results.map((item) => this.enrichTorrentResult(item));

      // Filter by quality preferences
      const filtered = this.filterByQualityPreferences(enrichedResults, qualityPrefs);

      // Sort by quality and seeders
      const sorted = this.sortTorrentResults(filtered);

      const finalResults = sorted.slice(0, maxResults);

      // Cache the results for 2 minutes (torrent results change frequently)
      await this.cache.set(cacheKey, finalResults, 2 * 60 * 1000);

      this.logger.info('Torrent search completed', {
        query,
        type,
        totalFound: results.length,
        afterFiltering: filtered.length,
        returned: finalResults.length
      });

      return finalResults;
    } catch (error: any) {
      this.logger.error('Torrent search failed', { 
        query, 
        type, 
        error: error.message 
      });

      // Transform specific Jackett errors
      if (error.response?.status === 401) {
        throw new JackettAuthenticationError('Invalid API key or authentication failed');
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new JackettConnectionError('Cannot connect to Jackett server. Is it running?');
      }

      // Re-throw if it's already a service error, otherwise wrap it
      if (error.isOperational) {
        throw error;
      }
      
      throw new ExternalServiceError(`Jackett search failed: ${error.message}`, this.serviceName, error);
    }
  }

  /**
   * Test connection to Jackett server
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.get('/api/v2.0/indexers', {
        apikey: this.getApiKey()
      });

      return {
        success: true,
        message: 'Jackett connection successful'
      };
    } catch (error: any) {
      this.logger.error('Jackett connection test failed', { error: error.message });
      
      return {
        success: false,
        message: error.message || 'Connection test failed'
      };
    }
  }

  private validateSearchParams(params: JackettSearchParams): void {
    if (!params.query || typeof params.query !== 'string' || params.query.trim().length === 0) {
      throw new JackettValidationError('Search query is required and must be a non-empty string');
    }

    if (params.query.length > 200) {
      throw new JackettValidationError('Search query is too long (maximum 200 characters)');
    }

    if (params.qualityPrefs?.minSeeders !== undefined && params.qualityPrefs.minSeeders < 0) {
      throw new JackettValidationError('Minimum seeders must be a non-negative number');
    }

    if (params.qualityPrefs?.maxResults !== undefined && (params.qualityPrefs.maxResults < 1 || params.qualityPrefs.maxResults > 100)) {
      throw new JackettValidationError('Maximum results must be between 1 and 100');
    }
  }

  private enrichTorrentResult(item: JackettRawResult): TorrentResult {
    const parsed = this.parseTorrentTitle(item.Title);
    const enriched: TorrentResult = {
      name: item.Title,
      magnet: item.MagnetUri || item.Link || '',
      size: item.Size || 0,
      sizeFormatted: this.formatBytes(item.Size || 0),
      seeders: item.Seeders || 0,
      peers: item.Peers || 0,
      indexer: item.Tracker || 'Unknown',
      publishDate: item.PublishDate || '',
      ...parsed,
      qualityScore: 0,
    };

    enriched.qualityScore = this.getQualityScore(enriched);
    return enriched;
  }

  private filterByQualityPreferences(torrents: TorrentResult[], qualityPrefs: QualityPreferences): TorrentResult[] {
    let filtered = torrents;

    if (qualityPrefs.resolution && qualityPrefs.resolution !== 'any') {
      filtered = filtered.filter(t => t.resolution === qualityPrefs.resolution);
    }

    if (qualityPrefs.minSeeders !== undefined) {
      filtered = filtered.filter(t => t.seeders >= qualityPrefs.minSeeders!);
    }

    return filtered;
  }

  private sortTorrentResults(torrents: TorrentResult[]): TorrentResult[] {
    return torrents.sort((a, b) => {
      // Primary: Most seeders
      if (b.seeders !== a.seeders) {
        return b.seeders - a.seeders;
      }
      // Secondary: Best quality (as tiebreaker)
      return b.qualityScore - a.qualityScore;
    });
  }

  private getCategoryForType(type?: MediaType): string {
    const categories: Record<MediaType, string> = {
      'Movie': '2000',
      'TV Show': '5000',
      'Book': '7000,8000',
      'Audiobook': '3030',
      'Application': '4000',
    };
    return type ? categories[type] || '' : '';
  }

  private formatBytes(bytes: number): string {
    if (!bytes) return 'Unknown';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }

  private parseTorrentTitle(title: string): Pick<TorrentResult, 'resolution' | 'codec' | 'hdr'> {
    return {
      resolution: this.extractResolution(title),
      codec: this.extractCodec(title),
      hdr: this.extractHDR(title)
    };
  }

  private extractResolution(title: string): string {
    const resolutions = ['2160p', '4K', '1080p', '720p', '480p'];
    for (const res of resolutions) {
      if (title.toLowerCase().includes(res.toLowerCase())) {
        return res;
      }
    }
    return 'Unknown';
  }

  private extractCodec(title: string): string {
    const codecs = ['x265', 'x264', 'HEVC', 'H.265', 'H.264'];
    for (const codec of codecs) {
      if (title.toLowerCase().includes(codec.toLowerCase())) {
        return codec;
      }
    }
    return 'Unknown';
  }

  private extractHDR(title: string): boolean {
    const hdrKeywords = ['HDR', 'HDR10', 'Dolby Vision', 'DV'];
    return hdrKeywords.some(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private getQualityScore(torrent: TorrentResult): number {
    let score = 0;
    
    // Resolution scoring
    const resolutionScores: Record<string, number> = {
      '2160p': 100,
      '4K': 100,
      '1080p': 80,
      '720p': 60,
      '480p': 40
    };
    score += resolutionScores[torrent.resolution] || 0;
    
    // Codec scoring
    if (torrent.codec === 'x265' || torrent.codec === 'HEVC' || torrent.codec === 'H.265') {
      score += 20;
    } else if (torrent.codec === 'x264' || torrent.codec === 'H.264') {
      score += 10;
    }
    
    // HDR bonus
    if (torrent.hdr) {
      score += 15;
    }
    
    return score;
  }
}

// Legacy function exports for backward compatibility
let jackettService: JackettService | null = null;

export const initializeJackettService = (config: IConfigManager, logger: ILogger): JackettService => {
  jackettService = new JackettService(config, logger);
  return jackettService;
};

export const searchTorrents = async (query: string, type?: string, qualityPrefs: any = {}): Promise<TorrentResult[]> => {
  if (!jackettService) {
    throw new Error('Jackett service not initialized. Call initializeJackettService() first.');
  }
  
  // Convert legacy parameters to new interface
  const params: JackettSearchParams = {
    query,
    type: type as MediaType,
    qualityPrefs
  };
  
  return jackettService.searchTorrents(params);
};