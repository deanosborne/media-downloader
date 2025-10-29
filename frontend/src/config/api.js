// API Configuration
const getApiBase = () => {
  // Check for environment variable first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Dynamic configuration based on hostname
  const hostname = window.location.hostname;
  const port = process.env.REACT_APP_API_PORT || "5000";

  // If accessing via localhost, use localhost
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://localhost:${port}/api`;
  }

  // Otherwise use the current hostname (for network access)
  return `http://${hostname}:${port}/api`;
};

export const API_BASE = getApiBase();

// Optional: Export other API-related configs
export const API_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRIES = 3;
