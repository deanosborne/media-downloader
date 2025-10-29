import axios from 'axios';
import { searchBooks, searchAudiobooks, searchApplications } from './bookService.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Don't cache the API key at module load - read it dynamically
const getApiKey = () => {
  return process.env.TMDB_API_KEY;
};

export const searchMedia = async (query, type) => {
  try {
    // Handle non-TMDB media types
    if (type === 'Book') {
      return await searchBooks(query);
    }
    
    if (type === 'Audiobook') {
      return await searchAudiobooks(query);
    }
    
    if (type === 'Application') {
      return await searchApplications(query);
    }
    
    // TMDB for movies and TV shows
    const API_KEY = getApiKey();
    
    if (!API_KEY) {
      console.error('TMDB API key not configured');
      return [];
    }
    
    let endpoint = '';
    
    switch(type) {
      case 'Movie':
        endpoint = '/search/movie';
        break;
      case 'TV Show':
        endpoint = '/search/tv';
        break;
      default:
        endpoint = '/search/multi';
    }

    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params: {
        api_key: API_KEY,
        query: query,
        language: 'en-US'
      }
    });

    return response.data.results.map(item => ({
      id: item.id,
      name: item.title || item.name,
      year: item.release_date ? new Date(item.release_date).getFullYear() : 
            (item.first_air_date ? new Date(item.first_air_date).getFullYear() : null),
      overview: item.overview,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null
    }));
  } catch (error) {
    console.error('Search error:', error.message);
    return [];
  }
};

export const getTVShowDetails = async (tvShowId) => {
  try {
    const API_KEY = getApiKey();
    
    if (!API_KEY) {
      throw new Error('TMDB API key not configured');
    }
    
    const response = await axios.get(`${TMDB_BASE_URL}/tv/${tvShowId}`, {
      params: {
        api_key: API_KEY,
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
      seasons: response.data.seasons.map(season => ({
        id: season.id,
        season_number: season.season_number,
        name: season.name,
        episode_count: season.episode_count,
        air_date: season.air_date,
        overview: season.overview,
        poster_path: season.poster_path
      }))
    };
  } catch (error) {
    console.error('TMDB TV details error:', error.message);
    throw error;
  }
};

export const getSeasonDetails = async (tvShowId, seasonNumber) => {
  try {
    const API_KEY = getApiKey();
    
    if (!API_KEY) {
      throw new Error('TMDB API key not configured');
    }
    
    const response = await axios.get(`${TMDB_BASE_URL}/tv/${tvShowId}/season/${seasonNumber}`, {
      params: {
        api_key: API_KEY,
        language: 'en-US'
      }
    });

    return {
      season_number: response.data.season_number,
      name: response.data.name,
      overview: response.data.overview,
      air_date: response.data.air_date,
      episodes: response.data.episodes.map(ep => ({
        id: ep.id,
        episode_number: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        air_date: ep.air_date,
        runtime: ep.runtime
      }))
    };
  } catch (error) {
    console.error('TMDB season details error:', error.message);
    throw error;
  }
};

export const getEpisodeDetails = async (tvShowId, seasonNumber, episodeNumber) => {
  try {
    const API_KEY = getApiKey();
    
    if (!API_KEY) {
      throw new Error('TMDB API key not configured');
    }
    
    const response = await axios.get(
      `${TMDB_BASE_URL}/tv/${tvShowId}/season/${seasonNumber}/episode/${episodeNumber}`,
      {
        params: {
          api_key: API_KEY,
          language: 'en-US'
        }
      }
    );

    return {
      episode_number: response.data.episode_number,
      season_number: response.data.season_number,
      name: response.data.name,
      overview: response.data.overview,
      air_date: response.data.air_date,
      runtime: response.data.runtime
    };
  } catch (error) {
    console.error('TMDB episode details error:', error.message);
    throw error;
  }
};
