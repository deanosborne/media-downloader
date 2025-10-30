import axios, { AxiosResponse } from 'axios';
import { QueueItem, MediaItem, AppConfig, MediaSearchResult, MediaType } from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Queue API functions
export const queueApi = {
  getAll: (): Promise<QueueItem[]> =>
    api.get('/queue').then((response: AxiosResponse<QueueItem[]>) => response.data),

  getById: (id: string): Promise<QueueItem> =>
    api.get(`/queue/${id}`).then((response: AxiosResponse<QueueItem>) => response.data),

  create: (item: Partial<QueueItem>): Promise<QueueItem> =>
    api.post('/queue', item).then((response: AxiosResponse<QueueItem>) => response.data),

  update: (id: string, updates: Partial<QueueItem>): Promise<QueueItem> =>
    api.put(`/queue/${id}`, updates).then((response: AxiosResponse<QueueItem>) => response.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/queue/${id}`).then(() => undefined),

  getByStatus: (status: string): Promise<QueueItem[]> =>
    api.get(`/queue?status=${status}`).then((response: AxiosResponse<QueueItem[]>) => response.data),
};

// Configuration API functions
export const configApi = {
  get: (): Promise<AppConfig> =>
    api.get('/config').then((response: AxiosResponse<AppConfig>) => response.data),

  update: (config: Partial<AppConfig>): Promise<AppConfig> =>
    api.put('/config', config).then((response: AxiosResponse<AppConfig>) => response.data),

  getSection: <T>(section: string): Promise<T> =>
    api.get(`/config/${section}`).then((response: AxiosResponse<T>) => response.data),

  updateSection: <T>(section: string, data: Partial<T>): Promise<T> =>
    api.put(`/config/${section}`, data).then((response: AxiosResponse<T>) => response.data),
};

// Media search API functions
export const mediaApi = {
  search: (query: string, type?: MediaType, page = 1): Promise<MediaSearchResult> =>
    api.get('/media/search', {
      params: { query, type, page }
    }).then((response: AxiosResponse<MediaSearchResult>) => response.data),

  getDetails: (id: string, type: MediaType): Promise<MediaItem> =>
    api.get(`/media/${type}/${id}`).then((response: AxiosResponse<MediaItem>) => response.data),

  getTrending: (type?: MediaType): Promise<MediaItem[]> =>
    api.get('/media/trending', {
      params: { type }
    }).then((response: AxiosResponse<MediaItem[]>) => response.data),
};

// Generic API function for custom requests
export const genericApi = {
  get: <T>(url: string, params?: Record<string, any>): Promise<T> =>
    api.get(url, { params }).then((response: AxiosResponse<T>) => response.data),

  post: <T>(url: string, data?: any): Promise<T> =>
    api.post(url, data).then((response: AxiosResponse<T>) => response.data),

  put: <T>(url: string, data?: any): Promise<T> =>
    api.put(url, data).then((response: AxiosResponse<T>) => response.data),

  delete: <T>(url: string): Promise<T> =>
    api.delete(url).then((response: AxiosResponse<T>) => response.data),
};

export default api;