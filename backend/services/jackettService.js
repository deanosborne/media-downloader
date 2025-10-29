import axios from "axios";

// Read config dynamically instead of caching on module load
const getJackettConfig = () => {
  return {
    url: process.env.JACKETT_URL || "http://localhost:9117",
    apiKey: process.env.JACKETT_API_KEY,
  };
};

export const searchTorrents = async (query, type, qualityPrefs = {}) => {
  try {
    const config = getJackettConfig();

    if (!config.apiKey) {
      console.error("Jackett API key not configured");
      return [];
    }

    console.log(`Searching Jackett: "${query}" (${type})`);

    const response = await axios.get(
      `${config.url}/api/v2.0/indexers/all/results`,
      {
        params: {
          apikey: config.apiKey,
          Query: query,
          Category: getCategoryForType(type),
        },
        timeout: 30000, // 30 second timeout
      }
    );

    const results = response.data.Results || [];

    if (results.length === 0) {
      console.log(`No torrents found for: ${query}`);
      return [];
    }

    // Parse and enrich each torrent with quality information
    const { parseTorrentTitle, getQualityScore } = await import(
      "./torrentParser.js"
    );

    const enrichedResults = results.map((item) => {
      const parsed = parseTorrentTitle(item.Title);
      return {
        name: item.Title,
        magnet: item.MagnetUri || item.Link,
        size: item.Size,
        sizeFormatted: formatBytes(item.Size),
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
      torrent.qualityScore = getQualityScore(torrent);
    });

    // Filter by quality preferences if provided
    let filtered = enrichedResults;
    if (qualityPrefs.resolution && qualityPrefs.resolution !== "any") {
      filtered = filtered.filter(
        (t) => t.resolution === qualityPrefs.resolution
      );
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

    console.log(
      `Found ${filtered.length} torrents (filtered from ${results.length})`
    );

    return filtered.slice(0, 20);
  } catch (error) {
    if (error.response?.status === 401) {
      console.error("Jackett 401 error: Invalid API key or not configured");
    } else if (error.code === "ECONNREFUSED") {
      console.error("Jackett connection refused: Is Jackett running?");
    } else {
      console.error("Jackett search error:", error.message);
    }
    return [];
  }
};

const getCategoryForType = (type) => {
  const categories = {
    Movie: "2000",
    "TV Show": "5000",
    Book: "7000,8000",
    Audiobook: "3030",
    Application: "4000",
  };
  return categories[type] || "";
};

const formatBytes = (bytes) => {
  if (!bytes) return "Unknown";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};
