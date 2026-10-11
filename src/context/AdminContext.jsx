'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
// AdminContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from "next/navigation";
import { withDevice } from '../lib/device';
import { adminPermissionForPath, firstAllowedAdminPath, hasAdminPermission } from '../lib/adminPermissions';

export const AdminContext = createContext();

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000";

const isBackendRequest = (config = {}) => {
  try {
    const requestUrl = new URL(config.url || '', config.baseURL || API_BASE_URL);
    return requestUrl.origin === new URL(API_BASE_URL).origin;
  } catch {
    return false;
  }
};

const isAbsoluteUrl = (url = '') => /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(url);

const initialState = {
  admin: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// --- Helpers ---
const fetchCurrentAdmin = async (accessToken) => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data?.admin || null;
};

// --- Reducer ---
function adminReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        admin: action.payload.admin,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    case 'LOGOUT':
      return initialState;
    case 'SET_LOADING':
      return { ...state, loading: action.payload ?? true };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'REFRESH_TOKEN':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken ?? state.refreshToken,
        error: null,
      };
    case 'SET_ADMIN_DATA':
      return {
        ...state,
        admin: action.payload,
      };
    default:
      return state;
  }
}

export const AdminProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState);
  const router = useRouter();

  const clearAuthStorage = () => {
    removeStorage('adminRefreshToken');
    removeStorage('adminAccessToken');
    removeStorage('adminData');
  };

 useEffect(() => {
  const initAuth = async () => {
    const refreshToken = getStorage('adminRefreshToken');
    const accessToken = getStorage('adminAccessToken');

    if (!refreshToken) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      let token = accessToken;

      if (!token) {
        const refreshRes = await axios.post(`${API_BASE_URL}/api/admin/refresh-token`, { token: refreshToken });
        token = refreshRes.data.accessToken;
        setStorage('adminAccessToken', token);
      }

      // Permission assignments may have changed while this admin was signed
      // in elsewhere. Always hydrate the current role from the server.
      const admin = await fetchCurrentAdmin(token);
      if (admin) setStorage('adminData', JSON.stringify(admin));

      if (!admin) {
        clearAuthStorage();
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      dispatch({ type: 'LOGIN_SUCCESS', payload: { admin, accessToken: token, refreshToken } });
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuthStorage();
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  initAuth();
}, []);


  // --- Axios interceptors ---
  // Admin screens use both context methods and direct axios calls. Read the
  // token from storage for each request so child effects do not race the
  // provider's state effect, and never forward admin credentials off-origin.
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (!isAbsoluteUrl(config.url) && !config.baseURL) {
          config.baseURL = API_BASE_URL;
        }

        if (isBackendRequest(config) && !config.skipAdminAuth) {
          const token = getStorage('adminAccessToken') || getStorage('adminToken') || state.accessToken;
          if (token) {
            if (typeof config.headers?.set === 'function') config.headers.set('Authorization', `Bearer ${token}`);
            else config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (!originalRequest || !isBackendRequest(originalRequest)) {
          return Promise.reject(error);
        }

        const banned = error.response?.status === 403 && error.response?.data?.banned === true;
        if (banned) {
          clearAuthStorage();
          dispatch({ type: 'LOGOUT' });
          router.replace('/admin');
          return Promise.reject(error);
        }

        const permissionDenied = error.response?.status === 403 && (
          error.response?.data?.requiredPermission ||
          /role does not have access|not assigned to your role/i.test(error.response?.data?.message || '')
        );
        if (permissionDenied && !originalRequest._adminRoleRefresh) {
          originalRequest._adminRoleRefresh = true;
          try {
            const token = getStorage('adminAccessToken') || state.accessToken;
            const currentAdmin = token ? await fetchCurrentAdmin(token) : null;
            if (currentAdmin) {
              setStorage('adminData', JSON.stringify(currentAdmin));
              dispatch({ type: 'SET_ADMIN_DATA', payload: currentAdmin });
              if (typeof window !== 'undefined') {
                const currentPermission = adminPermissionForPath(window.location.pathname);
                if (currentPermission && !hasAdminPermission(currentAdmin, currentPermission)) {
                  router.replace(firstAllowedAdminPath(currentAdmin));
                }
              }
            }
          } catch (roleRefreshError) {
            console.warn('Unable to refresh admin role after a permission change:', roleRefreshError);
          }
        }

        let requestPath = '';
        try { requestPath = new URL(originalRequest.url || '', originalRequest.baseURL || API_BASE_URL).pathname; } catch {}
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !requestPath.endsWith('/admin/login') &&
          !requestPath.endsWith('/admin/logout') &&
          !requestPath.endsWith('/admin/refresh-token')
        ) {
          const refreshToken = getStorage('adminRefreshToken') || state.refreshToken;
          if (!refreshToken) {
            clearAuthStorage();
            dispatch({ type: 'LOGOUT' });
            router.replace('/admin');
            return Promise.reject(error);
          }
          originalRequest._retry = true;
          try {
            const res = await axios.post(`${API_BASE_URL}/api/admin/refresh-token`, {
              token: refreshToken,
            }, { skipAdminAuth: true });
            const { accessToken, refreshToken: rotatedRefreshToken } = res.data;
            setStorage('adminAccessToken', accessToken);
            if (rotatedRefreshToken) setStorage('adminRefreshToken', rotatedRefreshToken);

            dispatch({
              type: 'REFRESH_TOKEN',
              payload: { accessToken, refreshToken: rotatedRefreshToken },
            });

            if (typeof originalRequest.headers?.set === 'function') {
              originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
            } else {
              originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${accessToken}` };
            }
            return axios(originalRequest);
          } catch (refreshError) {
            clearAuthStorage();
            dispatch({ type: 'LOGOUT' });
            router.replace('/admin');
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [state.accessToken, state.refreshToken, router]);

  // --- Auth Actions ---
  const login = async (credentials) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const res = await axios.post(`${API_BASE_URL}/api/admin/login`, withDevice(credentials));
      const { accessToken, refreshToken, admin } = res.data || {};
      if (!accessToken || !refreshToken) throw new Error('Invalid login response');

      setStorage('adminAccessToken', accessToken);
      setStorage('adminRefreshToken', refreshToken);

      let currentAdmin = admin || (await fetchCurrentAdmin(accessToken));
      if (!currentAdmin) throw new Error('Unable to load admin profile');
      setStorage('adminData', JSON.stringify(currentAdmin));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { admin: currentAdmin, accessToken, refreshToken },
      });

      return { admin: currentAdmin, accessToken, refreshToken };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/logout`,
        {},
        { headers: { Authorization: `Bearer ${state.accessToken}` } }
      );
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      clearAuthStorage();
      dispatch({ type: 'LOGOUT' });
      router.push('/admin');
    }
  };

  const registerAdmin = async (adminData, imageFile) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const formData = new FormData();
      Object.entries(adminData).forEach(([k, v]) => formData.append(k, v));
      if (imageFile) formData.append('image', imageFile);

      const res = await axios.post(`${API_BASE_URL}/api/admin/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${state.accessToken}` },
      });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateAdminData = (data) => {
    setStorage('adminData', JSON.stringify(data));
    dispatch({ type: 'SET_ADMIN_DATA', payload: data });
  };

  const refreshAccessToken = async () => {
    if (!state.refreshToken) return null;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/admin/refresh-token`, { token: state.refreshToken });
      setStorage('adminAccessToken', res.data.accessToken);
      dispatch({ type: 'REFRESH_TOKEN', payload: { accessToken: res.data.accessToken } });
      return res.data.accessToken;
    } catch (error) {
      await handleLogout();
      throw error;
    }
  };

  // --- CRUD Operations ---
  const createAdmin = async (adminData, imageFile) => {
    const formData = new FormData();
    Object.entries(adminData).forEach(([k, v]) => formData.append(k, v));
    if (imageFile) formData.append('image', imageFile);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/admin`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${state.accessToken}` },
      });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create admin';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const getAdmin = async (adminId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/${adminId}`, {
        headers: { Authorization: `Bearer ${state.accessToken}` },
      });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch admin';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateAdmin = async (adminId, adminData, imageFile) => {
    const formData = new FormData();
    Object.entries(adminData).forEach(([k, v]) => formData.append(k, v));
    if (imageFile) formData.append('image', imageFile);

    try {
      const res = await axios.put(`${API_BASE_URL}/api/admin/${adminId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${state.accessToken}` },
      });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update admin';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const deleteAdmin = async (adminId) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/admin/${adminId}`, {
        headers: { Authorization: `Bearer ${state.accessToken}` },
      });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete admin';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const listAdmins = async (params = {}) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin`, {
        params,
        headers: { Authorization: `Bearer ${state.accessToken}` },
      });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch admins';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // --- Exposed Context Value ---
  const value = {
    ...state,
    hasPermission: (permission) => hasAdminPermission(state.admin, permission),
    login,
    logout: handleLogout,
    registerAdmin,
    updateAdminData,
    refreshToken: refreshAccessToken,
    createAdmin,
    getAdmin,
    updateAdmin,
    deleteAdmin,
    listAdmins,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
};
