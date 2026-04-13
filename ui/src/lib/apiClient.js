import axios from "axios";
import { toast } from "sonner";

import { useAuthStore } from "../store/authStore";
import { API_V1_BASE_URL } from "./runtimeConfig";

const apiClient = axios.create({
  baseURL: API_V1_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const authState = useAuthStore.getState();
  authState.enforceInactivityTimeout?.();
  const token = useAuthStore.getState().token;
  if (token) {
    useAuthStore.getState().touchActivity?.();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      useAuthStore.getState().logout();
      toast.error(status === 401 ? "Session expired. Please log in again." : "You do not have access to that area.");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    } else if (error?.response?.data?.detail) {
      toast.error(
        typeof error.response.data.detail === "string"
          ? error.response.data.detail
          : "Something went wrong."
      );
    }
    return Promise.reject(error);
  }
);

export default apiClient;
