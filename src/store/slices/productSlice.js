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

export const fetchProductCollection = createAsyncThunk('products/fetchCollection', async ({ key, path, params = {} }, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API}${path}`, { params });
    const data = response.data;
    const items = Array.isArray(data) ? data : data.products || [];
    return { key, items };
  } catch (error) {
    return rejectWithValue({ key, message: error.response?.data?.message || error.message || 'Unable to load products' });
  }
});

const productSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    byId: {},
    collections: {},
    status: 'idle',
    detailStatus: 'idle',
    error: null,
    filters: {
      query: '',
      category: '',
      brand: '',
      categories: [],
      brands: [],
      genders: [],
      regions: [],
      appliedPrice: { min: '', max: '' },
      sortBy: 'name',
    },
    listRequestId: null,
    detailRequestId: null,
  },
  reducers: {
    filtersChanged(state, action) { state.filters = { ...state.filters, ...(action.payload || {}) }; },
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
      .addCase(fetchProducts.pending, (state, action) => { state.status = 'loading'; state.error = null; state.listRequestId = action.meta.requestId; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.listRequestId = null;
        state.items = action.payload;
        for (const product of action.payload) if (product?._id) state.byId[product._id] = product;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        if (state.listRequestId !== action.meta.requestId) return;
        state.status = 'failed'; state.listRequestId = null; state.error = action.payload || action.error.message;
      })
      .addCase(fetchProductById.pending, (state, action) => { state.detailStatus = 'loading'; state.error = null; state.detailRequestId = action.meta.requestId; })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailStatus = 'succeeded';
        state.detailRequestId = null;
        if (action.payload?._id) state.byId[action.payload._id] = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailStatus = 'failed'; state.detailRequestId = null; state.error = action.payload || action.error.message;
      });
    builder
      .addCase(fetchProductCollection.pending, (state, action) => {
        const key = action.meta.arg.key;
        state.collections[key] = { items: state.collections[key]?.items || [], status: 'loading', error: null, requestId: action.meta.requestId };
      })
      .addCase(fetchProductCollection.fulfilled, (state, action) => {
        const { key, items } = action.payload;
        if (state.collections[key]?.requestId !== action.meta.requestId) return;
        state.collections[key] = { items, status: 'succeeded', error: null, requestId: null };
        for (const product of items) if (product?._id) state.byId[product._id] = product;
      })
      .addCase(fetchProductCollection.rejected, (state, action) => {
        const key = action.payload?.key || action.meta.arg.key;
        if (state.collections[key]?.requestId !== action.meta.requestId) return;
        state.collections[key] = { items: state.collections[key]?.items || [], status: 'failed', requestId: null, error: action.payload?.message || action.error.message };
      });
  },
});

export const productActions = productSlice.actions;
export const selectProducts = (state) => state.products.items;
export const selectProductById = (state, id) => state.products.byId[id] || null;
const EMPTY_PRODUCT_COLLECTION = Object.freeze({ items: [], status: 'idle', error: null });
export const selectProductCollection = (state, key) => state.products.collections[key] || EMPTY_PRODUCT_COLLECTION;
export default productSlice.reducer;
