/**
 * Example usage of RealDebridService
 * This file demonstrates how to use the refactored Real-Debrid service
 */

import { RealDebridService } from '../realDebridService.js';
import { ConfigManager } from '../../config/ConfigManager.js';
import { Logger } from '../../utils/Logger.js';
import { ServiceFactory } from '../ServiceFactory.js';

// Example 1: Basic service initialization
async function basicUsageExample() {
  console.log('=== Basic Real-Debrid Service Usage ===');

  // Initialize dependencies
  const config = new ConfigManager();
  const logger = new Logger();

  // Create service instance
  const realDebridService = new RealDebridService(config, logger, {
    timeout: 30000,
    retries: 3
  });

  try {
    // Get user information
    const userInfo = await realDebridService.getUserInfo();
    console.log('User Info:', {
      username: userInfo.username,
      premium: userInfo.premium,
      expiration: userInfo.expiration
    });

    // Get all torrents
    const torrents = await realDebridService.getAllTorrents();
    console.log(`Found ${torrents.length} torrents`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: Adding and managing torrents
async function torrentManagementExample() {
  console.log('=== Torrent Management Example ===');

  const config = new ConfigManager();
  const logger = new Logger();
  const service = new RealDebridService(config, logger);

  // Example magnet link (Big Buck Bunny - public domain)
  const magnetLink = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny';

  try {
    // Add magnet link
    console.log('Adding magnet link...');
    const addResponse = await service.addMagnet(magnetLink);
    console.log('Torrent added:', addResponse.id);

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get torrent info
    const torrentInfo = await service.getTorrentInfo(addResponse.id);
    console.log('Torrent status:', torrentInfo.status);
    console.log('Torrent progress:', torrentInfo.progress + '%');

    // Select files (if in waiting_files_selection status)
    if (torrentInfo.status === 'waiting_files_selection') {
      console.log('Selecting files...');
      await service.selectFiles(addResponse.id);
      console.log('Files selected');
    }

    // Monitor progress
    console.log('Starting progress monitoring...');
    await service.monitorTorrent(addResponse.id, {
      pollInterval: 3000,
      onProgress: (progress) => {
        console.log(`Progress: ${progress.progress}% - Status: ${progress.status}`);
        if (progress.speed) {
          console.log(`Speed: ${(progress.speed / 1024 / 1024).toFixed(2)} MB/s`);
        }
      },
      onComplete: (torrent) => {
        console.log('Download completed!', torrent.filename);
      },
      onError: (error) => {
        console.error('Download error:', error.message);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 3: Download management with the DownloadManager interface
async function downloadManagerExample() {
  console.log('=== Download Manager Example ===');

  const config = new ConfigManager();
  const logger = new Logger();
  const service = new RealDebridService(config, logger);

  const magnetLink = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny';
  const outputPath = '/downloads/big-buck-bunny.mkv';

  try {
    // Add download task
    console.log('Creating download task...');
    const task = await service.addDownload(magnetLink, outputPath);
    console.log('Download task created:', {
      id: task.id,
      filename: task.filename,
      status: task.status
    });

    // Get task info
    const retrievedTask = await service.getDownload(task.id);
    console.log('Retrieved task:', retrievedTask?.status);

    // Get all downloads
    const allDownloads = await service.getAllDownloads();
    console.log(`Total downloads: ${allDownloads.length}`);

    // Start monitoring all downloads
    service.monitorDownloads();

    // Listen for events
    service.on('download:progress', (progress) => {
      console.log(`Download progress: ${progress.filename} - ${progress.progress}%`);
    });

    service.on('download:complete', (torrent) => {
      console.log(`Download completed: ${torrent.filename}`);
    });

    service.on('download:error', (error) => {
      console.error(`Download error: ${error.message}`);
    });

    // Simulate some time passing
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Stop monitoring
    service.stopMonitoring();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 4: Using ServiceFactory
async function serviceFactoryExample() {
  console.log('=== Service Factory Example ===');

  const config = new ConfigManager();
  const logger = new Logger();

  // Get service factory instance
  const serviceFactory = ServiceFactory.getInstance(config, logger);

  // Get Real-Debrid service from factory
  const realDebridService = serviceFactory.getRealDebridService();

  try {
    const userInfo = await realDebridService.getUserInfo();
    console.log('User from factory:', userInfo.username);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 5: Link unrestriction
async function linkUnrestrictionExample() {
  console.log('=== Link Unrestriction Example ===');

  const config = new ConfigManager();
  const logger = new Logger();
  const service = new RealDebridService(config, logger);

  // Example: First add a torrent, then unrestrict its links
  const magnetLink = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny';

  try {
    // Add and process torrent
    const addResponse = await service.addMagnet(magnetLink);
    await service.selectFiles(addResponse.id);

    // Wait for download to complete (in real scenario)
    // For demo, we'll just show how to unrestrict a link
    console.log('Torrent added and files selected');

    // Get torrent info to check for download links
    const torrentInfo = await service.getTorrentInfo(addResponse.id);
    
    if (torrentInfo.links && torrentInfo.links.length > 0) {
      console.log('Unrestricting download link...');
      const unrestrictedLink = await service.unrestrict(torrentInfo.links[0]);
      
      console.log('Unrestricted link info:', {
        filename: unrestrictedLink.filename,
        filesize: (unrestrictedLink.filesize / 1024 / 1024).toFixed(2) + ' MB',
        downloadUrl: unrestrictedLink.download
      });

      // Now you could download the file
      // await service.downloadFile(unrestrictedLink.download, '/path/to/save/file');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 6: Error handling
async function errorHandlingExample() {
  console.log('=== Error Handling Example ===');

  const config = new ConfigManager();
  const logger = new Logger();
  const service = new RealDebridService(config, logger);

  try {
    // Try to get info for non-existent torrent
    await service.getTorrentInfo('non-existent-id');
  } catch (error) {
    console.log('Caught expected error:', error.constructor.name);
    console.log('Error message:', error.message);
  }

  try {
    // Try to unrestrict invalid link
    await service.unrestrict('https://invalid-link.com/file.zip');
  } catch (error) {
    console.log('Caught expected error:', error.constructor.name);
    console.log('Error message:', error.message);
  }
}

// Run examples
async function runExamples() {
  console.log('Real-Debrid Service Examples');
  console.log('============================');

  // Note: These examples require a valid Real-Debrid API key
  // Set REAL_DEBRID_API_KEY environment variable before running

  if (!process.env.REAL_DEBRID_API_KEY) {
    console.log('Please set REAL_DEBRID_API_KEY environment variable to run examples');
    return;
  }

  try {
    await basicUsageExample();
    console.log('\n');
    
    await serviceFactoryExample();
    console.log('\n');
    
    await errorHandlingExample();
    console.log('\n');

    // Uncomment to run more intensive examples
    // await torrentManagementExample();
    // await downloadManagerExample();
    // await linkUnrestrictionExample();

  } catch (error) {
    console.error('Example error:', error.message);
  }
}

// Export for use in other files
export {
  basicUsageExample,
  torrentManagementExample,
  downloadManagerExample,
  serviceFactoryExample,
  linkUnrestrictionExample,
  errorHandlingExample,
  runExamples
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}