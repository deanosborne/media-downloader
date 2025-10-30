import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext';
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

// Test component that uses the context
const TestComponent: React.FC = () => {
  const { state, actions } = useAppContext();

  return (
    <div>
      <div data-testid="queue-items-count">{state.queue.items.length}</div>
      <div data-testid="queue-loading">{state.queue.loading.toString()}</div>
      <div data-testid="queue-error">{state.queue.error || 'no-error'}</div>
      <div data-testid="config-valid">{state.config.isValid.toString()}</div>
      <div data-testid="user-theme">{state.user.preferences.theme}</div>
      
      <button
        data-testid="add-to-queue"
        onClick={() => actions.addToQueue({
          name: 'Test Movie',
          type: MediaType.MOVIE,
        })}
      >
        Add to Queue
      </button>
      
      <button
        data-testid="update-preferences"
        onClick={() => actions.updateUserPreferences({ theme: 'dark' })}
      >
        Update Theme
      </button>
      
      <button
        data-testid="refresh-queue"
        onClick={() => actions.refreshQueue()}
      >
        Refresh Queue
      </button>
    </div>
  );
};

const mockQueueApi = queueApi as jest.Mocked<typeof queueApi>;
const mockConfigApi = configApi as jest.Mocked<typeof configApi>;

describe('AppContext', () => {
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

  it('should provide initial state', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Wait for initial data loading first
    await waitFor(() => {
      expect(mockQueueApi.getAll).toHaveBeenCalled();
      expect(mockConfigApi.get).toHaveBeenCalled();
    });

    expect(screen.getByTestId('queue-items-count')).toHaveTextContent('0');
    expect(screen.getByTestId('queue-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('queue-error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('config-valid')).toHaveTextContent('false');
    expect(screen.getByTestId('user-theme')).toHaveTextContent('auto');
  });

  it('should handle adding items to queue', async () => {
    const mockNewItem = {
      id: '1',
      name: 'Test Movie',
      type: MediaType.MOVIE,
      status: QueueStatus.NOT_STARTED,
      progress: 0,
      isSeasonPack: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockQueueApi.create.mockResolvedValue(mockNewItem);

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(mockQueueApi.getAll).toHaveBeenCalled();
    });

    const addButton = screen.getByTestId('add-to-queue');
    
    await act(async () => {
      addButton.click();
    });

    await waitFor(() => {
      expect(mockQueueApi.create).toHaveBeenCalledWith({
        name: 'Test Movie',
        type: MediaType.MOVIE,
      });
      expect(screen.getByTestId('queue-items-count')).toHaveTextContent('1');
    });
  });

  it('should handle queue errors', async () => {
    const errorMessage = 'Failed to add item';
    mockQueueApi.create.mockRejectedValue(new Error(errorMessage));

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(mockQueueApi.getAll).toHaveBeenCalled();
    });

    const addButton = screen.getByTestId('add-to-queue');
    
    await act(async () => {
      try {
        addButton.click();
      } catch (error) {
        // Expected error, ignore
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('queue-error')).toHaveTextContent(errorMessage);
    });
  });

  it('should handle user preferences updates', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const updateButton = screen.getByTestId('update-preferences');
    
    await act(async () => {
      updateButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-theme')).toHaveTextContent('dark');
    });

    // Check that preferences were persisted
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should handle queue refresh', async () => {
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

    mockQueueApi.getAll.mockResolvedValue(mockItems);

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const refreshButton = screen.getByTestId('refresh-queue');
    
    await act(async () => {
      refreshButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('queue-items-count')).toHaveTextContent('1');
    });

    expect(mockQueueApi.getAll).toHaveBeenCalledTimes(2); // Initial load + manual refresh
  });

  it('should throw error when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAppContext must be used within an AppProvider');

    consoleSpy.mockRestore();
  });

  it('should handle config updates', async () => {
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

    const ConfigTestComponent: React.FC = () => {
      const { state, actions } = useAppContext();

      return (
        <div>
          <div data-testid="config-valid">{state.config.isValid.toString()}</div>
          <button
            data-testid="update-config"
            onClick={() => actions.updateConfig({ tmdb: { apiKey: 'new-key', baseUrl: 'https://api.themoviedb.org/3' } })}
          >
            Update Config
          </button>
        </div>
      );
    };

    mockConfigApi.update.mockResolvedValue({
      ...mockConfig,
      tmdb: { apiKey: 'new-key', baseUrl: 'https://api.themoviedb.org/3' },
    });

    render(
      <AppProvider>
        <ConfigTestComponent />
      </AppProvider>
    );

    // Wait for initial config load
    await waitFor(() => {
      expect(screen.getByTestId('config-valid')).toHaveTextContent('true');
    });

    const updateButton = screen.getByTestId('update-config');
    
    await act(async () => {
      updateButton.click();
    });

    await waitFor(() => {
      expect(mockConfigApi.update).toHaveBeenCalledWith({
        tmdb: { apiKey: 'new-key', baseUrl: 'https://api.themoviedb.org/3' },
      });
    });
  });

  it('should handle auto-refresh when enabled', async () => {
    jest.useFakeTimers();

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

    mockQueueApi.getAll.mockResolvedValue(mockItems);

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(mockQueueApi.getAll).toHaveBeenCalledTimes(1);
    });

    // Fast-forward time to trigger auto-refresh
    act(() => {
      jest.advanceTimersByTime(5000); // Default refresh interval
    });

    await waitFor(() => {
      expect(mockQueueApi.getAll).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });
});