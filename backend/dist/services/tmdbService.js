/**
 * TMDB service with ConfigManager integration
 */
import axios from 'axios';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export class TMDBService {
    constructor(configManager) {
        this.configManager = configManager;
    }
    getApiKey() {
        return this.configManager.getRequired('tmdb.apiKey');
    }
    getBaseUrl() {
        return this.configManager.get('tmdb.baseUrl') || TMDB_BASE_URL;
    }
    async searchMedia(query, type) {
        try {
            // Handle non-TMDB media types
            if (type === 'Book') {
                return await this.searchBooks(query);
            }
            if (type === 'Audiobook') {
                return await this.searchAudiobooks(query);
            }
            if (type === 'Application') {
                return await this.searchApplications(query);
            }
            // TMDB for movies and TV shows
            const apiKey = this.getApiKey();
            const baseUrl = this.getBaseUrl();
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
            const response = await axios.get(`${baseUrl}${endpoint}`, {
                params: {
                    api_key: apiKey,
                    query: query,
                    language: 'en-US'
                }
            });
            return response.data.results.map((item) => ({
                id: item.id,
                name: item.title || item.name,
                year: item.release_date ? new Date(item.release_date).getFullYear() :
                    (item.first_air_date ? new Date(item.first_air_date).getFullYear() : null),
                overview: item.overview,
                poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null
            }));
        }
        catch (error) {
            console.error('TMDB search error:', error.message);
            return [];
        }
    }
    async getTVShowDetails(tvShowId) {
        try {
            const apiKey = this.getApiKey();
            const baseUrl = this.getBaseUrl();
            const response = await axios.get(`${baseUrl}/tv/${tvShowId}`, {
                params: {
                    api_key: apiKey,
                    language: 'en-US'
                }
            });
            return {
                id: response.data.id,
                name: response.data.name,
                overview: response.data.overview,
                first_air_date: response.data.first_air_date,
                number_of_seasons: response.data.number_of_seasons,
                number_of_episodes: response.data.number_of_episodes,
                seasons: response.data.seasons.map((season) => ({
                    id: season.id,
                    season_number: season.season_number,
                    name: season.name,
                    episode_count: season.episode_count,
                    air_date: season.air_date,
                    overview: season.overview,
                    poster_path: season.poster_path
                }))
            };
        }
        catch (error) {
            console.error('TMDB TV details error:', error.message);
            throw error;
        }
    }
    async getSeasonDetails(tvShowId, seasonNumber) {
        try {
            const apiKey = this.getApiKey();
            const baseUrl = this.getBaseUrl();
            const response = await axios.get(`${baseUrl}/tv/${tvShowId}/season/${seasonNumber}`, {
                params: {
                    api_key: apiKey,
                    language: 'en-US'
                }
            });
            return {
                season_number: response.data.season_number,
                name: response.data.name,
                overview: response.data.overview,
                air_date: response.data.air_date,
                episodes: response.data.episodes.map((ep) => ({
                    id: ep.id,
                    episode_number: ep.episode_number,
                    name: ep.name,
                    overview: ep.overview,
                    air_date: ep.air_date,
                    runtime: ep.runtime
                }))
            };
        }
        catch (error) {
            console.error('TMDB season details error:', error.message);
            throw error;
        }
    }
    async getEpisodeDetails(tvShowId, seasonNumber, episodeNumber) {
        try {
            const apiKey = this.getApiKey();
            const baseUrl = this.getBaseUrl();
            const response = await axios.get(`${baseUrl}/tv/${tvShowId}/season/${seasonNumber}/episode/${episodeNumber}`, {
                params: {
                    api_key: apiKey,
                    language: 'en-US'
                }
            });
            return {
                episode_number: response.data.episode_number,
                season_number: response.data.season_number,
                name: response.data.name,
                overview: response.data.overview,
                air_date: response.data.air_date,
                runtime: response.data.runtime
            };
        }
        catch (error) {
            console.error('TMDB episode details error:', error.message);
            throw error;
        }
    }
    // Placeholder methods for non-TMDB media types
    async searchBooks(query) {
        // TODO: Implement book search (could use Google Books API, etc.)
        console.log(`Book search not implemented: ${query}`);
        return [];
    }
    async searchAudiobooks(query) {
        // TODO: Implement audiobook search
        console.log(`Audiobook search not implemented: ${query}`);
        return [];
    }
    async searchApplications(query) {
        // TODO: Implement application search
        console.log(`Application search not implemented: ${query}`);
        return [];
    }
}
// Legacy function exports for backward compatibility
let tmdbService = null;
export const initializeTMDBService = (configManager) => {
    tmdbService = new TMDBService(configManager);
    return tmdbService;
};
export const searchMedia = async (query, type) => {
    if (!tmdbService) {
        throw new Error('TMDB service not initialized. Call initializeTMDBService() first.');
    }
    return tmdbService.searchMedia(query, type);
};
export const getTVShowDetails = async (tvShowId) => {
    if (!tmdbService) {
        throw new Error('TMDB service not initialized. Call initializeTMDBService() first.');
    }
    return tmdbService.getTVShowDetails(tvShowId);
};
export const getSeasonDetails = async (tvShowId, seasonNumber) => {
    if (!tmdbService) {
        throw new Error('TMDB service not initialized. Call initializeTMDBService() first.');
    }
    return tmdbService.getSeasonDetails(tvShowId, seasonNumber);
};
export const getEpisodeDetails = async (tvShowId, seasonNumber, episodeNumber) => {
    if (!tmdbService) {
        throw new Error('TMDB service not initialized. Call initializeTMDBService() first.');
    }
    return tmdbService.getEpisodeDetails(tvShowId, seasonNumber, episodeNumber);
};
//# sourceMappingURL=tmdbService.js.map