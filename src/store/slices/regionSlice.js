import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { getStorage } from '../../lib/storage';

const API = process.env.NEXT_PUBLIC_API_URI;
const authHeaders = () => ({ Authorization: `Bearer ${getStorage('adminAccessToken') || ''}` });

export const fetchRegions = createAsyncThunk('regions/fetch', async ({ activeOnly = false } = {}, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API}/api/regions`, { params: activeOnly ? { activeOnly: true } : undefined });
    return response.data;
  } catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Could not load regions'); }
});

export const createRegionRequest = createAsyncThunk('regions/create', async (data, { rejectWithValue }) => {
  try { return (await axios.post(`${API}/api/regions`, data, { headers: authHeaders() })).data; }
  catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Could not create region'); }
});

export const updateRegionRequest = createAsyncThunk('regions/update', async ({ id, data }, { rejectWithValue }) => {
  try { return (await axios.put(`${API}/api/regions/${id}`, data, { headers: authHeaders() })).data; }
  catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Could not update region'); }
});

export const deleteRegionRequest = createAsyncThunk('regions/delete', async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`${API}/api/regions/${id}`, { headers: authHeaders() });
    return id;
  } catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Could not delete region'); }
});

const regionSlice = createSlice({
  name: 'regions',
  initialState: { items: [], status: 'idle', error: null, fetchRequestId: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchRegions.pending, (state, action) => { state.status = 'loading'; state.error = null; state.fetchRequestId = action.meta.requestId; })
      .addCase(fetchRegions.fulfilled, (state, action) => {
        if (state.fetchRequestId !== action.meta.requestId) return;
        state.items = Array.isArray(action.payload) ? action.payload : [];
        state.status = 'succeeded'; state.fetchRequestId = null;
      })
      .addCase(fetchRegions.rejected, (state, action) => {
        if (state.fetchRequestId !== action.meta.requestId) return;
        state.status = 'failed'; state.fetchRequestId = null; state.error = action.payload || action.error.message;
      })
      .addCase(createRegionRequest.fulfilled, (state, action) => {
        state.items = [...state.items.filter((region) => region._id !== action.payload._id), action.payload].sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateRegionRequest.fulfilled, (state, action) => {
        state.items = state.items.map((region) => region._id === action.payload._id ? action.payload : region).sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(deleteRegionRequest.fulfilled, (state, action) => { state.items = state.items.filter((region) => region._id !== action.payload); });
  },
});

export const selectRegions = (state) => state.regions.items;
export const selectActiveRegions = (state) => state.regions.items.filter((region) => region.isActive !== false);
export default regionSlice.reducer;
