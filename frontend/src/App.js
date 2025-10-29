import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  IconButton,
  Chip,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Alert,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  HighQuality as QualityIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import axios from "axios";
import TVShowSelector from "./components/TVShowSelector";
import SetupWizard from "./components/SetupWizard";
import SettingsDialog from "./components/SettingsDialog";
import { API_BASE } from "./config/api";

const types = ["Movie", "TV Show", "Book", "Audiobook", "Application"];
const resolutions = ["any", "2160p", "1080p", "720p", "480p"];

function App() {
  const [type, setType] = useState("Movie");
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);

  // Quality selection state
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);
  const [availableTorrents, setAvailableTorrents] = useState(null);
  const [selectedResolution, setSelectedResolution] = useState("any");
  const [minSeeders, setMinSeeders] = useState(5);

  // TV Show selector state
  const [tvSelectorOpen, setTvSelectorOpen] = useState(false);
  const [selectedTVShow, setSelectedTVShow] = useState(null);

  // Configuration state
  const [setupOpen, setSetupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteFiles, setDeleteFiles] = useState(false);

  const [autoDownload, setAutoDownload] = useState(false);
  const [preferredResolution, setPreferredResolution] = useState("1080p");
  const [preferredMinSeeders, setPreferredMinSeeders] = useState(10);

  // Memoized functions
  const fetchQueue = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/queue`);
      setQueue(response.data);
    } catch (error) {
      console.error("Fetch queue error:", error);
    }
  }, []);

  const checkConfiguration = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/config/status`);
      if (!response.data.configured) {
        setSetupOpen(true);
      }

      // Load download preferences
      const configResponse = await axios.get(`${API_BASE}/config`);
      setAutoDownload(configResponse.data.AUTO_DOWNLOAD === "true");
      setPreferredResolution(
        configResponse.data.PREFERRED_RESOLUTION || "1080p"
      );
      setPreferredMinSeeders(
        parseInt(configResponse.data.PREFERRED_MIN_SEEDERS) || 10
      );
    } catch (error) {
      console.error("Check config error:", error);
    }
  }, []);

  const searchSuggestions = useCallback(async () => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/search`, {
        params: { query: input, type },
      });
      setSuggestions(response.data || []);
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, [input, type]);

  // Check if configured on mount
  useEffect(() => {
    checkConfiguration();
  }, [checkConfiguration]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      if (input.length >= 2) {
        searchSuggestions();
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [input, type, searchSuggestions]);

  const addToQueue = async () => {
    if (!selectedItem && !input) return;

    const item = selectedItem || { name: input, year: null, id: null };

    // If it's a TV show, open the season/episode selector
    if (type === "TV Show" && item.id) {
      setSelectedTVShow(item);
      setTvSelectorOpen(true);
      return;
    }

    // For movies and other types, add directly
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/queue`, {
        type,
        name: item.name,
        year: item.year,
        tmdb_id: item.id,
      });

      setInput("");
      setSelectedItem(null);
      setSuggestions([]);
      await fetchQueue();
    } catch (error) {
      console.error("Add to queue error:", error);
    }
    setLoading(false);
  };

  const handleTVShowAdd = async (tvShowData) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/queue`, {
        type: "TV Show",
        name: tvShowData.name,
        year: tvShowData.year,
        tmdb_id: tvShowData.id,
        season: tvShowData.season,
        episode: tvShowData.episode,
        episode_name: tvShowData.episode_name,
        is_season_pack: tvShowData.is_season_pack,
      });

      setInput("");
      setSelectedItem(null);
      setSuggestions([]);
      await fetchQueue();
    } catch (error) {
      console.error("Add TV show error:", error);
    }
    setLoading(false);
  };

  const openQualityDialog = async (item) => {
    // If auto-download is enabled, start download immediately
    if (autoDownload) {
      try {
        await axios.post(`${API_BASE}/queue/${item.id}/start`, {
          qualityPrefs: {
            resolution: preferredResolution,
            minSeeders: preferredMinSeeders,
          },
        });
        await fetchQueue();
      } catch (error) {
        console.error("Auto-download error:", error);
      }
      return;
    }

    // Otherwise show quality dialog
    setSelectedQueueItem(item);
    setQualityDialogOpen(true);
    setAvailableTorrents(null);

    try {
      const searchQuery = `${item.name} ${item.year || ""}`;
      const params = {
        query: searchQuery,
        type: item.type,
        resolution: selectedResolution,
        minSeeders: minSeeders,
      };

      if (item.season) {
        params.season = item.season;
        if (item.episode) {
          params.episode = item.episode;
        }
      }

      const response = await axios.get(`${API_BASE}/torrents/search`, {
        params,
      });
      setAvailableTorrents(response.data);
    } catch (error) {
      console.error("Search torrents error:", error);
    }
  };

  const startDownloadWithQuality = async (torrentLink = null) => {
    try {
      await axios.post(`${API_BASE}/queue/${selectedQueueItem.id}/start`, {
        torrentLink: torrentLink,
        qualityPrefs: {
          resolution: selectedResolution,
          minSeeders: minSeeders,
        },
      });

      setQualityDialogOpen(false);
      setAvailableTorrents(null);
      await fetchQueue();
    } catch (error) {
      console.error("Start download error:", error);
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setDeleteFiles(false);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await axios.delete(`${API_BASE}/queue/${itemToDelete.id}`, {
        data: { deleteFiles },
      });

      setDeleteDialogOpen(false);
      setItemToDelete(null);
      await fetchQueue();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "info";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status) => {
    return status.replace("_", " ").toUpperCase();
  };

  const filterQueueByStatus = (status) => {
    switch (status) {
      case 0:
        return queue.filter((item) => item.status === "not_started");
      case 1:
        return queue.filter((item) => item.status === "in_progress");
      case 2:
        return queue.filter((item) => item.status === "completed");
      default:
        return queue;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4" component="h1">
            Media Downloader
          </Typography>
          <IconButton onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Box>

        <Box mb={4}>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          >
            {types.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>

          <Autocomplete
            freeSolo
            options={suggestions}
            loading={searchLoading}
            value={selectedItem}
            getOptionLabel={(option) =>
              typeof option === "string"
                ? option
                : `${option.name} (${option.year || "N/A"})`
            }
            inputValue={input}
            onInputChange={(e, newVal) => {
              if (e && e.type !== "click") {
                setInput(newVal);
              }
            }}
            onChange={(e, newVal) => {
              if (newVal && typeof newVal === "object") {
                setSelectedItem(newVal);
                setInput(newVal.name);
                setSuggestions([]);
              } else {
                setSelectedItem(null);
              }
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  {option.poster && (
                    <Box
                      component="img"
                      src={option.poster}
                      alt={option.name}
                      sx={{
                        width: 40,
                        height: 60,
                        objectFit: "cover",
                        borderRadius: 1,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" noWrap>
                      {option.name} {option.year && `(${option.year})`}
                    </Typography>
                    {option.authors && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        By {option.authors}
                      </Typography>
                    )}
                    {option.overview && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {option.overview.substring(0, 120)}...
                      </Typography>
                    )}
                  </Box>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Name"
                placeholder="Start typing to search..."
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchLoading ? (
                        <Box
                          sx={{ display: "flex", alignItems: "center", mr: 2 }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mr: 1 }}
                          >
                            Searching...
                          </Typography>
                        </Box>
                      ) : input.length >= 2 &&
                        suggestions.length === 0 &&
                        !searchLoading ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mr: 2 }}
                          >
                          No results
                          </Typography>
                        ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            noOptionsText={
              input.length < 2
                ? "Type at least 2 characters to search"
                : "No results found"
            }
            openOnFocus={false}
          />
          {selectedItem && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Selected: {selectedItem.name}{" "}
                {selectedItem.year && `(${selectedItem.year})`}
              </Typography>
              {selectedItem.authors && (
                <Typography variant="caption" color="text.secondary">
                  By {selectedItem.authors}
                </Typography>
              )}
            </Box>
          )}

          {input.length > 0 && input.length < 2 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Type at least 2 characters to see suggestions
            </Typography>
          )}
          {suggestions.length > 0 && (
            <Typography
              variant="caption"
              color="primary"
              sx={{ mt: 1, display: "block" }}
            >
              {suggestions.length} result{suggestions.length !== 1 ? "s" : ""}{" "}
              found
            </Typography>
          )}

          <Button
            variant="contained"
            onClick={addToQueue}
            disabled={(!selectedItem && !input) || loading}
            fullWidth
            sx={{ mt: 2 }}
            size="large"
          >
            Add to Queue
          </Button>
        </Box>

        <Box>
          <Tabs
            value={tab}
            onChange={(e, newVal) => setTab(newVal)}
            sx={{ mb: 2 }}
          >
            <Tab
              label={`Not Started (${
                queue.filter((i) => i.status === "not_started").length
              })`}
            />
            <Tab
              label={`In Progress (${
                queue.filter((i) => i.status === "in_progress").length
              })`}
            />
            <Tab
              label={`Completed (${
                queue.filter((i) => i.status === "completed").length
              })`}
            />
          </Tabs>

          <List>
            {filterQueueByStatus(tab).map((item) => (
              <ListItem
                key={item.id}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  mb: 1,
                }}
                secondaryAction={
                  <Box>
                    {item.status === "not_started" && (
                      <IconButton
                        edge="end"
                        onClick={() => openQualityDialog(item)}
                        sx={{ mr: 1 }}
                        color={autoDownload ? "success" : "default"}
                        title={
                          autoDownload
                            ? "Auto-download enabled"
                            : "Select quality"
                        }
                      >
                        {autoDownload ? <DownloadIcon /> : <QualityIcon />}
                      </IconButton>
                    )}

                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteClick(item)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">
                        {item.name} {item.year && `(${item.year})`}
                        {item.season && (
                          <>
                            {" "}
                            S{String(item.season).padStart(2, "0")}
                            {item.episode &&
                              `E${String(item.episode).padStart(2, "0")}`}
                            {item.is_season_pack === 1 && " (Full Season)"}
                          </>
                        )}
                      </Typography>
                      <Chip label={item.type} size="small" variant="outlined" />
                      <Chip
                        label={getStatusLabel(item.status)}
                        size="small"
                        color={getStatusColor(item.status)}
                      />
                    </Box>
                  }
                  secondary={
                    <Box mt={1}>
                      {item.episode_name && (
                        <Typography variant="caption" display="block">
                          Episode: {item.episode_name}
                        </Typography>
                      )}
                      {item.torrent_name && (
                        <Typography variant="caption" display="block">
                          Torrent: {item.torrent_name}
                        </Typography>
                      )}
                      {item.error && (
                        <Typography
                          variant="caption"
                          color="error"
                          display="block"
                        >
                          Error: {item.error}
                        </Typography>
                      )}
                      {item.status === "in_progress" && (
                        <Box mt={1}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={0.5}
                          >
                            <Typography variant="caption">
                              {item.progress}%
                            </Typography>
                            {item.download_speed && (
                              <Typography variant="caption" color="primary">
                                {item.download_speed}
                              </Typography>
                            )}
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={item.progress}
                            sx={{
                              height: 8,
                              borderRadius: 1,
                              "& .MuiLinearProgress-bar": {
                                transition: "transform 0.2s linear",
                              },
                            }}
                          />
                          {item.progress <= 10 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              mt={0.5}
                            >
                              Cached on Real-Debrid, starting download...
                            </Typography>
                          )}
                          {item.progress > 10 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              mt={0.5}
                            >
                              Downloading from Real-Debrid servers...
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
            {filterQueueByStatus(tab).length === 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                py={4}
              >
                No items in this category
              </Typography>
            )}
          </List>
        </Box>
      </Paper>

      <SetupWizard
        open={setupOpen}
        onComplete={() => {
          setSetupOpen(false);
          window.location.reload();
        }}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <TVShowSelector
        open={tvSelectorOpen}
        onClose={() => setTvSelectorOpen(false)}
        tvShow={selectedTVShow}
        onAdd={handleTVShowAdd}
      />

      <Dialog
        open={qualityDialogOpen}
        onClose={() => setQualityDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <QualityIcon />
            Select Quality
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              {selectedQueueItem?.name}{" "}
              {selectedQueueItem?.year && `(${selectedQueueItem.year})`}
              {selectedQueueItem?.season && (
                <> S{String(selectedQueueItem.season).padStart(2, "0")}</>
              )}
              {selectedQueueItem?.episode && (
                <>E{String(selectedQueueItem.episode).padStart(2, "0")}</>
              )}
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Resolution</InputLabel>
                  <Select
                    value={selectedResolution}
                    onChange={(e) => setSelectedResolution(e.target.value)}
                    label="Resolution"
                  >
                    {resolutions.map((res) => (
                      <MenuItem key={res} value={res}>
                        {res === "any" ? "Any Resolution" : res}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Minimum Seeders"
                  type="number"
                  value={minSeeders}
                  onChange={(e) => setMinSeeders(parseInt(e.target.value) || 0)}
                />
              </Grid>
            </Grid>
          </Box>

          {!availableTorrents ? (
            <Box textAlign="center" py={4}>
              <Typography>Searching for torrents...</Typography>
            </Box>
          ) : availableTorrents.all.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography>No torrents found with selected criteria</Typography>
            </Box>
          ) : (
            <Box>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => startDownloadWithQuality()}
                fullWidth
                sx={{ mb: 2 }}
              >
                Start Download with Most Seeders
              </Button>
              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Or select a specific torrent:
              </Typography>
              {availableTorrents.grouped.map((group, idx) => (
                <Accordion key={idx}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={group.resolution}
                        size="small"
                        color="primary"
                      />
                      <Chip label={group.quality} size="small" />
                      <Typography variant="caption">
                        ({group.torrents.length} options)
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {group.torrents.slice(0, 5).map((torrent, tidx) => (
                      <Card key={tidx} sx={{ mb: 1 }}>
                        <CardContent sx={{ pb: 1 }}>
                          <Typography variant="caption" display="block" noWrap>
                            {torrent.name}
                          </Typography>
                          <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                            <Chip
                              label={`${torrent.seeders} seeds`}
                              size="small"
                              color="success"
                            />
                            <Chip label={torrent.sizeFormatted} size="small" />
                            <Chip label={torrent.codec} size="small" />
                            {torrent.hdr && (
                              <Chip
                                label="HDR"
                                size="small"
                                color="secondary"
                              />
                            )}
                          </Box>
                        </CardContent>
                        <CardActions>
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() =>
                              startDownloadWithQuality(torrent.magnet)
                            }
                          >
                            Download This
                          </Button>
                        </CardActions>
                      </Card>
                    ))}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQualityDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Item?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to delete &quot;{itemToDelete?.name}&quot;?
          </Typography>

          {itemToDelete?.status === "in_progress" && (
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              This download is currently in progress. Deleting will stop the
              download.
            </Alert>
          )}

          {itemToDelete?.status === "completed" && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteFiles}
                  onChange={(e) => setDeleteFiles(e.target.checked)}
                  color="error"
                />
              }
              label="Also delete downloaded files from Plex library"
            />
          )}

          {itemToDelete?.status === "in_progress" && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteFiles}
                  onChange={(e) => setDeleteFiles(e.target.checked)}
                  color="error"
                />
              }
              label="Delete incomplete download files and cancel torrent"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App;
