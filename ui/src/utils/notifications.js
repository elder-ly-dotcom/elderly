import apiClient from "../lib/apiClient";

export async function requestNotificationSetup() {
  if (!("Notification" in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const fallbackToken = `web-${crypto.randomUUID()}`;
  await apiClient.post("/auth/me/fcm-token", { fcm_token: fallbackToken });
  return fallbackToken;
}
