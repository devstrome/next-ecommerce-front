'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from "next/navigation";
import { useAdmin } from './AdminContext';
import { printThermalReceipt } from '../lib/print/thermal';

const POSContext = createContext();

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

export const POSProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [loyaltyCustomer, setLoyaltyCustomer] = useState(null);
  const [loyaltyRequested, setLoyaltyRequested] = useState('');
  const [posGiftCode, setPosGiftCodeValue] = useState('');
  const [posGiftCodeDetails, setPosGiftCodeDetails] = useState(null);
  const [posGiftCodeLoading, setPosGiftCodeLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [stats, setStats] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentTrxId, setPaymentTrxId] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [outlet, setOutlet] = useState('Main Outlet');
  
  const searchInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, hasPermission } = useAdmin();
  const canAccessPos = hasPermission('pos') || hasPermission('posOrders');

  // Helper function for authenticated requests
  const makeAuthenticatedRequest = useCallback((config) => {
    const token = getStorage('adminAccessToken');
    return axios({
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/stats`
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [makeAuthenticatedRequest]);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/recent-orders`
      });
      setRecentOrders(response.data.recentOrders);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    }
  }, [makeAuthenticatedRequest]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Please log in as admin to access POS');
      router.push('/admin');
      return;
    }

    if (isAuthenticated && canAccessPos) {
      fetchStats();
      fetchRecentOrders();
    }
  }, [isAuthenticated, authLoading, router, fetchStats, fetchRecentOrders, canAccessPos]);

  const searchProducts = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/search?query=${encodeURIComponent(query)}`
      });
      setSearchResults(response.data.inventory);
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Error searching products');
    } finally {
      setLoading(false);
    }
  };

  const scanBarcode = async (barcode) => {
    if (!barcode.trim()) return;

    try {
      setLoading(true);
      // Use the inventory scan endpoint for both barcodes and QR codes
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/inventory/scan?code=${encodeURIComponent(barcode)}`
      });
      
      if (response.data.success) {
        addToCart(response.data.inventory);
        toast.success('Product added to cart');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      toast.error(error.response?.data?.message || 'Product not found');
    } finally {
      setLoading(false);
      // Physical scanners keep typing — always return to the barcode field
      setScannedBarcode('');
      barcodeInputRef.current?.focus();
    }
  };

  const handleQRScan = async (qrData) => {
    
    try {
      setLoading(true);
      // Use the inventory scan endpoint for QR codes
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/inventory/scan?code=${encodeURIComponent(qrData)}`
      });
      
      if (response.data.success) {
        addToCart(response.data.inventory);
        setScannedBarcode('');
        toast.success('Product added to cart');
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      toast.error(error.response?.data?.message || 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (inventory) => {
    // Check if item is already in cart (same physical unit / barcode)
    const existingItem = cart.find(item => item.inventoryId === inventory._id);
    
    if (existingItem) {
      toast.warning('This unit is already in the cart');
      return;
    }

    // Check if item is available
    if (inventory.availableQuantity <= 0) {
      toast.error('Item is out of stock');
      return;
    }

    const newItem = {
      inventoryId: inventory._id,
      productId: inventory.productId._id,
      productName: inventory.productId.name,
      variantInfo: {
        size: inventory.size,
        color: inventory.color?.name,
        variantId: inventory.variantId?._id || inventory.variantId || null,
        barcode: inventory.barcode,
        realBarcode: inventory.realBarcode || '',
        qrCode: inventory.qrCode || '',
        imageUrl: inventory.variantImage || inventory.imageUri || inventory.productId?.mainImage || '',
        hexCode: inventory.color?.hexCode || inventory.hexCode || '',
        measureType: inventory.variantId?.measureType,
        unitName: inventory.variantId?.unitName,
        regionId: inventory.regionId?._id || inventory.regionId || inventory.variantId?.regionId?._id || inventory.variantId?.regionId || null,
        regionName: inventory.regionName || inventory.regionId?.name || inventory.variantId?.regionName || inventory.variantId?.regionId?.name || ''
      },
      quantity: 1, // Each inventory item represents 1 unit
      unitPrice: inventory.price,
      discountPrice: inventory.discountPrice,
      totalPrice: inventory.discountPrice || inventory.price,
      scannedBarcode: inventory.barcode
    };
    setCart([...cart, newItem]);
  };

  const removeFromCart = (inventoryId) => {
    setCart(cart.filter(item => item.inventoryId !== inventoryId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomer({ name: '', phone: '', email: '', address: '' });
    setLoyaltyCustomer(null);
    setLoyaltyRequested('');
    setPosGiftCodeValue('');
    setPosGiftCodeDetails(null);
    setPaymentMethod('cash');
    setPaymentTrxId('');
    setTaxRate(0);
    setDiscount(0);
    setNotes('');
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal + taxAmount - discountAmount;
    
    return { subtotal, taxAmount, discountAmount, total };
  };

  const lookupLoyaltyCustomer = async (query) => {
    const search = String(query || '').trim();
    if (search.length < 3) throw new Error('Enter at least 3 characters of phone or email');
    const response = await makeAuthenticatedRequest({
      method: 'GET',
      url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/loyalty/customer?query=${encodeURIComponent(search)}`,
    });
    const linkedCustomer = response.data.customer;
    setLoyaltyCustomer(linkedCustomer);
    setLoyaltyRequested('');
    setCustomer((current) => ({
      ...current,
      name: linkedCustomer.name || current.name,
      email: linkedCustomer.email || current.email,
      phone: linkedCustomer.phone || current.phone,
    }));
    return linkedCustomer;
  };

  const clearLoyaltyCustomer = () => {
    setLoyaltyCustomer(null);
    setLoyaltyRequested('');
  };

  const setPOSGiftCode = (value) => {
    setPosGiftCodeValue(String(value || '').toUpperCase());
    setPosGiftCodeDetails(null);
  };

  const clearPOSGiftCode = () => {
    setPosGiftCodeValue('');
    setPosGiftCodeDetails(null);
  };

  const validatePOSGiftCode = async () => {
    const code = String(posGiftCode || '').trim().toUpperCase();
    if (!code) throw new Error('Enter a gift code');
    setPosGiftCodeLoading(true);
    try {
      const response = await makeAuthenticatedRequest({
        method: 'POST',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/gift-codes/validate`,
        data: { code },
      });
      const details = { ...response.data.giftCode, code };
      setPosGiftCodeDetails(details);
      return details;
    } finally {
      setPosGiftCodeLoading(false);
    }
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (posGiftCode.trim() && (!posGiftCodeDetails || posGiftCodeDetails.code !== posGiftCode.trim().toUpperCase())) {
      toast.error('Apply and validate the gift code before completing the sale');
      return;
    }

    if (paymentMethod === 'mobile_payment' && !/^[a-z0-9]{8,100}$/i.test(String(paymentTrxId || '').trim())) {
      toast.error('Enter a valid mobile payment transaction ID (at least 8 letters or numbers)');
      return;
    }

    const { subtotal, taxAmount, discountAmount, total } = calculateTotals();

    try {
      setLoading(true);
      const orderData = {
        customer,
        items: cart,
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total,
        paymentMethod,
        paymentDetails: paymentMethod === 'mobile_payment' ? { trxId: paymentTrxId.trim() } : {},
        loyaltyUserId: loyaltyCustomer?.userId || null,
        loyaltyAmountBDT: Math.max(0, Number(loyaltyRequested) || 0),
        loyaltyGiftCode: posGiftCodeDetails?.code || '',
        outlet,
        notes
      };

      const response = await makeAuthenticatedRequest({
        method: 'POST',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/orders`,
        data: orderData
      });
      
      toast.success(`Order created successfully! Order #${response.data.posOrder.orderNumber}`);
      
      // Print receipt
      printReceipt(response.data.posOrder._id);
      
      // Clear cart and reset form
      clearCart();
      fetchStats();
      fetchRecentOrders();
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.message || 'Error creating order');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = async (orderId) => {
    try {
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/orders/${orderId}/receipt`
      });
      const receipt = response.data.receipt;

      // Single shared thermal template (58/80mm) — prints after images decode
      const width = Number(getStorage('posPaperWidth')) || 80;
      const ok = printThermalReceipt(receipt, { width });
      if (!ok) {
        toast.error('Print window blocked - allow popups for this site');
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Failed to load receipt for printing');
    }
  };

  const value = {
    // State
    cart,
    customer,
    loyaltyCustomer,
    loyaltyRequested,
    posGiftCode,
    posGiftCodeDetails,
    posGiftCodeLoading,
    searchQuery,
    scannedBarcode,
    searchResults,
    loading,
    showScanner,
    stats,
    recentOrders,
    paymentMethod,
    paymentTrxId,
    taxRate,
    discount,
    notes,
    outlet,
    searchInputRef,
    barcodeInputRef,
    
    // Actions
    setCustomer,
    setLoyaltyRequested,
    setPOSGiftCode,
    clearPOSGiftCode,
    setSearchQuery,
    setScannedBarcode,
    setShowScanner,
    setPaymentMethod,
    setPaymentTrxId,
    setTaxRate,
    setDiscount,
    setNotes,
    setOutlet,
    
    // Functions
    searchProducts,
    scanBarcode,
    handleQRScan,
    addToCart,
    removeFromCart,
    clearCart,
    calculateTotals,
    processOrder,
    lookupLoyaltyCustomer,
    validatePOSGiftCode,
    clearLoyaltyCustomer,
    printReceipt,
    fetchStats,
    fetchRecentOrders
  };

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};
