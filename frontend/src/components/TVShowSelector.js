import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import axios from "axios";
import { API_BASE } from "../config/api";

function TVShowSelector({ open, onClose, tvShow, onAdd }) {
  const [tvDetails, setTvDetails] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seasonDetails, setSeasonDetails] = useState(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState([]);
  const [downloadFullSeason, setDownloadFullSeason] = useState(false);

  // Fetch TV details when dialog opens
  useEffect(() => {
    if (!open || !tvShow?.id) return;

    const fetchTVDetails = async () => {
      try {
        const response = await axios.get(`${API_BASE}/tv/${tvShow.id}`);
        setTvDetails(response.data);
      } catch (error) {
        console.error("Fetch TV details error:", error);
      }
    };

    fetchTVDetails();
  }, [open, tvShow?.id]);

  // Fetch season details when season is selected
  useEffect(() => {
    if (!tvShow?.id || selectedSeason === null) return;

    const fetchSeasonDetails = async () => {
      try {
        const response = await axios.get(
          `${API_BASE}/tv/${tvShow.id}/season/${selectedSeason}`
        );
        setSeasonDetails(response.data);
        setSelectedEpisodes([]);
      } catch (error) {
        console.error("Fetch season details error:", error);
      }
    };

    fetchSeasonDetails();
  }, [tvShow?.id, selectedSeason]);

  const handleEpisodeToggle = (episodeNumber) => {
    setSelectedEpisodes((prev) => {
      if (prev.includes(episodeNumber)) {
        return prev.filter((e) => e !== episodeNumber);
      } else {
        return [...prev, episodeNumber];
      }
    });
  };

  const handleAddToQueue = () => {
    if (downloadFullSeason) {
      onAdd({
        ...tvShow,
        season: selectedSeason,
        episode: null,
        is_season_pack: true,
      });
    } else {
      selectedEpisodes.forEach((episodeNumber) => {
        const episode = seasonDetails.episodes.find(
          (ep) => ep.episode_number === episodeNumber
        );
        onAdd({
          ...tvShow,
          season: selectedSeason,
          episode: episodeNumber,
          episode_name: episode?.name,
          is_season_pack: false,
        });
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Select Season & Episodes
        {tvShow && (
          <Typography variant="subtitle2" color="text.secondary">
            {tvShow.name} {tvShow.year && `(${tvShow.year})`}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {!tvDetails ? (
          <Typography>Loading...</Typography>
        ) : (
          <Box>
            {selectedSeason === null ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Select Season
                </Typography>
                <Grid container spacing={2}>
                  {tvDetails.seasons
                    .filter((s) => s.season_number > 0)
                    .map((season) => (
                      <Grid item xs={6} sm={4} md={3} key={season.id}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">
                              Season {season.season_number}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {season.episode_count} episodes
                            </Typography>
                            {season.air_date && (
                              <Typography variant="caption" display="block">
                                {new Date(season.air_date).getFullYear()}
                              </Typography>
                            )}
                          </CardContent>
                          <CardActions>
                            <Button
                              size="small"
                              onClick={() =>
                                setSelectedSeason(season.season_number)
                              }
                            >
                              Select
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                </Grid>
              </Box>
            ) : (
              <Box>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">Season {selectedSeason}</Typography>
                  <Button
                    onClick={() => {
                      setSelectedSeason(null);
                      setSeasonDetails(null);
                      setSelectedEpisodes([]);
                    }}
                  >
                    Change Season
                  </Button>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={downloadFullSeason}
                      onChange={(e) => setDownloadFullSeason(e.target.checked)}
                    />
                  }
                  label="Download Full Season Pack"
                />

                {!downloadFullSeason && seasonDetails && (
                  <Box mt={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle2">
                        Select Episodes ({selectedEpisodes.length} selected)
                      </Typography>
                      <Box>
                        <Button
                          size="small"
                          onClick={() =>
                            setSelectedEpisodes(
                              seasonDetails.episodes.map(
                                (ep) => ep.episode_number
                              )
                            )
                          }
                        >
                          Select All
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setSelectedEpisodes([])}
                        >
                          Clear
                        </Button>
                      </Box>
                    </Box>
                    <List>
                      {seasonDetails.episodes.map((episode) => (
                        <ListItem
                          key={episode.id}
                          disablePadding
                          sx={{
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          <ListItemButton
                            onClick={() =>
                              handleEpisodeToggle(episode.episode_number)
                            }
                            selected={selectedEpisodes.includes(
                              episode.episode_number
                            )}
                          >
                            <Checkbox
                              checked={selectedEpisodes.includes(
                                episode.episode_number
                              )}
                              sx={{ mr: 1 }}
                            />
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Chip
                                    label={`E${String(
                                      episode.episode_number
                                    ).padStart(2, "0")}`}
                                    size="small"
                                  />
                                  <Typography variant="body1">
                                    {episode.name}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                episode.overview &&
                                episode.overview.substring(0, 100) + "..."
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleAddToQueue}
          variant="contained"
          disabled={
            selectedSeason === null ||
            (!downloadFullSeason && selectedEpisodes.length === 0)
          }
        >
          Add to Queue
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TVShowSelector;
