/**
 * Queue item data model
 */

export enum MediaType {
  MOVIE = 'movie',
  TV_SHOW = 'tv_show',
  BOOK = 'book',
  AUDIOBOOK = 'audiobook',
  APPLICATION = 'application'
}

export enum QueueStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface QueueItem {
  id: number;
  type: MediaType;
  name: string;
  year?: number;
  tmdbId?: number;
  season?: number;
  episode?: number;
  episodeName?: string;
  isSeasonPack: boolean;
  status: QueueStatus;
  torrentName?: string;
  torrentLink?: string;
  torrentId?: string;
  realDebridId?: string;
  progress: number;
  error?: string;
  filePath?: string;
  downloadSpeed?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQueueItemData {
  type: MediaType;
  name: string;
  year?: number;
  tmdbId?: number;
  season?: number;
  episode?: number;
  episodeName?: string;
  isSeasonPack?: boolean;
}

export interface UpdateQueueItemData {
  status?: QueueStatus;
  torrentName?: string;
  torrentLink?: string;
  torrentId?: string;
  realDebridId?: string;
  progress?: number;
  error?: string;
  filePath?: string;
  downloadSpeed?: string;
}