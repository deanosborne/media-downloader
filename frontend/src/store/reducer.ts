import { AppState, AppActionType, UserPreferences, QueueStatus } from '../types';

// Default user preferences
export const defaultUserPreferences: UserPreferences = {
  theme: 'auto',
  language: 'en',
  autoRefresh: true,
  refreshInterval: 5000,
  notifications: {
    enabled: true,
    downloadComplete: true,
    errors: true,
  },
  ui: {
    compactMode: false,
    showThumbnails: true,
    itemsPerPage: 20,
  },
};

// Initial state
export const initialState: AppState = {
  queue: {
    items: [],
    loading: false,
    error: null,
    lastUpdated: null,
  },
  config: {
    data: null,
    loading: false,
    error: null,
    isValid: false,
  },
  user: {
    preferences: defaultUserPreferences,
    loading: false,
    error: null,
  },
};

// Helper function to validate config
const validateConfig = (config: any): boolean => {
  if (!config) return false;
  
  const requiredFields = [
    'tmdb.apiKey',
    'jackett.url',
    'jackett.apiKey',
    'realDebrid.apiKey',
    'plex.url',
    'plex.token',
    'download.path',
  ];

  return requiredFields.every(field => {
    const keys = field.split('.');
    let value: any = config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return false;
      }
    }
    
    return value !== undefined && value !== null && value !== '';
  });
};

// App reducer
export function appReducer(state: AppState, action: AppActionType): AppState {
  switch (action.type) {
    // Queue actions
    case 'QUEUE_LOADING':
      return {
        ...state,
        queue: {
          ...state.queue,
          loading: action.payload,
          error: action.payload ? null : state.queue.error,
        },
      };

    case 'QUEUE_SUCCESS':
      return {
        ...state,
        queue: {
          ...state.queue,
          items: action.payload,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        },
      };

    case 'QUEUE_ERROR':
      return {
        ...state,
        queue: {
          ...state.queue,
          loading: false,
          error: action.payload,
        },
      };

    case 'QUEUE_ADD_ITEM':
      return {
        ...state,
        queue: {
          ...state.queue,
          items: [...state.queue.items, action.payload],
          lastUpdated: new Date(),
        },
      };

    case 'QUEUE_UPDATE_ITEM':
      return {
        ...state,
        queue: {
          ...state.queue,
          items: state.queue.items.map(item =>
            item.id === action.payload.id
              ? { ...item, ...action.payload.updates, updatedAt: new Date() }
              : item
          ),
          lastUpdated: new Date(),
        },
      };

    case 'QUEUE_REMOVE_ITEM':
      return {
        ...state,
        queue: {
          ...state.queue,
          items: state.queue.items.filter(item => item.id !== action.payload),
          lastUpdated: new Date(),
        },
      };

    case 'QUEUE_CLEAR_ERROR':
      return {
        ...state,
        queue: {
          ...state.queue,
          error: null,
        },
      };

    // Config actions
    case 'CONFIG_LOADING':
      return {
        ...state,
        config: {
          ...state.config,
          loading: action.payload,
          error: action.payload ? null : state.config.error,
        },
      };

    case 'CONFIG_SUCCESS':
      return {
        ...state,
        config: {
          ...state.config,
          data: action.payload,
          loading: false,
          error: null,
          isValid: validateConfig(action.payload),
        },
      };

    case 'CONFIG_ERROR':
      return {
        ...state,
        config: {
          ...state.config,
          loading: false,
          error: action.payload,
        },
      };

    case 'CONFIG_UPDATE':
      const updatedConfig = state.config.data 
        ? { ...state.config.data, ...action.payload }
        : action.payload;
      
      return {
        ...state,
        config: {
          ...state.config,
          data: updatedConfig as any,
          isValid: validateConfig(updatedConfig),
        },
      };

    case 'CONFIG_CLEAR_ERROR':
      return {
        ...state,
        config: {
          ...state.config,
          error: null,
        },
      };

    // User preferences actions
    case 'USER_LOADING':
      return {
        ...state,
        user: {
          ...state.user,
          loading: action.payload,
          error: action.payload ? null : state.user.error,
        },
      };

    case 'USER_SUCCESS':
      return {
        ...state,
        user: {
          ...state.user,
          preferences: action.payload,
          loading: false,
          error: null,
        },
      };

    case 'USER_ERROR':
      return {
        ...state,
        user: {
          ...state.user,
          loading: false,
          error: action.payload,
        },
      };

    case 'USER_UPDATE_PREFERENCES':
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {
            ...state.user.preferences,
            ...action.payload,
          },
        },
      };

    case 'USER_RESET_PREFERENCES':
      return {
        ...state,
        user: {
          ...state.user,
          preferences: defaultUserPreferences,
        },
      };

    case 'USER_CLEAR_ERROR':
      return {
        ...state,
        user: {
          ...state.user,
          error: null,
        },
      };

    default:
      return state;
  }
}