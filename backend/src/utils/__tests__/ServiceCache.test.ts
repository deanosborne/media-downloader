/**
 * Tests for ServiceCache implementation
 */

import { ServiceCache } from '../ServiceCache';

describe('ServiceCache', () => {
  let cache: ServiceCache;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    cache = new ServiceCache(1000, 5); // 1 second TTL, max 5 entries for testing
  });

  afterEach(() => {
    cache.stopCleanup();
  });

  afterAll(() => {
    // Ensure all timers are cleared
    jest.clearAllTimers();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1');
      const result = await cache.get('key1');
      expect(result).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      await cache.set('key1', 'value1');
      await cache.delete('key1');
      const result = await cache.get('key1');
      expect(result).toBeNull();
    });

    it('should clear all values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      
      const result1 = await cache.get('key1');
      const result2 = await cache.get('key2');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('key1', 'value1', 100); // 100ms TTL
      
      // Should be available immediately
      let result = await cache.get('key1');
      expect(result).toBe('value1');
      
      // Fast-forward time past expiration
      jest.advanceTimersByTime(150);
      
      result = await cache.get('key1');
      expect(result).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      const shortCache = new ServiceCache(100); // 100ms default TTL
      await shortCache.set('key1', 'value1');
      
      // Should be available immediately
      let result = await shortCache.get('key1');
      expect(result).toBe('value1');
      
      // Fast-forward time past expiration
      jest.advanceTimersByTime(150);
      
      result = await shortCache.get('key1');
      expect(result).toBeNull();
      
      shortCache.stopCleanup();
    });

    it('should allow custom TTL per entry', async () => {
      await cache.set('short', 'value1', 100); // 100ms
      await cache.set('long', 'value2', 500); // 500ms
      
      // Fast-forward 150ms
      jest.advanceTimersByTime(150);
      
      const shortResult = await cache.get('short');
      const longResult = await cache.get('long');
      
      expect(shortResult).toBeNull();
      expect(longResult).toBe('value2');
    });
  });

  describe('Size Limits and Eviction', () => {
    it('should evict least recently used entries when full', async () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }
      
      // Access key4 to make it recently used (it was the last one added)
      await cache.get('key4');
      
      // Add one more entry, should evict key0 (least recently used - first one added)
      await cache.set('key5', 'value5');
      
      const result0 = await cache.get('key0'); // Should be evicted
      const result4 = await cache.get('key4'); // Should still exist (recently accessed)
      const result5 = await cache.get('key5'); // Should exist (just added)
      
      expect(result0).toBeNull();
      expect(result4).toBe('value4');
      expect(result5).toBe('value5');
    });

    it('should not evict when updating existing key', async () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }
      
      // Update existing key - should not trigger eviction
      await cache.set('key0', 'updated_value');
      
      // All keys should still exist
      for (let i = 0; i < 5; i++) {
        const result = await cache.get(`key${i}`);
        expect(result).not.toBeNull();
      }
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(async () => {
      await cache.set('user:123:profile', 'profile_data');
      await cache.set('user:123:settings', 'settings_data');
      await cache.set('user:456:profile', 'other_profile');
      await cache.set('product:789', 'product_data');
      await cache.set('search:movies:action', 'search_results');
    });

    it('should invalidate by pattern', async () => {
      const deletedCount = await cache.invalidatePattern('user:123:*');
      
      expect(deletedCount).toBe(2);
      expect(await cache.get('user:123:profile')).toBeNull();
      expect(await cache.get('user:123:settings')).toBeNull();
      expect(await cache.get('user:456:profile')).toBe('other_profile');
      expect(await cache.get('product:789')).toBe('product_data');
    });

    it('should invalidate by prefix', async () => {
      const deletedCount = await cache.invalidatePrefix('user:');
      
      expect(deletedCount).toBe(3);
      expect(await cache.get('user:123:profile')).toBeNull();
      expect(await cache.get('user:123:settings')).toBeNull();
      expect(await cache.get('user:456:profile')).toBeNull();
      expect(await cache.get('product:789')).toBe('product_data');
    });

    it('should invalidate by substring', async () => {
      const deletedCount = await cache.invalidateContaining('profile');
      
      expect(deletedCount).toBe(2);
      expect(await cache.get('user:123:profile')).toBeNull();
      expect(await cache.get('user:456:profile')).toBeNull();
      expect(await cache.get('user:123:settings')).toBe('settings_data');
      expect(await cache.get('product:789')).toBe('product_data');
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track hit and miss metrics', async () => {
      await cache.set('key1', 'value1');
      
      // Hit
      await cache.get('key1');
      // Miss
      await cache.get('nonexistent');
      // Another hit
      await cache.get('key1');
      
      const metrics = cache.getMetrics();
      
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.hitRate).toBeCloseTo(66.67, 1);
    });

    it('should track set, delete, and clear operations', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.delete('key1');
      await cache.clear();
      
      const metrics = cache.getMetrics();
      
      expect(metrics.sets).toBe(2);
      expect(metrics.deletes).toBe(1);
      expect(metrics.clears).toBe(1);
    });

    it('should track evictions', async () => {
      // Fill cache beyond capacity to trigger evictions
      for (let i = 0; i < 7; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }
      
      const metrics = cache.getMetrics();
      expect(metrics.evictions).toBeGreaterThan(0);
    });

    it('should provide comprehensive stats', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      // Fast-forward time to ensure measurable age
      jest.advanceTimersByTime(10);
      
      await cache.get('key1');
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
      expect(stats.metrics.hits).toBe(1);
      expect(stats.memoryUsage.entries).toBe(2);
      expect(stats.memoryUsage.averageEntryAge).toBeGreaterThan(0);
    });

    it('should reset metrics', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      
      let metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      
      cache.resetMetrics();
      
      metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.totalRequests).toBe(0);
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should clean up expired entries', async () => {
      await cache.set('key1', 'value1', 100); // 100ms TTL
      await cache.set('key2', 'value2', 1000); // 1000ms TTL
      
      // Fast-forward time for first entry to expire
      jest.advanceTimersByTime(150);
      
      // Manual cleanup
      cache.cleanup();
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('key2');
      expect(stats.keys).not.toContain('key1');
    });

    it('should track cleanup evictions in metrics', async () => {
      await cache.set('key1', 'value1', 50); // Very short TTL
      
      // Fast-forward time past expiration
      jest.advanceTimersByTime(100);
      
      cache.cleanup();
      
      const metrics = cache.getMetrics();
      expect(metrics.evictions).toBe(1);
    });
  });

  describe('Data Types', () => {
    it('should handle different data types', async () => {
      const testData = {
        string: 'test',
        number: 42,
        boolean: true,
        object: { nested: 'value' },
        array: [1, 2, 3],
        null: null,
        undefined: undefined
      };

      for (const [key, value] of Object.entries(testData)) {
        await cache.set(key, value);
        const result = await cache.get(key);
        expect(result).toEqual(value);
      }
    });

    it('should handle complex objects', async () => {
      const complexObject = {
        id: 123,
        name: 'Test Movie',
        metadata: {
          year: 2023,
          genres: ['Action', 'Drama'],
          ratings: {
            imdb: 8.5,
            rotten: 85
          }
        },
        cast: [
          { name: 'Actor 1', role: 'Hero' },
          { name: 'Actor 2', role: 'Villain' }
        ]
      };

      await cache.set('movie:123', complexObject);
      const result = await cache.get<typeof complexObject>('movie:123');
      
      expect(result).toEqual(complexObject);
      expect(result?.metadata.genres).toContain('Action');
      expect(result?.cast?.[0]?.name).toBe('Actor 1');
    });
  });
});