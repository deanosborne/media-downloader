/**
 * Torrent parser service for parsing torrent titles and extracting metadata
 */

import ptt from 'parse-torrent-title';
import { IConfigManager } from '../config/types.js';
import { ILogger } from '../types/service.js';

export interface ParsedTorrentInfo {
  resolution: string;
  quality: string;
  codec: string;
  audio: string;
  hdr: boolean;
  season: number | null;
  episode: number | number[] | null;
  group: string;
  year: number | null;
  title: string;
}

export interface QualityGroup {
  resolution: string;
  quality: string;
  torrents: any[];
}

export interface TorrentWithScore {
  [key: string]: any;
  seeders: number;
  resolution: string;
  quality: string;
  codec: string;
  hdr: boolean;
}

export class TorrentParserService {
  private logger: ILogger;

  constructor(config: IConfigManager, logger: ILogger) {
    this.logger = logger.createChildLogger ? logger.createChildLogger('TorrentParser') : logger;
  }

  /**
   * Parse torrent title and extract metadata
   */
  public parseTorrentTitle(title: string): ParsedTorrentInfo {
    try {
      this.logger.debug('Parsing torrent title', { title });
      
      const parsed = ptt.parse(title);

      // Ensure audio is always a string
      let audioString = 'Unknown';
      if (parsed.audio) {
        if (Array.isArray(parsed.audio)) {
          audioString = parsed.audio.join(', ');
        } else {
          audioString = String(parsed.audio);
        }
      }

      // Ensure codec is a string
      const codec = parsed.codec ? String(parsed.codec) : 'Unknown';

      const result: ParsedTorrentInfo = {
        resolution: parsed.resolution || 'Unknown',
        quality: parsed.quality || 'Unknown',
        codec: codec,
        audio: audioString,
        hdr: parsed.hdr || false,
        season: parsed.season || null,
        episode: parsed.episode || null,
        group: parsed.group || 'Unknown',
        year: parsed.year || null,
        title: parsed.title || title,
      };

      this.logger.debug('Torrent title parsed successfully', { 
        title, 
        parsed: result 
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to parse torrent title', { title, error });
      
      // Return safe defaults if parsing fails
      return {
        resolution: 'Unknown',
        quality: 'Unknown',
        codec: 'Unknown',
        audio: 'Unknown',
        hdr: false,
        season: null,
        episode: null,
        group: 'Unknown',
        year: null,
        title: title,
      };
    }
  }

  /**
   * Group torrents by quality and resolution
   */
  public groupByQuality(torrents: any[]): QualityGroup[] {
    const grouped: { [key: string]: QualityGroup } = {};

    torrents.forEach((torrent) => {
      const parsed = this.parseTorrentTitle(torrent.name || torrent.title || '');
      const key = `${parsed.resolution}-${parsed.quality}`;

      if (!grouped[key]) {
        grouped[key] = {
          resolution: parsed.resolution,
          quality: parsed.quality,
          torrents: [],
        };
      }

      grouped[key].torrents.push({
        ...torrent,
        ...parsed
      });
    });

    // Convert to array and sort by quality score
    const result = Object.values(grouped);

    // Sort groups by resolution (2160p > 1080p > 720p, etc.)
    const resolutionOrder: { [key: string]: number } = {
      '2160p': 4,
      '1080p': 3,
      '720p': 2,
      '480p': 1,
      'Unknown': 0,
    };

    result.sort((a, b) => {
      const aScore = resolutionOrder[a.resolution] || 0;
      const bScore = resolutionOrder[b.resolution] || 0;
      return bScore - aScore;
    });

    // Sort torrents within each group by seeders
    result.forEach((group) => {
      group.torrents.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));
    });

    this.logger.debug('Grouped torrents by quality', {
      originalCount: torrents.length,
      groupCount: result.length
    });

    return result;
  }

  /**
   * Calculate quality score for a torrent
   */
  public getQualityScore(torrent: TorrentWithScore): number {
    let score = 0;

    // Seeders are now the PRIMARY factor (much higher weight)
    const seeders = torrent.seeders || 0;
    score += Math.min(seeders * 2, 500); // Max 500 points from seeders

    // Resolution scoring (secondary)
    const resolutionScores: { [key: string]: number } = {
      '2160p': 80,
      '1080p': 60,
      '720p': 40,
      '480p': 20,
      'Unknown': 10,
    };
    score += resolutionScores[torrent.resolution] || 0;

    // Quality scoring (tertiary)
    const qualityScores: { [key: string]: number } = {
      'REMUX': 25,
      'BluRay': 20,
      'WEB-DL': 15,
      'WEBRip': 13,
      'HDRip': 10,
      'DVDRip': 8,
      'CAM': 3,
      'Unknown': 0,
    };
    score += qualityScores[torrent.quality] || 0;

    // HDR bonus
    if (torrent.hdr) {
      score += 5;
    }

    // Codec bonus
    if (torrent.codec && torrent.codec.toLowerCase().includes('265')) {
      score += 3;
    }

    this.logger.debug('Calculated quality score', {
      torrentName: torrent.name || 'Unknown',
      seeders,
      resolution: torrent.resolution,
      quality: torrent.quality,
      score
    });

    return score;
  }

  /**
   * Filter torrents by minimum quality requirements
   */
  public filterByQuality(
    torrents: any[],
    minResolution?: string,
    minSeeders?: number,
    preferredCodec?: string
  ): any[] {
    const resolutionOrder: { [key: string]: number } = {
      '2160p': 4,
      '1080p': 3,
      '720p': 2,
      '480p': 1,
      'Unknown': 0,
    };

    const minResolutionScore = minResolution ? (resolutionOrder[minResolution] || 0) : 0;
    const minSeederCount = minSeeders || 0;

    const filtered = torrents.filter(torrent => {
      const parsed = this.parseTorrentTitle(torrent.name || torrent.title || '');
      const resolutionScore = resolutionOrder[parsed.resolution] || 0;
      const seeders = torrent.seeders || 0;

      // Check minimum resolution
      if (resolutionScore < minResolutionScore) {
        return false;
      }

      // Check minimum seeders
      if (seeders < minSeederCount) {
        return false;
      }

      // Check preferred codec if specified
      if (preferredCodec && parsed.codec.toLowerCase() !== preferredCodec.toLowerCase()) {
        return false;
      }

      return true;
    });

    this.logger.debug('Filtered torrents by quality', {
      originalCount: torrents.length,
      filteredCount: filtered.length,
      minResolution,
      minSeeders,
      preferredCodec
    });

    return filtered;
  }

  /**
   * Sort torrents by quality score
   */
  public sortByQuality(torrents: any[]): any[] {
    const sorted = torrents
      .map(torrent => ({
        ...torrent,
        ...this.parseTorrentTitle(torrent.name || torrent.title || ''),
        qualityScore: this.getQualityScore({
          ...torrent,
          ...this.parseTorrentTitle(torrent.name || torrent.title || '')
        })
      }))
      .sort((a, b) => b.qualityScore - a.qualityScore);

    this.logger.debug('Sorted torrents by quality', {
      count: sorted.length,
      topScore: sorted[0]?.qualityScore || 0,
      bottomScore: sorted[sorted.length - 1]?.qualityScore || 0
    });

    return sorted;
  }

  /**
   * Get the best torrent from a list based on quality scoring
   */
  public getBestTorrent(torrents: any[]): any | null {
    if (torrents.length === 0) {
      return null;
    }

    const sorted = this.sortByQuality(torrents);
    const best = sorted[0];

    this.logger.info('Selected best torrent', {
      torrentName: best.name || best.title || 'Unknown',
      qualityScore: best.qualityScore,
      seeders: best.seeders,
      resolution: best.resolution,
      quality: best.quality
    });

    return best;
  }

  /**
   * Extract year from torrent title
   */
  public extractYear(title: string): number | null {
    const parsed = this.parseTorrentTitle(title);
    return parsed.year;
  }

  /**
   * Check if torrent is HDR
   */
  public isHDR(title: string): boolean {
    const parsed = this.parseTorrentTitle(title);
    return parsed.hdr;
  }

  /**
   * Get torrent codec
   */
  public getCodec(title: string): string {
    const parsed = this.parseTorrentTitle(title);
    return parsed.codec;
  }

  /**
   * Get torrent resolution
   */
  public getResolution(title: string): string {
    const parsed = this.parseTorrentTitle(title);
    return parsed.resolution;
  }

  /**
   * Validate torrent meets minimum requirements
   */
  public validateTorrent(
    torrent: any,
    requirements: {
      minSeeders?: number;
      minResolution?: string;
      maxSize?: number; // in GB
      requiredCodec?: string;
    }
  ): { valid: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const parsed = this.parseTorrentTitle(torrent.name || torrent.title || '');

    // Check seeders
    if (requirements.minSeeders && (torrent.seeders || 0) < requirements.minSeeders) {
      reasons.push(`Insufficient seeders: ${torrent.seeders || 0} < ${requirements.minSeeders}`);
    }

    // Check resolution
    if (requirements.minResolution) {
      const resolutionOrder: { [key: string]: number } = {
        '2160p': 4,
        '1080p': 3,
        '720p': 2,
        '480p': 1,
        'Unknown': 0,
      };
      
      const currentScore = resolutionOrder[parsed.resolution] || 0;
      const requiredScore = resolutionOrder[requirements.minResolution] || 0;
      
      if (currentScore < requiredScore) {
        reasons.push(`Resolution too low: ${parsed.resolution} < ${requirements.minResolution}`);
      }
    }

    // Check size
    if (requirements.maxSize && torrent.size) {
      const sizeInGB = torrent.size / (1024 * 1024 * 1024);
      if (sizeInGB > requirements.maxSize) {
        reasons.push(`File too large: ${sizeInGB.toFixed(2)}GB > ${requirements.maxSize}GB`);
      }
    }

    // Check codec
    if (requirements.requiredCodec && 
        parsed.codec.toLowerCase() !== requirements.requiredCodec.toLowerCase()) {
      reasons.push(`Wrong codec: ${parsed.codec} != ${requirements.requiredCodec}`);
    }

    const valid = reasons.length === 0;

    this.logger.debug('Validated torrent', {
      torrentName: torrent.name || 'Unknown',
      valid,
      reasons,
      requirements
    });

    return { valid, reasons };
  }
}