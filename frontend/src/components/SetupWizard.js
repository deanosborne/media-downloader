import React, { useState } from "react";
import FolderBrowser from "./FolderBrowser";
import { IconButton } from "@mui/material";
import { FolderOpen as BrowseIcon } from "@mui/icons-material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Link,
} from "@mui/material";
import axios from "axios";
import { API_BASE } from "../config/api";

const steps = ["TMDB API", "Jackett", "Real-Debrid", "Plex", "Directories"];

function SetupWizard({ open, onComplete }) {
  const [activeStep, setActiveStep] = useState(0);
  const [config, setConfig] = useState({
    TMDB_API_KEY: "",
    JACKETT_URL: "http://localhost:9117",
    JACKETT_API_KEY: "",
    REAL_DEBRID_API_KEY: "",
    PLEX_URL: "http://localhost:32400",
    PLEX_TOKEN: "",
    DOWNLOAD_PATH: "",
    PLEX_MOVIE_PATH: "",
    PLEX_TV_PATH: "",
    PLEX_BOOKS_PATH: "",
    PLEX_AUDIOBOOKS_PATH: "",
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserField, setBrowserField] = useState(null);

  // Add browse handler
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

  const handleChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      let response;
      switch (activeStep) {
        case 0: // TMDB
          response = await axios.post(`${API_BASE}/config/test/tmdb`, {
            apiKey: config.TMDB_API_KEY,
          });
          break;
        case 1: // Jackett
          response = await axios.post(`${API_BASE}/config/test/jackett`, {
            url: config.JACKETT_URL,
            apiKey: config.JACKETT_API_KEY,
          });
          break;
        case 2: // Real-Debrid
          response = await axios.post(`${API_BASE}/config/test/realdebrid`, {
            apiKey: config.REAL_DEBRID_API_KEY,
          });
          break;
        case 3: // Plex
          response = await axios.post(`${API_BASE}/config/test/plex`, {
            url: config.PLEX_URL,
            token: config.PLEX_TOKEN,
          });
          break;
      }
      setTestResult(response.data);
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    }
    setTesting(false);
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
    setTestResult(null);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setTestResult(null);
  };

  const handleFinish = async () => {
    try {
      setTesting(true);

      // Filter out empty values before sending
      const configToSave = {};
      for (const [key, value] of Object.entries(config)) {
        if (value && value.trim() !== "") {
          configToSave[key] = value;
        }
      }

      console.log("Saving configuration:", Object.keys(configToSave));

      const response = await axios.post(`${API_BASE}/config`, configToSave);

      console.log("Save response:", response.data);

      setTestResult({
        success: true,
        message: `Configuration saved! (${response.data.saved} values)`,
      });

      // Wait a moment to show success message
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error("Save config error:", error);
      setTestResult({
        success: false,
        message: `Failed to save: ${
          error.response?.data?.error || error.message
        }`,
      });
    } finally {
      setTesting(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // TMDB
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Get your free API key from{" "}
              <Link
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
              >
                TMDB Settings
              </Link>
            </Typography>
            <TextField
              fullWidth
              label="TMDB API Key"
              value={config.TMDB_API_KEY}
              onChange={(e) => handleChange("TMDB_API_KEY", e.target.value)}
              margin="normal"
              placeholder="Enter your TMDB API key"
            />
          </Box>
        );

      case 1: // Jackett
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Install{" "}
              <Link href="https://github.com/Jackett/Jackett" target="_blank">
                Jackett
              </Link>{" "}
              and get your API key from the dashboard
            </Typography>
            <TextField
              fullWidth
              label="Jackett URL"
              value={config.JACKETT_URL}
              onChange={(e) => handleChange("JACKETT_URL", e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Jackett API Key"
              value={config.JACKETT_API_KEY}
              onChange={(e) => handleChange("JACKETT_API_KEY", e.target.value)}
              margin="normal"
            />
          </Box>
        );

      case 2: // Real-Debrid
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Get your API token from{" "}
              <Link href="https://real-debrid.com/apitoken" target="_blank">
                Real-Debrid
              </Link>
            </Typography>
            <TextField
              fullWidth
              label="Real-Debrid API Key"
              value={config.REAL_DEBRID_API_KEY}
              onChange={(e) =>
                handleChange("REAL_DEBRID_API_KEY", e.target.value)
              }
              margin="normal"
            />
          </Box>
        );

      case 3: // Plex
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Find your Plex token using{" "}
              <Link
                href="https://support.plex.tv/articles/204059436"
                target="_blank"
              >
                this guide
              </Link>
            </Typography>
            <TextField
              fullWidth
              label="Plex URL"
              value={config.PLEX_URL}
              onChange={(e) => handleChange("PLEX_URL", e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Plex Token"
              value={config.PLEX_TOKEN}
              onChange={(e) => handleChange("PLEX_TOKEN", e.target.value)}
              margin="normal"
            />
          </Box>
        );

      case 4: // Directories
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Configure directory paths for downloads and Plex libraries
            </Typography>

            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                label="Download Path"
                value={config.DOWNLOAD_PATH}
                onChange={(e) => handleChange("DOWNLOAD_PATH", e.target.value)}
                margin="normal"
                placeholder="/path/to/downloads"
              />
              <IconButton
                onClick={() => handleBrowse("DOWNLOAD_PATH")}
                sx={{ mt: 2 }}
              >
                <BrowseIcon />
              </IconButton>
            </Box>

            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                label="Plex Movie Library Path"
                value={config.PLEX_MOVIE_PATH}
                onChange={(e) =>
                  handleChange("PLEX_MOVIE_PATH", e.target.value)
                }
                margin="normal"
                placeholder="/path/to/plex/Movies"
              />
              <IconButton
                onClick={() => handleBrowse("PLEX_MOVIE_PATH")}
                sx={{ mt: 2 }}
              >
                <BrowseIcon />
              </IconButton>
            </Box>

            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                label="Plex TV Library Path"
                value={config.PLEX_TV_PATH}
                onChange={(e) => handleChange("PLEX_TV_PATH", e.target.value)}
                margin="normal"
                placeholder="/path/to/plex/TV Shows"
              />
              <IconButton
                onClick={() => handleBrowse("PLEX_TV_PATH")}
                sx={{ mt: 2 }}
              >
                <BrowseIcon />
              </IconButton>
            </Box>

            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                label="Plex Books Path (Optional)"
                value={config.PLEX_BOOKS_PATH}
                onChange={(e) =>
                  handleChange("PLEX_BOOKS_PATH", e.target.value)
                }
                margin="normal"
              />
              <IconButton
                onClick={() => handleBrowse("PLEX_BOOKS_PATH")}
                sx={{ mt: 2 }}
              >
                <BrowseIcon />
              </IconButton>
            </Box>

            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                label="Plex Audiobooks Path (Optional)"
                value={config.PLEX_AUDIOBOOKS_PATH}
                onChange={(e) =>
                  handleChange("PLEX_AUDIOBOOKS_PATH", e.target.value)
                }
                margin="normal"
              />
              <IconButton
                onClick={() => handleBrowse("PLEX_AUDIOBOOKS_PATH")}
                sx={{ mt: 2 }}
              >
                <BrowseIcon />
              </IconButton>
            </Box>

            {/* Folder Browser */}
            <FolderBrowser
              open={browserOpen}
              onClose={() => setBrowserOpen(false)}
              onSelect={handleFolderSelect}
              currentPath={browserField ? config[browserField] : ""}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle>Setup Media Downloader</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ my: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}

        {testResult && (
          <Alert
            severity={testResult.success ? "success" : "error"}
            sx={{ mt: 2 }}
          >
            {testResult.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleBack} disabled={activeStep === 0}>
          Back
        </Button>
        {activeStep < 4 && (
          <Button
            onClick={testConnection}
            disabled={testing}
            startIcon={testing && <CircularProgress size={20} />}
          >
            Test Connection
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        ) : (
          <Button onClick={handleFinish} variant="contained">
            Finish Setup
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default SetupWizard;
