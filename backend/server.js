import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import os from "os";
import {
  dbRun,
  dbGet,
  dbAll,
  getConfig,
  setConfig,
  getAllConfig,
  isConfigured,
} from "./database.js";
import {
  searchMedia,
  getTVShowDetails,
  getSeasonDetails,
  getEpisodeDetails,
} from "./services/tmdbService.js";
import { searchTorrents } from "./services/jackettService.js";
import {
  addMagnet,
  selectFiles,
  getTorrentInfo,
  unrestrict,
  downloadFile,
} from "./services/realDebridService.js";
import { startDownloadMonitor } from "./services/downloadMonitor.js";
import {
  moveSeasonPackToPlexLibrary,
  moveToPlexLibrary,
} from "./services/plexService.js";
import {
  buildTVSearchQuery,
  filterTVTorrents,
} from "./services/tvShowParser.js";
import { groupByQuality } from "./services/torrentParser.js";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, "../frontend/build")));

// Helper function to get local IP (synchronous)
function getLocalIP() {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
      if (net.family === familyV4Value && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

// Print welcome banner
function printWelcomeBanner(port) {
  const localIP = getLocalIP();

  console.log("\n" + "=".repeat(60));
  console.log("🎬  MEDIA DOWNLOADER - SERVER RUNNING");
  console.log("=".repeat(60));
  console.log("");
  console.log("📍 Access Points:");
  console.log(`   Local:   http://localhost:${port}`);
  console.log(`   Network: http://${localIP}:${port}`);
  console.log("");
  console.log("👥 Network Users:");
  console.log(`   Share this URL: http://${localIP}:${port}`);
  console.log("");
  console.log("⚙️  Status:");
  console.log(`   Config: ${process.env.TMDB_API_KEY ? "✓" : "✗"} Configured`);
  console.log(`   Port:   ${port}`);
  console.log("");
  console.log("Press Ctrl+C to stop");
  console.log("=".repeat(60) + "\n");
}

// Load config from database
const loadConfigFromDatabase = async () => {
  try {
    const config = await getAllConfig();
    console.log("\n=== Loading Configuration ===");

    let loadedCount = 0;
    for (const [key, value] of Object.entries(config)) {
      if (value && value.trim() !== "") {
        process.env[key] = value;
        loadedCount++;

        if (key.includes("API_KEY") || key.includes("TOKEN")) {
          console.log(`  ✓ Loaded ${key}: ${value.substring(0, 8)}...`);
        } else {
          console.log(`  ✓ Loaded ${key}: ${value}`);
        }
      }
    }

    if (loadedCount > 0) {
      console.log(`✓ ${loadedCount} configuration values loaded from database`);
    } else {
      console.log("⚠ No configuration found in database, will use .env values");
    }

    if (process.env.TMDB_API_KEY) {
      console.log(
        `✓ TMDB_API_KEY is available: ${process.env.TMDB_API_KEY.substring(
          0,
          8
        )}...`
      );
    } else {
      console.log("⚠ TMDB_API_KEY is NOT set!");
    }

    console.log("=============================\n");
  } catch (error) {
    console.error("Failed to load configuration:", error.message);
  }
};

// ============= API ENDPOINTS =============

// Config check endpoint
app.get("/api/config/check", async (req, res) => {
  res.json({
    tmdb_configured: !!process.env.TMDB_API_KEY,
    tmdb_key_preview: process.env.TMDB_API_KEY
      ? process.env.TMDB_API_KEY.substring(0, 8) + "..."
      : "NOT SET",
    jackett_configured: !!process.env.JACKETT_API_KEY,
    realdebrid_configured: !!process.env.REAL_DEBRID_API_KEY,
    plex_configured: !!process.env.PLEX_TOKEN,
  });
});

// Configuration endpoints
app.get("/api/config/status", async (req, res) => {
  try {
    const configured = await isConfigured();
    res.json({ configured });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/config", async (req, res) => {
  try {
    const config = await getAllConfig();

    const safeConfig = {};
    for (const [key, value] of Object.entries(config)) {
      if (key.includes("API_KEY") || key.includes("TOKEN")) {
        safeConfig[key] = value ? "••••••••" : "";
      } else {
        safeConfig[key] = value;
      }
    }

    res.json(safeConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/config", async (req, res) => {
  try {
    const config = req.body;
    let savedCount = 0;

    for (const [key, value] of Object.entries(config)) {
      if (!value || value === "••••••••" || value.trim() === "") {
        continue;
      }

      await setConfig(key, value);
      process.env[key] = value;
      savedCount++;
      console.log(`✓ Saved ${key}`);
    }

    console.log(`✓ Configuration saved (${savedCount} values)`);
    res.json({
      message: "Configuration saved successfully",
      saved: savedCount,
    });
  } catch (error) {
    console.error("Save config error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Test connection endpoints
app.post("/api/config/test/tmdb", async (req, res) => {
  try {
    const { apiKey } = req.body;
    await axios.get("https://api.themoviedb.org/3/configuration", {
      params: { api_key: apiKey },
    });
    res.json({ success: true, message: "TMDB connection successful" });
  } catch (error) {
    res.json({
      success: false,
      message: error.response?.data?.status_message || error.message,
    });
  }
});

app.post("/api/config/test/jackett", async (req, res) => {
  try {
    const { url, apiKey } = req.body;
    await axios.get(`${url}/api/v2.0/indexers/all/results/torznab/api`, {
      params: { apikey: apiKey, t: "caps" },
    });
    res.json({ success: true, message: "Jackett connection successful" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.post("/api/config/test/realdebrid", async (req, res) => {
  try {
    const { apiKey } = req.body;
    const response = await axios.get(
      "https://api.real-debrid.com/rest/1.0/user",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );
    res.json({
      success: true,
      message: `Connected as ${response.data.username}`,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.response?.data?.error || error.message,
    });
  }
});

app.post("/api/config/test/plex", async (req, res) => {
  try {
    const { url, token } = req.body;
    const response = await axios.get(`${url}/identity`, {
      params: { "X-Plex-Token": token },
    });
    res.json({
      success: true,
      message: `Connected to ${response.data.friendlyName}`,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Filesystem endpoints
app.get("/api/filesystem/shortcuts", (req, res) => {
  const shortcuts = [];

  if (process.platform === "win32") {
    ["C:\\", "D:\\", "E:\\", "F:\\", "G:\\"].forEach((drive) => {
      try {
        if (fs.existsSync(drive)) {
          shortcuts.push({
            name: drive.replace("\\", ""),
            path: drive,
            icon: "drive",
          });
        }
      } catch (e) {}
    });

    try {
      shortcuts.push({
        name: "Documents",
        path: path.join(os.homedir(), "Documents"),
        icon: "folder",
      });

      shortcuts.push({
        name: "Downloads",
        path: path.join(os.homedir(), "Downloads"),
        icon: "folder",
      });
    } catch (e) {}
  } else {
    shortcuts.push({
      name: "Root",
      path: "/",
      icon: "drive",
    });

    shortcuts.push({
      name: "Home",
      path: os.homedir(),
      icon: "home",
    });

    ["/home", "/mnt", "/media", "/opt", "/var"].forEach((dir) => {
      try {
        if (fs.existsSync(dir)) {
          shortcuts.push({
            name: path.basename(dir),
            path: dir,
            icon: "folder",
          });
        }
      } catch (e) {}
    });
  }

  res.json(shortcuts);
});

app.get("/api/filesystem/browse", async (req, res) => {
  try {
    let browsePath = req.query.path;

    if (!browsePath) {
      browsePath = process.platform === "win32" ? "C:\\" : "/";
    }

    browsePath = path.normalize(browsePath);

    const allowedPaths = [
      os.homedir(),
      "C:\\",
      "D:\\",
      "E:\\",
      "F:\\",
      "G:\\",
      "/",
      "/home",
      "/mnt",
      "/media",
      "/opt",
      "/var",
      "/usr",
    ];

    const isAllowed = allowedPaths.some((allowed) => {
      const normalizedAllowed = path.normalize(allowed);
      return (
        browsePath.startsWith(normalizedAllowed) ||
        normalizedAllowed.startsWith(browsePath) ||
        browsePath === normalizedAllowed
      );
    });

    if (!isAllowed) {
      return res.status(403).json({ error: "Access denied to this path" });
    }

    if (!fs.existsSync(browsePath)) {
      browsePath = process.platform === "win32" ? "C:\\" : "/";
    }

    const items = await fs.readdir(browsePath, { withFileTypes: true });

    const directories = items
      .filter((item) => item.isDirectory())
      .map((item) => ({
        name: item.name,
        path: path.join(browsePath, item.name),
        type: "directory",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    let parentPath = path.dirname(browsePath);

    if (
      browsePath === "C:\\" ||
      browsePath === "/" ||
      browsePath === parentPath
    ) {
      parentPath = null;
    }

    res.json({
      currentPath: browsePath,
      parentPath: parentPath,
      directories: directories,
    });
  } catch (error) {
    console.error("Browse error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/filesystem/create", async (req, res) => {
  try {
    const { path: dirPath } = req.body;

    if (!dirPath) {
      return res.status(400).json({ error: "Path is required" });
    }

    await fs.ensureDir(dirPath);
    res.json({ success: true, path: dirPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search suggestions endpoint
app.get("/api/search", async (req, res) => {
  try {
    const { query, type } = req.query;

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const results = await searchMedia(query, type);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TV Show endpoints
app.get("/api/tv/:id", async (req, res) => {
  try {
    const details = await getTVShowDetails(req.params.id);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/tv/:id/season/:season", async (req, res) => {
  try {
    const details = await getSeasonDetails(req.params.id, req.params.season);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/tv/:id/season/:season/episode/:episode", async (req, res) => {
  try {
    const details = await getEpisodeDetails(
      req.params.id,
      req.params.season,
      req.params.episode
    );
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search torrents
app.get("/api/torrents/search", async (req, res) => {
  try {
    const { query, type, season, episode, resolution, minSeeders } = req.query;

    let searchQuery = query;

    if (type === "TV Show" && season) {
      searchQuery = buildTVSearchQuery(
        query,
        parseInt(season),
        episode ? parseInt(episode) : null
      );
    }

    const qualityPrefs = {
      resolution: resolution || "any",
      minSeeders: parseInt(minSeeders) || 5,
    };

    let torrents = await searchTorrents(searchQuery, type, qualityPrefs);

    if (type === "TV Show" && season) {
      torrents = filterTVTorrents(
        torrents,
        parseInt(season),
        episode ? parseInt(episode) : null
      );
    }

    const grouped = groupByQuality(torrents);

    res.json({
      total: torrents.length,
      grouped: grouped,
      all: torrents,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Queue endpoints
app.post("/api/queue", async (req, res) => {
  try {
    const {
      type,
      name,
      year,
      tmdb_id,
      season,
      episode,
      episode_name,
      is_season_pack,
    } = req.body;

    const result = await dbRun(
      `INSERT INTO queue (
        type, name, year, tmdb_id, season, episode, episode_name, is_season_pack
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        name,
        year,
        tmdb_id,
        season || null,
        episode || null,
        episode_name || null,
        is_season_pack ? 1 : 0,
      ]
    );

    const item = await dbGet("SELECT * FROM queue WHERE id = ?", [result.id]);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/queue", async (req, res) => {
  try {
    const queue = await dbAll("SELECT * FROM queue ORDER BY created_at DESC");
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/queue/:id/start", async (req, res) => {
  try {
    const { id } = req.params;
    const { torrentLink, qualityPrefs } = req.body;

    const item = await dbGet("SELECT * FROM queue WHERE id = ?", [id]);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    let selectedTorrent;

    if (torrentLink) {
      selectedTorrent = { magnet: torrentLink };
    } else {
      let searchQuery = `${item.name} ${item.year || ""}`;
      if (item.type === "TV Show" && item.season) {
        searchQuery = buildTVSearchQuery(item.name, item.season, item.episode);
      }

      let torrents = await searchTorrents(
        searchQuery,
        item.type,
        qualityPrefs || {}
      );

      if (item.type === "TV Show" && item.season) {
        torrents = filterTVTorrents(torrents, item.season, item.episode);
      }

      if (torrents.length === 0) {
        await dbRun("UPDATE queue SET status = ?, error = ? WHERE id = ?", [
          "error",
          "No torrents found",
          id,
        ]);
        return res.status(404).json({ error: "No torrents found" });
      }

      selectedTorrent = torrents[0];
    }

    const rdTorrent = await addMagnet(selectedTorrent.magnet);
    await selectFiles(rdTorrent.id, "all");

    await dbRun(
      `UPDATE queue SET 
        status = ?,
        torrent_name = ?,
        torrent_link = ?,
        real_debrid_id = ?,
        progress = 10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        "in_progress",
        selectedTorrent.name || "Download",
        selectedTorrent.magnet,
        rdTorrent.id,
        id,
      ]
    );

    monitorTorrent(id, rdTorrent.id);

    res.json({
      message: "Download started",
      torrent: selectedTorrent,
    });
  } catch (error) {
    await dbRun("UPDATE queue SET status = ?, error = ? WHERE id = ?", [
      "error",
      error.message,
      req.params.id,
    ]);
    res.status(500).json({ error: error.message });
  }
});

// Monitor torrent progress
// Monitor torrent progress with actual download tracking
const monitorTorrent = async (queueId, rdTorrentId) => {
  const checkProgress = async () => {
    try {
      const info = await getTorrentInfo(rdTorrentId);
      const rdProgress = info.progress || 0;

      // Update RD progress (this happens fast, usually instant)
      await dbRun("UPDATE queue SET progress = ? WHERE id = ?", [
        Math.min(rdProgress, 10), // Cap RD progress at 10%
        queueId,
      ]);

      if (info.status === "downloaded" && rdProgress === 100) {
        const links = info.links || [];
        if (links.length > 0) {
          const queueItem = await dbGet("SELECT * FROM queue WHERE id = ?", [
            queueId,
          ]);

          // Update status to downloading from RD
          await dbRun(
            "UPDATE queue SET status = ?, torrent_name = ? WHERE id = ?",
            ["in_progress", "Downloading from Real-Debrid...", queueId]
          );

          if (queueItem.is_season_pack) {
            // Handle season pack
            const tempDir = path.join(
              process.env.DOWNLOAD_PATH,
              `temp_${queueId}`
            );
            await fs.ensureDir(tempDir);

            let totalFiles = links.length;
            let completedFiles = 0;

            for (const link of links) {
              const unrestrictedLink = await unrestrict(link);
              const fileName = path.basename(
                unrestrictedLink.filename || `file${links.indexOf(link)}.mkv`
              );
              const outputPath = path.join(tempDir, fileName);

              // Download with progress tracking
              await downloadFileWithProgress(
                unrestrictedLink.download,
                outputPath,
                (progress, speed) => {
                  // Calculate overall progress: 10% for RD cache + 90% for downloads
                  const fileProgress = (completedFiles + progress) / totalFiles;
                  const overallProgress = Math.round(10 + fileProgress * 90);

                  dbRun(
                    "UPDATE queue SET progress = ?, download_speed = ? WHERE id = ?",
                    [overallProgress, speed || "", queueId]
                  ).catch((err) =>
                    console.error("Progress update error:", err)
                  );
                }
              );

              completedFiles++;
            }

            let episodes = [];
            if (queueItem.tmdb_id && queueItem.season) {
              const seasonDetails = await getSeasonDetails(
                queueItem.tmdb_id,
                queueItem.season
              );
              episodes = seasonDetails.episodes;
            }

            await moveSeasonPackToPlexLibrary(
              tempDir,
              queueItem.name,
              queueItem.season,
              episodes
            );
            await fs.remove(tempDir);

            await dbRun(
              "UPDATE queue SET status = ?, progress = ?, torrent_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              ["completed", 100, "Completed", queueId]
            );
          } else {
            // Handle single file
            const unrestrictedLink = await unrestrict(links[0]);
            const fileName = path.basename(
              unrestrictedLink.filename || "download.mkv"
            );
            const outputPath = path.join(process.env.DOWNLOAD_PATH, fileName);

            // Download with progress tracking
            await downloadFileWithProgress(
              unrestrictedLink.download,
              outputPath,
              (progress, speed) => {
                // 10% for RD cache + 90% for download
                const overallProgress = Math.round(10 + progress * 90);

                dbRun(
                  "UPDATE queue SET progress = ?, download_speed = ? WHERE id = ?",
                  [overallProgress, speed || "", queueId]
                ).catch((err) => console.error("Progress update error:", err));
              }
            );

            const newPath = await moveToPlexLibrary(
              outputPath,
              queueItem.type,
              queueItem.name,
              queueItem.year,
              queueItem.season,
              queueItem.episode,
              queueItem.episode_name
            );

            await dbRun(
              "UPDATE queue SET status = ?, progress = ?, file_path = ?, torrent_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              ["completed", 100, newPath, "Completed", queueId]
            );
          }
        }
      } else if (info.status === "error") {
        await dbRun("UPDATE queue SET status = ?, error = ? WHERE id = ?", [
          "error",
          info.error || "Download failed",
          queueId,
        ]);
      } else {
        setTimeout(checkProgress, 5000); // Check every 5 seconds
      }
    } catch (error) {
      console.error("Monitor error:", error.message);
      await dbRun("UPDATE queue SET status = ?, error = ? WHERE id = ?", [
        "error",
        error.message,
        queueId,
      ]);
    }
  };

  checkProgress();
};

// Helper function to download with progress tracking
const downloadFileWithProgress = (url, outputPath, onProgress) => {
  return new Promise((resolve, reject) => {
    axios({
      method: "get",
      url: url,
      responseType: "stream",
    })
      .then((response) => {
        const totalSize = parseInt(response.headers["content-length"], 10);
        let downloadedSize = 0;
        let lastUpdate = Date.now();
        let lastSize = 0;

        const writer = fs.createWriteStream(outputPath);

        response.data.on("data", (chunk) => {
          downloadedSize += chunk.length;

          const now = Date.now();
          if (now - lastUpdate > 500) {
            const progress = totalSize > 0 ? downloadedSize / totalSize : 0;

            // Calculate speed
            const timeDiff = (now - lastUpdate) / 1000; // seconds
            const sizeDiff = downloadedSize - lastSize;
            const speedBps = sizeDiff / timeDiff; // bytes per second
            const speedMbps = (speedBps / (1024 * 1024)).toFixed(2); // MB/s

            onProgress(progress, `${speedMbps} MB/s`);

            lastUpdate = now;
            lastSize = downloadedSize;
          }
        });

        response.data.pipe(writer);

        writer.on("finish", () => {
          onProgress(1, "Complete");
          resolve();
        });

        writer.on("error", reject);
      })
      .catch(reject);
  });
};

app.delete("/api/queue/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteFiles } = req.body;

    // Get the item details before deleting
    const item = await dbGet("SELECT * FROM queue WHERE id = ?", [id]);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // If delete files is requested, clean up files
    if (deleteFiles) {
      // Delete completed files
      if (item.file_path && fs.existsSync(item.file_path)) {
        try {
          await fs.remove(item.file_path);
          console.log(`Deleted file: ${item.file_path}`);

          // Also try to delete the parent directory if empty
          const parentDir = path.dirname(item.file_path);
          const files = await fs.readdir(parentDir);
          if (files.length === 0) {
            await fs.remove(parentDir);
            console.log(`Deleted empty directory: ${parentDir}`);
          }
        } catch (err) {
          console.error("Error deleting file:", err.message);
        }
      }

      // Delete in-progress downloads
      if (item.status === "in_progress") {
        // Delete from download path
        const downloadPath = process.env.DOWNLOAD_PATH;
        if (downloadPath && fs.existsSync(downloadPath)) {
          try {
            const files = await fs.readdir(downloadPath);
            // Find files that might belong to this download
            const searchTerm = item.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");

            for (const file of files) {
              const fileName = file.toLowerCase().replace(/[^a-z0-9]/g, "");
              if (fileName.includes(searchTerm)) {
                const filePath = path.join(downloadPath, file);
                await fs.remove(filePath);
                console.log(`Deleted in-progress file: ${filePath}`);
              }
            }

            // Delete temp directory if exists
            const tempDir = path.join(downloadPath, `temp_${id}`);
            if (fs.existsSync(tempDir)) {
              await fs.remove(tempDir);
              console.log(`Deleted temp directory: ${tempDir}`);
            }
          } catch (err) {
            console.error("Error deleting in-progress files:", err.message);
          }
        }
      }

      // Cancel Real-Debrid torrent if exists
      if (item.real_debrid_id) {
        try {
          const rdConfig = {
            apiKey: process.env.REAL_DEBRID_API_KEY,
          };

          if (rdConfig.apiKey) {
            await axios.delete(
              `https://api.real-debrid.com/rest/1.0/torrents/delete/${item.real_debrid_id}`,
              {
                headers: { Authorization: `Bearer ${rdConfig.apiKey}` },
              }
            );
            console.log(`Deleted Real-Debrid torrent: ${item.real_debrid_id}`);
          }
        } catch (err) {
          console.error("Error deleting from Real-Debrid:", err.message);
        }
      }
    }

    // Delete from database
    await dbRun("DELETE FROM queue WHERE id = ?", [id]);

    res.json({
      message: "Deleted",
      filesDeleted: deleteFiles,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route for React app (must be AFTER all API routes)
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

// ============= START SERVER =============
loadConfigFromDatabase().then(() => {
  startDownloadMonitor();

  const server = app.listen(PORT, "0.0.0.0", () => {
    printWelcomeBanner(PORT);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`\n❌ Port ${PORT} is already in use!`);
      console.error(
        `\nRun: Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force\n`
      );
      process.exit(1);
    } else {
      console.error("Server error:", error);
      process.exit(1);
    }
  });
});
