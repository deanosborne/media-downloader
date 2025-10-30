import React from 'react';
import {
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Box,
  Typography,
  Chip,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  PlayArrow as InProgressIcon,
  Pause as PendingIcon,
} from '@mui/icons-material';
import { QueueItem as QueueItemType, QueueStatus, MediaType } from '../../types';

interface QueueItemProps {
  item: QueueItemType;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  onRefresh?: (id: string) => void;
  loading?: boolean;
  compact?: boolean;
}

const QueueItem: React.FC<QueueItemProps> = ({
  item,
  onRemove,
  onRetry,
  onRefresh,
  loading = false,
  compact = false,
}) => {
  const getStatusIcon = (status: QueueStatus) => {
    switch (status) {
      case QueueStatus.COMPLETED:
        return <CompleteIcon color="success" />;
      case QueueStatus.IN_PROGRESS:
        return <InProgressIcon color="primary" />;
      case QueueStatus.ERROR:
        return <ErrorIcon color="error" />;
      case QueueStatus.NOT_STARTED:
      default:
        return <PendingIcon color="action" />;
    }
  };

  const getStatusColor = (status: QueueStatus) => {
    switch (status) {
      case QueueStatus.COMPLETED:
        return 'success';
      case QueueStatus.IN_PROGRESS:
        return 'primary';
      case QueueStatus.ERROR:
        return 'error';
      case QueueStatus.NOT_STARTED:
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: QueueStatus) => {
    switch (status) {
      case QueueStatus.COMPLETED:
        return 'Completed';
      case QueueStatus.IN_PROGRESS:
        return 'Downloading';
      case QueueStatus.ERROR:
        return 'Error';
      case QueueStatus.NOT_STARTED:
      default:
        return 'Pending';
    }
  };

  const getMediaTypeLabel = (type: MediaType) => {
    switch (type) {
      case MediaType.MOVIE:
        return 'Movie';
      case MediaType.TV_SHOW:
        return 'TV Show';
      case MediaType.BOOK:
        return 'Book';
      case MediaType.AUDIOBOOK:
        return 'Audiobook';
      default:
        return 'Media';
    }
  };

  const formatTitle = () => {
    let title = item.name;
    
    if (item.year) {
      title += ` (${item.year})`;
    }
    
    if (item.season && item.episode) {
      title += ` - S${String(item.season).padStart(2, '0')}E${String(item.episode).padStart(2, '0')}`;
      if (item.episodeName) {
        title += ` - ${item.episodeName}`;
      }
    } else if (item.season && item.isSeasonPack) {
      title += ` - Season ${item.season} (Full Season)`;
    }
    
    return title;
  };

  const formatSecondaryText = () => {
    const parts = [];
    
    parts.push(getMediaTypeLabel(item.type));
    
    if (item.status === QueueStatus.IN_PROGRESS && item.progress > 0) {
      parts.push(`${item.progress}% complete`);
    }
    
    if (item.updatedAt) {
      const date = new Date(item.updatedAt);
      parts.push(`Updated ${date.toLocaleString()}`);
    }
    
    return parts.join(' • ');
  };

  return (
    <ListItem
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        bgcolor: 'background.paper',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
        {getStatusIcon(item.status)}
      </Box>
      
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography
              variant={compact ? 'body2' : 'body1'}
              sx={{
                fontWeight: item.status === QueueStatus.IN_PROGRESS ? 600 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {formatTitle()}
            </Typography>
            <Chip
              label={getStatusLabel(item.status)}
              color={getStatusColor(item.status)}
              size="small"
              variant="outlined"
            />
          </Box>
        }
        secondary={
          <React.Fragment>
            <Typography variant="caption" color="text.secondary">
              {formatSecondaryText()}
            </Typography>
            
            {item.status === QueueStatus.IN_PROGRESS && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={item.progress}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}
            
            {item.status === QueueStatus.ERROR && item.error && (
              <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                <Typography variant="caption">{item.error}</Typography>
              </Alert>
            )}
          </React.Fragment>
        }
      />
      
      <ListItemSecondaryAction>
        <Box display="flex" gap={0.5}>
          {item.status === QueueStatus.ERROR && onRetry && (
            <Tooltip title="Retry Download">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onRetry(item.id)}
                  disabled={loading}
                  aria-label="Retry Download"
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
          
          {onRefresh && (
            <Tooltip title="Refresh Status">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onRefresh(item.id)}
                  disabled={loading}
                  aria-label="Refresh Status"
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
          
          {onRemove && (
            <Tooltip title="Remove from Queue">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onRemove(item.id)}
                  disabled={loading}
                  aria-label="Remove from Queue"
                >
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

export default QueueItem;