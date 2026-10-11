'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { createContext, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from "next/navigation";
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { withDevice } from '../lib/device';
import { authActions } from '../store/slices/authSlice';
import { wishlistActions } from '../store/slices/wishlistSlice';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URI;
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const user = auth.user;
  const isLoggedIn = auth.isLoggedIn;
  const [loyaltyBalance, setLoyaltyBalance] = useState(null);
  const address = user?.address || null;
  const paymentMethods = user?.paymentMethods || [];
  const defaultPaymentMethod = paymentMethods.find((method) => method.isDefault) || paymentMethods[0] || null;
  const redirectPath = auth.redirectPath;
  const errorMessage = auth.errorMessage;
  const wishlist = useSelector((state) => state.wishlist.items);
  const userHydrated = auth.hydrated;
  const mustSetPassword = auth.mustSetPassword;
  const logoutRef = useRef(null);

  const setUser = (value) => dispatch(authActions.userUpdated(value));
  const setIsLoggedIn = (value) => { if (!value) dispatch(authActions.sessionCleared()); };
  const setRedirectPath = (value) => dispatch(authActions.redirectChanged(value));
  const setErrorMessage = (value) => dispatch(authActions.errorChanged(value));
  const setWishlist = (value) => dispatch(wishlistActions.wishlistReplaced(value));
  const setUserHydrated = () => dispatch(authActions.sessionHydrated());
  const setMustSetPassword = (value) => dispatch(authActions.passwordSetupRequired(value));

  const isTokenExpired = (token) => {
    try {
      const { exp } = jwtDecode(token);
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  };

  const clearLocalSession = () => {
    dispatch(authActions.sessionCleared());
    dispatch(wishlistActions.wishlistReplaced([]));
    removeStorage('user');
    removeStorage('accessToken');
    removeStorage('refreshToken');
    delete axios.defaults.headers.common.Authorization;
  };

  const invalidateSession = (message = 'Your account is not allowed to sign in') => {
    clearLocalSession();
    setErrorMessage(message);
    setRedirectPath('/login');
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
      if (error.response?.data?.banned) {
        invalidateSession(error.response.data.message);
        throw error;
      }
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
      if (error.response?.data?.banned) {
        invalidateSession(error.response.data.message);
        throw error;
      }
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
      fetchWishlist();
      setStorage('user', JSON.stringify(freshUser));
    } catch (error) {
      if (error.response?.data?.banned) {
        invalidateSession(error.response.data.message);
      } else {
        console.error('Failed to fetch user data:', error);
      }
      // Stay in guest mode instead of forcing redirect to login for public pages
      setUser(null);
      setIsLoggedIn(false);
      delete axios.defaults.headers.common.Authorization;
    }
  };

  useEffect(() => {
    // Restore cached session after hydration (never during the first render)
    try {
      const cached = JSON.parse(getStorage('user'));
      if (cached) {
        setUser(cached);
        setIsLoggedIn(true);
      }
    } catch { /* ignore corrupt cache */ }

    const token = getStorage('accessToken');
    if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    fetchUser().finally(() => setUserHydrated(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userHydrated) return;
    if (user) setStorage('user', JSON.stringify(user));
    else removeStorage('user');
  }, [user, userHydrated]);

  useEffect(() => {
    let active = true;
    const loadLoyaltyBalance = async () => {
      const token = getStorage('accessToken');
      if (!isLoggedIn || !token) {
        if (active) setLoyaltyBalance(null);
        return;
      }
      try {
        const response = await fetch(`${API}/api/loyalty/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data = await response.json();
        if (active) setLoyaltyBalance(Number(data?.balanceBDT) || 0);
      } catch {
        // Loyalty balance is supplementary navigation data; keep the rest of
        // the account and storefront usable if the endpoint is unavailable.
      }
    };

    loadLoyaltyBalance();
    const refresh = () => loadLoyaltyBalance();
    window.addEventListener('loyalty-balance-updated', refresh);
    const interval = window.setInterval(loadLoyaltyBalance, 60000);
    return () => {
      active = false;
      window.removeEventListener('loyalty-balance-updated', refresh);
      window.clearInterval(interval);
    };
  }, [API, isLoggedIn, user?._id]);

  useEffect(() => {
    if (redirectPath) {
      router.push(redirectPath);
      dispatch(authActions.redirectChanged(null));
    }
  }, [redirectPath, router, dispatch]);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = getStorage('accessToken');
      if (token && isTokenExpired(token)) {
        logoutRef.current?.();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const applySession = (loggedInUser, accessToken, refreshToken) => {
    setUser(loggedInUser);
    setIsLoggedIn(true);

    setStorage('user', JSON.stringify(loggedInUser));
    setStorage('accessToken', accessToken);
    setStorage('refreshToken', refreshToken);

    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    fetchWishlist();
    // Hold the redirect while the user still has to pick a password
    if (!loggedInUser.mustSetPassword) setRedirectPath('/');
    setMustSetPassword(Boolean(loggedInUser.mustSetPassword));
  };

  // After a Google sign-up: choose a real password (email stays verified)
  const setPassword = async (password, extras = {}) => {
    try {
      const { data } = await axios.put(`${API}/api/auth/set-password`, { password, ...extras });
      const updatedUser = { ...(user || {}), ...(data.user || {}), mustSetPassword: false };
      setUser(updatedUser);
      setStorage('user', JSON.stringify(updatedUser));
      setMustSetPassword(false);
      setRedirectPath('/');
      return data;
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to set password');
      throw error;
    }
  };

  const login = async (emailOrPhone, password) => {
    try {
      const response = await axios.post(`${API}/api/login`, withDevice({ emailOrPhone, password }));
      const { user: loggedInUser, accessToken, refreshToken } = response.data;

      applySession(loggedInUser, accessToken, refreshToken);
    } catch (error) {
      if (!error.response?.data?.banned) console.error('Login error:', error);
      setErrorMessage(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  // Google Sign-In / Sign-Up: sends the Google ID token to the backend,
  // which verifies it, finds-or-creates the user and returns a session
  const loginWithGoogle = async (credential) => {
    try {
      const response = await axios.post(`${API}/api/auth/google`, withDevice({ credential }));
      const { user: loggedInUser, accessToken, refreshToken } = response.data;

      applySession(loggedInUser, accessToken, refreshToken);
      return loggedInUser;
    } catch (error) {
      console.error('Google login error:', error);
      setErrorMessage(error.response?.data?.message || 'Google sign-in failed');
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
        setMustSetPassword(Boolean(registerData.user.mustSetPassword));
        
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
      if (!error.response?.data?.banned) {
        console.warn('Logout API failed:', error);
      }
    }

    clearLocalSession();
    setRedirectPath('/login');
  };
  logoutRef.current = logout;

  const deleteAccount = async () => {
    const result = await authRequest(`${API}/api/profile`, { method: 'DELETE' });
    clearLocalSession();
    dispatch(authActions.redirectChanged(null));
    router.replace('/');
    return result;
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
        loyaltyBalance,
        userHydrated,
        address,
        paymentMethods,
        defaultPaymentMethod,
        errorMessage,
        login,
        loginWithGoogle,
        setPassword,
        mustSetPassword,
        logout,
        deleteAccount,
        invalidateSession,
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

