import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URI;

export const fetchProducts = createAsyncThunk('products/fetchList', async (params = {}, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API}/api/products`, { params });
    const data = response.data;
    return Array.isArray(data) ? data : data.products || [];
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Unable to load products');
  }
});

export const fetchProductById = createAsyncThunk('products/fetchById', async (productId, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API}/api/products/${productId}`);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Unable to load product');
  }
});

const productSlice = createSlice({
  name: 'products',
  initialState: { items: [], byId: {}, status: 'idle', detailStatus: 'idle', error: null, filters: {} },
  reducers: {
    filtersChanged(state, action) { state.filters = action.payload || {}; },
    productUpserted(state, action) {
      const product = action.payload;
      if (!product?._id) return;
      state.byId[product._id] = product;
      const index = state.items.findIndex((item) => item._id === product._id);
      if (index >= 0) state.items[index] = product;
    },
    productsInvalidated(state) { state.status = 'idle'; state.detailStatus = 'idle'; },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchProducts.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        for (const product of action.payload) if (product?._id) state.byId[product._id] = product;
      })
      .addCase(fetchProducts.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || action.error.message; })
      .addCase(fetchProductById.pending, (state) => { state.detailStatus = 'loading'; state.error = null; })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        if (action.payload?._id) state.byId[action.payload._id] = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => { state.detailStatus = 'failed'; state.error = action.payload || action.error.message; });
  },
});

export const productActions = productSlice.actions;
export const selectProducts = (state) => state.products.items;
export const selectProductById = (state, id) => state.products.byId[id] || null;
export default productSlice.reducer;
