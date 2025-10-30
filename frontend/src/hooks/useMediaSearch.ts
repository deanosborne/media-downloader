import { useState, useCallback, useEffect, useMemo } from 'react';
import { useApi } from './useApi';
import { mediaApi } from '../services';
import { MediaItem, MediaType, MediaSearchResult } from '../types';

/**
 * Hook for media search functionality with debouncing and pagination
 */
export function useMediaSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setCurrentPage(1); // Reset to first page when query changes
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Search API call
  const {
    data: searchResults,
    loading: searchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useApi(
    () => mediaApi.search(debouncedQuery, mediaType, currentPage),
    [debouncedQuery, mediaType, currentPage],
    { enabled: debouncedQuery.length >= 2 } // Only search if query is at least 2 characters
  );

  // Update search query
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  // Update media type filter
  const updateMediaType = useCallback((type: MediaType | undefined) => {
    setMediaType(type);
    setCurrentPage(1); // Reset to first page when filter changes
  }, []);

  // Navigate to specific page
  const goToPage = useCallback((page: number) => {
    if (searchResults && page >= 1 && page <= searchResults.totalPages) {
      setCurrentPage(page);
    }
  }, [searchResults]);

  // Navigate to next page
  const nextPage = useCallback(() => {
    if (searchResults && currentPage < searchResults.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [searchResults, currentPage]);

  // Navigate to previous page
  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setCurrentPage(1);
  }, []);

  // Computed values
  const hasResults = useMemo(() => {
    return Boolean(searchResults && searchResults.results.length > 0);
  }, [searchResults]);

  const hasNextPage = useMemo(() => {
    return searchResults ? currentPage < searchResults.totalPages : false;
  }, [searchResults, currentPage]);

  const hasPreviousPage = useMemo(() => {
    return currentPage > 1;
  }, [currentPage]);

  const isSearching = useMemo(() => {
    return debouncedQuery.length >= 2 && searchLoading;
  }, [debouncedQuery, searchLoading]);

  return {
    // Search state
    query,
    debouncedQuery,
    mediaType,
    currentPage,
    
    // Results
    searchResults,
    results: searchResults?.results || [],
    totalResults: searchResults?.totalResults || 0,
    totalPages: searchResults?.totalPages || 0,
    
    // Loading and error states
    loading: isSearching,
    error: searchError,
    
    // Computed states
    hasResults,
    hasNextPage,
    hasPreviousPage,
    
    // Actions
    updateQuery,
    updateMediaType,
    goToPage,
    nextPage,
    previousPage,
    clearSearch,
    refetchSearch,
  };
}

/**
 * Hook for getting trending media
 */
export function useTrendingMedia(type?: MediaType) {
  const {
    data: trendingMedia,
    loading,
    error,
    refetch,
  } = useApi(() => mediaApi.getTrending(type), [type]);

  return {
    trendingMedia: trendingMedia || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for getting media details
 */
export function useMediaDetails(id: string, type: MediaType) {
  const {
    data: mediaDetails,
    loading,
    error,
    refetch,
  } = useApi(
    () => mediaApi.getDetails(id, type),
    [id, type],
    { enabled: !!id && !!type }
  );

  return {
    mediaDetails,
    loading,
    error,
    refetch,
  };
}