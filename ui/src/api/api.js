import axios from "axios";
import { API_ORIGIN } from "../lib/runtimeConfig";

const API = axios.create({
  baseURL: API_ORIGIN,
  headers: { "Content-Type": "application/json" },
});

// Service APIs
export const getServices = () => API.get("/services");
export const requestService = (userId, serviceId, notes) =>
  API.post("/requests", {
    user_id: userId,
    service_id: serviceId,
    notes,
  });
export const getRequests = (userId) => API.get(`/requests?user_id=${userId}`);
export const rescheduleRequest = (requestId, newDate) =>
  API.put(`/requests/${requestId}`, {
    scheduled_date: newDate,
  });
export const cancelRequest = (requestId) =>
  API.delete(`/requests/${requestId}`);
export const subscribePlan = (userId) =>
  API.post("/subscriptions/", { user_id: userId });

export default API;
