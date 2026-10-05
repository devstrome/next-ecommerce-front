import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isLoggedIn: false,
  address: null,
  paymentMethods: [],
  defaultPaymentMethod: null,
  redirectPath: null,
  errorMessage: '',
  wishlist: [],
  hydrated: false,
  mustSetPassword: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionRestored(state, action) {
      const user = action.payload || null;
      state.user = user;
      state.isLoggedIn = Boolean(user);
      state.address = user?.address || null;
      state.paymentMethods = user?.paymentMethods || [];
      state.defaultPaymentMethod = state.paymentMethods.find((method) => method.isDefault) || state.paymentMethods[0] || null;
      state.mustSetPassword = Boolean(user?.mustSetPassword);
    },
    userUpdated(state, action) {
      state.user = action.payload || null;
      state.isLoggedIn = Boolean(action.payload);
      state.address = action.payload?.address || null;
      state.paymentMethods = action.payload?.paymentMethods || [];
      state.defaultPaymentMethod = state.paymentMethods.find((method) => method.isDefault) || state.paymentMethods[0] || null;
    },
    profileUpdated(state, action) {
      state.user = action.payload || null;
      state.address = action.payload?.address || null;
      state.paymentMethods = action.payload?.paymentMethods || [];
      state.defaultPaymentMethod = state.paymentMethods.find((method) => method.isDefault) || state.paymentMethods[0] || null;
    },
    sessionCleared(state) {
      state.user = null;
      state.isLoggedIn = false;
      state.address = null;
      state.paymentMethods = [];
      state.defaultPaymentMethod = null;
      state.wishlist = [];
      state.mustSetPassword = false;
    },
    sessionHydrated(state) { state.hydrated = true; },
    wishlistLoaded(state, action) { state.wishlist = Array.isArray(action.payload) ? action.payload : []; },
    passwordSetupRequired(state, action) { state.mustSetPassword = Boolean(action.payload); },
    redirectChanged(state, action) { state.redirectPath = action.payload || null; },
    errorChanged(state, action) { state.errorMessage = action.payload || ''; },
    errorCleared(state) { state.errorMessage = ''; },
  },
});

export const authActions = authSlice.actions;
export default authSlice.reducer;
