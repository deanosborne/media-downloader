/**
 * Real-Debrid service type definitions
 */

// Real-Debrid API response types
export interface RealDebridTorrent {
  id: string;
  filename: string;
  original_filename: string;
  hash: string;
  bytes: number;
  original_bytes: number;
  host: string;
  split: number;
  progress: number;
  status: 'magnet_error' | 'magnet_conversion' | 'waiting_files_selection' | 'queued' | 'downloading' | 'downloaded' | 'error' | 'virus' | 'compressing' | 'uploading' | 'dead';
  added: string;
  files: RealDebridFile[];
  links: string[];
  ended?: string;
  speed?: number;
  seeders?: number;
}

export interface RealDebridFile {
  id: number;
  path: string;
  bytes: number;
  selected: number;
}

export interface RealDebridUnrestrictedLink {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  host_icon: string;
  chunks: number;
  crc: number;
  download: string;
  streamable: number;
}

export interface RealDebridUser {
  id: number;
  username: string;
  email: string;
  points: number;
  locale: string;
  avatar: string;
  type: string;
  premium: number;
  expiration: string;
}

export interface RealDebridAddMagnetResponse {
  id: string;
  uri: string;
}

// Progress tracking interfaces
export interface DownloadProgress {
  torrentId: string;
  filename: string;
  progress: number;
  speed?: number | undefined;
  eta?: number | undefined;
  status: RealDebridTorrent['status'];
  bytesDownloaded: number;
  totalBytes: number;
  timestamp: Date;
}

export interface DownloadMonitorOptions {
  pollInterval?: number;
  onProgress?: (progress: DownloadProgress) => void;
  onComplete?: (torrent: RealDebridTorrent) => void;
  onError?: (error: Error) => void;
}

// Service configuration
export interface RealDebridConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  pollInterval?: number;
}

// Download management types
export interface DownloadTask {
  id: string;
  torrentId: string;
  magnetLink: string;
  filename: string;
  outputPath: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  speed?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DownloadManager {
  addDownload(magnetLink: string, outputPath: string): Promise<DownloadTask>;
  getDownload(id: string): Promise<DownloadTask | null>;
  getAllDownloads(): Promise<DownloadTask[]>;
  cancelDownload(id: string): Promise<void>;
  retryDownload(id: string): Promise<void>;
  monitorDownloads(): void;
  stopMonitoring(): void;
}

// Error types specific to Real-Debrid
export class RealDebridError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'RealDebridError';
  }
}

export class RealDebridAuthError extends RealDebridError {
  constructor(message: string = 'Real-Debrid authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'RealDebridAuthError';
  }
}

export class RealDebridQuotaError extends RealDebridError {
  constructor(message: string = 'Real-Debrid quota exceeded') {
    super(message, 'QUOTA_ERROR', 429);
    this.name = 'RealDebridQuotaError';
  }
}

export class RealDebridTorrentError extends RealDebridError {
  constructor(message: string, public readonly torrentId?: string) {
    super(message, 'TORRENT_ERROR', 400);
    this.name = 'RealDebridTorrentError';
  }
}