/**
 * Book service for searching books and audiobooks from various APIs
 */

import { BaseService } from './BaseService.js';
import { IConfigManager } from '../config/types.js';
import { ILogger, ServiceConfig } from '../types/service.js';

export interface BookSearchResult {
  id: string;
  name: string;
  year?: number;
  overview: string;
  poster?: string;
  authors: string;
  type: 'book' | 'audiobook' | 'application';
}

export interface GoogleBooksResponse {
  items?: Array<{
    id: string;
    volumeInfo: {
      title: string;
      publishedDate?: string;
      description?: string;
      imageLinks?: {
        thumbnail?: string;
      };
      authors?: string[];
    };
  }>;
}

export interface iTunesResponse {
  results?: Array<{
    collectionId: number;
    collectionName: string;
    releaseDate?: string;
    description?: string;
    artworkUrl100?: string;
    artistName: string;
  }>;
}

export class BookService extends BaseService {
  private readonly googleBooksBaseUrl = 'https://www.googleapis.com/books/v1';
  private readonly itunesBaseUrl = 'https://itunes.apple.com';

  constructor(config: IConfigManager, logger: ILogger) {
    super('BookService', config, logger, {
      timeout: 15000,
      retries: 2,
      retryDelay: 1000
    });
  }

  protected getBaseUrl(): string {
    // This service uses multiple APIs, so we'll override the request methods
    return '';
  }

  protected getAuthHeaders(): Record<string, string> {
    // No authentication required for these public APIs
    return {};
  }

  protected getServiceConfig(): ServiceConfig {
    return {
      timeout: 15000,
      retries: 2,
      retryDelay: 1000
    };
  }

  /**
   * Search for books using Google Books API
   */
  public async searchBooks(query: string): Promise<BookSearchResult[]> {
    try {
      this.logger.info('Searching books', { query });

      const response = await this.handleRequest<GoogleBooksResponse>(() =>
        this.httpClient.get(`${this.googleBooksBaseUrl}/volumes`, {
          params: {
            q: query,
            maxResults: 10,
            printType: 'books',
            langRestrict: 'en'
          }
        })
      );

      if (!response.items) {
        this.logger.info('No books found', { query });
        return [];
      }

      const results = response.items.map(item => ({
        id: item.id,
        name: item.volumeInfo.title,
        year: item.volumeInfo.publishedDate 
          ? new Date(item.volumeInfo.publishedDate).getFullYear() 
          : undefined,
        overview: item.volumeInfo.description || 'No description available',
        poster: item.volumeInfo.imageLinks?.thumbnail || undefined,
        authors: item.volumeInfo.authors?.join(', ') || 'Unknown',
        type: 'book' as const
      }));

      this.logger.info('Books search completed', { 
        query, 
        resultsCount: results.length 
      });

      return results;
    } catch (error) {
      this.logger.error('Book search failed', { query, error });
      return [];
    }
  }

  /**
   * Search for audiobooks using iTunes API
   */
  public async searchAudiobooks(query: string): Promise<BookSearchResult[]> {
    try {
      this.logger.info('Searching audiobooks', { query });

      const response = await this.handleRequest<iTunesResponse>(() =>
        this.httpClient.get(`${this.itunesBaseUrl}/search`, {
          params: {
            term: query,
            media: 'audiobook',
            limit: 10,
            entity: 'audiobook'
          }
        })
      );

      if (!response.results) {
        this.logger.info('No audiobooks found', { query });
        return [];
      }

      const results = response.results.map(item => ({
        id: String(item.collectionId),
        name: item.collectionName,
        year: item.releaseDate 
          ? new Date(item.releaseDate).getFullYear() 
          : undefined,
        overview: item.description || `By ${item.artistName}`,
        poster: item.artworkUrl100 || undefined,
        authors: item.artistName,
        type: 'audiobook' as const
      }));

      this.logger.info('Audiobooks search completed', { 
        query, 
        resultsCount: results.length 
      });

      return results;
    } catch (error) {
      this.logger.error('Audiobook search failed', { query, error });
      return [];
    }
  }

  /**
   * Search for applications (simplified implementation)
   * This could be enhanced with proper API integrations for app stores
   */
  public async searchApplications(query: string): Promise<BookSearchResult[]> {
    try {
      this.logger.info('Searching applications', { query });

      // Static list of common applications for demonstration
      // In a real implementation, this would integrate with app store APIs
      const commonApps = [
        { name: 'Visual Studio Code', type: 'Development' },
        { name: 'Slack', type: 'Communication' },
        { name: 'Discord', type: 'Communication' },
        { name: 'Spotify', type: 'Music' },
        { name: 'VLC Media Player', type: 'Media' },
        { name: 'OBS Studio', type: 'Streaming' },
        { name: 'Steam', type: 'Gaming' },
        { name: 'Epic Games', type: 'Gaming' },
        { name: 'Adobe Photoshop', type: 'Creative' },
        { name: 'Audacity', type: 'Audio' },
        { name: 'Blender', type: '3D Modeling' },
        { name: 'FileZilla', type: 'FTP' },
        { name: 'WinRAR', type: 'Compression' },
        { name: '7-Zip', type: 'Compression' },
        { name: 'Chrome', type: 'Browser' },
        { name: 'Firefox', type: 'Browser' }
      ];

      const filtered = commonApps.filter(app => 
        app.name.toLowerCase().includes(query.toLowerCase())
      );

      const results = filtered.map((app, idx) => ({
        id: `app_${idx}`,
        name: app.name,
        year: undefined,
        overview: `${app.type} Application`,
        poster: undefined,
        authors: 'Various',
        type: 'application' as const
      }));

      this.logger.info('Applications search completed', { 
        query, 
        resultsCount: results.length 
      });

      return results;
    } catch (error) {
      this.logger.error('Application search failed', { query, error });
      return [];
    }
  }

  /**
   * Search across all media types (books, audiobooks, applications)
   */
  public async searchAll(query: string): Promise<{
    books: BookSearchResult[];
    audiobooks: BookSearchResult[];
    applications: BookSearchResult[];
  }> {
    try {
      this.logger.info('Searching all media types', { query });

      const [books, audiobooks, applications] = await Promise.allSettled([
        this.searchBooks(query),
        this.searchAudiobooks(query),
        this.searchApplications(query)
      ]);

      const results = {
        books: books.status === 'fulfilled' ? books.value : [],
        audiobooks: audiobooks.status === 'fulfilled' ? audiobooks.value : [],
        applications: applications.status === 'fulfilled' ? applications.value : []
      };

      // Log any failures
      if (books.status === 'rejected') {
        this.logger.error('Books search failed in searchAll', { error: books.reason });
      }
      if (audiobooks.status === 'rejected') {
        this.logger.error('Audiobooks search failed in searchAll', { error: audiobooks.reason });
      }
      if (applications.status === 'rejected') {
        this.logger.error('Applications search failed in searchAll', { error: applications.reason });
      }

      this.logger.info('All media search completed', {
        query,
        booksCount: results.books.length,
        audiobooksCount: results.audiobooks.length,
        applicationsCount: results.applications.length
      });

      return results;
    } catch (error) {
      this.logger.error('Search all failed', { query, error });
      throw error;
    }
  }

  /**
   * Get book details by ID (Google Books)
   */
  public async getBookDetails(bookId: string): Promise<BookSearchResult | null> {
    try {
      this.logger.info('Getting book details', { bookId });

      const response = await this.handleRequest<any>(() =>
        this.httpClient.get(`${this.googleBooksBaseUrl}/volumes/${bookId}`)
      );

      const result = {
        id: response.id,
        name: response.volumeInfo.title,
        year: response.volumeInfo.publishedDate 
          ? new Date(response.volumeInfo.publishedDate).getFullYear() 
          : undefined,
        overview: response.volumeInfo.description || 'No description available',
        poster: response.volumeInfo.imageLinks?.thumbnail || undefined,
        authors: response.volumeInfo.authors?.join(', ') || 'Unknown',
        type: 'book' as const
      };

      this.logger.info('Book details retrieved', { bookId });
      return result;
    } catch (error) {
      this.logger.error('Failed to get book details', { bookId, error });
      return null;
    }
  }

  /**
   * Check service health by testing API connectivity
   */
  public async checkHealth(): Promise<{
    googleBooks: boolean;
    itunes: boolean;
  }> {
    const results = {
      googleBooks: false,
      itunes: false
    };

    try {
      await this.handleRequest(() =>
        this.httpClient.get(`${this.googleBooksBaseUrl}/volumes`, {
          params: { q: 'test', maxResults: 1 }
        })
      );
      results.googleBooks = true;
    } catch (error) {
      this.logger.warn('Google Books API health check failed', { error });
    }

    try {
      await this.handleRequest(() =>
        this.httpClient.get(`${this.itunesBaseUrl}/search`, {
          params: { term: 'test', media: 'audiobook', limit: 1 }
        })
      );
      results.itunes = true;
    } catch (error) {
      this.logger.warn('iTunes API health check failed', { error });
    }

    this.logger.info('Service health check completed', results);
    return results;
  }
}