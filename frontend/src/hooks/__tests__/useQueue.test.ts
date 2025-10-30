import { renderHook, waitFor } from '@testing-library/react';
import { useQueue, useQueueItem } from '../useQueue';
import { queueApi } from '../../services';
import { QueueStatus, MediaType } from '../../types';

// Mock the services
jest.mock('../../services', () => ({
  queueApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockQueueApi = queueApi as jest.Mocked<typeof queueApi>;

const mockQueueItems = [
  {
    id: '1',
    name: 'Test Movie 1',
    type: MediaType.MOVIE,
    status: QueueStatus.NOT_STARTED,
    progress: 0,
    isSeasonPack: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Test Movie 2',
    type: MediaType.MOVIE,
    status: QueueStatus.IN_PROGRESS,
    progress: 50,
    isSeasonPack: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Test Movie 3',
    type: MediaType.MOVIE,
    status: QueueStatus.COMPLETED,
    progress: 100,
    isSeasonPack: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('useQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch queue items successfully', async () => {
    mockQueueApi.getAll.mockResolvedValue(mockQueueItems);

    const { result } = renderHook(() => useQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.queueItems).toEqual(mockQueueItems);
    expect(result.current.error).toBeNull();
    expect(mockQueueApi.getAll).toHaveBeenCalledTimes(1);
  });

  it('should calculate queue statistics correctly', async () => {
    mockQueueApi.getAll.mockResolvedValue(mockQueueItems);

    const { result } = renderHook(() => useQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.queueStats).toEqual({
      total: 3,
      notStarted: 1,
      inProgress: 1,
      completed: 1,
      error: 0,
    });
  });

  it('should add item to queue', async () => {
    const newItem = {
      id: '4',
      name: 'New Movie',
      type: MediaType.MOVIE,
      status: QueueStatus.NOT_STARTED,
      progress: 0,
      isSeasonPack: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockQueueApi.getAll.mockResolvedValue(mockQueueItems);
    mockQueueApi.create.mockResolvedValue(newItem);

    const { result } = renderHook(() => useQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const itemToAdd = {
      name: 'New Movie',
      type: MediaType.MOVIE,
    };

    await result.current.addToQueue(itemToAdd);

    expect(mockQueueApi.create).toHaveBeenCalledWith(itemToAdd);
    expect(mockQueueApi.getAll).toHaveBeenCalledTimes(2); // Initial load + refetch
  });

  it('should update queue item', async () => {
    const updatedItem = { ...mockQueueItems[0], progress: 25 };

    mockQueueApi.getAll.mockResolvedValue(mockQueueItems);
    mockQueueApi.update.mockResolvedValue(updatedItem);

    const { result } = renderHook(() => useQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.updateQueueItem('1', { progress: 25 });

    expect(mockQueueApi.update).toHaveBeenCalledWith('1', { progress: 25 });
    expect(mockQueueApi.getAll).toHaveBeenCalledTimes(2); // Initial load + refetch
  });

  it('should remove item from queue', async () => {
    mockQueueApi.getAll.mockResolvedValue(mockQueueItems);
    mockQueueApi.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.removeFromQueue('1');

    expect(mockQueueApi.delete).toHaveBeenCalledWith('1');
    expect(mockQueueApi.getAll).toHaveBeenCalledTimes(2); // Initial load + refetch
  });

  it('should filter items by status', async () => {
    mockQueueApi.getAll.mockResolvedValue(mockQueueItems);

    const { result } = renderHook(() => useQueue());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const inProgressItems = result.current.getItemsByStatus(QueueStatus.IN_PROGRESS);
    expect(inProgressItems).toHaveLength(1);
    expect(inProgressItems[0].id).toBe('2');
  });
});

describe('useQueueItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single queue item', async () => {
    const queueItem = mockQueueItems[0];
    mockQueueApi.getById.mockResolvedValue(queueItem);

    const { result } = renderHook(() => useQueueItem('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.queueItem).toEqual(queueItem);
    expect(mockQueueApi.getById).toHaveBeenCalledWith('1');
  });

  it('should update single queue item', async () => {
    const queueItem = mockQueueItems[0];
    const updatedItem = { ...queueItem, progress: 75 };

    mockQueueApi.getById.mockResolvedValue(queueItem);
    mockQueueApi.update.mockResolvedValue(updatedItem);

    const { result } = renderHook(() => useQueueItem('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.updateItem({ progress: 75 });

    expect(mockQueueApi.update).toHaveBeenCalledWith('1', { progress: 75 });
    expect(mockQueueApi.getById).toHaveBeenCalledTimes(2); // Initial load + refetch
  });

  it('should delete single queue item', async () => {
    const queueItem = mockQueueItems[0];
    mockQueueApi.getById.mockResolvedValue(queueItem);
    mockQueueApi.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useQueueItem('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.deleteItem();

    expect(mockQueueApi.delete).toHaveBeenCalledWith('1');
  });

  it('should not fetch when id is not provided', () => {
    const { result } = renderHook(() => useQueueItem(''));

    expect(result.current.queueItem).toBeUndefined();
    expect(mockQueueApi.getById).not.toHaveBeenCalled();
  });
});