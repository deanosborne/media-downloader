/**
 * Queue repository implementation
 */

import { BaseRepository } from './BaseRepository.js';
import { IDatabaseConnection } from './interfaces/IDatabaseConnection.js';
import { QueueItem, QueueStatus, MediaType, CreateQueueItemData, UpdateQueueItemData } from '../models/QueueItem.js';

export class QueueRepository extends BaseRepository<QueueItem> {
  constructor(db: IDatabaseConnection) {
    super(db, 'queue');
  }

  protected mapToEntity(row: any): QueueItem {
    return {
      id: row.id,
      type: row.type as MediaType,
      name: row.name,
      year: row.year || undefined,
      tmdbId: row.tmdb_id || undefined,
      season: row.season || undefined,
      episode: row.episode || undefined,
      episodeName: row.episode_name || undefined,
      isSeasonPack: Boolean(row.is_season_pack),
      status: row.status as QueueStatus,
      torrentName: row.torrent_name || undefined,
      torrentLink: row.torrent_link || undefined,
      torrentId: row.torrent_id || undefined,
      realDebridId: row.real_debrid_id || undefined,
      progress: row.progress || 0,
      error: row.error || undefined,
      filePath: row.file_path || undefined,
      downloadSpeed: row.download_speed || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  protected mapToRow(entity: Partial<QueueItem>): any {
    const row: any = {};

    if (entity.type !== undefined) row.type = entity.type;
    if (entity.name !== undefined) row.name = entity.name;
    if (entity.year !== undefined) row.year = entity.year;
    if (entity.tmdbId !== undefined) row.tmdb_id = entity.tmdbId;
    if (entity.season !== undefined) row.season = entity.season;
    if (entity.episode !== undefined) row.episode = entity.episode;
    if (entity.episodeName !== undefined) row.episode_name = entity.episodeName;
    if (entity.isSeasonPack !== undefined) row.is_season_pack = entity.isSeasonPack ? 1 : 0;
    if (entity.status !== undefined) row.status = entity.status;
    if (entity.torrentName !== undefined) row.torrent_name = entity.torrentName;
    if (entity.torrentLink !== undefined) row.torrent_link = entity.torrentLink;
    if (entity.torrentId !== undefined) row.torrent_id = entity.torrentId;
    if (entity.realDebridId !== undefined) row.real_debrid_id = entity.realDebridId;
    if (entity.progress !== undefined) row.progress = entity.progress;
    if (entity.error !== undefined) row.error = entity.error;
    if (entity.filePath !== undefined) row.file_path = entity.filePath;
    if (entity.downloadSpeed !== undefined) row.download_speed = entity.downloadSpeed;

    return row;
  }

  /**
   * Find queue items by status
   */
  async findByStatus(status: QueueStatus): Promise<QueueItem[]> {
    return this.findAll({
      where: { status },
      orderBy: 'created_at DESC'
    });
  }

  /**
   * Find queue items by type
   */
  async findByType(type: MediaType): Promise<QueueItem[]> {
    return this.findAll({
      where: { type },
      orderBy: 'created_at DESC'
    });
  }

  /**
   * Find queue items by TMDB ID
   */
  async findByTmdbId(tmdbId: number): Promise<QueueItem[]> {
    return this.findAll({
      where: { tmdb_id: tmdbId },
      orderBy: 'created_at DESC'
    });
  }

  /**
   * Find TV show episodes by season
   */
  async findEpisodesBySeason(tmdbId: number, season: number): Promise<QueueItem[]> {
    return this.findAll({
      where: { 
        tmdb_id: tmdbId, 
        season: season,
        type: MediaType.TV_SHOW
      },
      orderBy: 'episode ASC'
    });
  }

  /**
   * Update progress for a queue item
   */
  async updateProgress(id: number, progress: number, downloadSpeed?: string): Promise<QueueItem> {
    const updates: UpdateQueueItemData = { progress };
    if (downloadSpeed) {
      updates.downloadSpeed = downloadSpeed;
    }
    return this.update(id, updates);
  }

  /**
   * Update status for a queue item
   */
  async updateStatus(id: number, status: QueueStatus, error?: string): Promise<QueueItem> {
    const updates: UpdateQueueItemData = { status };
    if (error) {
      updates.error = error;
    }
    return this.update(id, updates);
  }

  /**
   * Set torrent information for a queue item
   */
  async setTorrentInfo(id: number, torrentName: string, torrentLink: string, torrentId?: string): Promise<QueueItem> {
    const updates: UpdateQueueItemData = {
      torrentName,
      torrentLink
    };
    if (torrentId) {
      updates.torrentId = torrentId;
    }
    return this.update(id, updates);
  }

  /**
   * Set Real-Debrid information for a queue item
   */
  async setRealDebridInfo(id: number, realDebridId: string): Promise<QueueItem> {
    return this.update(id, {
      realDebridId,
      status: QueueStatus.IN_PROGRESS
    });
  }

  /**
   * Mark item as completed with file path
   */
  async markCompleted(id: number, filePath: string): Promise<QueueItem> {
    return this.update(id, {
      status: QueueStatus.COMPLETED,
      progress: 100,
      filePath
    });
  }

  /**
   * Mark item as failed with error
   */
  async markFailed(id: number, error: string): Promise<QueueItem> {
    return this.update(id, {
      status: QueueStatus.ERROR,
      error
    });
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    error: number;
  }> {
    const [total, notStarted, inProgress, completed, error] = await Promise.all([
      this.count(),
      this.count({ where: { status: QueueStatus.NOT_STARTED } }),
      this.count({ where: { status: QueueStatus.IN_PROGRESS } }),
      this.count({ where: { status: QueueStatus.COMPLETED } }),
      this.count({ where: { status: QueueStatus.ERROR } })
    ]);

    return {
      total,
      notStarted,
      inProgress,
      completed,
      error
    };
  }

  /**
   * Get recent queue items
   */
  async getRecent(limit: number = 10): Promise<QueueItem[]> {
    return this.findAll({
      orderBy: 'created_at DESC',
      limit
    });
  }

  /**
   * Create a new queue item with validation
   */
  async createQueueItem(data: CreateQueueItemData): Promise<QueueItem> {
    // Validate required fields
    if (!data.name || !data.type) {
      throw new Error('Name and type are required');
    }

    // For TV shows, validate season/episode data
    if (data.type === MediaType.TV_SHOW && !data.isSeasonPack) {
      if (data.season === undefined || data.episode === undefined) {
        throw new Error('Season and episode are required for TV show episodes');
      }
    }

    return this.create({
      ...data,
      status: QueueStatus.NOT_STARTED,
      progress: 0,
      isSeasonPack: data.isSeasonPack || false
    });
  }
}