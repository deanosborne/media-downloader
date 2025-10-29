import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Link,
  Divider,
  InputAdornment,
  IconButton,
  InputLabel,
  FormControl,
  FormControlLabel,
  Select,
  Checkbox,
  MenuItem,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import axios from "axios";
import FolderBrowser from "./FolderBrowser";
import { FolderOpen as BrowseIcon } from "@mui/icons-material";
import { API_BASE } from "../config/api";

function SettingsDialog({ open, onClose }) {
  const [tab, setTab] = useState(0);
  const [config, setConfig] = useState({});
  const [originalConfig, setOriginalConfig] = useState({});
  const [changedFields, setChangedFields] = useState(new Set());
  const [showPasswords, setShowPasswords] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserField, setBrowserField] = useState(null);

  const [autoDownload, setAutoDownload] = useState(false);
  const [preferredResolution, setPreferredResolution] = useState("1080p");
  const [preferredMinSeeders, setPreferredMinSeeders] = useState(10);

  useEffect(() => {
    if (open) {
      async () => {
        const response = await axios.get(`${API_BASE}/config`);
        setConfig(response.data);
        setOriginalConfig(response.data);
        setChangedFields(new Set());
        setSaveMessage(null);

        // Load download preferences
        setAutoDownload(response.data.AUTO_DOWNLOAD === "true");
        setPreferredResolution(response.data.PREFERRED_RESOLUTION || "1080p");
        setPreferredMinSeeders(
          parseInt(response.data.PREFERRED_MIN_SEEDERS) || 10
        );
      };
    }
  }, [open]);

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE}/config`);
      setConfig(response.data);
      setOriginalConfig(response.data);
      setChangedFields(new Set());
      setSaveMessage(null);

      // Load download preferences
      setAutoDownload(response.data.AUTO_DOWNLOAD === "true");
      setPreferredResolution(response.data.PREFERRED_RESOLUTION || "1080p");
      setPreferredMinSeeders(
        parseInt(response.data.PREFERRED_MIN_SEEDERS) || 10
      );
    } catch (error) {
      console.error("Load config error:", error);
    }
  };

  // Add function to open browser
  const handleBrowse = (fieldKey) => {
    setBrowserField(fieldKey);
    setBrowserOpen(true);
  };

  const handleFolderSelect = (selectedPath) => {
    if (browserField) {
      handleChange(browserField, selectedPath);
    }
    setBrowserOpen(false);
    setBrowserField(null);
  };

  // Helper function to render path field with browse button
  const renderPathField = (label, key, placeholder = "") => {
    const isChanged = changedFields.has(key);

    return (
      <Box display="flex" gap={1} alignItems="flex-start">
        <TextField
          fullWidth
          label={label}
          value={config[key] || ""}
          onChange={(e) => handleChange(key, e.target.value)}
          margin="normal"
          placeholder={placeholder}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderColor: isChanged ? "warning.main" : undefined,
            },
          }}
        />
        <IconButton
          onClick={() => handleBrowse(key)}
          sx={{ mt: 2 }}
          color="primary"
        >
          <BrowseIcon />
        </IconButton>
      </Box>
    );
  };

  const handleChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));

    // Mark field as changed
    if (value !== originalConfig[key]) {
      setChangedFields((prev) => new Set([...prev, key]));
    } else {
      setChangedFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }

    setSaveMessage(null);
  };

  const togglePasswordVisibility = (key) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveMessage(null);

    try {
      // Include download preferences in the config
      const configToSave = {};
      changedFields.forEach((key) => {
        const value = config[key];
        if (value && value !== "••••••••" && value.trim() !== "") {
          configToSave[key] = value;
        }
      });

      // Always save download preferences
      configToSave.AUTO_DOWNLOAD = autoDownload.toString();
      configToSave.PREFERRED_RESOLUTION = preferredResolution;
      configToSave.PREFERRED_MIN_SEEDERS = preferredMinSeeders.toString();

      if (Object.keys(configToSave).length === 0) {
        setSaveMessage({
          type: "info",
          text: "No changes to save",
        });
        setLoading(false);
        return;
      }

      console.log("Saving config:", Object.keys(configToSave));

      const response = await axios.post(`${API_BASE}/config`, configToSave);

      setSaveMessage({
        type: "success",
        text: `Settings saved successfully! (${response.data.saved} values updated)`,
      });

      // Reload after success
      setTimeout(() => {
        loadConfig();
      }, 1500);
    } catch (error) {
      console.error("Save error:", error);
      setSaveMessage({
        type: "error",
        text: `Failed to save: ${error.response?.data?.error || error.message}`,
      });
    }
    setLoading(false);
  };

  const renderPasswordField = (label, key, helperLink = null) => {
    const isMasked = config[key] === "••••••••";
    const isChanged = changedFields.has(key);

    return (
      <Box>
        <TextField
          fullWidth
          label={label}
          value={config[key] || ""}
          onChange={(e) => handleChange(key, e.target.value)}
          margin="normal"
          type={showPasswords[key] ? "text" : "password"}
          placeholder={
            isMasked ? "Already set (enter new value to change)" : "Enter value"
          }
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => togglePasswordVisibility(key)}
                  edge="end"
                >
                  {showPasswords[key] ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderColor: isChanged ? "warning.main" : undefined,
            },
          }}
        />
        {helperLink && (
          <Typography variant="caption" color="text.secondary">
            Get from{" "}
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Settings
        {changedFields.size > 0 && (
          <Typography variant="caption" color="warning.main" display="block">
            {changedFields.size} unsaved change
            {changedFields.size !== 1 ? "s" : ""}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
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
              "TMDB API Key",
              "TMDB_API_KEY",
              "https://www.themoviedb.org/settings/api"
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Jackett
            </Typography>
            <TextField
              fullWidth
              label="Jackett URL"
              value={config.JACKETT_URL || ""}
              onChange={(e) => handleChange("JACKETT_URL", e.target.value)}
              margin="normal"
            />
            {renderPasswordField("Jackett API Key", "JACKETT_API_KEY")}

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Real-Debrid
            </Typography>
            {renderPasswordField(
              "Real-Debrid API Key",
              "REAL_DEBRID_API_KEY",
              "https://real-debrid.com/apitoken"
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Plex
            </Typography>
            <TextField
              fullWidth
              label="Plex URL"
              value={config.PLEX_URL || ""}
              onChange={(e) => handleChange("PLEX_URL", e.target.value)}
              margin="normal"
            />
            {renderPasswordField(
              "Plex Token",
              "PLEX_TOKEN",
              "https://support.plex.tv/articles/204059436"
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box>
            {renderPathField(
              "Download Path",
              "DOWNLOAD_PATH",
              "/path/to/downloads"
            )}
            {renderPathField(
              "Plex Movie Library Path",
              "PLEX_MOVIE_PATH",
              "/path/to/plex/Movies"
            )}
            {renderPathField(
              "Plex TV Library Path",
              "PLEX_TV_PATH",
              "/path/to/plex/TV Shows"
            )}
            {renderPathField(
              "Plex Books Path",
              "PLEX_BOOKS_PATH",
              "/path/to/plex/Books"
            )}
            {renderPathField(
              "Plex Audiobooks Path",
              "PLEX_AUDIOBOOKS_PATH",
              "/path/to/plex/Audiobooks"
            )}
          </Box>
        )}
        {tab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Download Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure automatic download behavior when clicking the download
              button
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={autoDownload}
                  onChange={(e) => setAutoDownload(e.target.checked)}
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
                  <InputLabel>Preferred Resolution</InputLabel>
                  <Select
                    value={preferredResolution}
                    onChange={(e) => setPreferredResolution(e.target.value)}
                    label="Preferred Resolution"
                  >
                    <MenuItem value="any">
                      Any Resolution (Most Seeders)
                    </MenuItem>
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
                    setPreferredMinSeeders(parseInt(e.target.value) || 0)
                  }
                  helperText="Downloads will only start if at least this many seeders are available"
                  sx={{ mb: 2 }}
                />

                <Box sx={{ bgcolor: "action.hover", p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Settings:
                  </Typography>
                  <Typography variant="body2">
                    • Resolution:{" "}
                    <strong>
                      {preferredResolution === "any"
                        ? "Any (prioritize seeders)"
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || changedFields.size === 0}
          startIcon={loading && <CircularProgress size={20} />}
        >
          Save {changedFields.size > 0 && `(${changedFields.size})`}
        </Button>
        <FolderBrowser
          open={browserOpen}
          onClose={() => setBrowserOpen(false)}
          onSelect={handleFolderSelect}
          currentPath={browserField ? config[browserField] : ""}
        />
      </DialogActions>
    </Dialog>
  );
}

export default SettingsDialog;
