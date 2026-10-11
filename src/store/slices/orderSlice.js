import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { getStorage } from '../../lib/storage';

const API = process.env.NEXT_PUBLIC_API_URI;

export const fetchOrders = createAsyncThunk('orders/fetch', async ({ userId }, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API}/api/orders`, {
      params: { userId },
      headers: { Authorization: `Bearer ${getStorage('accessToken') || ''}` },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Unable to load orders'); }
});

export const placeOrder = createAsyncThunk('orders/place', async (orderData, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API}/api/order`, orderData, {
      headers: { Authorization: `Bearer ${getStorage('accessToken') || ''}` },
    });
    return response.data;
  } catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Failed to place order'); }
});

const orderSlice = createSlice({
  name: 'orders',
  initialState: { current: null, items: [], status: 'idle', error: null, fetchRequestId: null },
  reducers: {
    ordersLoaded(state, action) { state.items = Array.isArray(action.payload) ? action.payload : []; state.status = 'succeeded'; state.fetchRequestId = null; },
    orderLoaded(state, action) { state.current = action.payload || null; },
    ordersLoading(state) { state.status = 'loading'; state.error = null; },
    ordersFailed(state, action) { state.status = 'failed'; state.error = action.payload || 'Unable to load orders'; },
    orderPlaced(state, action) { state.current = action.payload || null; state.items = [action.payload, ...state.items.filter((item) => item._id !== action.payload?._id)]; state.status = 'succeeded'; state.fetchRequestId = null; },
    orderUpserted(state, action) {
      const order = action.payload;
      if (!order) return;
      state.items = [order, ...state.items.filter((item) => item._id !== order._id && item.orderId !== order.orderId)];
    },
    orderPatched(state, action) {
      const { id, patch } = action.payload || {};
      state.items = state.items.map((item) => item._id === id || item.orderId === id ? { ...item, ...patch } : item);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchOrders.pending, (state, action) => { state.status = 'loading'; state.error = null; state.fetchRequestId = action.meta.requestId; })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        if (state.fetchRequestId !== action.meta.requestId) return;
        state.items = action.payload; state.status = 'succeeded'; state.fetchRequestId = null;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        if (state.fetchRequestId !== action.meta.requestId) return;
        state.status = 'failed'; state.fetchRequestId = null; state.error = action.payload || action.error.message;
      })
      .addCase(placeOrder.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.fetchRequestId = null;
        state.current = action.payload;
        state.items = [action.payload, ...state.items.filter((item) => item._id !== action.payload?._id)];
        state.status = 'succeeded';
      })
      .addCase(placeOrder.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || action.error.message; });
  },
});

export const orderActions = orderSlice.actions;
export default orderSlice.reducer;
