/**
 * Real-Debrid service extending BaseService with comprehensive functionality
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { AxiosError } from 'axios';
import { BaseService } from './BaseService.js';
import { IConfigManager } from '../config/types.js';
import { ILogger, ServiceConfig } from '../types/service.js';
import {
  RealDebridTorrent,

  RealDebridUnrestrictedLink,
  RealDebridUser,
  RealDebridAddMagnetResponse,
  DownloadProgress,
  DownloadMonitorOptions,
  DownloadTask,
  DownloadManager,
  RealDebridError,
  RealDebridAuthError,
  RealDebridQuotaError,
  RealDebridTorrentError
} from '../types/realDebrid.js';

export class RealDebridService extends BaseService implements DownloadManager {
  private downloadTasks = new Map<string, DownloadTask>();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private eventEmitter = new EventEmitter();
  private readonly pollInterval: number;

  constructor(config: IConfigManager, logger: ILogger, serviceConfig?: ServiceConfig) {
    super('RealDebrid', config, logger, {
      timeout: 60000, // 60 seconds for file operations
      retries: 3,
      retryDelay: 2000,
      ...serviceConfig
    });

    this.pollInterval = serviceConfig?.timeout || 5000; // 5 seconds default polling
    this.setupEventHandlers();
  }

  protected getBaseUrl(): string {
    return this.config.get<string>('realDebrid.baseUrl') || 'https://api.real-debrid.com/rest/1.0';
  }

  protected getAuthHeaders(): Record<string, string> {
    const apiKey = this.config.getRequired<string>('realDebrid.apiKey');
    return {
      'Authorization': `Bearer ${apiKey}`
    };
  }

  private setupEventHandlers(): void {
    this.eventEmitter.on('download:progress', (progress: DownloadProgress) => {
      this.logger.debug('Download progress update', {
        torrentId: progress.torrentId,
        progress: progress.progress,
        speed: progress.speed
      });
    });

    this.eventEmitter.on('download:complete', (torrent: RealDebridTorrent) => {
      this.logger.info('Download completed', {
        torrentId: torrent.id,
        filename: torrent.filename
      });
    });

    this.eventEmitter.on('download:error', (error: Error) => {
      this.logger.error('Download error occurred', { error: error.message });
    });
  }

  // Core Real-Debrid API methods
  async addMagnet(magnetLink: string): Promise<RealDebridAddMagnetResponse> {
    this.logger.info('Adding magnet link to Real-Debrid', { magnetLink: magnetLink.substring(0, 50) + '...' });

    try {
      const response = await this.handleRequest(() =>
        this.httpClient.post<RealDebridAddMagnetResponse>(
          '/torrents/addMagnet',
          `magnet=${encodeURIComponent(magnetLink)}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        )
      );

      this.logger.info('Magnet link added successfully', { torrentId: response.id });
      return response;
    } catch (error) {
      throw this.transformRealDebridError(error as AxiosError, 'Failed to add magnet link');
    }
  }

  async selectFiles(torrentId: string, fileIds: string | number[] = 'all'): Promise<void> {
    this.logger.info('Selecting files for torrent', { torrentId, fileIds });

    try {
      const fileIdsParam = Array.isArray(fileIds) ? fileIds.join(',') : fileIds;
      
      await this.handleRequest(() =>
        this.httpClient.post<void>(
          `/torrents/selectFiles/${torrentId}`,
          `files=${fileIdsParam}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        )
      );

      this.logger.info('Files selected successfully', { torrentId, fileIds: fileIdsParam });
    } catch (error) {
      throw this.transformRealDebridError(error as AxiosError, `Failed to select files for torrent ${torrentId}`);
    }
  }

  async getTorrentInfo(torrentId: string): Promise<RealDebridTorrent> {
    this.logger.debug('Getting torrent info', { torrentId });

    try {
      const torrent = await this.handleRequest(() =>
        this.httpClient.get<RealDebridTorrent>(`/torrents/info/${torrentId}`)
      );
      
      this.logger.debug('Torrent info retrieved', {
        torrentId,
        status: torrent.status,
        progress: torrent.progress,
        filename: torrent.filename
      });

      return torrent;
    } catch (error) {
      throw this.transformRealDebridError(error as AxiosError, `Failed to get torrent info for ${torrentId}`);
    }
  }

  async unrestrict(link: string): Promise<RealDebridUnrestrictedLink> {
    this.logger.info('Unrestricting link', { link: link.substring(0, 50) + '...' });

    try {
      const response = await this.handleRequest(() =>
        this.httpClient.post<RealDebridUnrestrictedLink>(
          '/unrestrict/link',
          `link=${encodeURIComponent(link)}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        )
      );

      this.logger.info('Link unrestricted successfully', {
        filename: response.filename,
        filesize: response.filesize,
        host: response.host
      });

      return response;
    } catch (error) {
      throw this.transformRealDebridError(error as AxiosError, 'Failed to unrestrict link');
    }
  }

  async getUserInfo(): Promise<RealDebridUser> {
    this.logger.debug('Getting user info');

    try {
      const user = await this.handleRequest(() =>
        this.httpClient.get<RealDebridUser>('/user')
      );
      
      this.logger.debug('User info retrieved', {
        username: user.username,
        premium: user.premium,
        expiration: user.expiration
      });

      return user;
    } catch (error) {
      throw this.transformRealDebridError(error as AxiosError, 'Failed to get user info');
    }
  }

  async deleteTorrent(torrentId: string): Promise<void> {
    this.logger.info('Deleting torrent', { torrentId });

    try {
      await this.handleRequest(() =>
        this.httpClient.delete<void>(`/torrents/delete/${torrentId}`)
      );
      this.logger.info('Torrent deleted successfully', { torrentId });
    } catch (error) {
      throw this.transformRealDebridError(error as AxiosError, `Failed to delete torrent ${torrentId}`);
    }
  }

  async getAllTorrents(): Promise<RealDebridTorrent[]> {
    this.logger.debug('Getting all torrents');

    try {
      const torrents = await this.handleRequest(() =>
        this.httpClient.get<RealDebridTorrent[]>('/torrents')
      );
      this.logger.debug('Retrieved torrents', { count: torrents.length });
      return torrents;
    } catch (error) {
      throw this.transformRealDebridError(error as AxiosError, 'Failed to get torrents list');
    }
  }

  // Download management methods
  async downloadFile(url: string, outputPath: string, onProgress?: (progress: number) => void): Promise<void> {
    this.logger.info('Starting file download', { url: url.substring(0, 50) + '...', outputPath });

    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const response = await this.httpClient.get(url, {
        responseType: 'stream',
        timeout: 0 // No timeout for downloads
      });

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      const writer = fs.createWriteStream(outputPath);
      
      response.data.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;
        if (onProgress && totalSize > 0) {
          const progress = (downloadedSize / totalSize) * 100;
          onProgress(progress);
        }
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          this.logger.info('File download completed', { outputPath, size: downloadedSize });
          resolve();
        });
        
        writer.on('error', (error) => {
          this.logger.error('File download failed', { error: error.message, outputPath });
          reject(new RealDebridError(`Download failed: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error('Download error', { error: (error as Error).message, outputPath });
      throw new RealDebridError(`Download failed: ${(error as Error).message}`);
    }
  }

  // Progress tracking and monitoring
  async monitorTorrent(torrentId: string, options: DownloadMonitorOptions = {}): Promise<void> {
    const pollInterval = options.pollInterval || this.pollInterval;
    
    this.logger.info('Starting torrent monitoring', { torrentId, pollInterval });

    const monitor = async (): Promise<void> => {
      try {
        const torrent = await this.getTorrentInfo(torrentId);
        
        const progress: DownloadProgress = {
          torrentId: torrent.id,
          filename: torrent.filename,
          progress: torrent.progress,
          speed: torrent.speed,
          status: torrent.status,
          bytesDownloaded: Math.floor((torrent.bytes * torrent.progress) / 100),
          totalBytes: torrent.bytes,
          timestamp: new Date()
        };

        if (options.onProgress) {
          options.onProgress(progress);
        }

        this.eventEmitter.emit('download:progress', progress);

        if (torrent.status === 'downloaded') {
          this.logger.info('Torrent download completed', { torrentId });
          if (options.onComplete) {
            options.onComplete(torrent);
          }
          this.eventEmitter.emit('download:complete', torrent);
          return;
        }

        if (torrent.status === 'error' || torrent.status === 'virus' || torrent.status === 'dead') {
          const error = new RealDebridTorrentError(`Torrent failed with status: ${torrent.status}`, torrentId);
          if (options.onError) {
            options.onError(error);
          }
          this.eventEmitter.emit('download:error', error);
          return;
        }

        // Continue monitoring
        setTimeout(monitor, pollInterval);
      } catch (error) {
        this.logger.error('Error monitoring torrent', { torrentId, error: (error as Error).message });
        if (options.onError) {
          options.onError(error as Error);
        }
        this.eventEmitter.emit('download:error', error);
      }
    };

    await monitor();
  }

  // DownloadManager interface implementation
  async addDownload(magnetLink: string, outputPath: string): Promise<DownloadTask> {
    const taskId = this.generateTaskId();
    
    const task: DownloadTask = {
      id: taskId,
      torrentId: '',
      magnetLink,
      filename: '',
      outputPath,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.downloadTasks.set(taskId, task);

    try {
      // Add magnet to Real-Debrid
      const response = await this.addMagnet(magnetLink);
      task.torrentId = response.id;
      task.updatedAt = new Date();

      // Get torrent info to get filename
      const torrentInfo = await this.getTorrentInfo(response.id);
      task.filename = torrentInfo.filename;
      task.updatedAt = new Date();

      // Select all files by default
      await this.selectFiles(response.id);

      // Start monitoring
      this.monitorTorrent(response.id, {
        onProgress: (progress) => {
          task.progress = progress.progress;
          task.status = progress.status === 'downloaded' ? 'completed' : 'downloading';
          task.updatedAt = new Date();
        },
        onComplete: async (_torrent) => {
          task.status = 'completed';
          task.progress = 100;
          task.updatedAt = new Date();
        },
        onError: (error) => {
          task.status = 'error';
          task.error = error.message;
          task.updatedAt = new Date();
        }
      });

      this.logger.info('Download task created', { taskId, torrentId: response.id });
      return task;
    } catch (error) {
      task.status = 'error';
      task.error = (error as Error).message;
      task.updatedAt = new Date();
      throw error;
    }
  }

  async getDownload(id: string): Promise<DownloadTask | null> {
    return this.downloadTasks.get(id) || null;
  }

  async getAllDownloads(): Promise<DownloadTask[]> {
    return Array.from(this.downloadTasks.values());
  }

  async cancelDownload(id: string): Promise<void> {
    const task = this.downloadTasks.get(id);
    if (!task) {
      throw new RealDebridError(`Download task ${id} not found`);
    }

    if (task.torrentId) {
      await this.deleteTorrent(task.torrentId);
    }

    this.downloadTasks.delete(id);
    this.logger.info('Download cancelled', { taskId: id, torrentId: task.torrentId });
  }

  async retryDownload(id: string): Promise<void> {
    const task = this.downloadTasks.get(id);
    if (!task) {
      throw new RealDebridError(`Download task ${id} not found`);
    }

    // Reset task status
    task.status = 'pending';
    task.progress = 0;
    delete task.error;
    task.updatedAt = new Date();

    // Re-add the download
    await this.addDownload(task.magnetLink, task.outputPath);
  }

  monitorDownloads(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.logger.info('Starting download monitoring');
    this.monitoringInterval = setInterval(() => {
      // Monitoring is handled per-torrent in monitorTorrent method
      // This could be used for cleanup or periodic health checks
    }, this.pollInterval);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info('Stopped download monitoring');
    }
  }

  // Utility methods
  private generateTaskId(): string {
    return `rd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private transformRealDebridError(error: AxiosError, message: string): RealDebridError {
    if (!error.response) {
      return new RealDebridError(`${message}: Network error`);
    }

    const status = error.response.status;
    const responseData = error.response.data as any;
    const errorMessage = responseData?.error || responseData?.message || error.message;

    switch (status) {
      case 401:
        return new RealDebridAuthError(`${message}: ${errorMessage}`);
      case 429:
        return new RealDebridQuotaError(`${message}: ${errorMessage}`);
      case 400:
        return new RealDebridTorrentError(`${message}: ${errorMessage}`);
      default:
        return new RealDebridError(`${message}: ${errorMessage}`, undefined, status);
    }
  }

  // Event emitter methods for external listeners
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  once(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.once(event, listener);
  }
}

// Legacy function exports for backward compatibility
let realDebridService: RealDebridService | null = null;

export const initializeRealDebridService = (
  configManager: IConfigManager, 
  logger: ILogger,
  serviceConfig?: ServiceConfig
): RealDebridService => {
  realDebridService = new RealDebridService(configManager, logger, serviceConfig);
  return realDebridService;
};

export const addMagnet = async (magnetLink: string): Promise<RealDebridAddMagnetResponse> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.addMagnet(magnetLink);
};

export const selectFiles = async (torrentId: string, fileIds: string | number[] = 'all'): Promise<void> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.selectFiles(torrentId, fileIds);
};

export const getTorrentInfo = async (torrentId: string): Promise<RealDebridTorrent> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.getTorrentInfo(torrentId);
};

export const unrestrict = async (link: string): Promise<RealDebridUnrestrictedLink> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.unrestrict(link);
};

export const downloadFile = async (url: string, outputPath: string, onProgress?: (progress: number) => void): Promise<void> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.downloadFile(url, outputPath, onProgress);
};

export const getUserInfo = async (): Promise<RealDebridUser> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.getUserInfo();
};

export const deleteTorrent = async (torrentId: string): Promise<void> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.deleteTorrent(torrentId);
};