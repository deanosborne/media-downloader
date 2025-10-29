/**
 * Configuration validation schemas and field definitions
 */

import { ConfigSection, ValidationError, EnvMapping } from './types.js';
import fs from 'fs';
import path from 'path';

// Environment variable mapping
export const ENV_MAPPING: EnvMapping = {
  'server.port': 'PORT',
  'tmdb.apiKey': 'TMDB_API_KEY',
  'tmdb.baseUrl': 'TMDB_BASE_URL',
  'jackett.url': 'JACKETT_URL',
  'jackett.apiKey': 'JACKETT_API_KEY',
  'realDebrid.apiKey': 'REAL_DEBRID_API_KEY',
  'plex.url': 'PLEX_URL',
  'plex.token': 'PLEX_TOKEN',
  'plex.paths.movies': 'PLEX_MOVIE_PATH',
  'plex.paths.tvShows': 'PLEX_TV_PATH',
  'plex.paths.books': 'PLEX_BOOKS_PATH',
  'plex.paths.audiobooks': 'PLEX_AUDIOBOOKS_PATH',
  'download.path': 'DOWNLOAD_PATH',
  'download.autoDownload': 'AUTO_DOWNLOAD',
  'download.preferredResolution': 'PREFERRED_RESOLUTION',
  'download.minSeeders': 'MIN_SEEDERS'
};

// Path validator
const validatePath = (value: any): ValidationError | null => {
  if (typeof value !== 'string') {
    return { key: '', message: 'Path must be a string', severity: 'error' };
  }
  
  const normalizedPath = path.normalize(value);
  
  // Check for directory traversal attempts
  if (normalizedPath.includes('..')) {
    return { key: '', message: 'Path cannot contain directory traversal sequences', severity: 'error' };
  }
  
  // Check if path exists (warning only)
  try {
    if (!fs.existsSync(normalizedPath)) {
      return { key: '', message: 'Path does not exist', severity: 'warning' };
    }
  } catch (error) {
    return { key: '', message: 'Invalid path format', severity: 'error' };
  }
  
  return null;
};

// URL validator
const validateUrl = (value: any): ValidationError | null => {
  if (typeof value !== 'string') {
    return { key: '', message: 'URL must be a string', severity: 'error' };
  }
  
  try {
    new URL(value);
    return null;
  } catch (error) {
    return { key: '', message: 'Invalid URL format', severity: 'error' };
  }
};

// API key validator
const validateApiKey = (value: any): ValidationError | null => {
  if (typeof value !== 'string') {
    return { key: '', message: 'API key must be a string', severity: 'error' };
  }
  
  if (value.length < 8) {
    return { key: '', message: 'API key appears to be too short', severity: 'warning' };
  }
  
  return null;
};

// Port validator
const validatePort = (value: any): ValidationError | null => {
  const port = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (isNaN(port) || port < 1 || port > 65535) {
    return { key: '', message: 'Port must be a number between 1 and 65535', severity: 'error' };
  }
  
  return null;
};

// Resolution validator
const validateResolution = (value: any): ValidationError | null => {
  if (typeof value !== 'string') {
    return { key: '', message: 'Resolution must be a string', severity: 'error' };
  }
  
  const validResolutions = ['any', '480p', '720p', '1080p', '4K', '2160p'];
  if (!validResolutions.includes(value)) {
    return { key: '', message: `Resolution must be one of: ${validResolutions.join(', ')}`, severity: 'error' };
  }
  
  return null;
};

// Configuration schema definition
export const CONFIG_SCHEMA: ConfigSection[] = [
  {
    name: 'Server',
    required: true,
    fields: [
      {
        key: 'server.port',
        type: 'number',
        required: false,
        defaultValue: 5000,
        validator: validatePort
      }
    ]
  },
  {
    name: 'TMDB',
    required: true,
    fields: [
      {
        key: 'tmdb.apiKey',
        type: 'string',
        required: true,
        sensitive: true,
        validator: validateApiKey
      },
      {
        key: 'tmdb.baseUrl',
        type: 'string',
        required: false,
        defaultValue: 'https://api.themoviedb.org/3',
        validator: validateUrl
      }
    ]
  },
  {
    name: 'Jackett',
    required: true,
    fields: [
      {
        key: 'jackett.url',
        type: 'string',
        required: true,
        defaultValue: 'http://localhost:9117',
        validator: validateUrl
      },
      {
        key: 'jackett.apiKey',
        type: 'string',
        required: true,
        sensitive: true,
        validator: validateApiKey
      }
    ]
  },
  {
    name: 'Real-Debrid',
    required: true,
    fields: [
      {
        key: 'realDebrid.apiKey',
        type: 'string',
        required: true,
        sensitive: true,
        validator: validateApiKey
      }
    ]
  },
  {
    name: 'Plex',
    required: true,
    fields: [
      {
        key: 'plex.url',
        type: 'string',
        required: true,
        defaultValue: 'http://localhost:32400',
        validator: validateUrl
      },
      {
        key: 'plex.token',
        type: 'string',
        required: true,
        sensitive: true,
        validator: validateApiKey
      },
      {
        key: 'plex.paths.movies',
        type: 'path',
        required: true,
        validator: validatePath
      },
      {
        key: 'plex.paths.tvShows',
        type: 'path',
        required: true,
        validator: validatePath
      },
      {
        key: 'plex.paths.books',
        type: 'path',
        required: true,
        validator: validatePath
      },
      {
        key: 'plex.paths.audiobooks',
        type: 'path',
        required: true,
        validator: validatePath
      }
    ]
  },
  {
    name: 'Download',
    required: true,
    fields: [
      {
        key: 'download.path',
        type: 'path',
        required: true,
        validator: validatePath
      },
      {
        key: 'download.autoDownload',
        type: 'boolean',
        required: false,
        defaultValue: false
      },
      {
        key: 'download.preferredResolution',
        type: 'string',
        required: false,
        defaultValue: 'any',
        validator: validateResolution
      },
      {
        key: 'download.minSeeders',
        type: 'number',
        required: false,
        defaultValue: 5
      }
    ]
  }
];

// Helper function to get all required fields
export const getRequiredFields = (): string[] => {
  return CONFIG_SCHEMA
    .flatMap(section => section.fields)
    .filter(field => field.required)
    .map(field => field.key);
};

// Helper function to get all sensitive fields
export const getSensitiveFields = (): string[] => {
  return CONFIG_SCHEMA
    .flatMap(section => section.fields)
    .filter(field => field.sensitive)
    .map(field => field.key);
};

// Helper function to get default values
export const getDefaultValues = (): Record<string, any> => {
  const defaults: Record<string, any> = {};
  
  CONFIG_SCHEMA.forEach(section => {
    section.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaults[field.key] = field.defaultValue;
      }
    });
  });
  
  return defaults;
};