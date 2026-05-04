import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://localhost:7001/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send HTTP-only refresh cookie
});

// Attach access token from memory store on every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Transparent token refresh on 401
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = refreshAccessToken().finally(() => {
          refreshing = null;
        });
      }
      const newToken = await refreshing;
      if (newToken) {
        setAccessToken(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post(
      `${API_BASE}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    return res.data.accessToken as string;
  } catch {
    clearAccessToken();
    return null;
  }
}

// In-memory token store (never in localStorage — XSS risk)
let _accessToken: string | null = null;

export function getAccessToken() { return _accessToken; }
export function setAccessToken(t: string) { _accessToken = t; }
export function clearAccessToken() { _accessToken = null; }
