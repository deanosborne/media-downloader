import ptt from "parse-torrent-title";

export const parseTorrentTitle = (title) => {
  try {
    const parsed = ptt.parse(title);

    // Ensure audio is always an array
    if (parsed.audio && !Array.isArray(parsed.audio)) {
      parsed.audio = [parsed.audio];
    } else if (!parsed.audio) {
      parsed.audio = [];
    }

    // Ensure codec is a string
    if (!parsed.codec) {
      parsed.codec = "Unknown";
    }

    return {
      resolution: parsed.resolution || "Unknown",
      quality: parsed.quality || "Unknown",
      codec: parsed.codec,
      audio: parsed.audio.join(", ") || "Unknown",
      hdr: parsed.hdr || false,
      season: parsed.season || null,
      episode: parsed.episode || null,
      group: parsed.group || "Unknown",
      year: parsed.year || null,
      title: parsed.title || title,
    };
  } catch (error) {
    console.error("Parse error:", error);
    // Return safe defaults if parsing fails
    return {
      resolution: "Unknown",
      quality: "Unknown",
      codec: "Unknown",
      audio: "Unknown",
      hdr: false,
      season: null,
      episode: null,
      group: "Unknown",
      year: null,
      title: title,
    };
  }
};

export const groupByQuality = (torrents) => {
  const grouped = {};

  torrents.forEach((torrent) => {
    const key = `${torrent.resolution}-${torrent.quality}`;

    if (!grouped[key]) {
      grouped[key] = {
        resolution: torrent.resolution,
        quality: torrent.quality,
        torrents: [],
      };
    }

    grouped[key].torrents.push(torrent);
  });

  // Convert to array and sort by quality score
  const result = Object.values(grouped);

  // Sort groups by resolution (2160p > 1080p > 720p, etc.)
  const resolutionOrder = {
    "2160p": 4,
    "1080p": 3,
    "720p": 2,
    "480p": 1,
    Unknown: 0,
  };

  result.sort((a, b) => {
    const aScore = resolutionOrder[a.resolution] || 0;
    const bScore = resolutionOrder[b.resolution] || 0;
    return bScore - aScore;
  });

  // Sort torrents within each group by seeders
  result.forEach((group) => {
    group.torrents.sort((a, b) => b.seeders - a.seeders);
  });

  return result;
};

export const getQualityScore = (torrent) => {
  let score = 0;

  // Seeders are now the PRIMARY factor (much higher weight)
  score += Math.min(torrent.seeders * 2, 500); // Max 500 points from seeders

  // Resolution scoring (secondary)
  const resolutionScores = {
    "2160p": 80,
    "1080p": 60,
    "720p": 40,
    "480p": 20,
    Unknown: 10,
  };
  score += resolutionScores[torrent.resolution] || 0;

  // Quality scoring (tertiary)
  const qualityScores = {
    REMUX: 25,
    BluRay: 20,
    "WEB-DL": 15,
    WEBRip: 13,
    HDRip: 10,
    DVDRip: 8,
    CAM: 3,
    Unknown: 0,
  };
  score += qualityScores[torrent.quality] || 0;

  // HDR bonus
  if (torrent.hdr) {
    score += 5;
  }

  // Codec bonus
  if (torrent.codec && torrent.codec.toLowerCase().includes("265")) {
    score += 3;
  }

  return score;
};
