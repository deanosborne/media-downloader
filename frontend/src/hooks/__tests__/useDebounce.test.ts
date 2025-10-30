import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback, useThrottle, useThrottledCallback } from '../useDebounce';

// Mock timers for testing
jest.useFakeTimers();

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial'); // Should still be initial

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // Rapid changes
    rerender({ value: 'change1', delay: 500 });
    act(() => {
      jest.advanceTimersByTime(250);
    });

    rerender({ value: 'change2', delay: 500 });
    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Should still be initial because timer was reset
    expect(result.current).toBe('initial');

    // Complete the debounce
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('change2');
  });
});

describe('useDebouncedCallback', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should debounce callback execution', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(mockCallback, 500)
    );

    // Call multiple times rapidly
    result.current('arg1');
    result.current('arg2');
    result.current('arg3');

    // Should not have been called yet
    expect(mockCallback).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should have been called only once with last arguments
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('arg3');
  });

  it('should update callback when dependencies change', () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedCallback(callback, 500, [callback]),
      { initialProps: { callback: mockCallback1 } }
    );

    result.current('test');

    // Change callback
    rerender({ callback: mockCallback2 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should call the new callback
    expect(mockCallback1).not.toHaveBeenCalled();
    expect(mockCallback2).toHaveBeenCalledWith('test');
  });
});

describe('useThrottle', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useThrottle('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should throttle value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, limit }) => useThrottle(value, limit),
      { initialProps: { value: 'initial', limit: 500 } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', limit: 500 });

    // Should update immediately on first change
    act(() => {
      jest.advanceTimersByTime(0);
    });

    // Rapid subsequent changes should be throttled
    rerender({ value: 'updated2', limit: 500 });
    expect(result.current).toBe('initial'); // Should still be throttled

    // After throttle period
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated2');
  });
});

describe('useThrottledCallback', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should throttle callback execution', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => 
      useThrottledCallback(mockCallback, 500)
    );

    // First call should execute immediately
    result.current('arg1');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('arg1');

    // Subsequent calls should be throttled
    result.current('arg2');
    result.current('arg3');
    expect(mockCallback).toHaveBeenCalledTimes(1); // Still only called once

    // After throttle period
    act(() => {
      jest.advanceTimersByTime(500);
    });

    result.current('arg4');
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenLastCalledWith('arg4');
  });
});