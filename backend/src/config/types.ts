/**
 * Configuration type definitions and interfaces for the media downloader application
 */

// Base configuration interface
export interface IConfigManager {
  get<T>(key: string): T | undefined;
  set(key: string, value: any): Promise<void>;
  getRequired<T>(key: string): T;
  validate(): Promise<ValidationResult>;
  onConfigChange(callback: (key: string, value: any) => void): void;
  getAllConfig(): Promise<Record<string, any>>;
}

// Configuration validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  key: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  key: string;
  message: string;
}

// Main application configuration interface
export interface AppConfig {
  // Server configuration
  server: {
    port: number;
  };

  // TMDB API configuration
  tmdb: {
    apiKey: string;
    baseUrl: string;
  };

  // Jackett configuration
  jackett: {
    url: string;
    apiKey: string;
  };

  // Real-Debrid configuration
  realDebrid: {
    apiKey: string;
  };

  // Plex configuration
  plex: {
    url: string;
    token: string;
    paths: {
      movies: string;
      tvShows: string;
      books: string;
      audiobooks: string;
    };
  };

  // Download configuration
  download: {
    path: string;
    autoDownload: boolean;
    preferredResolution: string;
    minSeeders: number;
  };
}

// Configuration sections for validation
export interface ConfigSection {
  name: string;
  required: boolean;
  fields: ConfigField[];
}

export interface ConfigField {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'path';
  required: boolean;
  sensitive?: boolean;
  defaultValue?: any;
  validator?: (value: any) => ValidationError | null;
}

// Environment variable mapping
export interface EnvMapping {
  [configKey: string]: string; // Maps config key to environment variable name
}

// Configuration change event
export interface ConfigChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

// Configuration storage interface
export interface IConfigStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  getAll(): Promise<Record<string, any>>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Secure configuration storage for sensitive data
export interface ISecureConfigStorage extends IConfigStorage {
  encrypt(value: string): string;
  decrypt(encryptedValue: string): string;
}