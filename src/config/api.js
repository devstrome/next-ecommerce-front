'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import axios from 'axios';

// Centralized configuration - ALL URLs come from here
export const API_CONFIG = {
  BASE_URI: process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000",
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://belorella.com",
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000",
};

// Convenience exports
export const API_URI = API_CONFIG.BASE_URI;
export const SITE_URL = API_CONFIG.SITE_URL;
export const SOCKET_URL = API_CONFIG.SOCKET_URL;

export const ENDPOINTS = {
  USER_ROOMS: (userId) => `/api/user/rooms/${userId}`,
  USER_MESSAGE: (roomId) => `/api/user/rooms/${roomId}/message`,
  ADMIN_ROOMS: "/api/rooms",
  ADMIN_ROOM: (roomId) => `/api/rooms/${roomId}`,
  ADMIN_MESSAGE: (roomId) => `/api/rooms/${roomId}/message`,
  ADMIN_TRANSFER: (roomId) => `/api/rooms/${roomId}/transfer`,
  ADMIN_CLOSE: (roomId) => `/api/rooms/${roomId}/close`,
};

export const getApiUrl = (endpoint) => `${API_CONFIG.BASE_URI}${endpoint}`;

export const getAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

// Pre-configured axios instance
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URI,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;
  const token = getStorage('adminAccessToken') || getStorage('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isAdmin = window.location.pathname.startsWith('/admin');
      if (isAdmin) {
        removeStorage('adminAccessToken');
        removeStorage('adminData');
      }
    }
    return Promise.reject(error);
  }
);
