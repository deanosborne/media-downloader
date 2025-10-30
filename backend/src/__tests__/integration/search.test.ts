import { IntegrationTestSetup, testHelpers } from './setup.js';

describe('Search API Integration Tests', () => {
  let setup: IntegrationTestSetup;

  beforeAll(async () => {
    setup = IntegrationTestSetup.getInstance();
    await setup.setup();
  });

  afterAll(async () => {
    await setup.teardown();
  });

  describe('GET /api/search', () => {
    it('should search for movies', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        {
          data: {
            results: [
              {
                id: 603,
                title: 'The Matrix',
                release_date: '1999-03-31',
                overview: 'A computer hacker learns from mysterious rebels...',
                poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
                media_type: 'movie'
              },
              {
                id: 604,
                title: 'The Matrix Reloaded',
                release_date: '2003-05-15',
                overview: 'Six months after the events depicted in The Matrix...',
                poster_path: '/9TGHDvWrqKBzwDxDodHYXEmOE6J.jpg',
                media_type: 'movie'
              }
            ]
          }
        }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/search?query=matrix&type=movie')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        
        const firstResult = response.body.data[0];
        expect(firstResult).toMatchObject({
          id: 603,
          name: 'The Matrix',
          year: 1999,
          type: 'movie',
          overview: expect.any(String),
          poster: expect.stringContaining('poster_path')
        });
      } finally {
        restoreMocks();
      }
    });

    it('should search for TV shows', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        {
          data: {
            results: [
              {
                id: 1396,
                name: 'Breaking Bad',
                first_air_date: '2008-01-20',
                overview: 'A high school chemistry teacher diagnosed with inoperable lung cancer...',
                poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
                media_type: 'tv'
              }
            ]
          }
        }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/search?query=breaking%20bad&type=tv_show')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        
        const result = response.body.data[0];
        expect(result).toMatchObject({
          id: 1396,
          name: 'Breaking Bad',
          year: 2008,
          type: 'tv_show'
        });
      } finally {
        restoreMocks();
      }
    });

    it('should search for books', async () => {
      const restoreMocks = testHelpers.mockExternalService('googleBooks', [
        {
          data: {
            items: [
              {
                id: 'book123',
                volumeInfo: {
                  title: 'The Great Gatsby',
                  authors: ['F. Scott Fitzgerald'],
                  publishedDate: '1925',
                  description: 'A classic American novel...',
                  imageLinks: {
                    thumbnail: 'http://books.google.com/books/content?id=book123&printsec=frontcover&img=1&zoom=1'
                  }
                }
              }
            ]
          }
        }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/search?query=great%20gatsby&type=book')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        
        const result = response.body.data[0];
        expect(result).toMatchObject({
          id: 'book123',
          name: 'The Great Gatsby',
          type: 'book',
          authors: 'F. Scott Fitzgerald'
        });
      } finally {
        restoreMocks();
      }
    });

    it('should perform multi-search when no type specified', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        {
          data: {
            results: [
              {
                id: 603,
                title: 'The Matrix',
                release_date: '1999-03-31',
                media_type: 'movie'
              },
              {
                id: 1396,
                name: 'Breaking Bad',
                first_air_date: '2008-01-20',
                media_type: 'tv'
              }
            ]
          }
        }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/search?query=matrix')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
        // Should contain mixed media types
        const types = response.body.data.map((item: any) => item.type);
        expect(types).toContain('movie');
      } finally {
        restoreMocks();
      }
    });

    it('should validate search query parameter', async () => {
      const response = await setup.getRequest()
        .get('/api/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('ValidationError');
      expect(response.body.error.message).toContain('query');
    });

    it('should handle empty search results', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        { data: { results: [] } }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/search?query=nonexistentmovie12345')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(0);
      } finally {
        restoreMocks();
      }
    });

    it('should handle external service errors gracefully', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        { ok: false, status: 500, data: { error: 'Internal Server Error' } }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/search?query=matrix&type=movie')
          .expect(502);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('ExternalServiceError');
      } finally {
        restoreMocks();
      }
    });

    it('should support pagination', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        {
          data: {
            results: Array.from({ length: 20 }, (_, i) => ({
              id: i + 1,
              title: `Movie ${i + 1}`,
              release_date: '2023-01-01',
              media_type: 'movie'
            })),
            page: 1,
            total_pages: 5,
            total_results: 100
          }
        }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/search?query=movie&page=1&limit=10')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(10);
        expect(response.body.meta.pagination).toMatchObject({
          page: 1,
          limit: 10,
          totalPages: expect.any(Number)
        });
      } finally {
        restoreMocks();
      }
    });
  });

  describe('GET /api/media/:id', () => {
    it('should get movie details', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        {
          data: {
            id: 603,
            title: 'The Matrix',
            release_date: '1999-03-31',
            runtime: 136,
            genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Science Fiction' }],
            overview: 'A computer hacker learns from mysterious rebels...',
            poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
            backdrop_path: '/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg',
            vote_average: 8.2,
            vote_count: 18040
          }
        }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/media/603?type=movie')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: 603,
          name: 'The Matrix',
          year: 1999,
          type: 'movie',
          runtime: 136,
          genres: ['Action', 'Science Fiction'],
          rating: 8.2
        });
      } finally {
        restoreMocks();
      }
    });

    it('should get TV show details with seasons', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        {
          data: {
            id: 1396,
            name: 'Breaking Bad',
            first_air_date: '2008-01-20',
            last_air_date: '2013-09-29',
            number_of_seasons: 5,
            number_of_episodes: 62,
            seasons: [
              {
                id: 3572,
                season_number: 1,
                name: 'Season 1',
                episode_count: 7,
                air_date: '2008-01-20'
              },
              {
                id: 3573,
                season_number: 2,
                name: 'Season 2',
                episode_count: 13,
                air_date: '2009-03-08'
              }
            ]
          }
        }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/media/1396?type=tv_show')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: 1396,
          name: 'Breaking Bad',
          type: 'tv_show',
          numberOfSeasons: 5,
          numberOfEpisodes: 62,
          seasons: expect.arrayContaining([
            expect.objectContaining({
              seasonNumber: 1,
              episodeCount: 7
            })
          ])
        });
      } finally {
        restoreMocks();
      }
    });

    it('should return 404 for non-existent media', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        { ok: false, status: 404, data: { status_message: 'The resource you requested could not be found.' } }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/media/999999?type=movie')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('NotFoundError');
      } finally {
        restoreMocks();
      }
    });
  });

  describe('GET /api/media/:id/season/:seasonNumber', () => {
    it('should get season details with episodes', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        {
          data: {
            id: 3572,
            season_number: 1,
            name: 'Season 1',
            overview: 'The first season of Breaking Bad...',
            air_date: '2008-01-20',
            episodes: [
              {
                id: 62085,
                episode_number: 1,
                name: 'Pilot',
                overview: 'Walter White, a struggling high school chemistry teacher...',
                air_date: '2008-01-20',
                runtime: 58
              },
              {
                id: 62086,
                episode_number: 2,
                name: 'Cat\'s in the Bag...',
                overview: 'Walt and Jesse attempt to tie up loose ends...',
                air_date: '2008-01-27',
                runtime: 48
              }
            ]
          }
        }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/media/1396/season/1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          seasonNumber: 1,
          name: 'Season 1',
          episodes: expect.arrayContaining([
            expect.objectContaining({
              episodeNumber: 1,
              name: 'Pilot',
              runtime: 58
            }),
            expect.objectContaining({
              episodeNumber: 2,
              name: 'Cat\'s in the Bag...',
              runtime: 48
            })
          ])
        });
      } finally {
        restoreMocks();
      }
    });
  });

  describe('GET /api/torrents/search', () => {
    it('should search for torrents via Jackett', async () => {
      const restoreMocks = testHelpers.mockExternalService('jackett', [
        {
          data: {
            Results: [
              {
                Title: 'The Matrix 1999 1080p BluRay x264-GROUP',
                Link: 'magnet:?xt=urn:btih:...',
                Size: 2147483648,
                Seeders: 150,
                Peers: 25,
                CategoryDesc: 'Movies'
              },
              {
                Title: 'The Matrix 1999 720p BluRay x264-GROUP',
                Link: 'magnet:?xt=urn:btih:...',
                Size: 1073741824,
                Seeders: 89,
                Peers: 12,
                CategoryDesc: 'Movies'
              }
            ]
          }
        }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/torrents/search?query=The%20Matrix%201999')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        
        const firstResult = response.body.data[0];
        expect(firstResult).toMatchObject({
          name: expect.stringContaining('Matrix'),
          magnet: expect.stringContaining('magnet:'),
          size: expect.any(Number),
          seeders: expect.any(Number),
          peers: expect.any(Number)
        });
      } finally {
        restoreMocks();
      }
    });

    it('should filter torrents by quality', async () => {
      const restoreMocks = testHelpers.mockExternalService('jackett', [
        {
          data: {
            Results: [
              {
                Title: 'Movie 2160p UHD BluRay x265-GROUP',
                Link: 'magnet:?xt=urn:btih:...',
                Size: 4294967296,
                Seeders: 50,
                Peers: 10
              },
              {
                Title: 'Movie 1080p BluRay x264-GROUP',
                Link: 'magnet:?xt=urn:btih:...',
                Size: 2147483648,
                Seeders: 150,
                Peers: 25
              },
              {
                Title: 'Movie 720p BluRay x264-GROUP',
                Link: 'magnet:?xt=urn:btih:...',
                Size: 1073741824,
                Seeders: 89,
                Peers: 12
              }
            ]
          }
        }
      ]);

      try {
        const response = await setup.getRequest()
          .get('/api/torrents/search?query=Movie&quality=1080p')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
        // Should prioritize 1080p results
        const firstResult = response.body.data[0];
        expect(firstResult.name).toContain('1080p');
      } finally {
        restoreMocks();
      }
    });
  });
});