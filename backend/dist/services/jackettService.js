/**
 * Jackett service with ConfigManager integration
 */
import axios from 'axios';
export class JackettService {
    constructor(configManager) {
        this.configManager = configManager;
    }
    getJackettConfig() {
        return {
            url: this.configManager.get('jackett.url') || 'http://localhost:9117',
            apiKey: this.configManager.getRequired('jackett.apiKey')
        };
    }
    async searchTorrents(query, type, qualityPrefs = {}) {
        try {
            const config = this.getJackettConfig();
            console.log(`Searching Jackett: "${query}" (${type})`);
            const response = await axios.get(`${config.url}/api/v2.0/indexers/all/results`, {
                params: {
                    apikey: config.apiKey,
                    Query: query,
                    Category: this.getCategoryForType(type),
                },
                timeout: 30000, // 30 second timeout
            });
            const results = response.data.Results || [];
            if (results.length === 0) {
                console.log(`No torrents found for: ${query}`);
                return [];
            }
            // Parse and enrich each torrent with quality information
            const enrichedResults = results.map((item) => {
                const parsed = this.parseTorrentTitle(item.Title);
                return {
                    name: item.Title,
                    magnet: item.MagnetUri || item.Link,
                    size: item.Size,
                    sizeFormatted: this.formatBytes(item.Size),
                    seeders: item.Seeders || 0,
                    peers: item.Peers || 0,
                    indexer: item.Tracker,
                    publishDate: item.PublishDate,
                    ...parsed,
                    qualityScore: 0,
                };
            });
            // Calculate quality scores
            enrichedResults.forEach((torrent) => {
                torrent.qualityScore = this.getQualityScore(torrent);
            });
            // Filter by quality preferences if provided
            let filtered = enrichedResults;
            if (qualityPrefs.resolution && qualityPrefs.resolution !== 'any') {
                filtered = filtered.filter((t) => t.resolution === qualityPrefs.resolution);
            }
            if (qualityPrefs.minSeeders) {
                filtered = filtered.filter((t) => t.seeders >= qualityPrefs.minSeeders);
            }
            // Sort by quality score then seeders
            filtered.sort((a, b) => {
                // Primary: Most seeders
                if (b.seeders !== a.seeders) {
                    return b.seeders - a.seeders;
                }
                // Secondary: Best quality (as tiebreaker)
                return b.qualityScore - a.qualityScore;
            });
            console.log(`Found ${filtered.length} torrents (filtered from ${results.length})`);
            return filtered.slice(0, 20);
        }
        catch (error) {
            if (error.response?.status === 401) {
                console.error('Jackett 401 error: Invalid API key or not configured');
            }
            else if (error.code === 'ECONNREFUSED') {
                console.error('Jackett connection refused: Is Jackett running?');
            }
            else {
                console.error('Jackett search error:', error.message);
            }
            return [];
        }
    }
    getCategoryForType(type) {
        const categories = {
            Movie: '2000',
            'TV Show': '5000',
            Book: '7000,8000',
            Audiobook: '3030',
            Application: '4000',
        };
        return type ? categories[type] || '' : '';
    }
    formatBytes(bytes) {
        if (!bytes)
            return 'Unknown';
        const gb = bytes / (1024 * 1024 * 1024);
        if (gb >= 1)
            return `${gb.toFixed(2)} GB`;
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    }
    parseTorrentTitle(title) {
        // Basic torrent title parsing - this could be enhanced with a proper parser
        const resolution = this.extractResolution(title);
        const codec = this.extractCodec(title);
        const hdr = this.extractHDR(title);
        return {
            resolution,
            codec,
            hdr
        };
    }
    extractResolution(title) {
        const resolutions = ['2160p', '4K', '1080p', '720p', '480p'];
        for (const res of resolutions) {
            if (title.toLowerCase().includes(res.toLowerCase())) {
                return res;
            }
        }
        return 'Unknown';
    }
    extractCodec(title) {
        const codecs = ['x265', 'x264', 'HEVC', 'H.265', 'H.264'];
        for (const codec of codecs) {
            if (title.toLowerCase().includes(codec.toLowerCase())) {
                return codec;
            }
        }
        return 'Unknown';
    }
    extractHDR(title) {
        const hdrKeywords = ['HDR', 'HDR10', 'Dolby Vision', 'DV'];
        return hdrKeywords.some(keyword => title.toLowerCase().includes(keyword.toLowerCase()));
    }
    getQualityScore(torrent) {
        let score = 0;
        // Resolution scoring
        const resolutionScores = {
            '2160p': 100,
            '4K': 100,
            '1080p': 80,
            '720p': 60,
            '480p': 40
        };
        score += resolutionScores[torrent.resolution] || 0;
        // Codec scoring
        if (torrent.codec === 'x265' || torrent.codec === 'HEVC') {
            score += 20;
        }
        else if (torrent.codec === 'x264') {
            score += 10;
        }
        // HDR bonus
        if (torrent.hdr) {
            score += 15;
        }
        return score;
    }
}
// Legacy function exports for backward compatibility
let jackettService = null;
export const initializeJackettService = (configManager) => {
    jackettService = new JackettService(configManager);
    return jackettService;
};
export const searchTorrents = async (query, type, qualityPrefs = {}) => {
    if (!jackettService) {
        throw new Error('Jackett service not initialized. Call initializeJackettService() first.');
    }
    return jackettService.searchTorrents(query, type, qualityPrefs);
};
//# sourceMappingURL=jackettService.js.map