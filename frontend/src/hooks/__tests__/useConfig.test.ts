import { renderHook, waitFor } from '@testing-library/react';
import { useConfig, useConfigSection } from '../useConfig';
import { configApi } from '../../services';

// Mock the services
jest.mock('../../services', () => ({
  configApi: {
    get: jest.fn(),
    update: jest.fn(),
    getSection: jest.fn(),
    updateSection: jest.fn(),
  },
}));

const mockConfigApi = configApi as jest.Mocked<typeof configApi>;

const mockConfig = {
  tmdb: {
    apiKey: 'test-tmdb-key',
    baseUrl: 'https://api.themoviedb.org/3',
  },
  jackett: {
    url: 'http://localhost:9117',
    apiKey: 'test-jackett-key',
  },
  realDebrid: {
    apiKey: 'test-rd-key',
  },
  plex: {
    url: 'http://localhost:32400',
    token: 'test-plex-token',
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

describe('useConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch configuration successfully', async () => {
    mockConfigApi.get.mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.config).toEqual(mockConfig);
    expect(result.current.error).toBeNull();
    expect(mockConfigApi.get).toHaveBeenCalledTimes(1);
  });

  it('should validate configuration correctly', async () => {
    mockConfigApi.get.mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConfigValid).toBe(true);
  });

  it('should detect invalid configuration', async () => {
    const invalidConfig = {
      ...mockConfig,
      tmdb: { ...mockConfig.tmdb, apiKey: '' }, // Missing required field
    };

    mockConfigApi.get.mockResolvedValue(invalidConfig);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConfigValid).toBe(false);
  });

  it('should update configuration', async () => {
    const updatedConfig = {
      ...mockConfig,
      download: { ...mockConfig.download, autoDownload: false },
    };

    mockConfigApi.get.mockResolvedValue(mockConfig);
    mockConfigApi.update.mockResolvedValue(updatedConfig);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updates = { download: { autoDownload: false } };
    await result.current.updateConfig(updates);

    expect(mockConfigApi.update).toHaveBeenCalledWith(updates);
    expect(mockConfigApi.get).toHaveBeenCalledTimes(2); // Initial load + refetch
  });

  it('should update configuration section', async () => {
    const updatedSection = { ...mockConfig.tmdb, apiKey: 'new-key' };

    mockConfigApi.get.mockResolvedValue(mockConfig);
    mockConfigApi.updateSection.mockResolvedValue(updatedSection);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.updateConfigSection('tmdb', { apiKey: 'new-key' });

    expect(mockConfigApi.updateSection).toHaveBeenCalledWith('tmdb', { apiKey: 'new-key' });
    expect(mockConfigApi.get).toHaveBeenCalledTimes(2); // Initial load + refetch
  });

  it('should get configuration values by path', async () => {
    mockConfigApi.get.mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getConfigValue('tmdb.apiKey')).toBe('test-tmdb-key');
    expect(result.current.getConfigValue('plex.paths.movies')).toBe('/movies');
    expect(result.current.getConfigValue('nonexistent.path', 'default')).toBe('default');
  });
});

describe('useConfigSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch configuration section', async () => {
    const tmdbSection = mockConfig.tmdb;
    mockConfigApi.getSection.mockResolvedValue(tmdbSection);

    const { result } = renderHook(() => useConfigSection('tmdb'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(tmdbSection);
    expect(mockConfigApi.getSection).toHaveBeenCalledWith('tmdb');
  });

  it('should update configuration section', async () => {
    const tmdbSection = mockConfig.tmdb;
    const updatedSection = { ...tmdbSection, apiKey: 'updated-key' };

    mockConfigApi.getSection.mockResolvedValue(tmdbSection);
    mockConfigApi.updateSection.mockResolvedValue(updatedSection);

    const { result } = renderHook(() => useConfigSection('tmdb'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.updateSection({ apiKey: 'updated-key' });

    expect(mockConfigApi.updateSection).toHaveBeenCalledWith('tmdb', { apiKey: 'updated-key' });
    expect(mockConfigApi.getSection).toHaveBeenCalledTimes(2); // Initial load + refetch
  });
});