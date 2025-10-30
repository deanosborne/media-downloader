import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AppProvider } from '../AppContext';
import { useQueue, useConfig, useUserPreferences, useAppLoading } from '../hooks';
import { queueApi, configApi } from '../../services';
import { MediaType, QueueStatus } from '../../types';

// Mock the services
jest.mock('../../services', () => ({
  queueApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  configApi: {
    get: jest.fn(),
    update: jest.fn(),
    updateSection: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const mockQueueApi = queueApi as jest.Mocked<typeof queueApi>;
const mockConfigApi = configApi as jest.Mocked<typeof configApi>;

// Wrapper component for hooks
const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider>{children}</AppProvider>
);

describe('Store hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Setup default mock implementations
    mockQueueApi.getAll.mockResolvedValue([]);
    mockConfigApi.get.mockResolvedValue({
      tmdb: { apiKey: '', baseUrl: '' },
      jackett: { url: '', apiKey: '' },
      realDebrid: { apiKey: '' },
      plex: { url: '', token: '', paths: { movies: '', tvShows: '', books: '', audiobooks: '' } },
      download: { path: '', autoDownload: false, preferredResolution: '', minSeeders: 0 },
    });
  });

  describe('useQueue', () => {
    it('should provide queue data and actions', async () => {
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
        {
          id: '2',
          name: 'Test TV Show',
          type: MediaType.TV_SHOW,
          status: QueueStatus.IN_PROGRESS,
          progress: 50,
          isSeasonPack: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueueApi.getAll.mockResolvedValue(mockItems);

      const { result } = renderHook(() => useQueue(), { wrapper });

      // Wait for initial data load
      await waitFor(() => {
        expect(result.current.items).toEqual(mockItems);
      });

      expect(result.current.items).toEqual(mockItems);
      expect(result.current.stats.total).toBe(2);
      expect(result.current.stats.notStarted).toBe(1);
      expect(result.current.stats.inProgress).toBe(1);
      expect(result.current.stats.completed).toBe(0);
      expect(result.current.stats.error).toBe(0);
    });

    it('should filter items by status', async () => {
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
        {
          id: '2',
          name: 'Test TV Show',
          type: MediaType.TV_SHOW,
          status: QueueStatus.IN_PROGRESS,
          progress: 50,
          isSeasonPack: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueueApi.getAll.mockResolvedValue(mockItems);

      const { result } = renderHook(() => useQueue(), { wrapper });

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2);
      });

      const notStartedItems = result.current.getItemsByStatus(QueueStatus.NOT_STARTED);
      const inProgressItems = result.current.getItemsByStatus(QueueStatus.IN_PROGRESS);

      expect(notStartedItems).toHaveLength(1);
      expect(notStartedItems[0].name).toBe('Test Movie');
      expect(inProgressItems).toHaveLength(1);
      expect(inProgressItems[0].name).toBe('Test TV Show');
    });

    it('should filter items by type', async () => {
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
        {
          id: '2',
          name: 'Test TV Show',
          type: MediaType.TV_SHOW,
          status: QueueStatus.IN_PROGRESS,
          progress: 50,
          isSeasonPack: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueueApi.getAll.mockResolvedValue(mockItems);

      const { result } = renderHook(() => useQueue(), { wrapper });

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2);
      });

      const movieItems = result.current.getItemsByType(MediaType.MOVIE);
      const tvItems = result.current.getItemsByType(MediaType.TV_SHOW);

      expect(movieItems).toHaveLength(1);
      expect(movieItems[0].name).toBe('Test Movie');
      expect(tvItems).toHaveLength(1);
      expect(tvItems[0].name).toBe('Test TV Show');
    });

    it('should search items', async () => {
      const mockItems = [
        {
          id: '1',
          name: 'The Matrix',
          type: MediaType.MOVIE,
          status: QueueStatus.NOT_STARTED,
          progress: 0,
          isSeasonPack: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Breaking Bad',
          type: MediaType.TV_SHOW,
          status: QueueStatus.IN_PROGRESS,
          progress: 50,
          isSeasonPack: false,
          episodeName: 'Pilot Episode',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueueApi.getAll.mockResolvedValue(mockItems);

      const { result } = renderHook(() => useQueue(), { wrapper });

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2);
      });

      const matrixResults = result.current.searchItems('matrix');
      const pilotResults = result.current.searchItems('pilot');
      const emptyResults = result.current.searchItems('');

      expect(matrixResults).toHaveLength(1);
      expect(matrixResults[0].name).toBe('The Matrix');
      expect(pilotResults).toHaveLength(1);
      expect(pilotResults[0].name).toBe('Breaking Bad');
      expect(emptyResults).toHaveLength(2);
    });

    it('should add items to queue', async () => {
      const newItem = {
        id: '1',
        name: 'New Movie',
        type: MediaType.MOVIE,
        status: QueueStatus.NOT_STARTED,
        progress: 0,
        isSeasonPack: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQueueApi.create.mockResolvedValue(newItem);

      const { result } = renderHook(() => useQueue(), { wrapper });

      await waitFor(() => {
        expect(result.current.items).toBeDefined();
      });

      await act(async () => {
        await result.current.addToQueue({ name: 'New Movie', type: MediaType.MOVIE });
      });

      expect(mockQueueApi.create).toHaveBeenCalledWith({
        name: 'New Movie',
        type: MediaType.MOVIE,
      });
    });
  });

  describe('useConfig', () => {
    it('should provide config data and validation', async () => {
      const mockConfig = {
        tmdb: { apiKey: 'test-key', baseUrl: 'https://api.themoviedb.org/3' },
        jackett: { url: 'http://localhost:9117', apiKey: 'test-key' },
        realDebrid: { apiKey: 'test-key' },
        plex: {
          url: 'http://localhost:32400',
          token: 'test-token',
          paths: { movies: '/movies', tvShows: '/tv', books: '/books', audiobooks: '/audiobooks' },
        },
        download: {
          path: '/downloads',
          autoDownload: true,
          preferredResolution: '1080p',
          minSeeders: 5,
        },
      };

      mockConfigApi.get.mockResolvedValue(mockConfig);

      const { result } = renderHook(() => useConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.config).toEqual(mockConfig);
      });
      expect(result.current.isValid).toBe(true);
    });

    it('should get config values by path', async () => {
      const mockConfig = {
        tmdb: { apiKey: 'test-key', baseUrl: 'https://api.themoviedb.org/3' },
        jackett: { url: 'http://localhost:9117', apiKey: 'test-key' },
        realDebrid: { apiKey: 'test-key' },
        plex: {
          url: 'http://localhost:32400',
          token: 'test-token',
          paths: { movies: '/movies', tvShows: '/tv', books: '/books', audiobooks: '/audiobooks' },
        },
        download: {
          path: '/downloads',
          autoDownload: true,
          preferredResolution: '1080p',
          minSeeders: 5,
        },
      };

      mockConfigApi.get.mockResolvedValue(mockConfig);

      const { result } = renderHook(() => useConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.config).toEqual(mockConfig);
      });

      expect(result.current.getConfigValue('tmdb.apiKey')).toBe('test-key');
      expect(result.current.getConfigValue('plex.paths.movies')).toBe('/movies');
      expect(result.current.getConfigValue('nonexistent.path', 'default')).toBe('default');
    });

    it('should validate config sections', async () => {
      const mockConfig = {
        tmdb: { apiKey: 'test-key', baseUrl: 'https://api.themoviedb.org/3' },
        jackett: { url: '', apiKey: 'test-key' }, // Missing URL
        realDebrid: { apiKey: 'test-key' },
        plex: {
          url: 'http://localhost:32400',
          token: 'test-token',
          paths: { movies: '/movies', tvShows: '/tv', books: '/books', audiobooks: '/audiobooks' },
        },
        download: {
          path: '/downloads',
          autoDownload: true,
          preferredResolution: '1080p',
          minSeeders: 5,
        },
      };

      mockConfigApi.get.mockResolvedValue(mockConfig);

      const { result } = renderHook(() => useConfig(), { wrapper });

      await waitFor(() => {
        expect(result.current.config).toEqual(mockConfig);
      });

      expect(result.current.isSectionValid('tmdb')).toBe(true);
      expect(result.current.isSectionValid('jackett')).toBe(false); // Missing URL
      expect(result.current.isSectionValid('realDebrid')).toBe(true);
    });
  });

  describe('useUserPreferences', () => {
    it('should provide user preferences and update functions', () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper });

      expect(result.current.theme).toBe('auto');
      expect(result.current.language).toBe('en');
      expect(result.current.autoRefresh).toBe(true);
      expect(result.current.refreshInterval).toBe(5000);
    });

    it('should update theme', async () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper });

      await act(async () => {
        await result.current.updateTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should update language', async () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper });

      await act(async () => {
        await result.current.updateLanguage('es');
      });

      expect(result.current.language).toBe('es');
    });

    it('should update auto refresh settings', async () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper });

      await act(async () => {
        await result.current.updateAutoRefresh(false, 10000);
      });

      expect(result.current.autoRefresh).toBe(false);
      expect(result.current.refreshInterval).toBe(10000);
    });

    it('should update notifications', async () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper });

      await act(async () => {
        await result.current.updateNotifications({ enabled: false, errors: false });
      });

      expect(result.current.notifications.enabled).toBe(false);
      expect(result.current.notifications.errors).toBe(false);
      expect(result.current.notifications.downloadComplete).toBe(true); // Should remain unchanged
    });

    it('should update UI preferences', async () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper });

      await act(async () => {
        await result.current.updateUI({ compactMode: true, itemsPerPage: 50 });
      });

      expect(result.current.ui.compactMode).toBe(true);
      expect(result.current.ui.itemsPerPage).toBe(50);
      expect(result.current.ui.showThumbnails).toBe(true); // Should remain unchanged
    });

    it('should reset preferences', async () => {
      const { result } = renderHook(() => useUserPreferences(), { wrapper });

      // First update some preferences
      await act(async () => {
        await result.current.updateTheme('dark');
        await result.current.updateLanguage('es');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.language).toBe('es');

      // Then reset
      await act(async () => {
        await result.current.resetUserPreferences();
      });

      expect(result.current.theme).toBe('auto');
      expect(result.current.language).toBe('en');
    });
  });

  describe('useAppLoading', () => {
    it('should provide loading states', async () => {
      const { result } = renderHook(() => useAppLoading(), { wrapper });

      // Initially should be loading (due to initial data fetch)
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingStates.queue).toBe(true);
      expect(result.current.loadingStates.config).toBe(true);

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasErrors).toBe(false);
    });

    it('should detect errors', async () => {
      mockQueueApi.getAll.mockRejectedValue(new Error('Queue error'));
      mockConfigApi.get.mockRejectedValue(new Error('Config error'));

      const { result } = renderHook(() => useAppLoading(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasErrors).toBe(true);
      });
      expect(result.current.errors.queue).toBe('Queue error');
      expect(result.current.errors.config).toBe('Config error');
    });
  });
});