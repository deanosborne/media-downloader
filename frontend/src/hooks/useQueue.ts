import { useCallback } from 'react';
import { useApi } from './useApi';
import { queueApi } from '../services';
import { QueueItem, QueueStatus } from '../types';

/**
 * Hook for managing queue operations
 */
export function useQueue() {
  // Get all queue items
  const {
    data: queueItems,
    loading: queueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useApi(() => queueApi.getAll(), [], { refetchInterval: 5000 });

  // Add item to queue
  const addToQueue = useCallback(async (item: Partial<QueueItem>): Promise<QueueItem> => {
    try {
      const newItem = await queueApi.create(item);
      await refetchQueue(); // Refresh the queue after adding
      return newItem;
    } catch (error) {
      throw error;
    }
  }, [refetchQueue]);

  // Update queue item
  const updateQueueItem = useCallback(async (
    id: string, 
    updates: Partial<QueueItem>
  ): Promise<QueueItem> => {
    try {
      const updatedItem = await queueApi.update(id, updates);
      await refetchQueue(); // Refresh the queue after updating
      return updatedItem;
    } catch (error) {
      throw error;
    }
  }, [refetchQueue]);

  // Remove item from queue
  const removeFromQueue = useCallback(async (id: string): Promise<void> => {
    try {
      await queueApi.delete(id);
      await refetchQueue(); // Refresh the queue after removing
    } catch (error) {
      throw error;
    }
  }, [refetchQueue]);

  // Get items by status
  const getItemsByStatus = useCallback((status: QueueStatus): QueueItem[] => {
    return queueItems?.filter(item => item.status === status) || [];
  }, [queueItems]);

  // Get queue statistics
  const queueStats = useCallback(() => {
    if (!queueItems) return null;

    return {
      total: queueItems.length,
      notStarted: queueItems.filter(item => item.status === QueueStatus.NOT_STARTED).length,
      inProgress: queueItems.filter(item => item.status === QueueStatus.IN_PROGRESS).length,
      completed: queueItems.filter(item => item.status === QueueStatus.COMPLETED).length,
      error: queueItems.filter(item => item.status === QueueStatus.ERROR).length,
    };
  }, [queueItems]);

  return {
    // Data
    queueItems: queueItems || [],
    queueStats: queueStats(),
    
    // Loading states
    loading: queueLoading,
    error: queueError,
    
    // Actions
    addToQueue,
    updateQueueItem,
    removeFromQueue,
    refetchQueue,
    getItemsByStatus,
  };
}

/**
 * Hook for managing a specific queue item
 */
export function useQueueItem(id: string) {
  const {
    data: queueItem,
    loading,
    error,
    refetch,
  } = useApi(() => queueApi.getById(id), [id], { enabled: !!id });

  const updateItem = useCallback(async (updates: Partial<QueueItem>): Promise<QueueItem> => {
    try {
      const updatedItem = await queueApi.update(id, updates);
      await refetch(); // Refresh the item after updating
      return updatedItem;
    } catch (error) {
      throw error;
    }
  }, [id, refetch]);

  const deleteItem = useCallback(async (): Promise<void> => {
    try {
      await queueApi.delete(id);
    } catch (error) {
      throw error;
    }
  }, [id]);

  return {
    queueItem,
    loading,
    error,
    updateItem,
    deleteItem,
    refetch,
  };
}