import { parseTorrentTitle } from './torrentParser.js';

export const detectSeasonPack = (torrentName) => {
  const name = torrentName.toLowerCase();
  
  // Season pack patterns
  const seasonPackPatterns = [
    /s\d{1,2}\s*complete/i,
    /season\s*\d{1,2}\s*complete/i,
    /s\d{1,2}\s*\d{3,4}p/i, // Season with quality but no episode
    /complete\s*season/i,
    /full\s*season/i
  ];
  
  const hasSeasonPack = seasonPackPatterns.some(pattern => pattern.test(name));
  
  // Check if it has episode number (if it does, it's not a season pack)
  const hasEpisode = /e\d{1,2}/i.test(name) || /episode\s*\d{1,2}/i.test(name);
  
  return hasSeasonPack && !hasEpisode;
};

export const detectEpisodeRange = (torrentName) => {
  const parsed = parseTorrentTitle(torrentName);
  
  if (parsed.episode) {
    // Handle arrays of episodes
    if (Array.isArray(parsed.episode)) {
      return {
        type: 'range',
        season: parsed.season,
        episodes: parsed.episode
      };
    }
    
    // Single episode
    return {
      type: 'single',
      season: parsed.season,
      episode: parsed.episode
    };
  }
  
  // Check for episode ranges in format E01-E05 or E01E02E03
  const rangeMatch = torrentName.match(/e(\d{1,2})\s*-\s*e(\d{1,2})/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    const episodes = [];
    for (let i = start; i <= end; i++) {
      episodes.push(i);
    }
    return {
      type: 'range',
      season: parsed.season,
      episodes: episodes
    };
  }
  
  // Check for multi-episode format E01E02E03
  const multiMatch = torrentName.match(/e(\d{1,2}(?:e\d{1,2})+)/i);
  if (multiMatch) {
    const episodes = multiMatch[0].match(/\d{1,2}/g).map(n => parseInt(n));
    return {
      type: 'range',
      season: parsed.season,
      episodes: episodes
    };
  }
  
  if (detectSeasonPack(torrentName)) {
    return {
      type: 'season',
      season: parsed.season
    };
  }
  
  return null;
};

export const formatEpisodeForPlex = (showName, season, episode, episodeName = '') => {
  const sanitizedShow = showName.replace(/[<>:"/\\|?*]/g, '');
  const s = String(season).padStart(2, '0');
  const e = String(episode).padStart(2, '0');
  
  if (episodeName) {
    return `${sanitizedShow} - S${s}E${e} - ${episodeName.replace(/[<>:"/\\|?*]/g, '')}`;
  }
  
  return `${sanitizedShow} - S${s}E${e}`;
};

export const buildTVSearchQuery = (showName, season = null, episode = null) => {
  let query = showName;
  
  if (season !== null) {
    const s = String(season).padStart(2, '0');
    query += ` S${s}`;
    
    if (episode !== null) {
      const e = String(episode).padStart(2, '0');
      query += `E${e}`;
    }
  }
  
  return query;
};

export const filterTVTorrents = (torrents, season, episode = null) => {
  return torrents.filter(torrent => {
    const episodeInfo = detectEpisodeRange(torrent.name);
    
    if (!episodeInfo) return false;
    
    // Check season matches
    if (episodeInfo.season !== season) return false;
    
    // If looking for specific episode
    if (episode !== null) {
      if (episodeInfo.type === 'single') {
        return episodeInfo.episode === episode;
      } else if (episodeInfo.type === 'range') {
        return episodeInfo.episodes.includes(episode);
      } else if (episodeInfo.type === 'season') {
        return true; // Season pack includes all episodes
      }
    } else {
      // Looking for season pack
      return episodeInfo.type === 'season';
    }
    
    return false;
  });
};
