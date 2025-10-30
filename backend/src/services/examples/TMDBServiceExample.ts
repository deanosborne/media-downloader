/**
 * Example usage of the new TMDBService
 */

import { TMDBService, createTMDBService } from '../TMDBService';
import { ConfigManager } from '../../config/ConfigManager';
import { Logger, LogLevel } from '../../utils/Logger';
import { ServiceCache } from '../../utils/ServiceCache';

async function exampleUsage() {
  // Setup dependencies
  const config = new ConfigManager();
  await config.set('tmdb.apiKey', 'your-tmdb-api-key-here');
  
  const logger = new Logger(LogLevel.INFO, 'TMDBExample');
  const cache = new ServiceCache(10 * 60 * 1000); // 10 minutes cache

  // Create service instance
  const tmdbService = new TMDBService(config, logger, cache);

  // Alternative: Use convenience function
  // const tmdbService = createTMDBService(config, logger, cache);

  try {
    // Search for movies
    console.log('Searching for movies...');
    const movieResults = await tmdbService.searchMedia('The Matrix', 'Movie');
    console.log(`Found ${movieResults.length} movies:`, movieResults.slice(0, 3));

    // Search for TV shows
    console.log('\nSearching for TV shows...');
    const tvResults = await tmdbService.searchMedia('Breaking Bad', 'TV Show');
    console.log(`Found ${tvResults.length} TV shows:`, tvResults.slice(0, 3));

    // Get TV show details
    if (tvResults.length > 0) {
      console.log('\nGetting TV show details...');
      const tvDetails = await tmdbService.getTVShowDetails(tvResults[0].id);
      console.log('TV Show Details:', {
        name: tvDetails.name,
        seasons: tvDetails.number_of_seasons,
        episodes: tvDetails.number_of_episodes
      });

      // Get season details
      if (tvDetails.seasons.length > 0) {
        console.log('\nGetting season details...');
        const seasonDetails = await tmdbService.getSeasonDetails(tvDetails.id, 1);
        console.log('Season 1 Details:', {
          name: seasonDetails.name,
          episodes: seasonDetails.episodes.length
        });

        // Get episode details
        if (seasonDetails.episodes.length > 0) {
          console.log('\nGetting episode details...');
          const episodeDetails = await tmdbService.getEpisodeDetails(tvDetails.id, 1, 1);
          console.log('Episode 1 Details:', {
            name: episodeDetails.name,
            runtime: episodeDetails.runtime
          });
        }
      }
    }

    // Demonstrate caching
    console.log('\nDemonstrating cache...');
    const start1 = Date.now();
    await tmdbService.searchMedia('The Matrix', 'Movie');
    const duration1 = Date.now() - start1;

    const start2 = Date.now();
    await tmdbService.searchMedia('The Matrix', 'Movie'); // Should be cached
    const duration2 = Date.now() - start2;

    console.log(`First request: ${duration1}ms, Second request (cached): ${duration2}ms`);

    // Get cache statistics
    const cacheStats = tmdbService.getCacheStats();
    console.log('Cache stats:', cacheStats);

  } catch (error) {
    console.error('Error occurred:', error);
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  exampleUsage().catch(console.error);
}

export { exampleUsage };