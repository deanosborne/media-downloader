import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { MediaItem, MediaType } from '../../types';
import { useMediaSearch } from '../../hooks/useMediaSearch';
import { useAppContext } from '../../store/AppContext';
import { useDebounce } from '../../hooks/useDebounce';
import MediaCard from '../../components/common/MediaCard';

interface MediaSearchContainerProps {
  onMediaSelect?: (media: MediaItem) => void;
  onMediaDownload?: (media: MediaItem) => void;
  onMediaInfo?: (media: MediaItem) => void;
  compact?: boolean;
  showTypeFilter?: boolean;
  autoSearch?: boolean;
}

const MediaSearchContainer: React.FC<MediaSearchContainerProps> = memo(({
  onMediaSelect,
  onMediaDownload,
  onMediaInfo,
  compact = false,
  showTypeFilter = true,
  autoSearch = true,
}) => {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType | 'all'>('all');
  
  const { actions } = useAppContext();
  
  // Use optimized debounce hook
  const debouncedQuery = useDebounce(autoSearch ? query : '', 300);

  const {
    data: searchResults,
    loading,
    error,
    refetch,
  } = useMediaSearch(
    debouncedQuery,
    mediaType === 'all' ? undefined : mediaType,
    {
      enabled: debouncedQuery.length >= 2,
    }
  );

  const handleSearch = useCallback(() => {
    if (query.length >= 2) {
      // Force immediate search by triggering refetch
      refetch();
    }
  }, [query, refetch]);

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  const handleMediaSelect = useCallback(async (media: MediaItem) => {
    if (onMediaSelect) {
      onMediaSelect(media);
    } else {
      // Default behavior: add to queue
      try {
        await actions.addToQueue({
          name: media.name,
          type: media.type,
          year: media.year,
          tmdbId: media.tmdbId,
        });
      } catch (error) {
        console.error('Failed to add to queue:', error);
      }
    }
  }, [onMediaSelect, actions]);

  const handleMediaDownload = useCallback((media: MediaItem) => {
    if (onMediaDownload) {
      onMediaDownload(media);
    } else {
      // Default behavior: same as select for now
      handleMediaSelect(media);
    }
  }, [onMediaDownload, handleMediaSelect]);

  const handleMediaInfo = useCallback((media: MediaItem) => {
    if (onMediaInfo) {
      onMediaInfo(media);
    } else {
      // Default behavior: log media info (could open a modal in the future)
      console.log('Media info:', media);
    }
  }, [onMediaInfo]);

  // Memoize grid configuration to prevent recalculation
  const gridConfig = useMemo(() => ({
    xs: 12,
    sm: compact ? 12 : 6,
    md: compact ? 6 : 4,
    lg: compact ? 4 : 3,
  }), [compact]);

  // Memoize search results rendering to prevent unnecessary re-renders
  const searchResultsContent = useMemo(() => {
    if (!searchResults || searchResults.results.length === 0) {
      return null;
    }

    return (
      <Grid container spacing={2}>
        {searchResults.results.map((media) => (
          <Grid
            item
            {...gridConfig}
            key={media.id}
          >
            <MediaCard
              media={media}
              onSelect={handleMediaSelect}
              onDownload={handleMediaDownload}
              onInfo={handleMediaInfo}
              loading={loading}
              compact={compact}
            />
          </Grid>
        ))}
      </Grid>
    );
  }, [searchResults, gridConfig, handleMediaSelect, handleMediaDownload, handleMediaInfo, loading, compact]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} alignItems="flex-end">
          <TextField
            fullWidth
            label="Search Media"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            placeholder="Enter movie, TV show, book, or audiobook title..."
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {query && (
                    <IconButton onClick={handleClear} size="small">
                      <ClearIcon />
                    </IconButton>
                  )}
                  {!autoSearch && (
                    <IconButton
                      onClick={handleSearch}
                      disabled={query.length < 2}
                      color="primary"
                    >
                      <SearchIcon />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
          />
          
          {showTypeFilter && (
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel id="media-type-label">Type</InputLabel>
              <Select
                labelId="media-type-label"
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType | 'all')}
                label="Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value={MediaType.MOVIE}>Movies</MenuItem>
                <MenuItem value={MediaType.TV_SHOW}>TV Shows</MenuItem>
                <MenuItem value={MediaType.BOOK}>Books</MenuItem>
                <MenuItem value={MediaType.AUDIOBOOK}>Audiobooks</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
        
        {query.length > 0 && query.length < 2 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Enter at least 2 characters to search
          </Typography>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Search failed: {error.message}
          </Typography>
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Searching...
          </Typography>
        </Box>
      )}

      {searchResults && searchResults.results.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Search Results ({searchResults.totalResults} found)
          </Typography>
          
          {searchResultsContent}
          
          {searchResults.page < searchResults.totalPages && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Typography variant="body2" color="text.secondary">
                Showing page {searchResults.page} of {searchResults.totalPages}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {searchResults && searchResults.results.length === 0 && debouncedQuery.length >= 2 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Results Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search terms or changing the media type filter.
          </Typography>
        </Paper>
      )}
    </Box>
  );
});

MediaSearchContainer.displayName = 'MediaSearchContainer';

export default MediaSearchContainer;