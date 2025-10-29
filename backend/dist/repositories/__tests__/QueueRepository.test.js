/**
 * Integration tests for QueueRepository
 */
import sqlite3 from 'sqlite3';
import { QueueRepository } from '../QueueRepository.js';
import { DatabaseConnection } from '../DatabaseConnection.js';
import { MediaType, QueueStatus } from '../../models/QueueItem.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
describe('QueueRepository', () => {
    let db;
    let connection;
    let repository;
    let testDbPath;
    beforeEach(async () => {
        // Create a temporary test database
        testDbPath = path.join(os.tmpdir(), `queue_test_${Date.now()}.db`);
        db = new sqlite3.Database(testDbPath);
        connection = new DatabaseConnection(db);
        repository = new QueueRepository(connection);
        // Create the queue table
        await connection.run(`
      CREATE TABLE queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        year INTEGER,
        tmdb_id INTEGER,
        season INTEGER,
        episode INTEGER,
        episode_name TEXT,
        is_season_pack INTEGER DEFAULT 0,
        status TEXT DEFAULT 'not_started',
        torrent_name TEXT,
        torrent_link TEXT,
        torrent_id TEXT,
        real_debrid_id TEXT,
        progress INTEGER DEFAULT 0,
        error TEXT,
        file_path TEXT,
        download_speed TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    });
    afterEach(async () => {
        // Close database and clean up
        await new Promise((resolve) => {
            db.close(() => resolve());
        });
        try {
            await fs.unlink(testDbPath);
        }
        catch (error) {
            // Ignore cleanup errors
        }
    });
    describe('createQueueItem', () => {
        it('should create a movie queue item', async () => {
            const movieData = {
                type: MediaType.MOVIE,
                name: 'Test Movie',
                year: 2023,
                tmdbId: 12345
            };
            const created = await repository.createQueueItem(movieData);
            expect(created.id).toBeGreaterThan(0);
            expect(created.type).toBe(MediaType.MOVIE);
            expect(created.name).toBe('Test Movie');
            expect(created.year).toBe(2023);
            expect(created.tmdbId).toBe(12345);
            expect(created.status).toBe(QueueStatus.NOT_STARTED);
            expect(created.progress).toBe(0);
            expect(created.isSeasonPack).toBe(false);
        });
        it('should create a TV show episode queue item', async () => {
            const tvData = {
                type: MediaType.TV_SHOW,
                name: 'Test TV Show',
                year: 2023,
                tmdbId: 67890,
                season: 1,
                episode: 5,
                episodeName: 'Test Episode'
            };
            const created = await repository.createQueueItem(tvData);
            expect(created.type).toBe(MediaType.TV_SHOW);
            expect(created.season).toBe(1);
            expect(created.episode).toBe(5);
            expect(created.episodeName).toBe('Test Episode');
        });
        it('should create a season pack queue item', async () => {
            const seasonData = {
                type: MediaType.TV_SHOW,
                name: 'Test TV Show Season 1',
                year: 2023,
                tmdbId: 67890,
                season: 1,
                isSeasonPack: true
            };
            const created = await repository.createQueueItem(seasonData);
            expect(created.isSeasonPack).toBe(true);
            expect(created.episode).toBeUndefined();
        });
        it('should throw error for missing required fields', async () => {
            await expect(repository.createQueueItem({
                type: MediaType.MOVIE,
                name: ''
            })).rejects.toThrow('Name and type are required');
        });
        it('should throw error for TV episode without season/episode', async () => {
            await expect(repository.createQueueItem({
                type: MediaType.TV_SHOW,
                name: 'Test TV Show'
            })).rejects.toThrow('Season and episode are required for TV show episodes');
        });
    });
    describe('findByStatus', () => {
        it('should find items by status', async () => {
            await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Movie 1'
            });
            const item2 = await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Movie 2'
            });
            await repository.updateStatus(item2.id, QueueStatus.IN_PROGRESS);
            const notStarted = await repository.findByStatus(QueueStatus.NOT_STARTED);
            const inProgress = await repository.findByStatus(QueueStatus.IN_PROGRESS);
            expect(notStarted).toHaveLength(1);
            expect(notStarted[0]?.name).toBe('Movie 1');
            expect(inProgress).toHaveLength(1);
            expect(inProgress[0]?.name).toBe('Movie 2');
        });
    });
    describe('findByType', () => {
        it('should find items by media type', async () => {
            await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Test Movie'
            });
            await repository.createQueueItem({
                type: MediaType.BOOK,
                name: 'Test Book'
            });
            const movies = await repository.findByType(MediaType.MOVIE);
            const books = await repository.findByType(MediaType.BOOK);
            expect(movies).toHaveLength(1);
            expect(movies[0]?.name).toBe('Test Movie');
            expect(books).toHaveLength(1);
            expect(books[0]?.name).toBe('Test Book');
        });
    });
    describe('findByTmdbId', () => {
        it('should find items by TMDB ID', async () => {
            const tmdbId = 12345;
            await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Movie 1',
                tmdbId
            });
            await repository.createQueueItem({
                type: MediaType.TV_SHOW,
                name: 'TV Show',
                tmdbId,
                season: 1,
                episode: 1
            });
            const items = await repository.findByTmdbId(tmdbId);
            expect(items).toHaveLength(2);
            expect(items.every(item => item.tmdbId === tmdbId)).toBe(true);
        });
    });
    describe('findEpisodesBySeason', () => {
        it('should find TV episodes by season', async () => {
            const tmdbId = 67890;
            const season = 1;
            await repository.createQueueItem({
                type: MediaType.TV_SHOW,
                name: 'TV Show',
                tmdbId,
                season,
                episode: 1,
                episodeName: 'Episode 1'
            });
            await repository.createQueueItem({
                type: MediaType.TV_SHOW,
                name: 'TV Show',
                tmdbId,
                season,
                episode: 3,
                episodeName: 'Episode 3'
            });
            await repository.createQueueItem({
                type: MediaType.TV_SHOW,
                name: 'TV Show',
                tmdbId,
                season: 2,
                episode: 1,
                episodeName: 'Season 2 Episode 1'
            });
            const episodes = await repository.findEpisodesBySeason(tmdbId, season);
            expect(episodes).toHaveLength(2);
            expect(episodes[0]?.episode).toBe(1);
            expect(episodes[1]?.episode).toBe(3);
            expect(episodes.every(ep => ep.season === season)).toBe(true);
        });
    });
    describe('updateProgress', () => {
        it('should update progress and download speed', async () => {
            const item = await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Test Movie'
            });
            const updated = await repository.updateProgress(item.id, 50, '10 MB/s');
            expect(updated.progress).toBe(50);
            expect(updated.downloadSpeed).toBe('10 MB/s');
        });
    });
    describe('updateStatus', () => {
        it('should update status and error', async () => {
            const item = await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Test Movie'
            });
            const updated = await repository.updateStatus(item.id, QueueStatus.ERROR, 'Download failed');
            expect(updated.status).toBe(QueueStatus.ERROR);
            expect(updated.error).toBe('Download failed');
        });
    });
    describe('setTorrentInfo', () => {
        it('should set torrent information', async () => {
            const item = await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Test Movie'
            });
            const updated = await repository.setTorrentInfo(item.id, 'Test.Movie.2023.1080p.BluRay.x264', 'magnet:?xt=urn:btih:...', 'torrent123');
            expect(updated.torrentName).toBe('Test.Movie.2023.1080p.BluRay.x264');
            expect(updated.torrentLink).toBe('magnet:?xt=urn:btih:...');
            expect(updated.torrentId).toBe('torrent123');
        });
    });
    describe('markCompleted', () => {
        it('should mark item as completed with file path', async () => {
            const item = await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Test Movie'
            });
            const updated = await repository.markCompleted(item.id, '/downloads/Test.Movie.2023.mkv');
            expect(updated.status).toBe(QueueStatus.COMPLETED);
            expect(updated.progress).toBe(100);
            expect(updated.filePath).toBe('/downloads/Test.Movie.2023.mkv');
        });
    });
    describe('getStats', () => {
        it('should return queue statistics', async () => {
            // Create items with different statuses
            await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Movie 1'
            });
            const item2 = await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Movie 2'
            });
            const item3 = await repository.createQueueItem({
                type: MediaType.MOVIE,
                name: 'Movie 3'
            });
            await repository.updateStatus(item2.id, QueueStatus.IN_PROGRESS);
            await repository.updateStatus(item3.id, QueueStatus.COMPLETED);
            const stats = await repository.getStats();
            expect(stats.total).toBe(3);
            expect(stats.notStarted).toBe(1);
            expect(stats.inProgress).toBe(1);
            expect(stats.completed).toBe(1);
            expect(stats.error).toBe(0);
        });
    });
});
//# sourceMappingURL=QueueRepository.test.js.map