/**
 * Plex service for managing Plex Media Server integration
 */

import path from 'path';
import fs from 'fs-extra';
import { BaseService } from './BaseService.js';
import { IConfigManager } from '../config/types.js';
import { ILogger, ServiceConfig } from '../types/service.js';
import { formatEpisodeForPlex } from './tvShowParserService.js';

export interface PlexConfig {
  url: string;
  token: string;
  paths: {
    movies: string;
    tvShows: string;
    books: string;
    audiobooks: string;
  };
}

export interface MoveToPlexOptions {
  filePath: string;
  type: MediaType;
  name: string;
  year?: number;
  season?: number;
  episode?: number;
  episodeName?: string;
}

export interface SeasonPackMoveOptions {
  directoryPath: string;
  showName: string;
  season: number;
  episodes?: Array<{ episode_number: number; name: string }>;
}

export type MediaType = 'Movie' | 'TV Show' | 'Book' | 'Audiobook';

export class PlexService extends BaseService {
  constructor(config: IConfigManager, logger: ILogger) {
    super('Plex', config, logger, {
      timeout: 10000,
      retries: 2,
      retryDelay: 1000
    });
  }

  protected getBaseUrl(): string {
    return this.config.getRequired<string>('plex.url');
  }

  protected getAuthHeaders(): Record<string, string> {
    const token = this.config.getRequired<string>('plex.token');
    return {
      'X-Plex-Token': token
    };
  }

  protected getServiceConfig(): ServiceConfig {
    return {
      timeout: 10000,
      retries: 2,
      retryDelay: 1000
    };
  }

  /**
   * Refresh Plex library sections
   */
  public async refreshLibrary(): Promise<void> {
    try {
      const token = this.config.get<string>('plex.token');
      
      if (!token) {
        this.logger.warn('Plex token not configured, skipping library refresh');
        return;
      }

      await this.get('/library/sections/all/refresh');
      this.logger.info('Plex library refresh triggered successfully');
    } catch (error) {
      this.logger.error('Failed to refresh Plex library', { error });
      throw error;
    }
  }

  /**
   * Move a file to the appropriate Plex library location
   */
  public async moveToPlexLibrary(options: MoveToPlexOptions): Promise<string> {
    try {
      const { filePath, type, name, year, season, episode, episodeName } = options;
      
      this.logger.info('Moving file to Plex library', {
        filePath,
        type,
        name,
        year,
        season,
        episode
      });

      const targetPath = this.getTargetPath(type, name, year, season, episode, episodeName);
      
      // Ensure target directory exists
      await fs.ensureDir(path.dirname(targetPath));
      
      // Move file to target location
      await fs.move(filePath, targetPath, { overwrite: false });
      
      this.logger.info('File moved successfully', { 
        from: filePath, 
        to: targetPath 
      });

      // Refresh Plex library
      await this.refreshLibrary();

      return targetPath;
    } catch (error) {
      this.logger.error('Failed to move file to Plex library', { 
        error,
        options 
      });
      throw error;
    }
  }

  /**
   * Move a season pack directory to Plex library
   */
  public async moveSeasonPackToPlexLibrary(options: SeasonPackMoveOptions): Promise<string[]> {
    try {
      const { directoryPath, showName, season, episodes } = options;
      
      this.logger.info('Moving season pack to Plex library', {
        directoryPath,
        showName,
        season
      });

      const files = await fs.readdir(directoryPath);
      const videoExtensions = ['.mkv', '.mp4', '.avi', '.m4v'];
      const movedFiles: string[] = [];

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!videoExtensions.includes(ext)) {
          this.logger.debug('Skipping non-video file', { file });
          continue;
        }

        const filePath = path.join(directoryPath, file);
        const episodeMatch = file.match(/e(\d{1,2})/i);
        
        if (episodeMatch) {
          const episodeNum = parseInt(episodeMatch[1]);
          const episodeName = episodes?.find(ep => ep.episode_number === episodeNum)?.name || '';

          const targetPath = this.getTargetPath(
            'TV Show',
            showName,
            undefined,
            season,
            episodeNum,
            episodeName
          );

          await fs.ensureDir(path.dirname(targetPath));
          await fs.move(filePath, targetPath, { overwrite: false });
          movedFiles.push(targetPath);
          
          this.logger.debug('Episode file moved', {
            episode: episodeNum,
            from: filePath,
            to: targetPath
          });
        }
      }

      this.logger.info('Season pack moved successfully', {
        showName,
        season,
        filesCount: movedFiles.length
      });

      // Refresh Plex library
      await this.refreshLibrary();

      return movedFiles;
    } catch (error) {
      this.logger.error('Failed to move season pack to Plex library', {
        error,
        options
      });
      throw error;
    }
  }

  /**
   * Get the target path for a media file based on its type and metadata
   */
  private getTargetPath(
    type: MediaType,
    name: string,
    year?: number,
    season?: number,
    episode?: number,
    episodeName?: string
  ): string {
    const sanitizedName = this.sanitizeFileName(name);
    const plexPaths = this.config.getRequired<PlexConfig['paths']>('plex.paths');

    switch (type) {
      case 'Movie':
        return path.join(
          plexPaths.movies,
          `${sanitizedName} (${year})`,
          `${sanitizedName} (${year}).mkv`
        );

      case 'TV Show':
        if (season === undefined || episode === undefined) {
          throw new Error('Season and episode are required for TV shows');
        }
        
        const seasonStr = String(season).padStart(2, '0');
        const fileName = episodeName
          ? formatEpisodeForPlex(sanitizedName, season, episode, episodeName)
          : formatEpisodeForPlex(sanitizedName, season, episode);

        return path.join(
          plexPaths.tvShows,
          sanitizedName,
          `Season ${seasonStr}`,
          `${fileName}.mkv`
        );

      case 'Book':
        return path.join(
          plexPaths.books,
          `${sanitizedName}.epub`
        );

      case 'Audiobook':
        return path.join(
          plexPaths.audiobooks,
          sanitizedName,
          `${sanitizedName}.m4b`
        );

      default:
        const downloadPath = this.config.get<string>('download.path') || '/downloads';
        return path.join(downloadPath, sanitizedName);
    }
  }

  /**
   * Sanitize filename by removing invalid characters
   */
  private sanitizeFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '');
  }

  /**
   * Check if Plex is configured and accessible
   */
  public async checkConnection(): Promise<boolean> {
    try {
      await this.get('/');
      return true;
    } catch (error) {
      this.logger.error('Plex connection check failed', { error });
      return false;
    }
  }

  /**
   * Get Plex server information
   */
  public async getServerInfo(): Promise<any> {
    try {
      return await this.get('/');
    } catch (error) {
      this.logger.error('Failed to get Plex server info', { error });
      throw error;
    }
  }

  /**
   * Get library sections
   */
  public async getLibrarySections(): Promise<any> {
    try {
      return await this.get('/library/sections');
    } catch (error) {
      this.logger.error('Failed to get library sections', { error });
      throw error;
    }
  }
}