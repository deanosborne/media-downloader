import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppProvider } from '../../store/AppContext';
import { theme } from '../../theme';

// Mock API responses
export const mockApiResponses = {
  search: {
    success: true,
    data: {
      results: [
        {
          id: '1',
          name: 'Test Movie',
          type: 'movie',
          year: 2023,
          overview: 'A test movie for integration testing',
          poster: 'https://example.com/poster.jpg',
          tmdbId: 12345
        },
        {
          id: '2',
          name: 'Test TV Show',
          type: 'tv_show',
          year: 2022,
          overview: 'A test TV show for integration testing',
          poster: 'https://example.com/tv-poster.jpg',
          tmdbId: 67890
        }
      ],
      pagination: {
        page: 1,
        totalPages: 1,
        total: 2
      }
    }
  },
  queue: {
    success: true,
    data: [
      {
        id: '1',
        name: 'Test Movie',
        type: 'movie',
        year: 2023,
        status: 'downloading',
        progress: 45,
        downloadSpeed: '2.5 MB/s',
        eta: '00:15:30',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Test TV Show S01E01',
        type: 'tv_show',
        year: 2022,
        status: 'completed',
        progress: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Failed Movie',
        type: 'movie',
        year: 2023,
        status: 'error',
        progress: 0,
        error: 'Download failed: Connection timeout',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  },
  config: {
    success: true,
    data: {
      'tmdb.apiKey': '***MASKED***',
      'jackett.url': 'http://localhost:9117',
      'jackett.apiKey': '***MASKED***',
      'realDebrid.apiKey': '***MASKED***',
      'plex.url': 'http://localhost:32400',
      'plex.token': '***MASKED***',
      'download.path': '/downloads',
      'download.autoDownload': true,
      'download.minSeeders': 5
    }
  },
  torrents: {
    success: true,
    data: [
      {
        name: 'Test Movie 2023 1080p BluRay x264-GROUP',
        magnet: 'magnet:?xt=urn:btih:abc123',
        size: 2147483648,
        seeders: 150,
        peers: 25,
        quality: '1080p',
        source: 'BluRay'
      },
      {
        name: 'Test Movie 2023 720p BluRay x264-GROUP',
        magnet: 'magnet:?xt=urn:btih:def456',
        size: 1073741824,
        seeders: 89,
        peers: 12,
        quality: '720p',
        source: 'BluRay'
      }
    ]
  }
};

// Mock fetch function
export const createMockFetch = (responses: Record<string, any> = {}) => {
  return jest.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    const method = options?.method || 'GET';
    const urlPath = new URL(url, 'http://localhost').pathname;
    
    // Default responses
    const defaultResponses = {
      '/api/search': mockApiResponses.search,
      '/api/queue': mockApiResponses.queue,
      '/api/config': mockApiResponses.config,
      '/api/torrents/search': mockApiResponses.torrents
    };
    
    // Merge with custom responses
    const allResponses = { ...defaultResponses, ...responses };
    
    // Find matching response
    const response = allResponses[urlPath] || { success: false, error: 'Not found' };
    
    return {
      ok: response.success !== false,
      status: response.success !== false ? 200 : 404,
      json: async () => response,
      text: async () => JSON.stringify(response)
    };
  });
};

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  initialState?: any;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ children, initialState }) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider initialState={initialState}>
        {children}
      </AppProvider>
    </ThemeProvider>
  );
};

// Custom render function for integration tests
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  mockResponses?: Record<string, any>;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialState, mockResponses, ...renderOptions } = options;
  
  // Setup fetch mock
  const originalFetch = global.fetch;
  global.fetch = createMockFetch(mockResponses);
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper initialState={initialState}>{children}</TestWrapper>
  );
  
  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  
  // Cleanup function
  const cleanup = () => {
    global.fetch = originalFetch;
    result.unmount();
  };
  
  return { ...result, cleanup };
};

// Helper functions for common test scenarios
export const waitForLoadingToFinish = async () => {
  const { waitForElementToBeRemoved, queryByTestId } = await import('@testing-library/react');
  const loadingElement = queryByTestId('loading-spinner');
  if (loadingElement) {
    await waitForElementToBeRemoved(loadingElement);
  }
};

export const mockLocalStorage = () => {
  const storage: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    length: 0,
    key: jest.fn()
  };
};

// Mock IntersectionObserver for virtualized lists
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  });
  window.IntersectionObserver = mockIntersectionObserver;
  window.IntersectionObserverEntry = jest.fn();
};

// Mock ResizeObserver for responsive components
export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  });
  window.ResizeObserver = mockResizeObserver;
};

// Setup function to run before each integration test
export const setupIntegrationTest = () => {
  // Mock browser APIs
  mockIntersectionObserver();
  mockResizeObserver();
  
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage()
  });
  
  // Mock console methods to avoid noise in tests
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
};

// Cleanup function to run after each integration test
export const cleanupIntegrationTest = () => {
  jest.restoreAllMocks();
};