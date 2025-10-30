import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Link,
  Divider,
  InputAdornment,
  IconButton,
  FormControl,
  FormControlLabel,
  Select,
  Checkbox,
  MenuItem,
  InputLabel,
  Button,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  FolderOpen as BrowseIcon,
} from '@mui/icons-material';
import { AppConfig } from '../../types';

interface SettingsFormProps {
  config: Partial<AppConfig>;
  changedFields: Set<string>;
  showPasswords: Record<string, boolean>;
  loading?: boolean;
  saveMessage?: {
    type: 'success' | 'error' | 'info';
    text: string;
  } | null;
  autoDownload: boolean;
  preferredResolution: string;
  preferredMinSeeders: number;
  onConfigChange: (key: string, value: any) => void;
  onTogglePasswordVisibility: (key: string) => void;
  onBrowse: (fieldKey: string) => void;
  onAutoDownloadChange: (enabled: boolean) => void;
  onPreferredResolutionChange: (resolution: string) => void;
  onPreferredMinSeedersChange: (seeders: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({
  config,
  changedFields,
  showPasswords,
  loading = false,
  saveMessage,
  autoDownload,
  preferredResolution,
  preferredMinSeeders,
  onConfigChange,
  onTogglePasswordVisibility,
  onBrowse,
  onAutoDownloadChange,
  onPreferredResolutionChange,
  onPreferredMinSeedersChange,
  onSave,
  onCancel,
}) => {
  const [tab, setTab] = React.useState(0);

  const renderPasswordField = (label: string, key: string, helperLink?: string) => {
    const value = config[key as keyof AppConfig] as string || '';
    const isMasked = value === '••••••••';
    const isChanged = changedFields.has(key);

    return (
      <Box>
        <TextField
          fullWidth
          label={label}
          value={value}
          onChange={(e) => onConfigChange(key, e.target.value)}
          margin="normal"
          type={showPasswords[key] ? 'text' : 'password'}
          placeholder={
            isMasked ? 'Already set (enter new value to change)' : 'Enter value'
          }
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => onTogglePasswordVisibility(key)}
                  edge="end"
                >
                  {showPasswords[key] ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderColor: isChanged ? 'warning.main' : undefined,
            },
          }}
        />
        {helperLink && (
          <Typography variant="caption" color="text.secondary">
            Get from{' '}
            <Link href={helperLink} target="_blank">
              here
            </Link>
          </Typography>
        )}
        {isMasked && !isChanged && (
          <Typography
            variant="caption"
            color="success.main"
            display="block"
            sx={{ mt: 0.5 }}
          >
            ✓ Already configured
          </Typography>
        )}
        {isChanged && (
          <Typography
            variant="caption"
            color="warning.main"
            display="block"
            sx={{ mt: 0.5 }}
          >
            ⚠ Will be updated
          </Typography>
        )}
      </Box>
    );
  };

  const renderPathField = (label: string, key: string, placeholder = '') => {
    const value = config[key as keyof AppConfig] as string || '';
    const isChanged = changedFields.has(key);

    return (
      <Box display="flex" gap={1} alignItems="flex-start">
        <TextField
          fullWidth
          label={label}
          value={value}
          onChange={(e) => onConfigChange(key, e.target.value)}
          margin="normal"
          placeholder={placeholder}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderColor: isChanged ? 'warning.main' : undefined,
            },
          }}
        />
        <IconButton
          onClick={() => onBrowse(key)}
          sx={{ mt: 2 }}
          color="primary"
        >
          <BrowseIcon />
        </IconButton>
      </Box>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Settings</Typography>
        {changedFields.size > 0 && (
          <Typography variant="caption" color="warning.main">
            {changedFields.size} unsaved change{changedFields.size !== 1 ? 's' : ''}
          </Typography>
        )}
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="API Keys" />
        <Tab label="Directories" />
        <Tab label="Download" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            TMDB
          </Typography>
          {renderPasswordField(
            'TMDB API Key',
            'TMDB_API_KEY',
            'https://www.themoviedb.org/settings/api'
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Jackett
          </Typography>
          <TextField
            fullWidth
            label="Jackett URL"
            value={(config.JACKETT_URL as string) || ''}
            onChange={(e) => onConfigChange('JACKETT_URL', e.target.value)}
            margin="normal"
          />
          {renderPasswordField('Jackett API Key', 'JACKETT_API_KEY')}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Real-Debrid
          </Typography>
          {renderPasswordField(
            'Real-Debrid API Key',
            'REAL_DEBRID_API_KEY',
            'https://real-debrid.com/apitoken'
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Plex
          </Typography>
          <TextField
            fullWidth
            label="Plex URL"
            value={(config.PLEX_URL as string) || ''}
            onChange={(e) => onConfigChange('PLEX_URL', e.target.value)}
            margin="normal"
          />
          {renderPasswordField(
            'Plex Token',
            'PLEX_TOKEN',
            'https://support.plex.tv/articles/204059436'
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box>
          {renderPathField(
            'Download Path',
            'DOWNLOAD_PATH',
            '/path/to/downloads'
          )}
          {renderPathField(
            'Plex Movie Library Path',
            'PLEX_MOVIE_PATH',
            '/path/to/plex/Movies'
          )}
          {renderPathField(
            'Plex TV Library Path',
            'PLEX_TV_PATH',
            '/path/to/plex/TV Shows'
          )}
          {renderPathField(
            'Plex Books Path',
            'PLEX_BOOKS_PATH',
            '/path/to/plex/Books'
          )}
          {renderPathField(
            'Plex Audiobooks Path',
            'PLEX_AUDIOBOOKS_PATH',
            '/path/to/plex/Audiobooks'
          )}
        </Box>
      )}

      {tab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Download Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Configure automatic download behavior when clicking the download button
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={autoDownload}
                onChange={(e) => onAutoDownloadChange(e.target.checked)}
                color="primary"
              />
            }
            label="Auto-download with preferred settings (skip quality selection)"
            sx={{ mb: 2 }}
          />

          {autoDownload && (
            <Box sx={{ pl: 4, mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                When enabled, clicking download will automatically start with
                your preferred resolution and minimum seeders, skipping the
                quality selection dialog.
              </Alert>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="preferred-resolution-label">Preferred Resolution</InputLabel>
                <Select
                  labelId="preferred-resolution-label"
                  value={preferredResolution}
                  onChange={(e) => onPreferredResolutionChange(e.target.value)}
                  label="Preferred Resolution"
                >
                  <MenuItem value="any">Any Resolution (Most Seeders)</MenuItem>
                  <MenuItem value="2160p">2160p (4K)</MenuItem>
                  <MenuItem value="1080p">1080p (Full HD)</MenuItem>
                  <MenuItem value="720p">720p (HD)</MenuItem>
                  <MenuItem value="480p">480p (SD)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Minimum Seeders"
                type="number"
                value={preferredMinSeeders}
                onChange={(e) =>
                  onPreferredMinSeedersChange(parseInt(e.target.value) || 0)
                }
                helperText="Downloads will only start if at least this many seeders are available"
                sx={{ mb: 2 }}
              />

              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Current Settings:
                </Typography>
                <Typography variant="body2">
                  • Resolution:{' '}
                  <strong>
                    {preferredResolution === 'any'
                      ? 'Any (prioritize seeders)'
                      : preferredResolution}
                  </strong>
                </Typography>
                <Typography variant="body2">
                  • Minimum Seeders: <strong>{preferredMinSeeders}</strong>
                </Typography>
              </Box>
            </Box>
          )}

          {!autoDownload && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Auto-download is disabled. You will see the quality selection
              dialog when clicking download.
            </Alert>
          )}
        </Box>
      )}

      {saveMessage && (
        <Alert severity={saveMessage.type} sx={{ mt: 2 }}>
          {saveMessage.text}
        </Alert>
      )}

      <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={loading || changedFields.size === 0}
          startIcon={loading && <CircularProgress size={20} />}
        >
          Save {changedFields.size > 0 && `(${changedFields.size})`}
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsForm;