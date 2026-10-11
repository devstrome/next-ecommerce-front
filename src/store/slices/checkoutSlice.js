import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { getStorage } from '../../lib/storage';

const API = process.env.NEXT_PUBLIC_API_URI;

export const validateCheckout = createAsyncThunk('checkout/validate', async ({ shippingName, paymentMethod, requestKey }, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API}/api/checkout/validate`, { shippingName, paymentMethod }, {
      headers: { Authorization: `Bearer ${getStorage('accessToken') || ''}` },
    });
    return { ...response.data, requestKey };
  } catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Checkout validation failed'); }
});

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: { validation: null, status: 'idle', error: null, activeRequestId: null },
  reducers: {
    validationReceived(state, action) { state.validation = action.payload; state.status = 'succeeded'; state.error = null; },
    validationStarted(state) { state.status = 'loading'; state.error = null; },
    validationFailed(state, action) { state.status = 'failed'; state.error = action.payload || 'Checkout validation failed'; },
    checkoutReset() { return { validation: null, status: 'idle', error: null, activeRequestId: null }; },
  },
  extraReducers(builder) {
    builder
      .addCase(validateCheckout.pending, (state, action) => { state.status = 'loading'; state.error = null; state.activeRequestId = action.meta.requestId; })
      .addCase(validateCheckout.fulfilled, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;
        state.validation = action.payload;
        state.status = 'succeeded';
        state.activeRequestId = null;
      })
      .addCase(validateCheckout.rejected, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Checkout validation failed';
        state.activeRequestId = null;
      });
  },
});

export const checkoutActions = checkoutSlice.actions;
export const selectCheckoutValidation = (state) => state.checkout.validation;
export default checkoutSlice.reducer;
