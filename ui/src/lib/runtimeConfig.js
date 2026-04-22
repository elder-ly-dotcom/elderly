const browserHost = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
const apiHost = import.meta.env.VITE_API_HOST || browserHost;
const apiPort = import.meta.env.VITE_API_PORT;
const apiProtocol = import.meta.env.VITE_API_PROTOCOL || "http";
const wsProtocol = apiProtocol === "https" ? "wss" : "ws";
const explicitApiOrigin = import.meta.env.VITE_API_ORIGIN;
const explicitApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const explicitWsBaseUrl = import.meta.env.VITE_WS_BASE_URL;

const inferredApiOrigin =
  explicitApiOrigin ||
  `${apiProtocol}://${apiHost}${apiPort ? `:${apiPort}` : apiProtocol === "http" ? ":8000" : ""}`;

export const API_ORIGIN = inferredApiOrigin.replace(/\/$/, "");
export const API_V1_BASE_URL = (explicitApiBaseUrl || `${API_ORIGIN}/api/v1`).replace(/\/$/, "");
export const WS_BASE_URL =
  (explicitWsBaseUrl || `${wsProtocol}://${apiHost}${apiPort ? `:${apiPort}` : apiProtocol === "http" ? ":8000" : ""}/api/v1`).replace(/\/$/, "");

export function toApiUrl(path) {
  if (!path) return API_ORIGIN;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
