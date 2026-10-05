import { createSlice } from '@reduxjs/toolkit';

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { items: [] },
  reducers: {
    wishlistReplaced(state, action) { state.items = Array.isArray(action.payload) ? action.payload : []; },
  },
});

export const wishlistActions = wishlistSlice.actions;
export default wishlistSlice.reducer;
