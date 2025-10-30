import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from '../useApi';

// Mock API function
const mockApiCall = jest.fn();

describe('useApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state correctly', () => {
    mockApiCall.mockResolvedValue('test data');
    
    const { result } = renderHook(() => useApi(mockApiCall));

    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should fetch data successfully', async () => {
    const testData = { id: 1, name: 'Test' };
    mockApiCall.mockResolvedValue(testData);

    const { result } = renderHook(() => useApi(mockApiCall));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(testData);
    expect(result.current.error).toBeNull();
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors', async () => {
    const testError = new Error('API Error');
    mockApiCall.mockRejectedValue(testError);

    const { result } = renderHook(() => useApi(mockApiCall));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(testError);
  });

  it('should use initial data when provided', () => {
    const initialData = { id: 1, name: 'Initial' };
    mockApiCall.mockResolvedValue('new data');

    const { result } = renderHook(() => 
      useApi(mockApiCall, [], { initialData })
    );

    expect(result.current.data).toEqual(initialData);
  });

  it('should not fetch when enabled is false', async () => {
    mockApiCall.mockResolvedValue('test data');

    const { result } = renderHook(() => 
      useApi(mockApiCall, [], { enabled: false })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiCall).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('should refetch data when dependencies change', async () => {
    mockApiCall.mockResolvedValue('test data');

    const { result, rerender } = renderHook(
      ({ dep }) => useApi(mockApiCall, [dep]),
      { initialProps: { dep: 'initial' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiCall).toHaveBeenCalledTimes(1);

    // Change dependency
    rerender({ dep: 'changed' });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });
  });

  it('should allow manual refetch', async () => {
    mockApiCall.mockResolvedValue('test data');

    const { result } = renderHook(() => useApi(mockApiCall));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiCall).toHaveBeenCalledTimes(1);

    // Manual refetch
    await result.current.refetch();

    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it('should handle refetch interval', async () => {
    jest.useFakeTimers();
    mockApiCall.mockResolvedValue('test data');

    const { result } = renderHook(() => 
      useApi(mockApiCall, [], { refetchInterval: 1000 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiCall).toHaveBeenCalledTimes(1);

    // Fast forward time
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });
});