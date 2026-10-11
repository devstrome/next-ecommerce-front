import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import products from './slices/productSlice';
import cart from './slices/cartSlice';
import checkout from './slices/checkoutSlice';
import orders from './slices/orderSlice';
import wishlist from './slices/wishlistSlice';
import regions from './slices/regionSlice';

export const makeStore = () => configureStore({
  reducer: { auth, products, cart, checkout, orders, wishlist, regions },
});

const store = makeStore();
export default store;
