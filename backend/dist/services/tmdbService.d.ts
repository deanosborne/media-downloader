/**
 * TMDB service with ConfigManager integration
 */
import { ConfigManager } from '../config/index.js';
export declare class TMDBService {
    private configManager;
    constructor(configManager: ConfigManager);
    private getApiKey;
    private getBaseUrl;
    searchMedia(query: string, type?: string): Promise<any[]>;
    getTVShowDetails(tvShowId: string | number): Promise<any>;
    getSeasonDetails(tvShowId: string | number, seasonNumber: string | number): Promise<any>;
    getEpisodeDetails(tvShowId: string | number, seasonNumber: string | number, episodeNumber: string | number): Promise<any>;
    private searchBooks;
    private searchAudiobooks;
    private searchApplications;
}
export declare const initializeTMDBService: (configManager: ConfigManager) => TMDBService;
export declare const searchMedia: (query: string, type?: string) => Promise<any[]>;
export declare const getTVShowDetails: (tvShowId: string | number) => Promise<any>;
export declare const getSeasonDetails: (tvShowId: string | number, seasonNumber: string | number) => Promise<any>;
export declare const getEpisodeDetails: (tvShowId: string | number, seasonNumber: string | number, episodeNumber: string | number) => Promise<any>;
//# sourceMappingURL=tmdbService.d.ts.map