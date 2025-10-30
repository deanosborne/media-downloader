/**
 * Integration tests for BookService
 */

import { BookService } from '../bookService.js';
import { ConfigManager } from '../../config/ConfigManager.js';
import { Logger } from '../../utils/Logger.js';
import axios from 'axios';

// Mock axios for HTTP requests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BookService Integration Tests', () => {
  let service: BookService;
  let config: ConfigManager;
  let logger: Logger;

  beforeAll(async () => {
    config = new ConfigManager();
    logger = new Logger();
    service = new BookService(config, logger);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup axios mock
    mockedAxios.create.mockReturnValue(mockedAxios);
  });

  describe('Service Integration', () => {
    it('should initialize with proper configuration', () => {
      expect(service.serviceName).toBe('BookService');
      expect(service).toBeInstanceOf(BookService);
    });

    it('should handle HTTP client configuration', () => {
      // Service should create HTTP client with proper timeout
      expect(service).toBeDefined();
    });
  });

  describe('Google Books API Integration', () => {
    const mockGoogleBooksResponse = {
      data: {
        items: [
          {
            id: 'book1',
            volumeInfo: {
              title: 'The Great Gatsby',
              publishedDate: '1925-04-10',
              description: 'A classic American novel',
              imageLinks: {
                thumbnail: 'https://example.com/gatsby.jpg'
              },
              authors: ['F. Scott Fitzgerald']
            }
          },
          {
            id: 'book2',
            volumeInfo: {
              title: 'To Kill a Mockingbird',
              publishedDate: '1960-07-11',
              authors: ['Harper Lee']
            }
          }
        ]
      }
    };

    it('should search books successfully with real API response format', async () => {
      mockedAxios.get.mockResolvedValue(mockGoogleBooksResponse);

      const results = await service.searchBooks('classic novels');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/books/v1/volumes',
        {
          params: {
            q: 'classic novels',
            maxResults: 10,
            printType: 'books',
            langRestrict: 'en'
          }
        }
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'book1',
        name: 'The Great Gatsby',
        year: 1925,
        overview: 'A classic American novel',
        poster: 'https://example.com/gatsby.jpg',
        authors: 'F. Scott Fitzgerald',
        type: 'book'
      });
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const results = await service.searchBooks('test query');

      expect(results).toEqual([]);
    });

    it('should handle empty API responses', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      const results = await service.searchBooks('nonexistent book');

      expect(results).toEqual([]);
    });

    it('should get book details by ID', async () => {
      const mockBookDetails = {
        data: {
          id: 'book1',
          volumeInfo: {
            title: 'Detailed Book',
            publishedDate: '2023-01-01',
            description: 'Detailed description',
            imageLinks: {
              thumbnail: 'https://example.com/detailed.jpg'
            },
            authors: ['Test Author']
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockBookDetails);

      const result = await service.getBookDetails('book1');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/books/v1/volumes/book1'
      );

      expect(result).toEqual({
        id: 'book1',
        name: 'Detailed Book',
        year: 2023,
        overview: 'Detailed description',
        poster: 'https://example.com/detailed.jpg',
        authors: 'Test Author',
        type: 'book'
      });
    });
  });

  describe('iTunes API Integration', () => {
    const mockiTunesResponse = {
      data: {
        results: [
          {
            collectionId: 123456,
            collectionName: 'The Hobbit (Unabridged)',
            releaseDate: '2012-09-18T07:00:00Z',
            description: 'The classic fantasy adventure',
            artworkUrl100: 'https://example.com/hobbit.jpg',
            artistName: 'Rob Inglis'
          },
          {
            collectionId: 789012,
            collectionName: '1984 (Unabridged)',
            artistName: 'Simon Prebble'
          }
        ]
      }
    };

    it('should search audiobooks successfully with real API response format', async () => {
      mockedAxios.get.mockResolvedValue(mockiTunesResponse);

      const results = await service.searchAudiobooks('fantasy audiobooks');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://itunes.apple.com/search',
        {
          params: {
            term: 'fantasy audiobooks',
            media: 'audiobook',
            limit: 10,
            entity: 'audiobook'
          }
        }
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: '123456',
        name: 'The Hobbit (Unabridged)',
        year: 2012,
        overview: 'The classic fantasy adventure',
        poster: 'https://example.com/hobbit.jpg',
        authors: 'Rob Inglis',
        type: 'audiobook'
      });
    });

    it('should handle missing description in audiobooks', async () => {
      mockedAxios.get.mockResolvedValue(mockiTunesResponse);

      const results = await service.searchAudiobooks('test');

      expect(results[1].overview).toBe('By Simon Prebble');
    });
  });

  describe('Multi-API Integration', () => {
    it('should search all media types concurrently', async () => {
      const mockBookResponse = {
        data: {
          items: [{ id: 'book1', volumeInfo: { title: 'Test Book', authors: ['Author'] } }]
        }
      };

      const mockAudiobookResponse = {
        data: {
          results: [{ collectionId: 123, collectionName: 'Test Audiobook', artistName: 'Narrator' }]
        }
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockBookResponse)
        .mockResolvedValueOnce(mockAudiobookResponse);

      const results = await service.searchAll('test query');

      expect(results.books).toHaveLength(1);
      expect(results.audiobooks).toHaveLength(1);
      expect(results.applications).toHaveLength(0); // No matches for 'test query'

      // Should have made concurrent API calls
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should handle partial API failures in searchAll', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: { items: [{ id: 'book1', volumeInfo: { title: 'Test Book', authors: ['Author'] } }] } })
        .mockRejectedValueOnce(new Error('iTunes API down'));

      const results = await service.searchAll('test query');

      expect(results.books).toHaveLength(1);
      expect(results.audiobooks).toEqual([]);
      expect(results.applications).toHaveLength(0);
    });
  });

  describe('Application Search Integration', () => {
    it('should search applications without external API calls', async () => {
      const results = await service.searchApplications('visual studio');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Visual Studio Code');
      expect(results[0].type).toBe('application');

      // Should not make any HTTP requests
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive application search', async () => {
      const results = await service.searchApplications('CHROME');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Chrome');
    });

    it('should return multiple matching applications', async () => {
      const results = await service.searchApplications('game'); // Should match Steam, Epic Games

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(app => app.name.includes('Steam'))).toBe(true);
    });
  });

  describe('Health Check Integration', () => {
    it('should check health of all APIs', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: {} }) // Google Books success
        .mockResolvedValueOnce({ data: {} }); // iTunes success

      const health = await service.checkHealth();

      expect(health).toEqual({
        googleBooks: true,
        itunes: true
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/books/v1/volumes',
        { params: { q: 'test', maxResults: 1 } }
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://itunes.apple.com/search',
        { params: { term: 'test', media: 'audiobook', limit: 1 } }
      );
    });

    it('should handle mixed API health status', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: {} }) // Google Books success
        .mockRejectedValueOnce(new Error('iTunes down')); // iTunes failure

      const health = await service.checkHealth();

      expect(health).toEqual({
        googleBooks: true,
        itunes: false
      });
    });

    it('should handle complete API failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network down'));

      const health = await service.checkHealth();

      expect(health).toEqual({
        googleBooks: false,
        itunes: false
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network timeouts', async () => {
      mockedAxios.get.mockRejectedValue(new Error('timeout of 15000ms exceeded'));

      const results = await service.searchBooks('test');

      expect(results).toEqual([]);
    });

    it('should handle malformed API responses', async () => {
      mockedAxios.get.mockResolvedValue({ data: null });

      const results = await service.searchBooks('test');

      expect(results).toEqual([]);
    });

    it('should handle API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = { status: 429 };
      
      mockedAxios.get.mockRejectedValue(rateLimitError);

      const results = await service.searchBooks('test');

      expect(results).toEqual([]);
    });
  });

  describe('Data Transformation Integration', () => {
    it('should handle missing optional fields gracefully', async () => {
      const incompleteResponse = {
        data: {
          items: [{
            id: 'incomplete-book',
            volumeInfo: {
              title: 'Incomplete Book'
              // Missing: publishedDate, description, imageLinks, authors
            }
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(incompleteResponse);

      const results = await service.searchBooks('incomplete');

      expect(results[0]).toEqual({
        id: 'incomplete-book',
        name: 'Incomplete Book',
        year: undefined,
        overview: 'No description available',
        poster: undefined,
        authors: 'Unknown',
        type: 'book'
      });
    });

    it('should handle date parsing edge cases', async () => {
      const edgeCaseResponse = {
        data: {
          items: [{
            id: 'edge-case-book',
            volumeInfo: {
              title: 'Edge Case Book',
              publishedDate: '2023', // Year only
              authors: ['Test Author']
            }
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(edgeCaseResponse);

      const results = await service.searchBooks('edge case');

      expect(results[0].year).toBe(2023);
    });

    it('should handle multiple authors correctly', async () => {
      const multiAuthorResponse = {
        data: {
          items: [{
            id: 'multi-author-book',
            volumeInfo: {
              title: 'Multi Author Book',
              authors: ['Author One', 'Author Two', 'Author Three']
            }
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(multiAuthorResponse);

      const results = await service.searchBooks('multi author');

      expect(results[0].authors).toBe('Author One, Author Two, Author Three');
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});