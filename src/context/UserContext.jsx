'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { createContext, useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URI;

  const cachedUser = typeof window !== 'undefined' ? (() => { try { return JSON.parse(getStorage('user')); } catch {} return null; })() : null;
  const [user, setUser] = useState(cachedUser);
  const [isLoggedIn, setIsLoggedIn] = useState(!!cachedUser);
  const [address, setAddress] = useState(cachedUser?.address || null);
  const [paymentMethods, setPaymentMethods] = useState(cachedUser?.paymentMethods || []);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(cachedUser ? (cachedUser.paymentMethods?.find((m) => m.isDefault) || cachedUser.paymentMethods?.[0] || null) : null);
  const [redirectPath, setRedirectPath] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [wishlist, setWishlist] = useState([]);

  const pickDefaultPaymentMethod = (methods = []) =>
    methods.find((m) => m.isDefault) || methods[0] || null;

  const isTokenExpired = (token) => {
    try {
      const { exp } = jwtDecode(token);
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = getStorage('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post(`${API}/api/refresh-token`, { token: refreshToken });
      const newAccessToken = response.data.accessToken;

      setStorage('accessToken', newAccessToken);
      axios.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`; // 🔐 Set default

      return newAccessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
      throw error;
    }
  };

  const getAccessToken = async () => {
    let token = getStorage('accessToken');
    if (!token || isTokenExpired(token)) {
      token = await refreshAccessToken();
    }
    return token;
  };

  const getAuthHeader = async () => {
    const token = await getAccessToken();
    return { Authorization: `Bearer ${token}` };
  };

  const authRequest = async (url, options = {}) => {
    let accessToken = getStorage('accessToken');
    if (!accessToken || isTokenExpired(accessToken)) {
      accessToken = await refreshAccessToken();
    }

    try {
      const res = await axios({
        ...options,
        url,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return res.data;
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          accessToken = await refreshAccessToken();
          const retry = await axios({
            ...options,
            url,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${accessToken}`,
            },
          });
          return retry.data;
        } catch (refreshError) {
          logout();
          throw refreshError;
        }
      }
      throw error;
    }
  };

  const fetchUser = async () => {
    try {
      const accessToken = getStorage('accessToken');
      if (!accessToken) {
        // No token: keep app in guest mode without redirecting
        setUser(null);
        setIsLoggedIn(false);
        delete axios.defaults.headers.common.Authorization;
        return;
      }

      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      const freshUser = await authRequest(`${API}/api/user/profile`, { method: 'GET' });
      setUser(freshUser);
      setIsLoggedIn(true);

      const addr = freshUser.address || null;
      const methods = freshUser.paymentMethods || [];

      setAddress(addr);
      setPaymentMethods(methods);
      setDefaultPaymentMethod(pickDefaultPaymentMethod(methods));
      fetchWishlist();
      setStorage('user', JSON.stringify(freshUser));
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // Stay in guest mode instead of forcing redirect to login for public pages
      setUser(null);
      setIsLoggedIn(false);
      delete axios.defaults.headers.common.Authorization;
    }
  };

  useEffect(() => {
    const token = getStorage('accessToken');
    if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) setStorage('user', JSON.stringify(user));
    else removeStorage('user');
  }, [user]);

  useEffect(() => {
    if (redirectPath) {
      router.push(redirectPath);
      setRedirectPath(null);
    }
  }, [redirectPath, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = getStorage('accessToken');
      if (token && isTokenExpired(token)) {
        logout();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const login = async (emailOrPhone, password) => {
    try {
      const response = await axios.post(`${API}/api/login`, { emailOrPhone, password });
      const { user: loggedInUser, accessToken, refreshToken } = response.data;

      setUser(loggedInUser);
      setIsLoggedIn(true);

      const addr = loggedInUser.address || null;
      const methods = loggedInUser.paymentMethods || [];

      setAddress(addr);
      setPaymentMethods(methods);
      setDefaultPaymentMethod(pickDefaultPaymentMethod(methods));

      setStorage('user', JSON.stringify(loggedInUser));
      setStorage('accessToken', accessToken);
      setStorage('refreshToken', refreshToken);

      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      fetchWishlist();
      setRedirectPath('/');
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (registerData) => {
    try {
      // Check if this is a post-registration login (has accessToken)
      if (registerData.accessToken && registerData.refreshToken && registerData.user) {
        // This is a post-registration login, not a new registration
        setUser(registerData.user);
        setIsLoggedIn(true);
        setAddress(registerData.user.address || null);
        setPaymentMethods(registerData.user.paymentMethods || []);
        setDefaultPaymentMethod(registerData.user.paymentMethods?.find(pm => pm.isDefault) || null);
        
        setStorage('user', JSON.stringify(registerData.user));
        setStorage('accessToken', registerData.accessToken);
        setStorage('refreshToken', registerData.refreshToken);
        
        axios.defaults.headers.common.Authorization = `Bearer ${registerData.accessToken}`;
        setRedirectPath('/');
        return;
      }
      
      // Legacy registration flow (should not be used anymore)
      await axios.post(`${API}/api/register`, registerData);
      setRedirectPath('/login');
    } catch (error) {
      console.error('Registration error:', error);
      setErrorMessage(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      const accessToken = getStorage('accessToken');
      if (accessToken) {
        await axios.post(`${API}/api/logout`, {}, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    } catch (error) {
      console.warn('Logout API failed:', error);
    }

    setUser(null);
    setIsLoggedIn(false);
    setAddress(null);
    setPaymentMethods([]);
    setDefaultPaymentMethod(null);

    removeStorage('user');
    removeStorage('accessToken');
    removeStorage('refreshToken');

    delete axios.defaults.headers.common.Authorization;
    setRedirectPath('/login');
  };

  const updateProfile = async (newData) => {
    await authRequest(`${API}/api/profile`, { method: 'PATCH', data: newData });
    await fetchUser();
  };

  const updateAddress = async (newAddress) => {
    await authRequest(`${API}/api/address`, { method: 'PATCH', data: { address: newAddress } });
    await fetchUser();
  };

  const replacePaymentMethods = async (methods) => {
    await authRequest(`${API}/api/payment-methods`, { method: 'PATCH', data: { paymentMethods: methods } });
    await fetchUser();
  };

  const addPaymentMethod = async (method) => {
    await authRequest(`${API}/api/payment-methods`, { method: 'POST', data: method });
    await fetchUser();
  };

  const removePaymentMethod = async (methodId) => {
    await authRequest(`${API}/api/payment-methods/${methodId}`, { method: 'DELETE' });
    await fetchUser();
  };

  const makeDefaultPaymentMethod = async (methodId) => {
    await authRequest(`${API}/api/payment-methods/${methodId}/default`, { method: 'PATCH' });
    await fetchUser();
  };

  const editPaymentMethod = async (methodId, updates) => {
    await authRequest(`${API}/api/payment-methods/${methodId}`, { method: 'PATCH', data: updates });
    await fetchUser();
  };

  const fetchWishlist = async () => {
    try {
      const data = await authRequest(`${API}/api/wishlist`, { method: 'GET' });
      setWishlist(Array.isArray(data) ? data : []);
    } catch { setWishlist([]); }
  };

  const toggleWishlist = async (productId) => {
    try {
      const data = await authRequest(`${API}/api/wishlist`, { method: 'POST', data: { productId } });
      setWishlist(data.wishlist || []);
      return data.wishlisted;
    } catch { return false; }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoggedIn,
        address,
        paymentMethods,
        defaultPaymentMethod,
        errorMessage,
        login,
        logout,
        register,
        authRequest,
        updateProfile,
        updateAddress,
        replacePaymentMethods,
        addPaymentMethod,
        removePaymentMethod,
        makeDefaultPaymentMethod,
        editPaymentMethod,
        getAuthHeader,
        wishlist,
        toggleWishlist,
        fetchWishlist,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

