/**
 * Queue repository implementation
 */
import { BaseRepository } from './BaseRepository.js';
import { IDatabaseConnection } from './interfaces/IDatabaseConnection.js';
import { QueueItem, QueueStatus, MediaType, CreateQueueItemData } from '../models/QueueItem.js';
export declare class QueueRepository extends BaseRepository<QueueItem> {
    constructor(db: IDatabaseConnection);
    protected mapToEntity(row: any): QueueItem;
    protected mapToRow(entity: Partial<QueueItem>): any;
    /**
     * Find queue items by status
     */
    findByStatus(status: QueueStatus): Promise<QueueItem[]>;
    /**
     * Find queue items by type
     */
    findByType(type: MediaType): Promise<QueueItem[]>;
    /**
     * Find queue items by TMDB ID
     */
    findByTmdbId(tmdbId: number): Promise<QueueItem[]>;
    /**
     * Find TV show episodes by season
     */
    findEpisodesBySeason(tmdbId: number, season: number): Promise<QueueItem[]>;
    /**
     * Update progress for a queue item
     */
    updateProgress(id: number, progress: number, downloadSpeed?: string): Promise<QueueItem>;
    /**
     * Update status for a queue item
     */
    updateStatus(id: number, status: QueueStatus, error?: string): Promise<QueueItem>;
    /**
     * Set torrent information for a queue item
     */
    setTorrentInfo(id: number, torrentName: string, torrentLink: string, torrentId?: string): Promise<QueueItem>;
    /**
     * Set Real-Debrid information for a queue item
     */
    setRealDebridInfo(id: number, realDebridId: string): Promise<QueueItem>;
    /**
     * Mark item as completed with file path
     */
    markCompleted(id: number, filePath: string): Promise<QueueItem>;
    /**
     * Mark item as failed with error
     */
    markFailed(id: number, error: string): Promise<QueueItem>;
    /**
     * Get queue statistics
     */
    getStats(): Promise<{
        total: number;
        notStarted: number;
        inProgress: number;
        completed: number;
        error: number;
    }>;
    /**
     * Get recent queue items
     */
    getRecent(limit?: number): Promise<QueueItem[]>;
    /**
     * Create a new queue item with validation
     */
    createQueueItem(data: CreateQueueItemData): Promise<QueueItem>;
}
//# sourceMappingURL=QueueRepository.d.ts.map