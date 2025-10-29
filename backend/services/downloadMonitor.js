import chokidar from 'chokidar';
import path from 'path';
import { dbRun, dbGet } from '../database.js';
import { moveToPlexLibrary } from './plexService.js';
import dotenv from 'dotenv';

dotenv.config();

export const startDownloadMonitor = () => {
  const downloadPath = process.env.DOWNLOAD_PATH;
  
  const watcher = chokidar.watch(downloadPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 5000,
      pollInterval: 1000
    }
  });

  watcher.on('add', async (filePath) => {
    console.log(`File detected: ${filePath}`);
    
    try {
      const fileName = path.basename(filePath);
      
      // Find matching queue item
      const queueItem = await dbGet(
        'SELECT * FROM queue WHERE status = ? AND torrent_name LIKE ?',
        ['in_progress', `%${fileName.split('.')[0]}%`]
      );

      if (queueItem) {
        // Move to Plex library
        const newPath = await moveToPlexLibrary(
          filePath,
          queueItem.type,
          queueItem.name,
          queueItem.year
        );

        // Update queue status
        await dbRun(
          'UPDATE queue SET status = ?, progress = ?, file_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['completed', 100, newPath, queueItem.id]
        );

        console.log(`Completed: ${queueItem.name}`);
      }
    } catch (error) {
      console.error('Download monitor error:', error.message);
    }
  });

  console.log(`Watching downloads at: ${downloadPath}`);
};
