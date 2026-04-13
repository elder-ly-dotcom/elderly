const browserHost = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
const apiHost = import.meta.env.VITE_API_HOST || browserHost;
const apiPort = import.meta.env.VITE_API_PORT || "8000";
const apiProtocol = import.meta.env.VITE_API_PROTOCOL || "http";
const wsProtocol = apiProtocol === "https" ? "wss" : "ws";

export const API_ORIGIN = `${apiProtocol}://${apiHost}:${apiPort}`;
export const API_V1_BASE_URL = `${API_ORIGIN}/api/v1`;
export const WS_BASE_URL = `${wsProtocol}://${apiHost}:${apiPort}/api/v1`;

export function toApiUrl(path) {
  if (!path) return API_ORIGIN;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
