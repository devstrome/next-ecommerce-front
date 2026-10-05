import { createSlice } from '@reduxjs/toolkit';

const orderSlice = createSlice({
  name: 'orders',
  initialState: { current: null, items: [], status: 'idle', error: null },
  reducers: {
    ordersLoaded(state, action) { state.items = Array.isArray(action.payload) ? action.payload : []; state.status = 'succeeded'; },
    orderLoaded(state, action) { state.current = action.payload || null; },
    ordersLoading(state) { state.status = 'loading'; state.error = null; },
    ordersFailed(state, action) { state.status = 'failed'; state.error = action.payload || 'Unable to load orders'; },
  },
});

export const orderActions = orderSlice.actions;
export default orderSlice.reducer;
