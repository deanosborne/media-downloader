import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useAppContext } from '../../store/AppContext';
import { useConfig } from '../../hooks/useConfig';
import SettingsForm from '../../components/forms/SettingsForm';
import FolderBrowser from '../../components/FolderBrowser';

interface SettingsContainerProps {
  open: boolean;
  onClose: () => void;
}

const SettingsContainer: React.FC<SettingsContainerProps> = ({
  open,
  onClose,
}) => {
  const { state, actions } = useAppContext();
  const { config: globalConfig } = state;
  
  const {
    data: configData,
    loading: configLoading,
    error: configError,
    refetch: refetchConfig,
  } = useConfig();

  // Local form state
  const [config, setConfig] = useState<Record<string, any>>({});
  const [originalConfig, setOriginalConfig] = useState<Record<string, any>>({});
  const [changedFields, setChangedFields] = useState(new Set<string>());
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  
  // Folder browser state
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserField, setBrowserField] = useState<string | null>(null);
  
  // Download preferences state
  const [autoDownload, setAutoDownload] = useState(false);
  const [preferredResolution, setPreferredResolution] = useState('1080p');
  const [preferredMinSeeders, setPreferredMinSeeders] = useState(10);

  // Load config when dialog opens
  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = useCallback(async () => {
    try {
      const response = configData || globalConfig.data;
      if (response) {
        // Convert AppConfig to flat structure for form
        const flatConfig = {
          TMDB_API_KEY: response.tmdb?.apiKey || '',
          JACKETT_URL: response.jackett?.url || '',
          JACKETT_API_KEY: response.jackett?.apiKey || '',
          REAL_DEBRID_API_KEY: response.realDebrid?.apiKey || '',
          PLEX_URL: response.plex?.url || '',
          PLEX_TOKEN: response.plex?.token || '',
          DOWNLOAD_PATH: response.download?.path || '',
          PLEX_MOVIE_PATH: response.plex?.paths?.movies || '',
          PLEX_TV_PATH: response.plex?.paths?.tvShows || '',
          PLEX_BOOKS_PATH: response.plex?.paths?.books || '',
          PLEX_AUDIOBOOKS_PATH: response.plex?.paths?.audiobooks || '',
        };
        
        setConfig(flatConfig);
        setOriginalConfig(flatConfig);
        setChangedFields(new Set());
        setSaveMessage(null);

        // Load download preferences
        setAutoDownload(response.download?.autoDownload || false);
        setPreferredResolution(response.download?.preferredResolution || '1080p');
        setPreferredMinSeeders(response.download?.minSeeders || 10);
      }
    } catch (error) {
      console.error('Load config error:', error);
      setSaveMessage({
        type: 'error',
        text: 'Failed to load configuration',
      });
    }
  }, [configData, globalConfig.data]);

  const handleConfigChange = useCallback((key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));

    // Mark field as changed
    if (value !== originalConfig[key]) {
      setChangedFields(prev => new Set([...prev, key]));
    } else {
      setChangedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }

    setSaveMessage(null);
  }, [originalConfig]);

  const handleTogglePasswordVisibility = useCallback((key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleBrowse = useCallback((fieldKey: string) => {
    setBrowserField(fieldKey);
    setBrowserOpen(true);
  }, []);

  const handleFolderSelect = useCallback((selectedPath: string) => {
    if (browserField) {
      handleConfigChange(browserField, selectedPath);
    }
    setBrowserOpen(false);
    setBrowserField(null);
  }, [browserField, handleConfigChange]);

  const handleSave = useCallback(async () => {
    setLoading(true);
    setSaveMessage(null);

    try {
      // Build config object from changed fields
      const configToSave: any = {};
      
      // Convert flat structure back to nested AppConfig structure
      const updates: any = {};
      
      changedFields.forEach(key => {
        const value = config[key];
        if (value && value !== '••••••••' && value.trim() !== '') {
          if (key.startsWith('TMDB_')) {
            if (!updates.tmdb) updates.tmdb = {};
            if (key === 'TMDB_API_KEY') updates.tmdb.apiKey = value;
          } else if (key.startsWith('JACKETT_')) {
            if (!updates.jackett) updates.jackett = {};
            if (key === 'JACKETT_URL') updates.jackett.url = value;
            if (key === 'JACKETT_API_KEY') updates.jackett.apiKey = value;
          } else if (key.startsWith('REAL_DEBRID_')) {
            if (!updates.realDebrid) updates.realDebrid = {};
            if (key === 'REAL_DEBRID_API_KEY') updates.realDebrid.apiKey = value;
          } else if (key.startsWith('PLEX_')) {
            if (!updates.plex) updates.plex = {};
            if (key === 'PLEX_URL') updates.plex.url = value;
            if (key === 'PLEX_TOKEN') updates.plex.token = value;
            if (key.startsWith('PLEX_') && key.endsWith('_PATH')) {
              if (!updates.plex.paths) updates.plex.paths = {};
              if (key === 'PLEX_MOVIE_PATH') updates.plex.paths.movies = value;
              if (key === 'PLEX_TV_PATH') updates.plex.paths.tvShows = value;
              if (key === 'PLEX_BOOKS_PATH') updates.plex.paths.books = value;
              if (key === 'PLEX_AUDIOBOOKS_PATH') updates.plex.paths.audiobooks = value;
            }
          } else if (key === 'DOWNLOAD_PATH') {
            if (!updates.download) updates.download = {};
            updates.download.path = value;
          }
        }
      });

      // Always save download preferences
      if (!updates.download) updates.download = {};
      updates.download.autoDownload = autoDownload;
      updates.download.preferredResolution = preferredResolution;
      updates.download.minSeeders = preferredMinSeeders;

      if (Object.keys(updates).length === 0) {
        setSaveMessage({
          type: 'info',
          text: 'No changes to save',
        });
        setLoading(false);
        return;
      }

      console.log('Saving config:', updates);

      await actions.updateConfig(updates);

      setSaveMessage({
        type: 'success',
        text: 'Settings saved successfully!',
      });

      // Reload after success
      setTimeout(() => {
        loadConfig();
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage({
        type: 'error',
        text: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    setLoading(false);
  }, [config, changedFields, autoDownload, preferredResolution, preferredMinSeeders, actions, loadConfig]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <SettingsForm
            config={config}
            changedFields={changedFields}
            showPasswords={showPasswords}
            loading={loading}
            saveMessage={saveMessage}
            autoDownload={autoDownload}
            preferredResolution={preferredResolution}
            preferredMinSeeders={preferredMinSeeders}
            onConfigChange={handleConfigChange}
            onTogglePasswordVisibility={handleTogglePasswordVisibility}
            onBrowse={handleBrowse}
            onAutoDownloadChange={setAutoDownload}
            onPreferredResolutionChange={setPreferredResolution}
            onPreferredMinSeedersChange={setPreferredMinSeeders}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>

      <FolderBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={handleFolderSelect}
        currentPath={browserField ? config[browserField] : ''}
      />
    </>
  );
};

export default SettingsContainer;