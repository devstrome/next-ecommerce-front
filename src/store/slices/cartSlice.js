import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import axios from 'axios';
import { getStorage, removeStorage } from '../../lib/storage';

const API = process.env.NEXT_PUBLIC_API_URI;

const headers = () => ({ Authorization: `Bearer ${getStorage('accessToken') || ''}` });
let cartWorkQueue = Promise.resolve();
const serializeCartWork = (work) => {
  const next = cartWorkQueue.then(work, work);
  cartWorkQueue = next.then(() => undefined, () => undefined);
  return next;
};
const parseGuestCart = () => {
  try {
    const value = JSON.parse(getStorage('guestCart') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const productIdOf = (item) => item?.productId?._id || item?.productId || '';
const configurationKey = (item) => [
  productIdOf(item), item?.regionId?._id || item?.regionId || '', item?.variantId?._id || item?.variantId || '', item?.size || '',
  item?.color || item?.colorName || '', item?.measureType || '', item?.unitName || '',
].map(String).join('::');

const prepareItems = (items = []) => items.map((item) => {
  const product = item.productId && typeof item.productId === 'object' ? item.productId : item.product || null;
  const productId = product?._id || item.productId;
  return {
    ...item,
    product,
    productId,
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
    discountApplied: Number(item.discountApplied) || 0,
    guestItemId: item.guestItemId || configurationKey(item),
  };
});

const cartStateFrom = (response) => {
  const cart = response?.cart || response?.updatedCart || response?.resetCart || response || {};
  return {
    items: prepareItems(cart.items || []),
    coupon: cart.couponId || null,
    discount: Number(cart.discountAmount ?? response?.totals?.totalDiscount ?? 0) || 0,
    subtotal: Number(cart.totalAmount ?? response?.totals?.totalBeforeDiscount ?? 0) || 0,
  };
};

const guestAdd = (items, item) => {
  const incoming = { ...item, quantity: Math.max(1, Number(item.quantity) || 1) };
  const key = configurationKey(incoming);
  const index = items.findIndex((candidate) => configurationKey(candidate) === key);
  if (index < 0) return [...items, { ...incoming, guestItemId: key }];
  return items.map((candidate, currentIndex) => currentIndex === index
    ? { ...candidate, quantity: Number(candidate.quantity || 0) + incoming.quantity }
    : candidate);
};

const guestChange = (items, id, quantity) => items.map((item) =>
  (item._id === id || item.id === id || item.guestItemId === id)
    ? { ...item, quantity: Math.max(1, Number(quantity) || 1) }
    : item);

const guestDelta = (items, id, delta) => items.map((item) =>
  (item._id === id || item.id === id || item.guestItemId === id)
    ? { ...item, quantity: Math.max(1, Number(item.quantity || 1) + delta) }
    : item);

const request = async (method, path, data, config = {}) => {
  try {
    const response = await axios({ method, url: `${API}${path}`, data, ...config, headers: { ...headers(), ...(config.headers || {}) } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Cart request failed');
  }
};

export const loadCart = createAsyncThunk('cart/load', async ({ userId, isLoggedIn }, { getState, rejectWithValue }) => {
  try {
    if (!isLoggedIn || !userId) return { guest: true, items: parseGuestCart() };
    return await serializeCartWork(async () => {
      const guestItems = parseGuestCart();
      if (guestItems.length) {
        await request('post', '/api/cart/items/sync', { userId, items: guestItems });
        removeStorage('guestCart');
      }
      try {
        return await request('get', `/api/cart/${userId}`);
      } catch (error) {
        // An authenticated account can legitimately have no cart yet.
        if (/cart not found/i.test(error.message)) return { cart: { items: [], couponId: null, discountAmount: 0, totalAmount: 0 } };
        throw error;
      }
    });
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const syncCartItems = createAsyncThunk('cart/sync', async ({ userId, items }, { rejectWithValue }) => {
  try {
    return await serializeCartWork(async () => {
      await request('post', '/api/cart/items/sync', { userId, items });
      return await request('get', `/api/cart/${userId}`);
    });
  } catch (error) { return rejectWithValue(error.message); }
});

export const addCartItem = createAsyncThunk('cart/addItem', async ({ userId, isLoggedIn, item }, { getState, rejectWithValue }) => {
  try {
    if (!isLoggedIn || !userId) return { guest: true, items: guestAdd(getState().cart.items, item) };
    return await serializeCartWork(() => request('post', '/api/cart/items', { userId, ...item }));
  } catch (error) { return rejectWithValue(error.message); }
});

export const setCartItemQuantity = createAsyncThunk('cart/setQuantity', async ({ userId, isLoggedIn, itemId, quantity, couponId }, { getState, rejectWithValue }) => {
  try {
    if (!isLoggedIn || !userId) return { guest: true, items: guestChange(getState().cart.items, itemId, quantity) };
    return await serializeCartWork(() => request('patch', `/api/cart/items/${itemId}/update`, { userId, quantity, couponId }));
  } catch (error) { return rejectWithValue(error.message); }
});

export const changeCartItemQuantity = createAsyncThunk('cart/changeQuantity', async ({ userId, isLoggedIn, itemId, delta, couponId }, { getState, rejectWithValue }) => {
  try {
    if (!isLoggedIn || !userId) return { guest: true, items: guestDelta(getState().cart.items, itemId, delta) };
    const direction = delta > 0 ? 'increase' : 'decrease';
    return await serializeCartWork(() => request('patch', `/api/cart/items/${itemId}/${direction}`, { userId, couponId }));
  } catch (error) { return rejectWithValue(error.message); }
});

export const removeCartItem = createAsyncThunk('cart/removeItem', async ({ userId, isLoggedIn, itemId }, { getState, rejectWithValue }) => {
  try {
    if (!isLoggedIn || !userId) return { guest: true, items: getState().cart.items.filter((item) => item.guestItemId !== itemId && item._id !== itemId && item.id !== itemId) };
    return await serializeCartWork(() => request('delete', `/api/cart/items/delete/${userId}/${itemId}`));
  } catch (error) { return rejectWithValue(error.message); }
});

export const clearCartRequest = createAsyncThunk('cart/clear', async ({ userId, isLoggedIn }, { rejectWithValue }) => {
  try {
    if (!isLoggedIn || !userId) return { guest: true, items: [] };
    return await serializeCartWork(() => request('delete', `/api/cart/${userId}`));
  } catch (error) { return rejectWithValue(error.message); }
});

export const applyCartCoupon = createAsyncThunk('cart/applyCoupon', async ({ userId, couponCode }, { rejectWithValue }) => {
  try {
    return await serializeCartWork(async () => {
      await request('post', `/api/cart/${userId}/coupon`, { couponCode });
      return await request('get', `/api/cart/${userId}`);
    });
  } catch (error) { return rejectWithValue(error.message); }
});

export const removeCartCoupon = createAsyncThunk('cart/removeCoupon', async ({ userId }, { rejectWithValue }) => {
  try { return await serializeCartWork(() => request('delete', `/api/cart/${userId}/coupon`)); }
  catch (error) { return rejectWithValue(error.message); }
});

const initialState = { items: [], coupon: null, discount: 0, subtotal: 0, status: 'idle', hydrated: false, error: null, activeRequestId: null };

function applyResponse(state, response) {
  if (response?.guest) {
    state.items = prepareItems(response.items || []);
    state.coupon = null;
    state.discount = 0;
    state.subtotal = state.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    return;
  }
  const normalized = cartStateFrom(response);
  state.items = normalized.items;
  state.coupon = normalized.coupon;
  state.discount = normalized.discount;
  state.subtotal = normalized.subtotal;
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    cartHydrated(state) { state.hydrated = true; },
    cartServerSnapshot(state, action) { applyResponse(state, action.payload); },
    guestItemsReplaced(state, action) { applyResponse(state, { guest: true, items: action.payload }); },
    cartRequestCleared(state) { state.status = 'idle'; state.activeRequestId = null; },
  },
  extraReducers(builder) {
    const thunks = [loadCart, syncCartItems, addCartItem, setCartItemQuantity, changeCartItemQuantity, removeCartItem, clearCartRequest, applyCartCoupon, removeCartCoupon];
    builder
      .addMatcher(isAnyOf(...thunks.map((thunk) => thunk.pending)), (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.activeRequestId = action.meta.requestId;
      })
      .addMatcher(isAnyOf(...thunks.map((thunk) => thunk.fulfilled)), (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;
        applyResponse(state, action.payload);
        state.status = 'succeeded';
        state.hydrated = true;
        state.activeRequestId = null;
      })
      .addMatcher(isAnyOf(...thunks.map((thunk) => thunk.rejected)), (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Cart request failed';
        state.activeRequestId = null;
      });
  },
});

export const cartActions = cartSlice.actions;
export const selectCartItems = (state) => state.cart.items;
export const selectCartSubtotal = (state) => state.cart.subtotal;
export const selectCartTotal = (state) => Math.max(0, state.cart.subtotal - state.cart.discount);
export const selectCartItemCount = (state) => state.cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
export default cartSlice.reducer;
