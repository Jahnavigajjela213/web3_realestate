import axios from "axios";
import { APP_CONFIG } from "../config/env";

const api = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl
});

export async function fetchProperties() {
  const response = await api.get("/properties");
  return response.data.data;
}

export async function fetchUserPortfolio(walletAddress) {
  const response = await api.get(`/portfolio/${walletAddress}`);
  return response.data.data;
}

export async function logBuyTransaction(payload) {
  const response = await api.post("/buy", payload);
  return response.data;
}

/**
 * ADMIN: Saves new property metadata (image, location, description) to the backend.
 */
export async function savePropertyMetadata(payload) {
  const response = await api.post("/properties", payload);
  return response.data;
}
