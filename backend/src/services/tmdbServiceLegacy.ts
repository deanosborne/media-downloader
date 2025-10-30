/**
 * TMDB service implementation extending BaseService
 * Provides movie and TV show metadata from The Movie Database API
 */

import { BaseService } from './BaseService.js';
import { IConfigManager } from '../config/types.js';
import { ILogger, IServiceCache } from '../types/service.js';
import { MediaType } from '../models/index.js';

// TMDB API response interfaces
export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
  media_type?: string;
}

export interface TMDBSearchResponse {
  results: TMDBSearchResult[];
  total_results: number;
  total_pages: number;
}

export interface TMDBTVShowDetails {
  id: number;
  name: string;
  overview?: string;
  first_air_date?: string;
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: TMDBSeason[];
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string;
  overview?: string;
  poster_path?: string | null;
}

export interface TMDBSeasonDetails {
  season_number: number;
  name: string;
  overview?: string;
  air_date?: string;
  episodes: TMDBEpisode[];
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview?: string;
  air_date?: string;
  runtime?: number;
}

export interface TMDBEpisodeDetails {
  episode_number: number;
  season_number: number;
  name: string;
  overview?: string;
  air_date?: string;
  runtime?: number;
}

// Normalized response interfaces
export interface MediaSearchResult {
  id: number;
  name: string;
  year?: number;
  overview?: string;
  poster?: string | null;
  type: MediaType;
}

export interface TVShowDetails {
  id: number;
  name: string;
  overview?: string;
  first_air_date?: string;
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: SeasonInfo[];
}

export interface SeasonInfo {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string;
  overview?: string;
  poster_path?: string | null;
}

export interface SeasonDetails {
  season_number: number;
  name: string;
  overview?: string;
  air_date?: string;
  episodes: EpisodeInfo[];
}

export interface EpisodeInfo {
  id: number;
  episode_number: number;
  name: string;
  overview?: string;
  air_date?: string;
  runtime?: number;
}

export interface EpisodeDetails {
  episode_number: number;
  season_number: number;
  name: string;
  overview?: string;
  air_date?: string;
  runtime?: number;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';

export class TMDBService extends BaseService {
  private cache: IServiceCache;

  constructor(
    config: IConfigManager,
    logger: ILogger,
    cache: IServiceCache
  ) {
    super('TMDB', config, logger, {
      timeout: 10000,
      retries: 2,
      retryDelay: 1000
    });
    this.cache = cache;
  }

  protected getBaseUrl(): string {
    return this.config.get<string>('tmdb.baseUrl') || TMDB_BASE_URL;
  }

  protected getAuthHeaders(): Record<string, string> {
    const apiKey = this.config.getRequired<string>('tmdb.apiKey');
    return {
      'Authorization': `Bearer ${apiKey}`
    };
  }

  /**
   * Search for media (movies, TV shows, or multi-search)
   */
  async searchMedia(query: string, type?: string): Promise<MediaSearchResult[]> {
    // Handle non-TMDB media types
    if (type === 'Book') {
      return this.searchBooks(query);
    }
    
    if (type === 'Audiobook') {
      return this.searchAudiobooks(query);
    }
    
    if (type === 'Application') {
      return this.searchApplications(query);
    }

    const cacheKey = `search:${type || 'multi'}:${query}`;
    const cached = await this.cache.get<MediaSearchResult[]>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for search', { query, type, cacheKey });
      return cached;
    }

    let endpoint = '';
    switch (type) {
      case 'Movie':
        endpoint = '/search/movie';
        break;
      case 'TV Show':
        endpoint = '/search/tv';
        break;
      default:
        endpoint = '/search/multi';
    }

    const response = await this.get<TMDBSearchResponse>(endpoint, {
      query,
      language: 'en-US'
    });

    const results = response.results.map(item => this.normalizeSearchResult(item));
    
    // Cache results for 10 minutes
    await this.cache.set(cacheKey, results, 10 * 60 * 1000);
    
    this.logger.info('Media search completed', {
      query,
      type,
      resultCount: results.length
    });

    return results;
  }

  /**
   * Get detailed information about a TV show
   */
  async getTVShowDetails(tvShowId: string | number): Promise<TVShowDetails> {
    const cacheKey = `tv:${tvShowId}`;
    const cached = await this.cache.get<TVShowDetails>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for TV show details', { tvShowId, cacheKey });
      return cached;
    }

    const response = await this.get<TMDBTVShowDetails>(`/tv/${tvShowId}`, {
      language: 'en-US'
    });

    const details: TVShowDetails = {
      id: response.id,
      name: response.name,
      overview: response.overview,
      first_air_date: response.first_air_date,
      number_of_seasons: response.number_of_seasons,
      number_of_episodes: response.number_of_episodes,
      seasons: response.seasons.map(season => ({
        id: season.id,
        season_number: season.season_number,
        name: season.name,
        episode_count: season.episode_count,
        air_date: season.air_date,
        overview: season.overview,
        poster_path: season.poster_path
      }))
    };

    // Cache for 1 hour
    await this.cache.set(cacheKey, details, 60 * 60 * 1000);
    
    this.logger.info('TV show details retrieved', { tvShowId });
    return details;
  }

  /**
   * Get detailed information about a specific season
   */
  async getSeasonDetails(tvShowId: string | number, seasonNumber: string | number): Promise<SeasonDetails> {
    const cacheKey = `season:${tvShowId}:${seasonNumber}`;
    const cached = await this.cache.get<SeasonDetails>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for season details', { tvShowId, seasonNumber, cacheKey });
      return cached;
    }

    const response = await this.get<TMDBSeasonDetails>(`/tv/${tvShowId}/season/${seasonNumber}`, {
      language: 'en-US'
    });

    const details: SeasonDetails = {
      season_number: response.season_number,
      name: response.name,
      overview: response.overview,
      air_date: response.air_date,
      episodes: response.episodes.map(ep => ({
        id: ep.id,
        episode_number: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        air_date: ep.air_date,
        runtime: ep.runtime
      }))
    };

    // Cache for 1 hour
    await this.cache.set(cacheKey, details, 60 * 60 * 1000);
    
    this.logger.info('Season details retrieved', { tvShowId, seasonNumber });
    return details;
  }

  /**
   * Get detailed information about a specific episode
   */
  async getEpisodeDetails(
    tvShowId: string | number,
    seasonNumber: string | number,
    episodeNumber: string | number
  ): Promise<EpisodeDetails> {
    const cacheKey = `episode:${tvShowId}:${seasonNumber}:${episodeNumber}`;
    const cached = await this.cache.get<EpisodeDetails>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for episode details', { tvShowId, seasonNumber, episodeNumber, cacheKey });
      return cached;
    }

    const response = await this.get<TMDBEpisodeDetails>(
      `/tv/${tvShowId}/season/${seasonNumber}/episode/${episodeNumber}`,
      {
        language: 'en-US'
      }
    );

    const details: EpisodeDetails = {
      episode_number: response.episode_number,
      season_number: response.season_number,
      name: response.name,
      overview: response.overview,
      air_date: response.air_date,
      runtime: response.runtime
    };

    // Cache for 1 hour
    await this.cache.set(cacheKey, details, 60 * 60 * 1000);
    
    this.logger.info('Episode details retrieved', { tvShowId, seasonNumber, episodeNumber });
    return details;
  }

  /**
   * Normalize TMDB search result to common format
   */
  private normalizeSearchResult(item: TMDBSearchResult): MediaSearchResult {
    const name = item.title || item.name || '';
    const year = item.release_date 
      ? new Date(item.release_date).getFullYear()
      : item.first_air_date 
        ? new Date(item.first_air_date).getFullYear()
        : undefined;
    
    const poster = item.poster_path 
      ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
      : null;

    // Determine media type
    let type: MediaType;
    if (item.media_type === 'movie' || item.title) {
      type = MediaType.MOVIE;
    } else if (item.media_type === 'tv' || item.name) {
      type = MediaType.TV_SHOW;
    } else {
      type = MediaType.MOVIE; // Default fallback
    }

    return {
      id: item.id,
      name,
      year,
      overview: item.overview,
      poster,
      type
    };
  }

  /**
   * Placeholder for book search - to be implemented with external service
   */
  private async searchBooks(query: string): Promise<MediaSearchResult[]> {
    this.logger.info('Book search not implemented', { query });
    return [];
  }

  /**
   * Placeholder for audiobook search - to be implemented with external service
   */
  private async searchAudiobooks(query: string): Promise<MediaSearchResult[]> {
    this.logger.info('Audiobook search not implemented', { query });
    return [];
  }

  /**
   * Placeholder for application search - to be implemented with external service
   */
  private async searchApplications(query: string): Promise<MediaSearchResult[]> {
    this.logger.info('Application search not implemented', { query });
    return [];
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.logger.info('TMDB cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } | null {
    if ('getStats' in this.cache && typeof this.cache.getStats === 'function') {
      return (this.cache as any).getStats();
    }
    return null;
  }
}