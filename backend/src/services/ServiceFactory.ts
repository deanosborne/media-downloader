/**
 * Service factory for creating and managing service instances
 */

import { TMDBService } from './TMDBService';
import { RealDebridService } from './realDebridService.js';
import { JackettService } from './jackettService.js';
import { PlexService } from './plexService.js';
import { BookService } from './bookService.js';
import { TVShowParserService } from './tvShowParserService.js';
import { TorrentParserService } from './torrentParserService.js';
import { IConfigManager } from '../config/types';
import { ILogger, IServiceCache } from '../types/service';
import { Logger } from '../utils/Logger';
import { ServiceCache } from '../utils/ServiceCache';

export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Map<string, any> = new Map();
  private config: IConfigManager;
  private logger: ILogger;
  private cache: IServiceCache;

  private constructor(config: IConfigManager, logger?: ILogger, cache?: IServiceCache) {
    this.config = config;
    this.logger = logger || new Logger();
    this.cache = cache || new ServiceCache();
  }

  public static getInstance(config: IConfigManager, logger?: ILogger, cache?: IServiceCache): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(config, logger, cache);
    }
    return ServiceFactory.instance;
  }

  public static reset(): void {
    ServiceFactory.instance = null as any;
  }

  /**
   * Get or create TMDB service instance
   */
  public getTMDBService(): TMDBService {
    if (!this.services.has('tmdb')) {
      const service = new TMDBService(this.config, this.logger, this.cache);
      this.services.set('tmdb', service);
    }
    return this.services.get('tmdb');
  }

  /**
   * Get or create Real-Debrid service instance
   */
  public getRealDebridService(): RealDebridService {
    if (!this.services.has('realDebrid')) {
      const service = new RealDebridService(this.config, this.logger);
      this.services.set('realDebrid', service);
    }
    return this.services.get('realDebrid');
  }

  /**
   * Get or create Jackett service instance
   */
  public getJackettService(): JackettService {
    if (!this.services.has('jackett')) {
      const service = new JackettService(this.config, this.logger, this.cache);
      this.services.set('jackett', service);
    }
    return this.services.get('jackett');
  }

  /**
   * Get or create Plex service instance
   */
  public getPlexService(): PlexService {
    if (!this.services.has('plex')) {
      const service = new PlexService(this.config, this.logger);
      this.services.set('plex', service);
    }
    return this.services.get('plex');
  }

  /**
   * Get or create Book service instance
   */
  public getBookService(): BookService {
    if (!this.services.has('book')) {
      const service = new BookService(this.config, this.logger);
      this.services.set('book', service);
    }
    return this.services.get('book');
  }

  /**
   * Get or create TV Show Parser service instance
   */
  public getTVShowParserService(): TVShowParserService {
    if (!this.services.has('tvShowParser')) {
      const service = new TVShowParserService(this.config, this.logger);
      this.services.set('tvShowParser', service);
    }
    return this.services.get('tvShowParser');
  }

  /**
   * Get or create Torrent Parser service instance
   */
  public getTorrentParserService(): TorrentParserService {
    if (!this.services.has('torrentParser')) {
      const service = new TorrentParserService(this.config, this.logger);
      this.services.set('torrentParser', service);
    }
    return this.services.get('torrentParser');
  }

  /**
   * Register a custom service instance
   */
  public registerService<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Get a registered service by name
   */
  public getService<T>(name: string): T | undefined {
    return this.services.get(name);
  }

  /**
   * Check if a service is registered
   */
  public hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all registered services
   */
  public clearServices(): void {
    this.services.clear();
  }

  /**
   * Get all registered service names
   */
  public getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}

// Convenience functions for creating services
export function createTMDBService(
  config: IConfigManager,
  logger?: ILogger,
  cache?: IServiceCache
): TMDBService {
  return new TMDBService(
    config,
    logger || new Logger(),
    cache || new ServiceCache()
  );
}

export function createRealDebridService(
  config: IConfigManager,
  logger?: ILogger
): RealDebridService {
  return new RealDebridService(
    config,
    logger || new Logger()
  );
}

export function createJackettService(
  config: IConfigManager,
  logger?: ILogger,
  cache?: IServiceCache
): JackettService {
  return new JackettService(
    config,
    logger || new Logger(),
    cache || new ServiceCache()
  );
}

export function createPlexService(
  config: IConfigManager,
  logger?: ILogger
): PlexService {
  return new PlexService(
    config,
    logger || new Logger()
  );
}

export function createBookService(
  config: IConfigManager,
  logger?: ILogger
): BookService {
  return new BookService(
    config,
    logger || new Logger()
  );
}

export function createTVShowParserService(
  config: IConfigManager,
  logger?: ILogger
): TVShowParserService {
  return new TVShowParserService(
    config,
    logger || new Logger()
  );
}

export function createTorrentParserService(
  config: IConfigManager,
  logger?: ILogger
): TorrentParserService {
  return new TorrentParserService(
    config,
    logger || new Logger()
  );
}