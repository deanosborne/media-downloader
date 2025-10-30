import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { MediaItem, MediaType } from '../../types';

interface MediaCardProps {
  media: MediaItem;
  onSelect?: (media: MediaItem) => void;
  onDownload?: (media: MediaItem) => void;
  onInfo?: (media: MediaItem) => void;
  loading?: boolean;
  showActions?: boolean;
  compact?: boolean;
}

const MediaCard: React.FC<MediaCardProps> = ({
  media,
  onSelect,
  onDownload,
  onInfo,
  loading = false,
  showActions = true,
  compact = false,
}) => {
  const getMediaTypeColor = (type: MediaType) => {
    switch (type) {
      case MediaType.MOVIE:
        return 'primary';
      case MediaType.TV_SHOW:
        return 'secondary';
      case MediaType.BOOK:
        return 'success';
      case MediaType.AUDIOBOOK:
        return 'warning';
      default:
        return 'default';
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

  return (
    <Card
      sx={{
        height: compact ? 'auto' : '100%',
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
    >
      {media.poster && (
        <CardMedia
          component="img"
          sx={{
            width: compact ? 80 : '100%',
            height: compact ? 120 : 200,
            objectFit: 'cover',
          }}
          image={media.poster}
          alt={media.name}
        />
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <CardContent sx={{ flex: 1, pb: compact ? 1 : 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography
              variant={compact ? 'body1' : 'h6'}
              component="h3"
              sx={{
                fontWeight: 600,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: compact ? 1 : 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {media.name}
            </Typography>
            <Chip
              label={getMediaTypeLabel(media.type)}
              color={getMediaTypeColor(media.type)}
              size="small"
              sx={{ ml: 1, flexShrink: 0 }}
            />
          </Box>

          {media.year && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {media.year}
            </Typography>
          )}

          {media.overview && !compact && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.4,
              }}
            >
              {media.overview}
            </Typography>
          )}
        </CardContent>

        {showActions && (
          <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
            <Box display="flex" justifyContent="space-between" width="100%">
              <Box>
                {onSelect && (
                  <Button
                    size="small"
                    startIcon={<PlayIcon />}
                    onClick={() => onSelect(media)}
                    disabled={loading}
                  >
                    Select
                  </Button>
                )}
              </Box>
              
              <Box>
                {onInfo && (
                  <Tooltip title="View Details">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => onInfo(media)}
                        disabled={loading}
                        aria-label="View Details"
                      >
                        <InfoIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                
                {onDownload && (
                  <Tooltip title="Download">
                    <span>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onDownload(media)}
                        disabled={loading}
                        aria-label="Download"
                      >
                        <DownloadIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </CardActions>
        )}
      </Box>
    </Card>
  );
};

export default MediaCard;