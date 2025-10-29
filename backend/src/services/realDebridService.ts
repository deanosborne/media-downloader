/**
 * Real-Debrid service with ConfigManager integration
 */

import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import { ConfigManager } from '../config/index.js';

const RD_BASE_URL = 'https://api.real-debrid.com/rest/1.0';

export class RealDebridService {
  private configManager: ConfigManager;
  private axiosInstance: AxiosInstance;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.axiosInstance = this.createAxiosInstance();
  }

  private createAxiosInstance(): AxiosInstance {
    const apiKey = this.configManager.getRequired<string>('realDebrid.apiKey');

    return axios.create({
      baseURL: RD_BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  async addMagnet(magnetLink: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        '/torrents/addMagnet',
        `magnet=${encodeURIComponent(magnetLink)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Real-Debrid add magnet error:',
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async selectFiles(torrentId: string, fileIds: string = 'all'): Promise<void> {
    try {
      await this.axiosInstance.post(
        `/torrents/selectFiles/${torrentId}`,
        `files=${fileIds}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    } catch (error: any) {
      console.error(
        'Real-Debrid select files error:',
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getTorrentInfo(torrentId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/torrents/info/${torrentId}`);
      return response.data;
    } catch (error: any) {
      console.error(
        'Real-Debrid get info error:',
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async unrestrict(link: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        '/unrestrict/link',
        `link=${encodeURIComponent(link)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Real-Debrid unrestrict error:',
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async downloadFile(url: string, outputPath: string): Promise<void> {
    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
      });

      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error: any) {
      console.error('Download error:', error.message);
      throw error;
    }
  }

  async getUserInfo(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/user');
      return response.data;
    } catch (error: any) {
      console.error('Real-Debrid user info error:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteTorrent(torrentId: string): Promise<void> {
    try {
      await this.axiosInstance.delete(`/torrents/delete/${torrentId}`);
    } catch (error: any) {
      console.error('Real-Debrid delete torrent error:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Legacy function exports for backward compatibility
let realDebridService: RealDebridService | null = null;

export const initializeRealDebridService = (configManager: ConfigManager): RealDebridService => {
  realDebridService = new RealDebridService(configManager);
  return realDebridService;
};

export const addMagnet = async (magnetLink: string): Promise<any> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.addMagnet(magnetLink);
};

export const selectFiles = async (torrentId: string, fileIds: string = 'all'): Promise<void> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.selectFiles(torrentId, fileIds);
};

export const getTorrentInfo = async (torrentId: string): Promise<any> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.getTorrentInfo(torrentId);
};

export const unrestrict = async (link: string): Promise<any> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.unrestrict(link);
};

export const downloadFile = async (url: string, outputPath: string): Promise<void> => {
  if (!realDebridService) {
    throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
  }
  return realDebridService.downloadFile(url, outputPath);
};