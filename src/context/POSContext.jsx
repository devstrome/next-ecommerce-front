'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [stats, setStats] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [outlet, setOutlet] = useState('Main Outlet');
  
  const searchInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAdmin();

  // Helper function for authenticated requests
  const makeAuthenticatedRequest = (config) => {
    const token = getStorage('adminAccessToken');
    return axios({
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Please log in as admin to access POS');
      router.push('/admin');
      return;
    }
    
    if (isAuthenticated) {
      fetchStats();
      fetchRecentOrders();
    }
  }, [isAuthenticated, authLoading]);

  const fetchStats = async () => {
    try {
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/stats`
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/recent-orders`
      });
      setRecentOrders(response.data.recentOrders);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    }
  };

  const searchProducts = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/search?query=${query}`
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
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/inventory/scan?code=${barcode}`
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
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/inventory/scan?code=${qrData}`
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
      barcodeInputRef.current?.focus();
      return;
    }

    // Check if item is available
    if (inventory.availableQuantity <= 0) {
      toast.error('Item is out of stock');
      barcodeInputRef.current?.focus();
      return;
    }

    const newItem = {
      inventoryId: inventory._id,
      productId: inventory.productId._id,
      productName: inventory.productId.name,
      variantInfo: {
        size: inventory.size,
        color: inventory.color?.name,
        barcode: inventory.barcode,
        measureType: inventory.variantId?.measureType,
        unitName: inventory.variantId?.unitName
      },
      quantity: 1, // Each inventory item represents 1 unit
      unitPrice: inventory.price,
      discountPrice: inventory.discountPrice,
      totalPrice: inventory.discountPrice || inventory.price,
      scannedBarcode: inventory.barcode
    };
    setCart([...cart, newItem]);
    barcodeInputRef.current?.focus();
  };

  const removeFromCart = (inventoryId) => {
    setCart(cart.filter(item => item.inventoryId !== inventoryId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomer({ name: '', phone: '', email: '', address: '' });
    setPaymentMethod('cash');
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

  const processOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!customer.name.trim()) {
      toast.error('Customer name is required');
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
    searchQuery,
    scannedBarcode,
    searchResults,
    loading,
    showScanner,
    stats,
    recentOrders,
    paymentMethod,
    taxRate,
    discount,
    notes,
    outlet,
    searchInputRef,
    barcodeInputRef,
    
    // Actions
    setCustomer,
    setSearchQuery,
    setScannedBarcode,
    setShowScanner,
    setPaymentMethod,
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
