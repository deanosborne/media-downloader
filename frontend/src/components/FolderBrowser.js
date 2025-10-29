import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Box,
  Typography,
  Breadcrumbs,
  Link,
  CircularProgress,
  IconButton,
  Divider,
  Alert,
} from "@mui/material";
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Home as HomeIcon,
  Computer as ComputerIcon,
  ArrowUpward as ArrowUpIcon,
  CreateNewFolder as CreateFolderIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import axios from "axios";
import { API_BASE } from "../config/api";

function FolderBrowser({ open, onClose, onSelect, currentPath = "" }) {
  const [path, setPath] = useState(currentPath || "");
  const [directories, setDirectories] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualPath, setManualPath] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    if (open) {
      loadShortcuts();

      // Determine starting path
      if (currentPath && currentPath.trim() !== "") {
        // Use existing path if provided
        browsePath(currentPath);
      } else {
        // Start at C:/ on Windows, / on Unix-like systems
        const defaultPath = navigator.platform.toLowerCase().includes("win")
          ? "C:\\"
          : "/";
        browsePath(defaultPath);
      }
    }
  }, [open, currentPath]);

  const loadShortcuts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/filesystem/shortcuts`);
      setShortcuts(response.data);
      return response.data;
    } catch (error) {
      console.error("Load shortcuts error:", error);
      return [];
    }
  };

  const browsePath = async (newPath) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/filesystem/browse`, {
        params: { path: newPath },
      });
      setPath(response.data.currentPath);
      setDirectories(response.data.directories);
      setManualPath(response.data.currentPath);
    } catch (error) {
      setError(error.response?.data?.error || error.message);
    }
    setLoading(false);
  };

  const handleFolderClick = (folderPath) => {
    browsePath(folderPath);
  };

  const handleGoUp = () => {
    if (!path) return;

    // Handle Windows root
    if (path.match(/^[A-Z]:\\$/i)) {
      return; // Already at drive root
    }

    // Handle Unix root
    if (path === "/") {
      return; // Already at root
    }

    const separator = path.includes("\\") ? "\\" : "/";
    const parts = path.split(separator).filter((p) => p);

    if (parts.length === 0) return;

    parts.pop(); // Remove last part

    let parentPath;
    if (parts.length === 0) {
      // Going to root
      parentPath = separator === "\\" ? "C:\\" : "/";
    } else {
      parentPath = parts.join(separator);
      if (separator === "\\" && !parentPath.endsWith("\\")) {
        parentPath += "\\";
      }
    }

    browsePath(parentPath);
  };

  const handleManualPathSubmit = () => {
    if (manualPath) {
      browsePath(manualPath);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;

    try {
      const newPath =
        path +
        (path.endsWith("/") || path.endsWith("\\")
          ? ""
          : path.includes("\\")
            ? "\\"
            : "/") +
        newFolderName;
      await axios.post(`${API_BASE}/filesystem/create`, { path: newPath });
      setNewFolderName("");
      setShowCreateFolder(false);
      browsePath(path); // Refresh
    } catch (error) {
      setError("Failed to create folder: " + error.message);
    }
  };

  const handleSelect = () => {
    onSelect(path);
    onClose();
  };

  const getBreadcrumbs = () => {
    if (!path) return [];
    const parts = path.split(/[\/\\]/).filter((p) => p);
    const breadcrumbs = [];
    let currentPath = "";

    parts.forEach((part, idx) => {
      currentPath += part + (path.includes("\\") ? "\\" : "/");
      breadcrumbs.push({
        label: part || "Root",
        path: currentPath,
      });
    });

    return breadcrumbs;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Browse Folders
        <IconButton
          onClick={handleGoUp}
          disabled={
            !path ||
            path === "/" ||
            path.match(/^[A-Z]:\\$/i) || // Windows drive root
            loading
          }
          sx={{ ml: 2 }}
          title="Go to parent folder"
        >
          <ArrowUpIcon />
        </IconButton>
        <IconButton onClick={() => browsePath(path)} disabled={loading}>
          <RefreshIcon />
        </IconButton>
        <IconButton onClick={() => setShowCreateFolder(!showCreateFolder)}>
          <CreateFolderIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          {getBreadcrumbs().map((crumb, idx) => (
            <Link
              key={idx}
              component="button"
              variant="body2"
              onClick={() => browsePath(crumb.path)}
            >
              {crumb.label}
            </Link>
          ))}
        </Breadcrumbs>

        {/* Manual path input */}
        <Box display="flex" gap={1} mb={2}>
          <TextField
            fullWidth
            size="small"
            label="Path"
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleManualPathSubmit()}
          />
          <Button variant="outlined" onClick={handleManualPathSubmit}>
            Go
          </Button>
        </Box>

        {/* Create folder */}
        {showCreateFolder && (
          <Box display="flex" gap={1} mb={2}>
            <TextField
              fullWidth
              size="small"
              label="New Folder Name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCreateFolder()}
            />
            <Button variant="contained" onClick={handleCreateFolder}>
              Create
            </Button>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box display="flex" gap={2}>
          {/* Shortcuts sidebar */}
          <Box
            sx={{ width: 150, borderRight: 1, borderColor: "divider", pr: 1 }}
          >
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Quick Access
            </Typography>
            <List dense>
              {shortcuts.map((shortcut, idx) => (
                <ListItem key={idx} disablePadding>
                  <ListItemButton onClick={() => browsePath(shortcut.path)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {shortcut.icon === "home" ? (
                        <HomeIcon />
                      ) : (
                        <ComputerIcon />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={shortcut.name}
                      primaryTypographyProps={{ variant: "caption" }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Directory list */}
          <Box
            sx={{ flex: 1, minHeight: 400, maxHeight: 400, overflow: "auto" }}
          >
            {loading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
              >
                <CircularProgress />
              </Box>
            ) : directories.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No folders in this directory
              </Typography>
            ) : (
              <List>
                {directories.map((dir, idx) => (
                  <ListItem key={idx} disablePadding>
                    <ListItemButton
                      onClick={() => handleFolderClick(dir.path)}
                      onDoubleClick={() => handleFolderClick(dir.path)}
                    >
                      <ListItemIcon>
                        <FolderIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={dir.name} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSelect} variant="contained">
          Select This Folder
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FolderBrowser;
