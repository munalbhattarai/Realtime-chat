import axios from "axios";
import { store } from "../app/store";
import { setAccessToken } from "../features/auth/authSlice";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  (isLocal
    ? "http://127.0.0.1:8000/api"
    : "https://realtime-chat-rrwp.onrender.com/api");

// Ensure no trailing slash so axios joins stay clean
const DEFAULT_API_URL = RAW_API_URL.replace(/\/+$/, "");

const api = axios.create({
  baseURL: DEFAULT_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken =
    localStorage.getItem("refresh_token");

  if (!refreshToken) {
    throw new Error(
      "No refresh token available.",
    );
  }

  const response = await axios.post(
    `${DEFAULT_API_URL}/accounts/token/refresh/`,
    {
      refresh: refreshToken,
    },
  );

  const newAccessToken =
    response.data.access;
  const newRefreshToken =
    response.data.refresh;

  localStorage.setItem(
    "access_token",
    newAccessToken,
  );

  if (newRefreshToken) {
    localStorage.setItem(
      "refresh_token",
      newRefreshToken,
    );
  }

  store.dispatch(setAccessToken(newAccessToken));

  return newAccessToken;
};


api.interceptors.request.use(
  (config) => {
    const accessToken =
      localStorage.getItem("access_token");

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry
    ) {
      return Promise.reject(error);
    }

    if (
      originalRequest.url?.includes(
        "/accounts/token/refresh/",
      )
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(
          () => {
            refreshPromise = null;
          },
        );
      }

      const newAccessToken =
        await refreshPromise;

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      window.dispatchEvent(
        new Event("auth:logout"),
      );

      return Promise.reject(refreshError);
    }
  },
);

export const getMediaUrl = (path) => {
  if (!path) return null;
  if (
    path.startsWith("http://") || 
    path.startsWith("https://") || 
    path.startsWith("data:")
  ) {
    return path;
  }
  const baseUrl = DEFAULT_API_URL.replace(/\/api\/?$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

export default api;