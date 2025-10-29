/**
 * Real-Debrid service with ConfigManager integration
 */
import axios from 'axios';
import fs from 'fs';
const RD_BASE_URL = 'https://api.real-debrid.com/rest/1.0';
export class RealDebridService {
    constructor(configManager) {
        this.configManager = configManager;
        this.axiosInstance = this.createAxiosInstance();
    }
    createAxiosInstance() {
        const apiKey = this.configManager.getRequired('realDebrid.apiKey');
        return axios.create({
            baseURL: RD_BASE_URL,
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
    }
    async addMagnet(magnetLink) {
        try {
            const response = await this.axiosInstance.post('/torrents/addMagnet', `magnet=${encodeURIComponent(magnetLink)}`, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            return response.data;
        }
        catch (error) {
            console.error('Real-Debrid add magnet error:', error.response?.data || error.message);
            throw error;
        }
    }
    async selectFiles(torrentId, fileIds = 'all') {
        try {
            await this.axiosInstance.post(`/torrents/selectFiles/${torrentId}`, `files=${fileIds}`, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
        }
        catch (error) {
            console.error('Real-Debrid select files error:', error.response?.data || error.message);
            throw error;
        }
    }
    async getTorrentInfo(torrentId) {
        try {
            const response = await this.axiosInstance.get(`/torrents/info/${torrentId}`);
            return response.data;
        }
        catch (error) {
            console.error('Real-Debrid get info error:', error.response?.data || error.message);
            throw error;
        }
    }
    async unrestrict(link) {
        try {
            const response = await this.axiosInstance.post('/unrestrict/link', `link=${encodeURIComponent(link)}`, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            return response.data;
        }
        catch (error) {
            console.error('Real-Debrid unrestrict error:', error.response?.data || error.message);
            throw error;
        }
    }
    async downloadFile(url, outputPath) {
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
        }
        catch (error) {
            console.error('Download error:', error.message);
            throw error;
        }
    }
    async getUserInfo() {
        try {
            const response = await this.axiosInstance.get('/user');
            return response.data;
        }
        catch (error) {
            console.error('Real-Debrid user info error:', error.response?.data || error.message);
            throw error;
        }
    }
    async deleteTorrent(torrentId) {
        try {
            await this.axiosInstance.delete(`/torrents/delete/${torrentId}`);
        }
        catch (error) {
            console.error('Real-Debrid delete torrent error:', error.response?.data || error.message);
            throw error;
        }
    }
}
// Legacy function exports for backward compatibility
let realDebridService = null;
export const initializeRealDebridService = (configManager) => {
    realDebridService = new RealDebridService(configManager);
    return realDebridService;
};
export const addMagnet = async (magnetLink) => {
    if (!realDebridService) {
        throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
    }
    return realDebridService.addMagnet(magnetLink);
};
export const selectFiles = async (torrentId, fileIds = 'all') => {
    if (!realDebridService) {
        throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
    }
    return realDebridService.selectFiles(torrentId, fileIds);
};
export const getTorrentInfo = async (torrentId) => {
    if (!realDebridService) {
        throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
    }
    return realDebridService.getTorrentInfo(torrentId);
};
export const unrestrict = async (link) => {
    if (!realDebridService) {
        throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
    }
    return realDebridService.unrestrict(link);
};
export const downloadFile = async (url, outputPath) => {
    if (!realDebridService) {
        throw new Error('Real-Debrid service not initialized. Call initializeRealDebridService() first.');
    }
    return realDebridService.downloadFile(url, outputPath);
};
//# sourceMappingURL=realDebridService.js.map