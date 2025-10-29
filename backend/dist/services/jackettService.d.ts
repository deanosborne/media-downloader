/**
 * Jackett service with ConfigManager integration
 */
import { ConfigManager } from '../config/index.js';
export declare class JackettService {
    private configManager;
    constructor(configManager: ConfigManager);
    private getJackettConfig;
    searchTorrents(query: string, type?: string, qualityPrefs?: any): Promise<any[]>;
    private getCategoryForType;
    private formatBytes;
    private parseTorrentTitle;
    private extractResolution;
    private extractCodec;
    private extractHDR;
    private getQualityScore;
}
export declare const initializeJackettService: (configManager: ConfigManager) => JackettService;
export declare const searchTorrents: (query: string, type?: string, qualityPrefs?: any) => Promise<any[]>;
//# sourceMappingURL=jackettService.d.ts.map