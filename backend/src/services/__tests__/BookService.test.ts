/**
 * Unit tests for BookService
 */

import { BookService, BookSearchResult, GoogleBooksResponse, iTunesResponse } from '../bookService.js';
import { IConfigManager } from '../../config/types.js';
import { ILogger } from '../../types/service.js';

describe('BookService', () => {
  let service: BookService;
  let mockConfig: jest.Mocked<IConfigManager>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock config
    mockConfig = {
      get: jest.fn(),
      getRequired: jest.fn(),
      set: jest.fn(),
      validate: jest.fn(),
      onConfigChange: jest.fn()
    } as jest.Mocked<IConfigManager>;

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      createChildLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      })
    } as jest.Mocked<ILogger>;

    service = new BookService(mockConfig, mockLogger);
  });

  describe('constructor', () => {
    it('should create service with correct configuration', () => {
      expect(service).toBeInstanceOf(BookService);
      expect(service.serviceName).toBe('BookService');
      expect(mockLogger.createChildLogger).toHaveBeenCalledWith('BookService');
    });
  });

  describe('searchBooks', () => {
    const mockGoogleBooksResponse: GoogleBooksResponse = {
      items: [
        {
          id: 'book1',
          volumeInfo: {
            title: 'Test Book',
            publishedDate: '2023-01-01',
            description: 'A test book',
            imageLinks: {
              thumbnail: 'http://example.com/book1.jpg'
            },
            authors: ['Test Author']
          }
        },
        {
          id: 'book2',
          volumeInfo: {
            title: 'Another Book',
            publishedDate: '2022-12-01',
            authors: ['Another Author']
          }
        }
      ]
    };

    it('should search books successfully', async () => {
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockResolvedValue(mockGoogleBooksResponse);

      const result = await service.searchBooks('test query');

      expect(mockHandleRequest).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'book1',
        name: 'Test Book',
        year: 2023,
        overview: 'A test book',
        poster: 'http://example.com/book1.jpg',
        authors: 'Test Author',
        type: 'book'
      });
      expect(result[1]).toEqual({
        id: 'book2',
        name: 'Another Book',
        year: 2022,
        overview: 'No description available',
        poster: undefined,
        authors: 'Another Author',
        type: 'book'
      });
    });

    it('should return empty array when no books found', async () => {
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockResolvedValue({});

      const result = await service.searchBooks('nonexistent');

      expect(result).toEqual([]);
      expect(mockLogger.createChildLogger().info).toHaveBeenCalledWith(
        'No books found',
        { query: 'nonexistent' }
      );
    });

    it('should handle search errors gracefully', async () => {
      const error = new Error('API error');
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockRejectedValue(error);

      const result = await service.searchBooks('test');

      expect(result).toEqual([]);
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Book search failed',
        { query: 'test', error }
      );
    });

    it('should handle books without authors', async () => {
      const responseWithoutAuthors: GoogleBooksResponse = {
        items: [{
          id: 'book1',
          volumeInfo: {
            title: 'Test Book'
          }
        }]
      };

      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockResolvedValue(responseWithoutAuthors);

      const result = await service.searchBooks('test');

      expect(result[0].authors).toBe('Unknown');
    });
  });

  describe('searchAudiobooks', () => {
    const mockiTunesResponse: iTunesResponse = {
      results: [
        {
          collectionId: 123,
          collectionName: 'Test Audiobook',
          releaseDate: '2023-01-01T00:00:00Z',
          description: 'A test audiobook',
          artworkUrl100: 'http://example.com/audiobook1.jpg',
          artistName: 'Test Narrator'
        },
        {
          collectionId: 456,
          collectionName: 'Another Audiobook',
          artistName: 'Another Narrator'
        }
      ]
    };

    it('should search audiobooks successfully', async () => {
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockResolvedValue(mockiTunesResponse);

      const result = await service.searchAudiobooks('test query');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '123',
        name: 'Test Audiobook',
        year: 2023,
        overview: 'A test audiobook',
        poster: 'http://example.com/audiobook1.jpg',
        authors: 'Test Narrator',
        type: 'audiobook'
      });
      expect(result[1]).toEqual({
        id: '456',
        name: 'Another Audiobook',
        year: undefined,
        overview: 'By Another Narrator',
        poster: undefined,
        authors: 'Another Narrator',
        type: 'audiobook'
      });
    });

    it('should return empty array when no audiobooks found', async () => {
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockResolvedValue({});

      const result = await service.searchAudiobooks('nonexistent');

      expect(result).toEqual([]);
      expect(mockLogger.createChildLogger().info).toHaveBeenCalledWith(
        'No audiobooks found',
        { query: 'nonexistent' }
      );
    });

    it('should handle search errors gracefully', async () => {
      const error = new Error('API error');
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockRejectedValue(error);

      const result = await service.searchAudiobooks('test');

      expect(result).toEqual([]);
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Audiobook search failed',
        { query: 'test', error }
      );
    });
  });

  describe('searchApplications', () => {
    it('should search applications successfully', async () => {
      const result = await service.searchApplications('visual studio');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'app_0',
        name: 'Visual Studio Code',
        year: undefined,
        overview: 'Development Application',
        poster: undefined,
        authors: 'Various',
        type: 'application'
      });
    });

    it('should return empty array for no matches', async () => {
      const result = await service.searchApplications('nonexistent app');

      expect(result).toEqual([]);
    });

    it('should handle case insensitive search', async () => {
      const result = await service.searchApplications('CHROME');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Chrome');
    });

    it('should handle search errors gracefully', async () => {
      // Force an error by mocking logger to throw
      mockLogger.createChildLogger().info.mockImplementation(() => {
        throw new Error('Logger error');
      });

      const result = await service.searchApplications('test');

      expect(result).toEqual([]);
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Application search failed',
        expect.objectContaining({ query: 'test' })
      );
    });
  });

  describe('searchAll', () => {
    it('should search all media types successfully', async () => {
      const mockSearchBooks = jest.spyOn(service, 'searchBooks')
        .mockResolvedValue([{ id: 'book1', name: 'Test Book', overview: 'test', authors: 'author', type: 'book' }]);
      const mockSearchAudiobooks = jest.spyOn(service, 'searchAudiobooks')
        .mockResolvedValue([{ id: 'audio1', name: 'Test Audio', overview: 'test', authors: 'narrator', type: 'audiobook' }]);
      const mockSearchApplications = jest.spyOn(service, 'searchApplications')
        .mockResolvedValue([{ id: 'app1', name: 'Test App', overview: 'test', authors: 'dev', type: 'application' }]);

      const result = await service.searchAll('test');

      expect(result.books).toHaveLength(1);
      expect(result.audiobooks).toHaveLength(1);
      expect(result.applications).toHaveLength(1);
      expect(mockSearchBooks).toHaveBeenCalledWith('test');
      expect(mockSearchAudiobooks).toHaveBeenCalledWith('test');
      expect(mockSearchApplications).toHaveBeenCalledWith('test');
    });

    it('should handle partial failures gracefully', async () => {
      const mockSearchBooks = jest.spyOn(service, 'searchBooks')
        .mockResolvedValue([{ id: 'book1', name: 'Test Book', overview: 'test', authors: 'author', type: 'book' }]);
      const mockSearchAudiobooks = jest.spyOn(service, 'searchAudiobooks')
        .mockRejectedValue(new Error('Audiobook API failed'));
      const mockSearchApplications = jest.spyOn(service, 'searchApplications')
        .mockResolvedValue([{ id: 'app1', name: 'Test App', overview: 'test', authors: 'dev', type: 'application' }]);

      const result = await service.searchAll('test');

      expect(result.books).toHaveLength(1);
      expect(result.audiobooks).toEqual([]);
      expect(result.applications).toHaveLength(1);
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Audiobooks search failed in searchAll',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should handle complete failure', async () => {
      const error = new Error('Complete failure');
      jest.spyOn(service, 'searchBooks').mockRejectedValue(error);
      jest.spyOn(service, 'searchAudiobooks').mockRejectedValue(error);
      jest.spyOn(service, 'searchApplications').mockRejectedValue(error);

      await expect(service.searchAll('test')).rejects.toThrow('Complete failure');
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Search all failed',
        { query: 'test', error }
      );
    });
  });

  describe('getBookDetails', () => {
    const mockBookDetails = {
      id: 'book1',
      volumeInfo: {
        title: 'Detailed Book',
        publishedDate: '2023-01-01',
        description: 'Detailed description',
        imageLinks: {
          thumbnail: 'http://example.com/detailed.jpg'
        },
        authors: ['Detailed Author']
      }
    };

    it('should get book details successfully', async () => {
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockResolvedValue(mockBookDetails);

      const result = await service.getBookDetails('book1');

      expect(result).toEqual({
        id: 'book1',
        name: 'Detailed Book',
        year: 2023,
        overview: 'Detailed description',
        poster: 'http://example.com/detailed.jpg',
        authors: 'Detailed Author',
        type: 'book'
      });
    });

    it('should return null for failed request', async () => {
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockRejectedValue(new Error('Not found'));

      const result = await service.getBookDetails('nonexistent');

      expect(result).toBeNull();
      expect(mockLogger.createChildLogger().error).toHaveBeenCalledWith(
        'Failed to get book details',
        { bookId: 'nonexistent', error: expect.any(Error) }
      );
    });
  });

  describe('checkHealth', () => {
    it('should return health status for all APIs', async () => {
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockResolvedValue({});

      const result = await service.checkHealth();

      expect(result).toEqual({
        googleBooks: true,
        itunes: true
      });
      expect(mockHandleRequest).toHaveBeenCalledTimes(2);
    });

    it('should handle API failures', async () => {
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockRejectedValue(new Error('API down'));

      const result = await service.checkHealth();

      expect(result).toEqual({
        googleBooks: false,
        itunes: false
      });
      expect(mockLogger.createChildLogger().warn).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed API status', async () => {
      const mockHandleRequest = jest.spyOn(service as any, 'handleRequest')
        .mockResolvedValueOnce({}) // Google Books success
        .mockRejectedValueOnce(new Error('iTunes down')); // iTunes failure

      const result = await service.checkHealth();

      expect(result).toEqual({
        googleBooks: true,
        itunes: false
      });
    });
  });
});