/**
 * TV Show parser service for handling TV show torrent parsing and formatting
 */

import { IConfigManager } from '../config/types.js';
import { ILogger } from '../types/service.js';
import { TorrentParserService } from './torrentParserService.js';

export interface EpisodeInfo {
  type: 'single' | 'range' | 'season';
  season: number | null;
  episode?: number;
  episodes?: number[];
}

export interface TVSearchQuery {
  showName: string;
  season?: number;
  episode?: number;
}

export interface TorrentInfo {
  name: string;
  seeders: number;
  [key: string]: any;
}

export class TVShowParserService {
  private torrentParser: TorrentParserService;
  private logger: ILogger;

  constructor(config: IConfigManager, logger: ILogger) {
    this.logger = logger.createChildLogger ? logger.createChildLogger('TVShowParser') : logger;
    this.torrentParser = new TorrentParserService(config, logger);
  }

  /**
   * Detect if a torrent is a season pack
   */
  public detectSeasonPack(torrentName: string): boolean {
    const name = torrentName.toLowerCase();
    
    // Season pack patterns
    const seasonPackPatterns = [
      /s\d{1,2}\s*complete/i,
      /season\s*\d{1,2}\s*complete/i,
      /s\d{1,2}\s*\d{3,4}p/i, // Season with quality but no episode
      /complete\s*season/i,
      /full\s*season/i
    ];
    
    const hasSeasonPack = seasonPackPatterns.some(pattern => pattern.test(name));
    
    // Check if it has episode number (if it does, it's not a season pack)
    const hasEpisode = /e\d{1,2}/i.test(name) || /episode\s*\d{1,2}/i.test(name);
    
    const isSeasonPack = hasSeasonPack && !hasEpisode;
    
    this.logger.debug('Season pack detection', {
      torrentName,
      hasSeasonPack,
      hasEpisode,
      isSeasonPack
    });
    
    return isSeasonPack;
  }

  /**
   * Detect episode range information from torrent name
   */
  public detectEpisodeRange(torrentName: string): EpisodeInfo | null {
    try {
      const parsed = this.torrentParser.parseTorrentTitle(torrentName);
      
      if (parsed.episode) {
        // Handle arrays of episodes
        if (Array.isArray(parsed.episode)) {
          return {
            type: 'range',
            season: parsed.season,
            episodes: parsed.episode
          };
        }
        
        // Single episode
        return {
          type: 'single',
          season: parsed.season,
          episode: parsed.episode
        };
      }
      
      // Check for episode ranges in format E01-E05 or E01E02E03
      const rangeMatch = torrentName.match(/e(\d{1,2})\s*-\s*e(\d{1,2})/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        const episodes = [];
        for (let i = start; i <= end; i++) {
          episodes.push(i);
        }
        return {
          type: 'range',
          season: parsed.season,
          episodes: episodes
        };
      }
      
      // Check for multi-episode format E01E02E03
      const multiMatch = torrentName.match(/e(\d{1,2}(?:e\d{1,2})+)/i);
      if (multiMatch) {
        const episodes = multiMatch[0].match(/\d{1,2}/g)?.map(n => parseInt(n)) || [];
        return {
          type: 'range',
          season: parsed.season,
          episodes: episodes
        };
      }
      
      if (this.detectSeasonPack(torrentName)) {
        return {
          type: 'season',
          season: parsed.season
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to detect episode range', { torrentName, error });
      return null;
    }
  }

  /**
   * Format episode name for Plex naming convention
   */
  public formatEpisodeForPlex(
    showName: string, 
    season: number, 
    episode: number, 
    episodeName: string = ''
  ): string {
    const sanitizedShow = this.sanitizeFileName(showName);
    const s = String(season).padStart(2, '0');
    const e = String(episode).padStart(2, '0');
    
    if (episodeName) {
      const sanitizedEpisodeName = this.sanitizeFileName(episodeName);
      return `${sanitizedShow} - S${s}E${e} - ${sanitizedEpisodeName}`;
    }
    
    return `${sanitizedShow} - S${s}E${e}`;
  }

  /**
   * Build search query for TV shows
   */
  public buildTVSearchQuery(options: TVSearchQuery): string {
    const { showName, season, episode } = options;
    let query = showName;
    
    if (season !== null && season !== undefined) {
      const s = String(season).padStart(2, '0');
      query += ` S${s}`;
      
      if (episode !== null && episode !== undefined) {
        const e = String(episode).padStart(2, '0');
        query += `E${e}`;
      }
    }
    
    this.logger.debug('Built TV search query', { options, query });
    return query;
  }

  /**
   * Filter torrents based on season and episode criteria
   */
  public filterTVTorrents(
    torrents: TorrentInfo[], 
    season: number, 
    episode?: number
  ): TorrentInfo[] {
    const filtered = torrents.filter(torrent => {
      const episodeInfo = this.detectEpisodeRange(torrent.name);
      
      if (!episodeInfo) {
        return false;
      }
      
      // Check season matches
      if (episodeInfo.season !== season) {
        return false;
      }
      
      // If looking for specific episode
      if (episode !== null && episode !== undefined) {
        if (episodeInfo.type === 'single') {
          return episodeInfo.episode === episode;
        } else if (episodeInfo.type === 'range') {
          return episodeInfo.episodes?.includes(episode) || false;
        } else if (episodeInfo.type === 'season') {
          return true; // Season pack includes all episodes
        }
      } else {
        // Looking for season pack
        return episodeInfo.type === 'season';
      }
      
      return false;
    });

    this.logger.debug('Filtered TV torrents', {
      originalCount: torrents.length,
      filteredCount: filtered.length,
      season,
      episode
    });

    return filtered;
  }

  /**
   * Extract season and episode numbers from filename
   */
  public extractSeasonEpisode(filename: string): { season?: number; episode?: number } {
    const episodeInfo = this.detectEpisodeRange(filename);
    
    if (!episodeInfo) {
      return {};
    }

    if (episodeInfo.type === 'single') {
      return {
        season: episodeInfo.season || undefined,
        episode: episodeInfo.episode
      };
    }

    return {
      season: episodeInfo.season || undefined
    };
  }

  /**
   * Check if torrent matches specific TV show criteria
   */
  public matchesTVCriteria(
    torrentName: string,
    showName: string,
    season?: number,
    episode?: number
  ): boolean {
    // Basic name matching
    const normalizedTorrent = torrentName.toLowerCase();
    const normalizedShow = showName.toLowerCase();
    
    if (!normalizedTorrent.includes(normalizedShow)) {
      return false;
    }

    const episodeInfo = this.detectEpisodeRange(torrentName);
    if (!episodeInfo) {
      return false;
    }

    // Check season
    if (season !== undefined && episodeInfo.season !== season) {
      return false;
    }

    // Check episode
    if (episode !== undefined) {
      if (episodeInfo.type === 'single') {
        return episodeInfo.episode === episode;
      } else if (episodeInfo.type === 'range') {
        return episodeInfo.episodes?.includes(episode) || false;
      } else if (episodeInfo.type === 'season') {
        return true; // Season pack includes the episode
      }
    }

    return true;
  }

  /**
   * Get preferred torrent from a list based on quality and seeders
   */
  public getPreferredTorrent(torrents: TorrentInfo[]): TorrentInfo | null {
    if (torrents.length === 0) {
      return null;
    }

    // Sort by seeders (descending) and then by quality score
    const sorted = torrents.sort((a, b) => {
      const seedersA = a.seeders || 0;
      const seedersB = b.seeders || 0;
      
      if (seedersA !== seedersB) {
        return seedersB - seedersA;
      }

      // If seeders are equal, use quality score from torrent parser
      const qualityA = this.torrentParser.getQualityScore(a);
      const qualityB = this.torrentParser.getQualityScore(b);
      
      return qualityB - qualityA;
    });

    const preferred = sorted[0];
    
    this.logger.debug('Selected preferred torrent', {
      torrentName: preferred.name,
      seeders: preferred.seeders,
      totalOptions: torrents.length
    });

    return preferred;
  }

  /**
   * Sanitize filename by removing invalid characters
   */
  private sanitizeFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '');
  }

  /**
   * Validate TV show search parameters
   */
  public validateTVSearchParams(params: TVSearchQuery): boolean {
    if (!params.showName || params.showName.trim().length === 0) {
      return false;
    }

    if (params.season !== undefined && (params.season < 1 || params.season > 50)) {
      return false;
    }

    if (params.episode !== undefined && (params.episode < 1 || params.episode > 999)) {
      return false;
    }

    return true;
  }
}

// Export the formatEpisodeForPlex function for backward compatibility
export function formatEpisodeForPlex(
  showName: string, 
  season: number, 
  episode: number, 
  episodeName: string = ''
): string {
  const sanitizedShow = showName.replace(/[<>:"/\\|?*]/g, '');
  const s = String(season).padStart(2, '0');
  const e = String(episode).padStart(2, '0');
  
  if (episodeName) {
    const sanitizedEpisodeName = episodeName.replace(/[<>:"/\\|?*]/g, '');
    return `${sanitizedShow} - S${s}E${e} - ${sanitizedEpisodeName}`;
  }
  
  return `${sanitizedShow} - S${s}E${e}`;
}