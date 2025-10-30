import React, { memo, useMemo, useCallback } from 'react';
import {
  List,
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { QueueItem as QueueItemType, QueueStatus } from '../../types';
import QueueItem from './QueueItem';

interface QueueListProps {
  items: QueueItemType[];
  loading?: boolean;
  error?: string | null;
  onRemoveItem?: (id: string) => void;
  onRetryItem?: (id: string) => void;
  onRefreshItem?: (id: string) => void;
  onRefreshAll?: () => void;
  onClearCompleted?: () => void;
  compact?: boolean;
  showStats?: boolean;
}

const QueueList: React.FC<QueueListProps> = memo(({
  items,
  loading = false,
  error = null,
  onRemoveItem,
  onRetryItem,
  onRefreshItem,
  onRefreshAll,
  onClearCompleted,
  compact = false,
  showStats = true,
}) => {
  // Memoize status counts calculation
  const statusCounts = useMemo(() => {
    const counts = {
      [QueueStatus.NOT_STARTED]: 0,
      [QueueStatus.IN_PROGRESS]: 0,
      [QueueStatus.COMPLETED]: 0,
      [QueueStatus.ERROR]: 0,
    };
    
    items.forEach(item => {
      counts[item.status]++;
    });
    
    return counts;
  }, [items]);

  // Memoize derived states
  const hasCompletedItems = useMemo(() => statusCounts[QueueStatus.COMPLETED] > 0, [statusCounts]);
  const hasErrorItems = useMemo(() => statusCounts[QueueStatus.ERROR] > 0, [statusCounts]);

  // Memoize grouped items calculation
  const groupedItems = useMemo(() => {
    const groups = {
      [QueueStatus.IN_PROGRESS]: [] as QueueItemType[],
      [QueueStatus.NOT_STARTED]: [] as QueueItemType[],
      [QueueStatus.ERROR]: [] as QueueItemType[],
      [QueueStatus.COMPLETED]: [] as QueueItemType[],
    };
    
    items.forEach(item => {
      groups[item.status].push(item);
    });
    
    // Sort each group by updatedAt (most recent first)
    Object.keys(groups).forEach(status => {
      groups[status as QueueStatus].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
    
    return groups;
  }, [items]);

  // Memoize event handlers
  const handleRefreshAll = useCallback(() => {
    if (onRefreshAll) {
      onRefreshAll();
    }
  }, [onRefreshAll]);

  const handleClearCompleted = useCallback(() => {
    if (onClearCompleted) {
      onClearCompleted();
    }
  }, [onClearCompleted]);

  if (loading && items.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading queue...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="body2">{error}</Typography>
        {onRefreshAll && (
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAll}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        )}
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Queue is Empty
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add some media to your download queue to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {showStats && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Download Queue ({items.length} items)
            </Typography>
            
            <Box display="flex" gap={1}>
              {onRefreshAll && (
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefreshAll}
                  disabled={loading}
                >
                  Refresh
                </Button>
              )}
              
              {hasCompletedItems && onClearCompleted && (
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={handleClearCompleted}
                  disabled={loading}
                >
                  Clear Completed
                </Button>
              )}
            </Box>
          </Box>
          
          <Box display="flex" gap={1} flexWrap="wrap">
            {statusCounts[QueueStatus.IN_PROGRESS] > 0 && (
              <Chip
                label={`${statusCounts[QueueStatus.IN_PROGRESS]} Downloading`}
                color="primary"
                size="small"
                variant="outlined"
              />
            )}
            
            {statusCounts[QueueStatus.NOT_STARTED] > 0 && (
              <Chip
                label={`${statusCounts[QueueStatus.NOT_STARTED]} Pending`}
                color="default"
                size="small"
                variant="outlined"
              />
            )}
            
            {statusCounts[QueueStatus.COMPLETED] > 0 && (
              <Chip
                label={`${statusCounts[QueueStatus.COMPLETED]} Completed`}
                color="success"
                size="small"
                variant="outlined"
              />
            )}
            
            {statusCounts[QueueStatus.ERROR] > 0 && (
              <Chip
                label={`${statusCounts[QueueStatus.ERROR]} Errors`}
                color="error"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Paper>
      )}

      <List sx={{ p: 0 }}>
        {/* In Progress Items */}
        {groupedItems[QueueStatus.IN_PROGRESS].length > 0 && (
          <>
            {!compact && (
              <Typography variant="subtitle2" sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
                Currently Downloading
              </Typography>
            )}
            {groupedItems[QueueStatus.IN_PROGRESS].map(item => (
              <QueueItem
                key={item.id}
                item={item}
                onRemove={onRemoveItem}
                onRetry={onRetryItem}
                onRefresh={onRefreshItem}
                loading={loading}
                compact={compact}
              />
            ))}
          </>
        )}

        {/* Pending Items */}
        {groupedItems[QueueStatus.NOT_STARTED].length > 0 && (
          <>
            {!compact && groupedItems[QueueStatus.IN_PROGRESS].length > 0 && <Divider sx={{ my: 2 }} />}
            {!compact && (
              <Typography variant="subtitle2" sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
                Pending
              </Typography>
            )}
            {groupedItems[QueueStatus.NOT_STARTED].map(item => (
              <QueueItem
                key={item.id}
                item={item}
                onRemove={onRemoveItem}
                onRetry={onRetryItem}
                onRefresh={onRefreshItem}
                loading={loading}
                compact={compact}
              />
            ))}
          </>
        )}

        {/* Error Items */}
        {groupedItems[QueueStatus.ERROR].length > 0 && (
          <>
            {!compact && (groupedItems[QueueStatus.IN_PROGRESS].length > 0 || groupedItems[QueueStatus.NOT_STARTED].length > 0) && <Divider sx={{ my: 2 }} />}
            {!compact && (
              <Typography variant="subtitle2" sx={{ px: 2, py: 1, bgcolor: 'error.light', color: 'error.contrastText' }}>
                Errors ({groupedItems[QueueStatus.ERROR].length})
              </Typography>
            )}
            {groupedItems[QueueStatus.ERROR].map(item => (
              <QueueItem
                key={item.id}
                item={item}
                onRemove={onRemoveItem}
                onRetry={onRetryItem}
                onRefresh={onRefreshItem}
                loading={loading}
                compact={compact}
              />
            ))}
          </>
        )}

        {/* Completed Items */}
        {groupedItems[QueueStatus.COMPLETED].length > 0 && (
          <>
            {!compact && (groupedItems[QueueStatus.IN_PROGRESS].length > 0 || groupedItems[QueueStatus.NOT_STARTED].length > 0 || groupedItems[QueueStatus.ERROR].length > 0) && <Divider sx={{ my: 2 }} />}
            {!compact && (
              <Typography variant="subtitle2" sx={{ px: 2, py: 1, bgcolor: 'success.light', color: 'success.contrastText' }}>
                Completed ({groupedItems[QueueStatus.COMPLETED].length})
              </Typography>
            )}
            {groupedItems[QueueStatus.COMPLETED].map(item => (
              <QueueItem
                key={item.id}
                item={item}
                onRemove={onRemoveItem}
                onRetry={onRetryItem}
                onRefresh={onRefreshItem}
                loading={loading}
                compact={compact}
              />
            ))}
          </>
        )}
      </List>
    </Box>
  );
});

QueueList.displayName = 'QueueList';

export default QueueList;