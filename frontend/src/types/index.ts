// Core data types
export enum MediaType {
  MOVIE = 'movie',
  TV_SHOW = 'tv_show',
  BOOK = 'book',
  AUDIOBOOK = 'audiobook',
  APPLICATION = 'application'
}

export enum QueueStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface MediaItem {
  id: string;
  name: string;
  year?: number;
  type: MediaType;
  overview?: string;
  poster?: string;
  tmdbId?: number;
}

export interface QueueItem {
  id: string;
  type: MediaType;
  name: string;
  year?: number;
  tmdbId?: number;
  season?: number;
  episode?: number;
  episodeName?: string;
  isSeasonPack: boolean;
  status: QueueStatus;
  progress: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppConfig {
  tmdb: {
    apiKey: string;
    baseUrl: string;
  };
  jackett: {
    url: string;
    apiKey: string;
  };
  realDebrid: {
    apiKey: string;
  };
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
  download: {
    path: string;
    autoDownload: boolean;
    preferredResolution: string;
    minSeeders: number;
  };
}

// Hook-specific types
export interface UseApiOptions<T> {
  initialData?: T;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface ApiResponse<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface MediaSearchResult {
  results: MediaItem[];
  totalResults: number;
  page: number;
  totalPages: number;
}

// User preferences interface
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoRefresh: boolean;
  refreshInterval: number;
  notifications: {
    enabled: boolean;
    downloadComplete: boolean;
    errors: boolean;
  };
  ui: {
    compactMode: boolean;
    showThumbnails: boolean;
    itemsPerPage: number;
  };
}

// State management types
export interface AppState {
  queue: {
    items: QueueItem[];
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
  };
  config: {
    data: AppConfig | null;
    loading: boolean;
    error: string | null;
    isValid: boolean;
  };
  user: {
    preferences: UserPreferences;
    loading: boolean;
    error: string | null;
  };
}

export interface AppActions {
  // Queue actions
  addToQueue: (item: Partial<QueueItem>) => Promise<void>;
  updateQueueItem: (id: string, updates: Partial<QueueItem>) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  refreshQueue: () => Promise<void>;
  clearQueueError: () => void;
  
  // Config actions
  updateConfig: (config: Partial<AppConfig>) => Promise<void>;
  updateConfigSection: (section: keyof AppConfig, updates: any) => Promise<void>;
  refreshConfig: () => Promise<void>;
  clearConfigError: () => void;
  
  // User preferences actions
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  resetUserPreferences: () => Promise<void>;
  clearUserError: () => void;
}

export interface AppContextType {
  state: AppState;
  actions: AppActions;
}

// Action types for reducer
export type AppActionType =
  // Queue actions
  | { type: 'QUEUE_LOADING'; payload: boolean }
  | { type: 'QUEUE_SUCCESS'; payload: QueueItem[] }
  | { type: 'QUEUE_ERROR'; payload: string }
  | { type: 'QUEUE_ADD_ITEM'; payload: QueueItem }
  | { type: 'QUEUE_UPDATE_ITEM'; payload: { id: string; updates: Partial<QueueItem> } }
  | { type: 'QUEUE_REMOVE_ITEM'; payload: string }
  | { type: 'QUEUE_CLEAR_ERROR' }
  
  // Config actions
  | { type: 'CONFIG_LOADING'; payload: boolean }
  | { type: 'CONFIG_SUCCESS'; payload: AppConfig }
  | { type: 'CONFIG_ERROR'; payload: string }
  | { type: 'CONFIG_UPDATE'; payload: Partial<AppConfig> }
  | { type: 'CONFIG_CLEAR_ERROR' }
  
  // User preferences actions
  | { type: 'USER_LOADING'; payload: boolean }
  | { type: 'USER_SUCCESS'; payload: UserPreferences }
  | { type: 'USER_ERROR'; payload: string }
  | { type: 'USER_UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'USER_RESET_PREFERENCES' }
  | { type: 'USER_CLEAR_ERROR' };

// Storage keys for persistence
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'media-downloader-user-preferences',
  APP_STATE: 'media-downloader-app-state',
} as const;