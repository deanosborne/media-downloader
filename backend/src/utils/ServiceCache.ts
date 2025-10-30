/**
 * Enhanced in-memory cache implementation for service responses
 * Includes metrics, monitoring, and invalidation strategies
 */

import { IServiceCache } from '../types/service.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  clears: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
}

interface CacheStats {
  size: number;
  keys: string[];
  metrics: CacheMetrics;
  memoryUsage: {
    entries: number;
    averageEntryAge: number;
    oldestEntry: number;
    newestEntry: number;
  };
}

export class ServiceCache implements IServiceCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;
  private metrics: CacheMetrics;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    defaultTTL: number = 5 * 60 * 1000, // 5 minutes default
    maxSize: number = 1000, // Maximum number of entries
    cleanupIntervalMs: number = 60 * 1000 // Cleanup every minute
  ) {
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      clears: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0,
    };

    // Start automatic cleanup only if not in test environment
    if (process.env['NODE_ENV'] !== 'test') {
      this.startCleanup(cleanupIntervalMs);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    this.metrics.totalRequests++;
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.metrics.hits++;
    this.updateHitRate();

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Check if we need to evict entries to stay under max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
    });

    this.metrics.sets++;
  }

  async delete(key: string): Promise<void> {
    if (this.cache.delete(key)) {
      this.metrics.deletes++;
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.metrics.clears++;
  }

  /**
   * Delete all keys matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.metrics.deletes += deletedCount;
    return deletedCount;
  }

  /**
   * Delete all keys with a specific prefix
   */
  async invalidatePrefix(prefix: string): Promise<number> {
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.metrics.deletes += deletedCount;
    return deletedCount;
  }

  /**
   * Delete all keys containing a specific substring
   */
  async invalidateContaining(substring: string): Promise<number> {
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (key.includes(substring)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.metrics.deletes += deletedCount;
    return deletedCount;
  }

  // Utility method to clean up expired entries
  cleanup(): void {
    const now = Date.now();
    let evictedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        evictedCount++;
      }
    }

    this.metrics.evictions += evictedCount;
  }

  /**
   * Evict least recently used entries when cache is full
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;

    let oldestKey: string | null = null;
    let oldestTime = Number.MAX_SAFE_INTEGER;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests) * 100 
      : 0;
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    let totalAge = 0;
    let oldestEntry = now;
    let newestEntry = 0;

    for (const entry of entries) {
      const age = now - entry.createdAt;
      totalAge += age;
      
      if (entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      
      if (entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      metrics: { ...this.metrics },
      memoryUsage: {
        entries: entries.length,
        averageEntryAge: entries.length > 0 ? totalAge / entries.length : 0,
        oldestEntry: entries.length > 0 ? now - oldestEntry : 0,
        newestEntry: entries.length > 0 ? now - newestEntry : 0,
      },
    };
  }

  /**
   * Get simple cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      clears: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0,
    };
  }
}

// Default cache instance with reasonable defaults
export const defaultServiceCache = new ServiceCache(
  5 * 60 * 1000, // 5 minutes TTL
  1000, // Max 1000 entries
  60 * 1000 // Cleanup every minute
);

// Graceful shutdown cleanup
process.on('SIGTERM', () => {
  defaultServiceCache.stopCleanup();
});

process.on('SIGINT', () => {
  defaultServiceCache.stopCleanup();
});