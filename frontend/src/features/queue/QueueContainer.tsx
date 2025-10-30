import React, { useEffect, useCallback } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useAppContext } from '../../store/AppContext';
import { useQueue } from '../../hooks/useQueue';
import QueueList from '../../components/common/QueueList';

interface QueueContainerProps {
  compact?: boolean;
  showStats?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const QueueContainer: React.FC<QueueContainerProps> = ({
  compact = false,
  showStats = true,
  autoRefresh = true,
  refreshInterval = 5000, // 5 seconds
}) => {
  const { state, actions } = useAppContext();
  const { queue } = state;
  
  const {
    data: queueData,
    loading,
    error,
    refetch,
  } = useQueue({
    refetchInterval: autoRefresh ? refreshInterval : undefined,
  });

  // Sync queue data with global state
  useEffect(() => {
    if (queueData && queueData !== queue.items) {
      // Update global state if needed
      // This is handled by the useQueue hook internally
    }
  }, [queueData, queue.items]);

  const handleRemoveItem = useCallback(async (id: string) => {
    try {
      await actions.removeFromQueue(id);
    } catch (error) {
      console.error('Failed to remove item from queue:', error);
    }
  }, [actions]);

  const handleRetryItem = useCallback(async (id: string) => {
    try {
      // Find the item and update its status to retry
      const item = queue.items.find(item => item.id === id);
      if (item) {
        await actions.updateQueueItem(id, {
          status: 'not_started' as any,
          error: undefined,
          progress: 0,
        });
      }
    } catch (error) {
      console.error('Failed to retry item:', error);
    }
  }, [actions, queue.items]);

  const handleRefreshItem = useCallback(async (id: string) => {
    try {
      // Refresh individual item status
      await refetch();
    } catch (error) {
      console.error('Failed to refresh item:', error);
    }
  }, [refetch]);

  const handleRefreshAll = useCallback(async () => {
    try {
      await actions.refreshQueue();
    } catch (error) {
      console.error('Failed to refresh queue:', error);
    }
  }, [actions]);

  const handleClearCompleted = useCallback(async () => {
    try {
      const completedItems = queue.items.filter(item => item.status === 'completed');
      
      // Remove all completed items
      await Promise.all(
        completedItems.map(item => actions.removeFromQueue(item.id))
      );
    } catch (error) {
      console.error('Failed to clear completed items:', error);
    }
  }, [actions, queue.items]);

  // Show global queue error if present
  const displayError = error || queue.error;
  const errorMessage = displayError instanceof Error ? displayError.message : displayError;

  return (
    <Box>
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {errorMessage}
          </Typography>
        </Alert>
      )}

      <QueueList
        items={queue.items}
        loading={loading || queue.loading}
        error={errorMessage}
        onRemoveItem={handleRemoveItem}
        onRetryItem={handleRetryItem}
        onRefreshItem={handleRefreshItem}
        onRefreshAll={handleRefreshAll}
        onClearCompleted={handleClearCompleted}
        compact={compact}
        showStats={showStats}
      />
    </Box>
  );
};

export default QueueContainer;