import { IntegrationTestSetup, TestDataFactory, testHelpers } from './setup.js';

describe('End-to-End API Integration Tests', () => {
  let setup: IntegrationTestSetup;

  beforeAll(async () => {
    setup = IntegrationTestSetup.getInstance();
    await setup.setup();
  });

  afterAll(async () => {
    await setup.teardown();
  });

  beforeEach(async () => {
    await setup.resetDatabase();
  });

  describe('Complete Movie Download Workflow', () => {
    it('should handle complete movie download workflow', async () => {
      // Mock external services
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        // Search response
        {
          data: {
            results: [
              {
                id: 603,
                title: 'The Matrix',
                release_date: '1999-03-31',
                overview: 'A computer hacker learns...',
                poster_path: '/poster.jpg',
                media_type: 'movie'
              }
            ]
          }
        },
        // Movie details response
        {
          data: {
            id: 603,
            title: 'The Matrix',
            release_date: '1999-03-31',
            runtime: 136,
            genres: [{ name: 'Action' }, { name: 'Sci-Fi' }]
          }
        }
      ]);

      const restoreJackettMocks = testHelpers.mockExternalService('jackett', [
        {
          data: {
            Results: [
              {
                Title: 'The Matrix 1999 1080p BluRay x264-GROUP',
                Link: 'magnet:?xt=urn:btih:abc123',
                Size: 2147483648,
                Seeders: 150,
                Peers: 25
              }
            ]
          }
        }
      ]);

      try {
        // 1. Search for movie
        const searchResponse = await setup.getRequest()
          .get('/api/search?query=matrix&type=movie')
          .expect(200);

        expect(searchResponse.body.data).toHaveLength(1);
        const movie = searchResponse.body.data[0];

        // 2. Get movie details
        const detailsResponse = await setup.getRequest()
          .get(`/api/media/${movie.id}?type=movie`)
          .expect(200);

        expect(detailsResponse.body.data.runtime).toBe(136);

        // 3. Search for torrents
        const torrentResponse = await setup.getRequest()
          .get(`/api/torrents/search?query=${encodeURIComponent('The Matrix 1999')}`)
          .expect(200);

        expect(torrentResponse.body.data).toHaveLength(1);
        const torrent = torrentResponse.body.data[0];

        // 4. Add to queue
        const queueResponse = await setup.getRequest()
          .post('/api/queue')
          .send({
            name: movie.name,
            type: 'movie',
            year: movie.year,
            tmdbId: movie.id,
            magnet: torrent.magnet,
            size: torrent.size
          })
          .expect(201);

        const queueItem = queueResponse.body.data;
        expect(queueItem.status).toBe('not_started');

        // 5. Start download (simulate)
        await setup.getRequest()
          .put(`/api/queue/${queueItem.id}`)
          .send({ status: 'in_progress', progress: 0 })
          .expect(200);

        // 6. Update progress
        await setup.getRequest()
          .put(`/api/queue/${queueItem.id}`)
          .send({ 
            progress: 50, 
            downloadSpeed: '5.2 MB/s',
            eta: '00:15:30'
          })
          .expect(200);

        // 7. Complete download
        const completedResponse = await setup.getRequest()
          .put(`/api/queue/${queueItem.id}`)
          .send({ 
            status: 'completed', 
            progress: 100,
            completedAt: new Date().toISOString(),
            filePath: '/downloads/The.Matrix.1999.1080p.BluRay.x264-GROUP.mkv'
          })
          .expect(200);

        expect(completedResponse.body.data.status).toBe('completed');
        expect(completedResponse.body.data.progress).toBe(100);

        // 8. Verify final state
        const finalResponse = await setup.getRequest()
          .get(`/api/queue/${queueItem.id}`)
          .expect(200);

        expect(finalResponse.body.data).toMatchObject({
          status: 'completed',
          progress: 100,
          filePath: '/downloads/The.Matrix.1999.1080p.BluRay.x264-GROUP.mkv'
        });

      } finally {
        restoreMocks();
        restoreJackettMocks();
      }
    });
  });

  describe('Complete TV Show Download Workflow', () => {
    it('should handle TV show season download workflow', async () => {
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        // Search response
        {
          data: {
            results: [
              {
                id: 1396,
                name: 'Breaking Bad',
                first_air_date: '2008-01-20',
                media_type: 'tv'
              }
            ]
          }
        },
        // TV show details
        {
          data: {
            id: 1396,
            name: 'Breaking Bad',
            number_of_seasons: 5,
            seasons: [
              {
                id: 3572,
                season_number: 1,
                episode_count: 7,
                air_date: '2008-01-20'
              }
            ]
          }
        },
        // Season details
        {
          data: {
            id: 3572,
            season_number: 1,
            episodes: [
              {
                id: 62085,
                episode_number: 1,
                name: 'Pilot',
                air_date: '2008-01-20'
              },
              {
                id: 62086,
                episode_number: 2,
                name: 'Cat\'s in the Bag...',
                air_date: '2008-01-27'
              }
            ]
          }
        }
      ]);

      try {
        // 1. Search for TV show
        const searchResponse = await setup.getRequest()
          .get('/api/search?query=breaking%20bad&type=tv_show')
          .expect(200);

        const tvShow = searchResponse.body.data[0];

        // 2. Get TV show details
        const detailsResponse = await setup.getRequest()
          .get(`/api/media/${tvShow.id}?type=tv_show`)
          .expect(200);

        expect(detailsResponse.body.data.numberOfSeasons).toBe(5);

        // 3. Get season details
        const seasonResponse = await setup.getRequest()
          .get(`/api/media/${tvShow.id}/season/1`)
          .expect(200);

        expect(seasonResponse.body.data.episodes).toHaveLength(2);

        // 4. Add season pack to queue
        const queueResponse = await setup.getRequest()
          .post('/api/queue')
          .send({
            name: `${tvShow.name} Season 1`,
            type: 'tv_show',
            year: tvShow.year,
            tmdbId: tvShow.id,
            season: 1,
            isSeasonPack: true
          })
          .expect(201);

        const queueItem = queueResponse.body.data;
        expect(queueItem.isSeasonPack).toBe(true);
        expect(queueItem.season).toBe(1);

        // 5. Process season pack (simulate extracting episodes)
        const episodes = seasonResponse.body.data.episodes;
        for (const episode of episodes) {
          await setup.getRequest()
            .post('/api/queue')
            .send({
              name: `${tvShow.name} S01E${episode.episodeNumber.toString().padStart(2, '0')}`,
              type: 'tv_show',
              year: tvShow.year,
              tmdbId: tvShow.id,
              season: 1,
              episode: episode.episodeNumber,
              episodeName: episode.name,
              parentId: queueItem.id
            })
            .expect(201);
        }

        // 6. Verify all episodes were added
        const allQueueResponse = await setup.getRequest()
          .get('/api/queue')
          .expect(200);

        const episodeItems = allQueueResponse.body.data.filter(
          (item: any) => item.parentId === queueItem.id
        );
        expect(episodeItems).toHaveLength(2);

      } finally {
        restoreMocks();
      }
    });
  });

  describe('Configuration and Service Integration', () => {
    it('should handle service configuration and testing', async () => {
      // 1. Set up TMDB configuration
      await setup.getRequest()
        .put('/api/config/tmdb.apiKey')
        .send({ value: 'test-api-key' })
        .expect(200);

      // 2. Test TMDB connection
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      try {
        const connectionResponse = await setup.getRequest()
          .post('/api/config/test-connection')
          .send({ service: 'tmdb' })
          .expect(200);

        expect(connectionResponse.body.data.connected).toBe(true);

        // 3. Validate all configuration
        const validationResponse = await setup.getRequest()
          .post('/api/config/validate')
          .expect(200);

        expect(validationResponse.body.data.valid).toBe(true);

      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle download failures and retries', async () => {
      // 1. Add item to queue
      const queueItem = await testHelpers.createQueueItem(setup, {
        name: 'Failing Movie',
        status: 'not_started'
      });

      // 2. Simulate download failure
      await setup.getRequest()
        .put(`/api/queue/${queueItem.id}`)
        .send({ 
          status: 'error',
          error: 'Download failed: Connection timeout',
          retryCount: 1
        })
        .expect(200);

      // 3. Retry download
      await setup.getRequest()
        .put(`/api/queue/${queueItem.id}`)
        .send({ 
          status: 'not_started',
          error: null,
          retryCount: 1
        })
        .expect(200);

      // 4. Verify retry state
      const retryResponse = await setup.getRequest()
        .get(`/api/queue/${queueItem.id}`)
        .expect(200);

      expect(retryResponse.body.data.status).toBe('not_started');
      expect(retryResponse.body.data.retryCount).toBe(1);
    });

    it('should handle external service failures gracefully', async () => {
      // Mock failing external service
      const restoreMocks = testHelpers.mockExternalService('tmdb', [
        { ok: false, status: 503, data: { error: 'Service Unavailable' } }
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
  });

  describe('Bulk Operations', () => {
    it('should handle bulk queue operations efficiently', async () => {
      const movies = [
        { name: 'Movie 1', tmdbId: 1 },
        { name: 'Movie 2', tmdbId: 2 },
        { name: 'Movie 3', tmdbId: 3 },
        { name: 'Movie 4', tmdbId: 4 },
        { name: 'Movie 5', tmdbId: 5 }
      ];

      const bulkData = movies.map(movie => 
        TestDataFactory.createQueueItem(movie)
      );

      // 1. Bulk add to queue
      const bulkResponse = await setup.getRequest()
        .post('/api/queue/bulk')
        .send({ items: bulkData })
        .expect(201);

      expect(bulkResponse.body.data).toHaveLength(5);

      // 2. Bulk status update
      const queueIds = bulkResponse.body.data.map((item: any) => item.id);
      
      await setup.getRequest()
        .put('/api/queue/bulk')
        .send({ 
          ids: queueIds,
          updates: { status: 'in_progress' }
        })
        .expect(200);

      // 3. Verify bulk update
      const updatedResponse = await setup.getRequest()
        .get('/api/queue')
        .expect(200);

      const allInProgress = updatedResponse.body.data.every(
        (item: any) => item.status === 'in_progress'
      );
      expect(allInProgress).toBe(true);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = [];

      // Create concurrent search requests
      for (let i = 0; i < concurrentRequests; i++) {
        const mockRestore = testHelpers.mockExternalService('tmdb', [
          {
            data: {
              results: [
                {
                  id: i,
                  title: `Movie ${i}`,
                  release_date: '2023-01-01',
                  media_type: 'movie'
                }
              ]
            }
          }
        ]);

        requests.push(
          setup.getRequest()
            .get(`/api/search?query=movie${i}&type=movie`)
            .expect(200)
            .then(response => {
              mockRestore();
              return response;
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      console.log(`${concurrentRequests} concurrent requests completed in ${duration}ms`);
      
      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach((response, index) => {
        expect(response.body.success).toBe(true);
        expect(response.body.data[0].name).toBe(`Movie ${index}`);
      });
    });
  });
});