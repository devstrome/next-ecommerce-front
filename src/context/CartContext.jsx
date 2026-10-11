'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UserContext } from './UserContext';
import { getStorage, setStorage, removeStorage } from '../lib/storage';
import { io } from 'socket.io-client';
import {
  addCartItem,
  applyCartCoupon,
  cartActions,
  changeCartItemQuantity,
  clearCartRequest,
  loadCart,
  removeCartCoupon,
  removeCartItem,
  selectCartTotal,
  setCartItemQuantity,
  syncCartItems,
} from '../store/slices/cartSlice';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { user, isLoggedIn, userHydrated, invalidateSession } = useContext(UserContext);
  const cart = useSelector((state) => state.cart);
  const totalPrice = useSelector(selectCartTotal);
  const userId = user?._id || null;

  useEffect(() => {
    if (!userHydrated) return;
    dispatch(loadCart({ userId, isLoggedIn }))
      .unwrap()
      .catch((message) => {
        if (typeof message === 'string' && /banned/i.test(message)) invalidateSession(message);
        else console.error('Cart load failed:', message);
      })
      .finally(() => dispatch(cartActions.cartHydrated()));
  }, [dispatch, userHydrated, isLoggedIn, userId, invalidateSession]);

  useEffect(() => {
    if (!cart.hydrated || isLoggedIn) return;
    const guestCart = cart.items.map((item) => ({
      productId: item.productId?._id || item.productId,
      regionId: item.regionId?._id || item.regionId || null,
      regionName: item.regionName || item.regionId?.name || '',
      variantId: item.variantId || null,
      size: item.size || '',
      measureType: item.measureType || '',
      unitName: item.unitName || '',
      color: item.color || item.colorName || '',
      price: item.price,
      quantity: item.quantity,
      mainImage: item.mainImage,
      name: item.name,
      isPreOrder: Boolean(item.isPreOrder),
      preOrderEstimatedDate: item.preOrderEstimatedDate || null,
      guestItemId: item.guestItemId,
    }));
    setStorage('guestCart', JSON.stringify(guestCart));
  }, [cart.items, cart.hydrated, isLoggedIn]);

  useEffect(() => {
    const API_URI = process.env.NEXT_PUBLIC_API_URI;
    if (!API_URI || !userHydrated || !isLoggedIn || !userId) return;
    let disposed = false;
    const socket = io(API_URI, { auth: { token: getStorage('accessToken') }, transports: ['websocket', 'polling'] });
    const refreshCart = () => {
      if (!disposed) dispatch(loadCart({ userId, isLoggedIn: true }));
    };
    socket.on('connect', () => socket.emit('joinUserRoom', userId));
    socket.on('cart:updated', refreshCart);
    socket.on('storeChanged', () => {
      refreshCart();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('storeChanged'));
    });
    return () => { disposed = true; socket.disconnect(); };
  }, [dispatch, userHydrated, isLoggedIn, userId]);

  const addToCart = useCallback(async (item) => {
    try {
      return await dispatch(addCartItem({ userId, isLoggedIn, item })).unwrap();
    } catch (error) {
      console.error('Unable to add cart item:', error);
      return null;
    }
  }, [dispatch, userId, isLoggedIn]);

  const updateQuantity = useCallback(async (itemId, quantity) => {
    try {
      return await dispatch(setCartItemQuantity({ userId, isLoggedIn, itemId, quantity, couponId: cart.coupon?._id || cart.coupon })).unwrap();
    } catch (error) {
      const message = String(error || 'Unable to update cart quantity');
      if (/only \d+ item\(s\) are available/i.test(message)) {
        dispatch(loadCart({ userId, isLoggedIn }));
        return { success: false, message };
      }
      console.error('Unable to update cart quantity:', error);
      return { success: false, message };
    }
  }, [dispatch, userId, isLoggedIn, cart.coupon]);

  const increaseQuantity = useCallback(async (itemId) => {
    try {
      return await dispatch(changeCartItemQuantity({ userId, isLoggedIn, itemId, delta: 1, couponId: cart.coupon?._id || cart.coupon })).unwrap();
    } catch (error) {
      const message = String(error || 'Unable to increase cart quantity');
      if (/only \d+ item\(s\) are available/i.test(message)) {
        dispatch(loadCart({ userId, isLoggedIn }));
        return { success: false, message };
      }
      console.error('Unable to increase cart quantity:', error);
      return { success: false, message };
    }
  }, [dispatch, userId, isLoggedIn, cart.coupon]);

  const decreaseQuantity = useCallback(async (itemId) => {
    try {
      return await dispatch(changeCartItemQuantity({ userId, isLoggedIn, itemId, delta: -1, couponId: cart.coupon?._id || cart.coupon })).unwrap();
    } catch (error) { console.error('Unable to decrease cart quantity:', error); return null; }
  }, [dispatch, userId, isLoggedIn, cart.coupon]);

  const removeItem = useCallback(async (itemId) => {
    try { return await dispatch(removeCartItem({ userId, isLoggedIn, itemId })).unwrap(); }
    catch (error) { console.error('Unable to remove cart item:', error); return null; }
  }, [dispatch, userId, isLoggedIn]);

  const clearCart = useCallback(async () => {
    try {
      const result = await dispatch(clearCartRequest({ userId, isLoggedIn })).unwrap();
      removeStorage('guestCart');
      return result;
    } catch (error) { console.error('Unable to clear cart:', error); return null; }
  }, [dispatch, userId, isLoggedIn]);

  const applyCoupon = useCallback(async (couponCode) => {
    if (!userId) return { success: false, message: 'Please log in to apply coupons' };
    try {
      await dispatch(applyCartCoupon({ userId, couponCode })).unwrap();
      return { success: true, message: 'Coupon applied successfully!' };
    } catch (error) { return { success: false, message: String(error || 'Failed to apply coupon') }; }
  }, [dispatch, userId]);

  const removeCoupon = useCallback(async () => {
    if (!userId) return null;
    try { return await dispatch(removeCartCoupon({ userId })).unwrap(); }
    catch (error) { console.error('Unable to remove coupon:', error); return null; }
  }, [dispatch, userId]);

  const syncCart = useCallback(async (items = []) => {
    if (!userId || !isLoggedIn) return false;
    try {
      await dispatch(syncCartItems({ userId, items })).unwrap();
      return true;
    } catch (error) { console.error('Cart sync failed:', error); return false; }
  }, [dispatch, userId, isLoggedIn]);

  const value = useMemo(() => ({
    cartItems: cart.items,
    coupon: cart.coupon,
    discount: cart.discount,
    totalPrice,
    isLoading: cart.status === 'loading',
    cartHydrated: cart.hydrated,
    error: cart.error,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    syncCart,
    fetchCart: () => dispatch(loadCart({ userId, isLoggedIn })),
  }), [cart, totalPrice, addToCart, increaseQuantity, decreaseQuantity, updateQuantity, removeItem, clearCart, applyCoupon, removeCoupon, syncCart, dispatch, userId, isLoggedIn]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
