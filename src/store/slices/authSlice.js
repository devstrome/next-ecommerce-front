import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isLoggedIn: false,
  redirectPath: null,
  errorMessage: '',
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
      state.mustSetPassword = Boolean(user?.mustSetPassword);
    },
    userUpdated(state, action) {
      state.user = action.payload || null;
      state.isLoggedIn = Boolean(action.payload);
      state.mustSetPassword = Boolean(action.payload?.mustSetPassword);
    },
    profileUpdated(state, action) {
      state.user = action.payload || null;
      state.isLoggedIn = Boolean(action.payload);
    },
    sessionCleared(state) {
      state.user = null;
      state.isLoggedIn = false;
      state.mustSetPassword = false;
    },
    sessionHydrated(state) { state.hydrated = true; },
    passwordSetupRequired(state, action) { state.mustSetPassword = Boolean(action.payload); },
    redirectChanged(state, action) { state.redirectPath = action.payload || null; },
    errorChanged(state, action) { state.errorMessage = action.payload || ''; },
    errorCleared(state) { state.errorMessage = ''; },
  },
});

export const authActions = authSlice.actions;
export default authSlice.reducer;
