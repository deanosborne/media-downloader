import { useState, useEffect, useCallback, useRef } from 'react';
import { UseApiOptions, ApiResponse } from '../types';

/**
 * Generic hook for API calls with loading, error handling, and refetch functionality
 * @param apiCall - Function that returns a Promise with the API data
 * @param dependencies - Array of dependencies that trigger a refetch when changed
 * @param options - Configuration options for the hook
 */
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  options: UseApiOptions<T> = {}
): ApiResponse<T> {
  const [data, setData] = useState<T | undefined>(options.initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    // Don't fetch if explicitly disabled
    if (options.enabled === false) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, dependencies);

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optional polling/refetch interval
  useEffect(() => {
    if (!options.refetchInterval) return;

    const interval = setInterval(() => {
      if (!loading && options.enabled !== false) {
        fetchData();
      }
    }, options.refetchInterval);

    return () => clearInterval(interval);
  }, [fetchData, loading, options.refetchInterval, options.enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}