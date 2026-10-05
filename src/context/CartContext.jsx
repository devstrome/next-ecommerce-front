'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { createContext, useState, useMemo, useEffect, useContext, useCallback, useRef } from 'react';
import { UserContext } from './UserContext';
import axios from 'axios';
import { io } from 'socket.io-client';

export const CartContext = createContext();

const normalizeCartCoupon = (coupon, discountAmount) => {
  if (!coupon) return null;
  const couponData = typeof coupon === 'object'
    ? coupon
    : { _id: String(coupon) };
  return {
    ...couponData,
    discount: Number(discountAmount) || 0,
  };
};

const getCouponId = (coupon) =>
  typeof coupon === 'object' ? coupon?._id || null : coupon || null;

export const CartProvider = ({ children }) => {
  const { user, isLoggedIn, userHydrated, invalidateSession } = useContext(UserContext);
  // Cart starts empty on both server and client first render (hydration-safe),
  // then is restored from storage / server in the sync effect below.
  const [cartItems, setCartItems] = useState([]);
  const [coupon, setCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cartHydrated, setCartHydrated] = useState(false);

  const formatCartItem = useCallback((item) => {
  const productId = item.productId?._id || item.productId;
  const color = item.color || item.colorName || '';

  return {
    ...item,
    productId,
    price: item.price || 0,
    discountApplied: item.discountApplied || 0,
    measureType: item.measureType || '',
    unitName: item.unitName || '',
    color,
    guestItemId:
      item.guestItemId ||
      `${productId}-${item.variantId || ''}-${item.size || ''}-${color || ''}`
  };
}, []);

  const fetchCart = useCallback(async () => {
    if (!isLoggedIn || !user?._id) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/cart/${user._id}`, {
        headers: {
          Authorization: `Bearer ${getStorage('accessToken')}`
        }
      });
      const formattedItems = res.data.items.map(formatCartItem);
      setCartItems(formattedItems);
      setCoupon(normalizeCartCoupon(res.data.couponId, res.data.discountAmount));
      setDiscount(res.data.discountAmount || 0);
    } catch (error) {
      if (error.response?.data?.banned) {
        invalidateSession(error.response.data.message);
      } else {
        console.error('Failed to fetch cart:', error);
      }
    }
  }, [isLoggedIn, user?._id, formatCartItem, invalidateSession]);
  

const syncCart = useCallback(async (localCartItems = []) => {
  if (!isLoggedIn || !user?._id) {
    console.warn("Sync skipped: user ID missing");
    return false;
  }

  try {
    const formattedItems = localCartItems.map(item => {
      const productId =
        typeof item.productId === "object" ? item.productId._id : item.productId;

      const color =
        typeof item.color === "string" ? item.color :
        item.colorName || item.selectedColor?.name || item.selectedColor || "";

      return {
        productId,
        variantId: item.variantId || null,
        size: item.size || "",
        measureType: item.measureType,
        unitName: item.unitName,
        color: String(color).trim(),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        mainImage: item.mainImage,
        name: item.name,
      };
    });

    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URI}/api/cart/items/sync`,
      {
        userId: user._id,
        items: formattedItems,
      },
      {
        headers: {
          Authorization: `Bearer ${getStorage("accessToken")}`,
        },
      }
    );

    const cartLike = data.cart || data.Upcart || data.updatedCart || data;
    const items = cartLike.items || [];

    setCartItems(items.map(formatCartItem));
    setCoupon(normalizeCartCoupon(cartLike.couponId, cartLike.discountAmount));
    setDiscount(cartLike.discountAmount ?? 0);
    return true;
  } catch (error) {
    if (error.response?.data?.banned) {
      invalidateSession(error.response.data.message);
    } else {
      console.error("Sync error:", error.response?.data || error.message);
    }
    return false;
  }
}, [isLoggedIn, user?._id, formatCartItem, invalidateSession]);


  const updateQuantity = useCallback(async (itemIdentifier, newQuantity) => {
  try {
    const numericQuantity = Math.max(1, Number(newQuantity) || 1);

    if (!isLoggedIn) {
      setCartItems(prev =>
        prev.map(item =>
          item.guestItemId === itemIdentifier
            ? { ...item, quantity: numericQuantity }
            : item
        )
      );
      return;
    }

    const { data } = await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URI}/api/cart/items/${itemIdentifier}/update`,
      {
        userId: user._id,
        quantity: numericQuantity,
        couponId: getCouponId(coupon),
      }
    );

    setCartItems(data.cart.items.map(formatCartItem));
    setDiscount(data.totals?.totalDiscount ?? data.cart.discountAmount ?? 0);
    setCoupon(normalizeCartCoupon(data.cart.couponId, data.cart.discountAmount));
  } catch (error) {
    console.error("Update error:", error.response?.data || error.message);
  }
}, [isLoggedIn, user?._id, coupon, formatCartItem]);

  const syncCartRef = useRef(syncCart);
  const fetchCartRef = useRef(fetchCart);
  useEffect(() => { syncCartRef.current = syncCart; }, [syncCart]);
  useEffect(() => { fetchCartRef.current = fetchCart; }, [fetchCart]);

  // Live store sync: when an admin changes coupons / checkout rules / shipping /
  // product prices, the server revalidates carts and pushes events here.
  const userIdRef = useRef(user?._id);
  useEffect(() => { userIdRef.current = user?._id; }, [user?._id]);
  useEffect(() => {
    const API_URI = process.env.NEXT_PUBLIC_API_URI;
    if (!API_URI || !userHydrated || !isLoggedIn || !user?._id) return;
    let disposed = false;
    const socket = io(API_URI, { auth: { token: getStorage('accessToken') }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('joinUserRoom', user._id));
    socket.on('cart:updated', (data) => {
      if (disposed) return;
      if (data?.userId && data.userId !== String(userIdRef.current)) return;
      fetchCartRef.current();
    });
    socket.on('storeChanged', () => {
      if (disposed) return;
      // New price/coupon/shipping rule may already be reflected server-side
      fetchCartRef.current();
      window.dispatchEvent(new CustomEvent('storeChanged'));
    });
    return () => { disposed = true; socket.disconnect(); };
  }, [userHydrated, isLoggedIn, user?._id]);

  const hasSyncedRef = useRef(false);

  useEffect(() => {
    const handleCartSync = async () => {
      if (!userHydrated) return;
      if (isLoggedIn && user?._id) {
        if (hasSyncedRef.current) { setCartHydrated(true); return; }
        hasSyncedRef.current = true;
        try {
          const guestCart = JSON.parse(getStorage('guestCart')) || [];
          if (guestCart.length > 0) {
            const syncSuccess = await syncCartRef.current(guestCart);
            if (syncSuccess) {
              removeStorage('guestCart');
            }
          }
          await fetchCartRef.current();
        } catch (error) {
          console.error('Cart sync error:', error);
        }
      } else {
        hasSyncedRef.current = false;
        try {
          const guestCart = JSON.parse(getStorage('guestCart')) || [];
          setCartItems(guestCart.map(formatCartItem));
        } catch (error) {
          console.error('Cart restore error:', error);
        }
      }
      setCartHydrated(true);
    };

    handleCartSync();
  }, [userHydrated, isLoggedIn, user?._id, formatCartItem]);

  useEffect(() => {
    if (!cartHydrated) return;
    const simplifiedCart = cartItems.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      size: item.size,
      measureType: item.measureType,
      unitName: item.unitName,
      color: item.color,
      price: item.price,
      quantity: item.quantity,
      guestItemId: item.guestItemId,
      mainImage: item.mainImage,
      name: item.name
    }));
    setStorage('cart', JSON.stringify(simplifiedCart));
    if (!isLoggedIn) {
      setStorage('guestCart', JSON.stringify(simplifiedCart));
    }
  }, [cartItems, isLoggedIn, cartHydrated]);

 const applyCoupon = useCallback(async (couponCode) => {
  if (!user?._id) {
    return { success: false, message: "Please log in to apply coupons" };
  }

  setIsLoading(true);
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URI}/api/cart/${user._id}/coupon`,
      { couponCode }
    );


    if (!res.data.success) {
      return { 
        success: false, 
        message: res.data.message || "Failed to apply coupon",
        details: res.data.details 
      };
    }

    const cartRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URI}/api/cart/${user._id}`, 
      {
        headers: {
          Authorization: `Bearer ${getStorage('accessToken')}`
        }
      }
    );


    const getProductId = (p) => typeof p === 'string' ? p : p._id || p;

    const freshItems = cartRes.data.items.map(item => ({
      ...item,
      guestItemId: `${getProductId(item.productId)}-${item.variantId}-${item.size}-${item.color}`
    }));

    setCartItems(() => [...freshItems]);
    setDiscount(cartRes.data.discountAmount || 0);
    setCoupon(normalizeCartCoupon(cartRes.data.couponId, cartRes.data.discountAmount));

    return { success: true, message: "Coupon applied successfully!" };

  } catch (error) {
    console.error('Failed to apply coupon:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to apply coupon",
      details: error.response?.data?.details 
    };
  } finally {
    setIsLoading(false);
  }
}, [user?._id]);



  const removeCoupon = useCallback(async () => {
    if (!user?._id) return;
    setIsLoading(true);
    try {
      const res = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URI}/api/cart/${user._id}/coupon`
      );
      setCartItems(res.data.cart.items.map(formatCartItem));
      setDiscount(0);
      setCoupon(null);
    } catch (error) {
      console.error('Failed to remove coupon:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?._id, formatCartItem]);

const addToCart = useCallback(async (product) => {
  const makeKey = (p) =>
    `${p.productId}-${p.variantId || ""}-${p.size || ""}-${p.color || ""}-${p.measureType || ""}-${p.unitName || ""}`;

  const optimisticId = makeKey(product);
  const qty = product.quantity || 1;

  if (!isLoggedIn) {
    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.guestItemId === optimisticId);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { ...product, quantity: qty, guestItemId: optimisticId }];
    });
    return;
  }

  let snapshot;
  setCartItems((prev) => {
    snapshot = prev;
    const idx = prev.findIndex((item) => item.guestItemId === optimisticId);
    if (idx > -1) {
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
      return next;
    }
    return [...prev, { ...product, quantity: qty, guestItemId: optimisticId }];
  });

  try {
    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URI}/api/cart/items`,
      {
        userId: user._id,
        productId: product.productId,
        variantId: product.variantId,
        name: product.name,
        quantity: qty,
        price: product.price,
        mainImage: product.mainImage,
        size: product.size,
        color: product.color,
        measureType: product.measureType,
        unitName: product.unitName,
      }
    );

    const { cart, totals } = data;
    setCartItems(cart.items.map(formatCartItem));
    setDiscount(totals?.totalDiscount ?? cart.discountAmount ?? 0);
    setCoupon(normalizeCartCoupon(cart.couponId, totals?.totalDiscount ?? cart.discountAmount));
  } catch (error) {
    console.error("Error adding item to cart:", error);
    setCartItems(snapshot); // rollback
  }
}, [isLoggedIn, user?._id, formatCartItem]);

 const increaseQuantity = useCallback(async (itemIdentifier) => {
  if (!isLoggedIn) {
    // Guest cart: itemIdentifier is guestItemId
    setCartItems(prev =>
      prev.map(item =>
        item.guestItemId === itemIdentifier
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
    return;
  }

  // Logged-in: itemIdentifier is server cart item _id
  let snapshot;
  setCartItems(prev => {
    snapshot = prev;
    const idx = prev.findIndex(it => it.id === itemIdentifier || it._id === itemIdentifier);
    if (idx === -1) return prev;

    const next = [...prev];
    next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
    return next;
  });

  try {
    const { data } = await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URI}/api/cart/items/${itemIdentifier}/increase`,
      {
        userId: user._id,
        couponId: getCouponId(coupon) ?? undefined, // optional
      }
    );

    setCartItems(data.cart.items.map(formatCartItem));
    setDiscount(data.totals?.totalDiscount ?? data.cart.discountAmount ?? 0);
    setCoupon(normalizeCartCoupon(data.cart.couponId, data.cart.discountAmount));
  } catch (error) {
    console.error("Failed to increase quantity:", error);
    setCartItems(snapshot); // rollback
  }
}, [isLoggedIn, user?._id, coupon, formatCartItem]);

const decreaseQuantity = useCallback(async (itemIdentifier) => {
  if (!isLoggedIn) {
    // Guest cart: itemIdentifier is guestItemId
    setCartItems(prev =>
      prev.map(item =>
        item.guestItemId === itemIdentifier
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item
      )
    );
    return;
  }

  // Logged-in: itemIdentifier is server cart item _id
  let snapshot;
  setCartItems(prev => {
    snapshot = prev;
    const idx = prev.findIndex(it => it.id === itemIdentifier || it._id === itemIdentifier);
    if (idx === -1) return prev;

    const next = [...prev];
    next[idx] = {
      ...next[idx],
      quantity: Math.max(1, next[idx].quantity - 1),
    };
    return next;
  });

  try {
    const { data } = await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URI}/api/cart/items/${itemIdentifier}/decrease`,
      {
        userId: user._id,
        couponId: getCouponId(coupon) ?? undefined,
      }
    );

    setCartItems(data.cart.items.map(formatCartItem));
    setDiscount(data.totals?.totalDiscount ?? data.cart.discountAmount ?? 0);
    setCoupon(normalizeCartCoupon(data.cart.couponId, data.cart.discountAmount));
  } catch (error) {
    console.error("Failed to decrease quantity:", error);
    setCartItems(snapshot); // rollback
  }
}, [isLoggedIn, user?._id, coupon, formatCartItem]);

  const removeItem = useCallback(async (itemIdentifier) => {
  if (!isLoggedIn) {
    // Guest cart: remove by guestItemId
    setCartItems(prev => prev.filter(item => item.guestItemId !== itemIdentifier));
    return;
  }

  try {
    const { data } = await axios.delete(
      `${process.env.NEXT_PUBLIC_API_URI}/api/cart/items/delete/${user._id}/${itemIdentifier}`
    );

    setCartItems(data.cart.items.map(formatCartItem));
    setDiscount(data.totals?.totalDiscount ?? data.cart.discountAmount ?? 0);
    setCoupon(normalizeCartCoupon(data.cart.couponId, data.cart.discountAmount));
  } catch (error) {
    console.error("Error removing item from cart:", error.response?.data || error.message);
  }
}, [isLoggedIn, user?._id, formatCartItem]);

  const clearCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCartItems([]);
    } else {
      try {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/cart/${user._id}`);
        setCartItems([]);
        setDiscount(0);
        setCoupon(null);
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
  }, [isLoggedIn, user?._id]);

  const totalPrice = useMemo(() => {
    const subtotal = cartItems.reduce((total, item) => 
      total + (item.price * item.quantity) - (item.discountApplied || 0), 0);
    return subtotal - discount;
  }, [cartItems, discount]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        totalPrice,
        isLoading,
        coupon,
        discount,
        addToCart,
        increaseQuantity,
        decreaseQuantity,
        removeItem,
        clearCart,
        applyCoupon,
        removeCoupon,
        syncCart,
        updateQuantity
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
