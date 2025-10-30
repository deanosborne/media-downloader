import { renderHook, waitFor, act } from '@testing-library/react';
import { useMediaSearch, useTrendingMedia, useMediaDetails } from '../useMediaSearch';
import { mediaApi } from '../../services';
import { MediaType } from '../../types';

// Mock the services
jest.mock('../../services', () => ({
  mediaApi: {
    search: jest.fn(),
    getTrending: jest.fn(),
    getDetails: jest.fn(),
  },
}));

const mockMediaApi = mediaApi as jest.Mocked<typeof mediaApi>;

const mockSearchResults = {
  results: [
    {
      id: '1',
      name: 'Test Movie 1',
      year: 2023,
      type: MediaType.MOVIE,
      overview: 'A test movie',
      poster: '/poster1.jpg',
      tmdbId: 12345,
    },
    {
      id: '2',
      name: 'Test Movie 2',
      year: 2022,
      type: MediaType.MOVIE,
      overview: 'Another test movie',
      poster: '/poster2.jpg',
      tmdbId: 67890,
    },
  ],
  totalResults: 2,
  page: 1,
  totalPages: 1,
};

const mockTrendingMedia = [
  {
    id: '1',
    name: 'Trending Movie',
    year: 2023,
    type: MediaType.MOVIE,
    overview: 'A trending movie',
    poster: '/trending.jpg',
    tmdbId: 11111,
  },
];

describe('useMediaSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useMediaSearch());

    expect(result.current.query).toBe('');
    expect(result.current.debouncedQuery).toBe('');
    expect(result.current.mediaType).toBeUndefined();
    expect(result.current.currentPage).toBe(1);
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasResults).toBe(false);
  });

  it('should debounce search query', async () => {
    mockMediaApi.search.mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() => useMediaSearch());

    // Update query
    act(() => {
      result.current.updateQuery('test');
    });

    expect(result.current.query).toBe('test');
    expect(result.current.debouncedQuery).toBe(''); // Not debounced yet

    // Fast forward debounce timer
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.debouncedQuery).toBe('test');

    // Wait for API call
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockMediaApi.search).toHaveBeenCalledWith('test', undefined, 1);
  });

  it('should not search with queries less than 2 characters', async () => {
    const { result } = renderHook(() => useMediaSearch());

    act(() => {
      result.current.updateQuery('a');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockMediaApi.search).not.toHaveBeenCalled();
  });

  it('should search successfully', async () => {
    mockMediaApi.search.mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() => useMediaSearch());

    act(() => {
      result.current.updateQuery('test movie');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.results).toEqual(mockSearchResults.results);
    expect(result.current.totalResults).toBe(2);
    expect(result.current.hasResults).toBe(true);
  });

  it('should filter by media type', async () => {
    mockMediaApi.search.mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() => useMediaSearch());

    act(() => {
      result.current.updateQuery('test');
      result.current.updateMediaType(MediaType.MOVIE);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockMediaApi.search).toHaveBeenCalledWith('test', MediaType.MOVIE, 1);
  });

  it('should handle pagination', async () => {
    const multiPageResults = {
      ...mockSearchResults,
      totalPages: 3,
    };

    mockMediaApi.search.mockResolvedValue(multiPageResults);

    const { result } = renderHook(() => useMediaSearch());

    act(() => {
      result.current.updateQuery('test');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(false);

    // Go to next page
    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(true);

    // Go to previous page
    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('should clear search', () => {
    const { result } = renderHook(() => useMediaSearch());

    act(() => {
      result.current.updateQuery('test');
      result.current.updateMediaType(MediaType.MOVIE);
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.debouncedQuery).toBe('');
    expect(result.current.currentPage).toBe(1);
  });
});

describe('useTrendingMedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch trending media', async () => {
    mockMediaApi.getTrending.mockResolvedValue(mockTrendingMedia);

    const { result } = renderHook(() => useTrendingMedia());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trendingMedia).toEqual(mockTrendingMedia);
    expect(mockMediaApi.getTrending).toHaveBeenCalledWith(undefined);
  });

  it('should fetch trending media by type', async () => {
    mockMediaApi.getTrending.mockResolvedValue(mockTrendingMedia);

    const { result } = renderHook(() => useTrendingMedia(MediaType.MOVIE));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockMediaApi.getTrending).toHaveBeenCalledWith(MediaType.MOVIE);
  });
});

describe('useMediaDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch media details', async () => {
    const mediaDetails = mockSearchResults.results[0];
    mockMediaApi.getDetails.mockResolvedValue(mediaDetails);

    const { result } = renderHook(() => useMediaDetails('1', MediaType.MOVIE));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.mediaDetails).toEqual(mediaDetails);
    expect(mockMediaApi.getDetails).toHaveBeenCalledWith('1', MediaType.MOVIE);
  });

  it('should not fetch when id or type is missing', () => {
    const { result } = renderHook(() => useMediaDetails('', MediaType.MOVIE));

    expect(result.current.mediaDetails).toBeUndefined();
    expect(mockMediaApi.getDetails).not.toHaveBeenCalled();
  });
});