import axios from "axios";
import fs from "fs";

const RD_BASE_URL = "https://api.real-debrid.com/rest/1.0";

// Read config dynamically
const getRealDebridConfig = () => {
  return {
    apiKey: process.env.REAL_DEBRID_API_KEY,
  };
};

const createRdAxios = () => {
  const config = getRealDebridConfig();

  if (!config.apiKey) {
    throw new Error("Real-Debrid API key not configured");
  }

  return axios.create({
    baseURL: RD_BASE_URL,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });
};

export const addMagnet = async (magnetLink) => {
  try {
    const rdAxios = createRdAxios();
    const response = await rdAxios.post(
      "/torrents/addMagnet",
      `magnet=${encodeURIComponent(magnetLink)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Real-Debrid add magnet error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const selectFiles = async (torrentId, fileIds = "all") => {
  try {
    const rdAxios = createRdAxios();
    await rdAxios.post(
      "/torrents/selectFiles/" + torrentId,
      `files=${fileIds}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
  } catch (error) {
    console.error(
      "Real-Debrid select files error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const getTorrentInfo = async (torrentId) => {
  try {
    const rdAxios = createRdAxios();
    const response = await rdAxios.get(`/torrents/info/${torrentId}`);
    return response.data;
  } catch (error) {
    console.error(
      "Real-Debrid get info error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const unrestrict = async (link) => {
  try {
    const rdAxios = createRdAxios();
    const response = await rdAxios.post(
      "/unrestrict/link",
      `link=${encodeURIComponent(link)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Real-Debrid unrestrict error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const downloadFile = async (url, outputPath) => {
  try {
    const response = await axios({
      method: "get",
      url: url,
      responseType: "stream",
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Download error:", error.message);
    throw error;
  }
};
