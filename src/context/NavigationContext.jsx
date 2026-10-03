'use client'
import React, { createContext, useContext, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const NavigationContext = createContext();

export const useNavigation = () => useContext(NavigationContext);

const LABEL_MAP = {
  products: 'Products',
  contact: 'Contact Us',
  login: 'Login',
  signup: 'Sign Up',
  cart: 'Shopping Cart',
  profile: 'Profile',
  admin: 'Admin Panel',
  dashboard: 'Dashboard',
  'orders': 'My Orders',
  users: 'Users',
  categories: 'Categories',
  inventory: 'Inventory',
  shipping: 'Shipping',
  coupons: 'Coupons',
  contacts: 'Contacts',
  slides: 'Sliders',
  'top-rated': 'Top Rated',
  colors: 'Colors',
  sizes: 'Sizes',
  gender: 'Genders',
  'measure-type': 'Measure Types',
  badges: 'Badges',
  admins: 'Admin Management',
  createproducts: 'Create Product',
  related: 'Related Products',
  inbox: 'Messages',
  pos: 'Point of Sale',
  'pos-orders': 'POS Orders',
  wishlist: 'Wishlist',
  addresses: 'Addresses',
  payment: 'Payment Methods',
  settings: 'Settings',
  checkout: 'Checkout',
  blog: 'Blog',
};

const getLabel = (segment) => {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export const NavigationProvider = ({ children }) => {
  const pathname = usePathname();
  const historyRef = useRef([]);
  const lastPathRef = useRef('');

  // Track route changes — append new path to history
  if (pathname !== lastPathRef.current) {
    lastPathRef.current = pathname;
    const segments = pathname.split('/').filter(Boolean);
    let accumulated = '';

    const trail = segments.map((seg) => {
      accumulated += `/${seg}`;
      return { path: accumulated, label: getLabel(seg) };
    });

    // Always prepend Home if not at root
    const fullTrail = [{ path: '/', label: 'Home' }, ...trail];

    // Store the full trail for current page
    historyRef.current = fullTrail;
  }

  const getBreadcrumbs = useCallback(() => {
    return historyRef.current;
  }, [pathname]);

  return (
    <NavigationContext.Provider value={{ getBreadcrumbs }}>
      {children}
    </NavigationContext.Provider>
  );
};
