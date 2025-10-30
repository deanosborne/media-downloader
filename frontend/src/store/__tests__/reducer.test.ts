import { appReducer, initialState, defaultUserPreferences } from '../reducer';
import { AppState, QueueStatus, MediaType } from '../../types';

describe('appReducer', () => {
  describe('Queue actions', () => {
    it('should handle QUEUE_LOADING', () => {
      const action = { type: 'QUEUE_LOADING' as const, payload: true };
      const newState = appReducer(initialState, action);

      expect(newState.queue.loading).toBe(true);
      expect(newState.queue.error).toBe(null);
    });

    it('should handle QUEUE_SUCCESS', () => {
      const mockItems = [
        {
          id: '1',
          name: 'Test Movie',
          type: MediaType.MOVIE,
          status: QueueStatus.NOT_STARTED,
          progress: 0,
          isSeasonPack: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const action = { type: 'QUEUE_SUCCESS' as const, payload: mockItems };
      const newState = appReducer(initialState, action);

      expect(newState.queue.items).toEqual(mockItems);
      expect(newState.queue.loading).toBe(false);
      expect(newState.queue.error).toBe(null);
      expect(newState.queue.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle QUEUE_ERROR', () => {
      const errorMessage = 'Failed to load queue';
      const action = { type: 'QUEUE_ERROR' as const, payload: errorMessage };
      const newState = appReducer(initialState, action);

      expect(newState.queue.error).toBe(errorMessage);
      expect(newState.queue.loading).toBe(false);
    });

    it('should handle QUEUE_ADD_ITEM', () => {
      const newItem = {
        id: '2',
        name: 'New Movie',
        type: MediaType.MOVIE,
        status: QueueStatus.NOT_STARTED,
        progress: 0,
        isSeasonPack: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const action = { type: 'QUEUE_ADD_ITEM' as const, payload: newItem };
      const newState = appReducer(initialState, action);

      expect(newState.queue.items).toContain(newItem);
      expect(newState.queue.items).toHaveLength(1);
      expect(newState.queue.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle QUEUE_UPDATE_ITEM', () => {
      const existingItem = {
        id: '1',
        name: 'Test Movie',
        type: MediaType.MOVIE,
        status: QueueStatus.NOT_STARTED,
        progress: 0,
        isSeasonPack: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const stateWithItem: AppState = {
        ...initialState,
        queue: {
          ...initialState.queue,
          items: [existingItem],
        },
      };

      const updates = { progress: 50, status: QueueStatus.IN_PROGRESS };
      const action = {
        type: 'QUEUE_UPDATE_ITEM' as const,
        payload: { id: '1', updates },
      };

      const newState = appReducer(stateWithItem, action);
      const updatedItem = newState.queue.items.find(item => item.id === '1');

      expect(updatedItem?.progress).toBe(50);
      expect(updatedItem?.status).toBe(QueueStatus.IN_PROGRESS);
      expect(updatedItem?.updatedAt).toBeInstanceOf(Date);
      expect(newState.queue.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle QUEUE_REMOVE_ITEM', () => {
      const existingItem = {
        id: '1',
        name: 'Test Movie',
        type: MediaType.MOVIE,
        status: QueueStatus.NOT_STARTED,
        progress: 0,
        isSeasonPack: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const stateWithItem: AppState = {
        ...initialState,
        queue: {
          ...initialState.queue,
          items: [existingItem],
        },
      };

      const action = { type: 'QUEUE_REMOVE_ITEM' as const, payload: '1' };
      const newState = appReducer(stateWithItem, action);

      expect(newState.queue.items).toHaveLength(0);
      expect(newState.queue.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle QUEUE_CLEAR_ERROR', () => {
      const stateWithError: AppState = {
        ...initialState,
        queue: {
          ...initialState.queue,
          error: 'Some error',
        },
      };

      const action = { type: 'QUEUE_CLEAR_ERROR' as const };
      const newState = appReducer(stateWithError, action);

      expect(newState.queue.error).toBe(null);
    });
  });

  describe('Config actions', () => {
    it('should handle CONFIG_LOADING', () => {
      const action = { type: 'CONFIG_LOADING' as const, payload: true };
      const newState = appReducer(initialState, action);

      expect(newState.config.loading).toBe(true);
      expect(newState.config.error).toBe(null);
    });

    it('should handle CONFIG_SUCCESS', () => {
      const mockConfig = {
        tmdb: { apiKey: 'test-key', baseUrl: 'https://api.themoviedb.org/3' },
        jackett: { url: 'http://localhost:9117', apiKey: 'test-key' },
        realDebrid: { apiKey: 'test-key' },
        plex: {
          url: 'http://localhost:32400',
          token: 'test-token',
          paths: {
            movies: '/movies',
            tvShows: '/tv',
            books: '/books',
            audiobooks: '/audiobooks',
          },
        },
        download: {
          path: '/downloads',
          autoDownload: true,
          preferredResolution: '1080p',
          minSeeders: 5,
        },
      };

      const action = { type: 'CONFIG_SUCCESS' as const, payload: mockConfig };
      const newState = appReducer(initialState, action);

      expect(newState.config.data).toEqual(mockConfig);
      expect(newState.config.loading).toBe(false);
      expect(newState.config.error).toBe(null);
      expect(newState.config.isValid).toBe(true);
    });

    it('should handle CONFIG_ERROR', () => {
      const errorMessage = 'Failed to load config';
      const action = { type: 'CONFIG_ERROR' as const, payload: errorMessage };
      const newState = appReducer(initialState, action);

      expect(newState.config.error).toBe(errorMessage);
      expect(newState.config.loading).toBe(false);
    });

    it('should handle CONFIG_UPDATE', () => {
      const existingConfig = {
        tmdb: { apiKey: 'old-key', baseUrl: 'https://api.themoviedb.org/3' },
        jackett: { url: 'http://localhost:9117', apiKey: 'test-key' },
        realDebrid: { apiKey: 'test-key' },
        plex: {
          url: 'http://localhost:32400',
          token: 'test-token',
          paths: {
            movies: '/movies',
            tvShows: '/tv',
            books: '/books',
            audiobooks: '/audiobooks',
          },
        },
        download: {
          path: '/downloads',
          autoDownload: true,
          preferredResolution: '1080p',
          minSeeders: 5,
        },
      };

      const stateWithConfig: AppState = {
        ...initialState,
        config: {
          ...initialState.config,
          data: existingConfig,
        },
      };

      const updates = { tmdb: { apiKey: 'new-key', baseUrl: 'https://api.themoviedb.org/3' } };
      const action = { type: 'CONFIG_UPDATE' as const, payload: updates };
      const newState = appReducer(stateWithConfig, action);

      expect(newState.config.data?.tmdb.apiKey).toBe('new-key');
      expect(newState.config.isValid).toBe(true);
    });

    it('should handle CONFIG_CLEAR_ERROR', () => {
      const stateWithError: AppState = {
        ...initialState,
        config: {
          ...initialState.config,
          error: 'Some error',
        },
      };

      const action = { type: 'CONFIG_CLEAR_ERROR' as const };
      const newState = appReducer(stateWithError, action);

      expect(newState.config.error).toBe(null);
    });
  });

  describe('User preferences actions', () => {
    it('should handle USER_LOADING', () => {
      const action = { type: 'USER_LOADING' as const, payload: true };
      const newState = appReducer(initialState, action);

      expect(newState.user.loading).toBe(true);
      expect(newState.user.error).toBe(null);
    });

    it('should handle USER_SUCCESS', () => {
      const mockPreferences = {
        ...defaultUserPreferences,
        theme: 'dark' as const,
        language: 'es',
      };

      const action = { type: 'USER_SUCCESS' as const, payload: mockPreferences };
      const newState = appReducer(initialState, action);

      expect(newState.user.preferences).toEqual(mockPreferences);
      expect(newState.user.loading).toBe(false);
      expect(newState.user.error).toBe(null);
    });

    it('should handle USER_ERROR', () => {
      const errorMessage = 'Failed to update preferences';
      const action = { type: 'USER_ERROR' as const, payload: errorMessage };
      const newState = appReducer(initialState, action);

      expect(newState.user.error).toBe(errorMessage);
      expect(newState.user.loading).toBe(false);
    });

    it('should handle USER_UPDATE_PREFERENCES', () => {
      const updates = { theme: 'dark' as const, autoRefresh: false };
      const action = { type: 'USER_UPDATE_PREFERENCES' as const, payload: updates };
      const newState = appReducer(initialState, action);

      expect(newState.user.preferences.theme).toBe('dark');
      expect(newState.user.preferences.autoRefresh).toBe(false);
      expect(newState.user.preferences.language).toBe(defaultUserPreferences.language);
    });

    it('should handle USER_RESET_PREFERENCES', () => {
      const stateWithCustomPreferences: AppState = {
        ...initialState,
        user: {
          ...initialState.user,
          preferences: {
            ...defaultUserPreferences,
            theme: 'dark',
            language: 'es',
          },
        },
      };

      const action = { type: 'USER_RESET_PREFERENCES' as const };
      const newState = appReducer(stateWithCustomPreferences, action);

      expect(newState.user.preferences).toEqual(defaultUserPreferences);
    });

    it('should handle USER_CLEAR_ERROR', () => {
      const stateWithError: AppState = {
        ...initialState,
        user: {
          ...initialState.user,
          error: 'Some error',
        },
      };

      const action = { type: 'USER_CLEAR_ERROR' as const };
      const newState = appReducer(stateWithError, action);

      expect(newState.user.error).toBe(null);
    });
  });

  it('should return current state for unknown actions', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' as any, payload: 'test' };
    const newState = appReducer(initialState, unknownAction);

    expect(newState).toBe(initialState);
  });
});