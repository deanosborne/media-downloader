/**
 * Real-Debrid service with ConfigManager integration
 */
import { ConfigManager } from '../config/index.js';
export declare class RealDebridService {
    private configManager;
    private axiosInstance;
    constructor(configManager: ConfigManager);
    private createAxiosInstance;
    addMagnet(magnetLink: string): Promise<any>;
    selectFiles(torrentId: string, fileIds?: string): Promise<void>;
    getTorrentInfo(torrentId: string): Promise<any>;
    unrestrict(link: string): Promise<any>;
    downloadFile(url: string, outputPath: string): Promise<void>;
    getUserInfo(): Promise<any>;
    deleteTorrent(torrentId: string): Promise<void>;
}
export declare const initializeRealDebridService: (configManager: ConfigManager) => RealDebridService;
export declare const addMagnet: (magnetLink: string) => Promise<any>;
export declare const selectFiles: (torrentId: string, fileIds?: string) => Promise<void>;
export declare const getTorrentInfo: (torrentId: string) => Promise<any>;
export declare const unrestrict: (link: string) => Promise<any>;
export declare const downloadFile: (url: string, outputPath: string) => Promise<void>;
//# sourceMappingURL=realDebridService.d.ts.map