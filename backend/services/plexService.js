import axios from "axios";
import path from "path";
import fs from "fs-extra";
import { formatEpisodeForPlex } from "./tvShowParser.js";

// Read config dynamically
const getPlexConfig = () => {
  return {
    url: process.env.PLEX_URL || "http://localhost:32400",
    token: process.env.PLEX_TOKEN,
  };
};

export const refreshLibrary = async () => {
  try {
    const config = getPlexConfig();

    if (!config.token) {
      console.warn("Plex token not configured, skipping library refresh");
      return;
    }

    await axios.get(`${config.url}/library/sections/all/refresh`, {
      params: {
        "X-Plex-Token": config.token,
      },
      timeout: 10000,
    });
    console.log("Plex library refresh triggered");
  } catch (error) {
    console.error("Plex refresh error:", error.message);
  }
};

// Rest of the file stays the same...
export const moveToPlexLibrary = async (
  filePath,
  type,
  name,
  year,
  season = null,
  episode = null,
  episodeName = null
) => {
  try {
    const targetPath = getTargetPath(
      type,
      name,
      year,
      season,
      episode,
      episodeName
    );
    await fs.ensureDir(path.dirname(targetPath));
    await fs.move(filePath, targetPath, { overwrite: false });

    await refreshLibrary();

    return targetPath;
  } catch (error) {
    console.error("Move to Plex error:", error.message);
    throw error;
  }
};

export const moveSeasonPackToPlexLibrary = async (
  directoryPath,
  showName,
  season,
  episodes
) => {
  try {
    const files = await fs.readdir(directoryPath);
    const videoExtensions = [".mkv", ".mp4", ".avi", ".m4v"];
    const movedFiles = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!videoExtensions.includes(ext)) continue;

      const filePath = path.join(directoryPath, file);

      const episodeMatch = file.match(/e(\d{1,2})/i);
      if (episodeMatch) {
        const episodeNum = parseInt(episodeMatch[1]);
        const episodeName =
          episodes?.find((ep) => ep.episode_number === episodeNum)?.name || "";

        const targetPath = getTargetPath(
          "TV Show",
          showName,
          null,
          season,
          episodeNum,
          episodeName
        );

        await fs.ensureDir(path.dirname(targetPath));
        await fs.move(filePath, targetPath, { overwrite: false });
        movedFiles.push(targetPath);
      }
    }

    await refreshLibrary();
    return movedFiles;
  } catch (error) {
    console.error("Move season pack error:", error.message);
    throw error;
  }
};

const getTargetPath = (
  type,
  name,
  year,
  season = null,
  episode = null,
  episodeName = null
) => {
  const sanitizedName = name.replace(/[<>:"/\\|?*]/g, "");

  switch (type) {
    case "Movie":
      return path.join(
        process.env.PLEX_MOVIE_PATH || "/movies",
        `${sanitizedName} (${year})`,
        `${sanitizedName} (${year}).mkv`
      );

    case "TV Show":
      const seasonStr = String(season).padStart(2, "0");
      const episodeStr = episode ? String(episode).padStart(2, "0") : null;
      const fileName = episodeName
        ? formatEpisodeForPlex(sanitizedName, season, episode, episodeName)
        : formatEpisodeForPlex(sanitizedName, season, episode);

      return path.join(
        process.env.PLEX_TV_PATH || "/tv",
        sanitizedName,
        `Season ${seasonStr}`,
        `${fileName}.mkv`
      );

    case "Book":
      return path.join(
        process.env.PLEX_BOOKS_PATH || "/books",
        `${sanitizedName}.epub`
      );

    case "Audiobook":
      return path.join(
        process.env.PLEX_AUDIOBOOKS_PATH || "/audiobooks",
        sanitizedName,
        `${sanitizedName}.m4b`
      );

    default:
      return path.join(
        process.env.DOWNLOAD_PATH || "/downloads",
        sanitizedName
      );
  }
};
