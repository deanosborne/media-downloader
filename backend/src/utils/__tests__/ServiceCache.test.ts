/**
 * Unit tests for ServiceCache utility
 */

import { ServiceCache } from '../ServiceCache.js';

describe('ServiceCache', () => {
  let cache: ServiceCache;

  beforeEach(() => {
    cache = new ServiceCache(1000); // 1 second TTL for testing
  });

  describe('get and set', () => {
    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cache.set(key, value);
      const result = await cache.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      await cache.set('string', 'test');
      await cache.set('number', 42);
      await cache.set('boolean', true);
      await cache.set('object', { key: 'value' });
      await cache.set('array', [1, 2, 3]);

      expect(await cache.get('string')).toBe('test');
      expect(await cache.get('number')).toBe(42);
      expect(await cache.get('boolean')).toBe(true);
      expect(await cache.get('object')).toEqual({ key: 'value' });
      expect(await cache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const key = 'expiring-key';
      const value = 'expiring-value';

      await cache.set(key, value, 100); // 100ms TTL
      
      // Should be available immediately
      expect(await cache.get(key)).toBe(value);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(await cache.get(key)).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      const key = 'default-ttl-key';
      const value = 'default-ttl-value';

      await cache.set(key, value);
      
      // Should be available immediately
      expect(await cache.get(key)).toBe(value);
    });

    it('should allow custom TTL per entry', async () => {
      await cache.set('short', 'short-value', 50);
      await cache.set('long', 'long-value', 200);

      // Both should be available initially
      expect(await cache.get('short')).toBe('short-value');
      expect(await cache.get('long')).toBe('long-value');

      // Wait for short TTL to expire
      await new Promise(resolve => setTimeout(resolve, 75));

      expect(await cache.get('short')).toBeNull();
      expect(await cache.get('long')).toBe('long-value');

      // Wait for long TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(await cache.get('long')).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete specific entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');

      await cache.delete('key1');

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBe('value2');
    });

    it('should handle deleting non-existent keys', async () => {
      await expect(cache.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');
      expect(await cache.get('key3')).toBe('value3');

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries during cleanup', async () => {
      await cache.set('key1', 'value1', 50);
      await cache.set('key2', 'value2', 200);

      // Wait for first key to expire
      await new Promise(resolve => setTimeout(resolve, 75));

      // Before cleanup, expired entries are still in memory
      const statsBefore = cache.getStats();
      expect(statsBefore.size).toBe(2);

      // Run cleanup
      cache.cleanup();

      // After cleanup, expired entries should be removed
      const statsAfter = cache.getStats();
      expect(statsAfter.size).toBe(1);
      expect(statsAfter.keys).toEqual(['key2']);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toEqual(expect.arrayContaining(['key1', 'key2']));
    });

    it('should return empty stats for empty cache', () => {
      const stats = cache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe('constructor', () => {
    it('should use default TTL when not specified', () => {
      const defaultCache = new ServiceCache();
      expect(defaultCache).toBeInstanceOf(ServiceCache);
    });

    it('should use custom default TTL', async () => {
      const customCache = new ServiceCache(500);
      await customCache.set('test', 'value');
      
      // Should be available immediately
      expect(await customCache.get('test')).toBe('value');
    });
  });
});