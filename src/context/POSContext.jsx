'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from "next/navigation";
import { useAdmin } from './AdminContext';

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
        setScannedBarcode('');
        toast.success('Product added to cart');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      toast.error(error.response?.data?.message || 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async (qrData) => {
    console.log('QR Code scanned:', qrData);
    
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
    // Check if item is already in cart
    const existingItem = cart.find(item => item.inventoryId === inventory._id);
    
    if (existingItem) {
      toast.warning('Item already in cart');
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
        barcode: inventory.barcode
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
      
      // Create printable receipt content
      const receiptContent = `
        ========================================
        BELORELLA - POS RECEIPT
        ========================================
        Order #: ${receipt.orderNumber}
        Date: ${new Date(receipt.date).toLocaleString()}
        Cashier: ${receipt.cashier.firstName} ${receipt.cashier.lastName}
        
        Customer: ${receipt.customer.name}
        Phone: ${receipt.customer.phone || 'N/A'}
        
        ========================================
        ITEMS:
        ${receipt.items.map(item => `
        ${item.productName} (${item.variantInfo.size})
        ${item.quantity} x $${item.unitPrice} = $${item.totalPrice}
        Barcode: ${item.variantInfo.barcode}
        `).join('')}
        ========================================
        Subtotal: $${receipt.subtotal.toFixed(2)}
        Tax: $${receipt.tax.toFixed(2)}
        Discount: $${receipt.discount.toFixed(2)}
        ========================================
        TOTAL: $${receipt.total.toFixed(2)}
        Payment: ${receipt.paymentMethod.toUpperCase()}
        ========================================
        Thank you for your purchase!
        ========================================
      `;
      
                    // Create thermal printer receipt with POS order barcode only
        const thermalReceiptContent = `
          <html>
            <head>
              <title>Receipt - ${receipt.orderNumber}</title>
              <style>
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                                 body { 
                   font-family: 'Courier New', monospace; 
                   font-size: 9px; 
                   margin: 0;
                   padding: 2mm;
                   width: 76mm;
                   max-width: 76mm;
                   background: white;
                   line-height: 1.2;
                   word-wrap: break-word;
                 }
                .logo {
                  text-align: center;
                  font-size: 10px;
                  font-weight: bold;
                  margin-bottom: 3mm;
                  border-bottom: 1px dashed #000;
                  padding-bottom: 2mm;
                }
                .receipt-header {
                  text-align: center;
                  margin-bottom: 3mm;
                  font-size: 7px;
                }
                .customer-info {
                  margin-bottom: 3mm;
                  font-size: 7px;
                }
                .items-section {
                  margin-bottom: 3mm;
                }
                .item {
                  margin-bottom: 2mm;
                  padding-bottom: 1mm;
                  border-bottom: 1px dotted #ccc;
                  font-size: 7px;
                }
                .item-details {
                  margin: 0.5mm 0;
                }
                .order-barcode-section {
                  text-align: center;
                  margin: 3mm 0;
                  padding: 2mm 0;
                  border-top: 1px dashed #000;
                  border-bottom: 1px dashed #000;
                }
                .barcode-container {
                  text-align: center;
                  margin: 1mm 0;
                }
                .barcode-image {
                  max-width: 60mm;
                  height: auto;
                }
                .totals {
                  border-top: 1px dashed #000;
                  padding-top: 2mm;
                  margin-top: 3mm;
                  font-size: 7px;
                }
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 0.5mm 0;
                }
                .final-total {
                  font-weight: bold;
                  font-size: 9px;
                  border-top: 1px solid #000;
                  padding-top: 1mm;
                  margin-top: 1mm;
                }
                .footer {
                  text-align: center;
                  margin-top: 3mm;
                  border-top: 1px dashed #000;
                  padding-top: 2mm;
                  font-size: 7px;
                }
                .divider {
                  text-align: center;
                  margin: 2mm 0;
                  font-size: 6px;
                }
                @media print {
                  body {
                    width: 76mm;
                    max-width: 76mm;
                    margin: 0;
                    padding: 2mm;
                  }
                  .barcode-image {
                    max-width: 60mm;
                  }
                  * {
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                  }
                }
              </style>
            </head>
            <body>
              <div class="logo">
                ╔══════════════════════════════════════════════════════════╗
                ║                                                          ║
                ║                    BELORELLA                             ║
                ║              Premium Fashion & Lifestyle                 ║
                ║                                                          ║
                ╚══════════════════════════════════════════════════════════╝
              </div>
              
              <div class="receipt-header">
                <div>POS RECEIPT</div>
                <div>Order #: ${receipt.orderNumber}</div>
                <div>Date: ${new Date(receipt.date).toLocaleString()}</div>
                <div>Cashier: ${receipt.cashier.firstName} ${receipt.cashier.lastName}</div>
              </div>
              
              <div class="divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
              
              <div class="customer-info">
                <div><strong>Customer:</strong> ${receipt.customer.name}</div>
                <div><strong>Phone:</strong> ${receipt.customer.phone || 'N/A'}</div>
              </div>
              
              <div class="divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
              
              <div class="items-section">
                <div style="text-align: center; font-weight: bold; margin-bottom: 2mm;">ITEMS:</div>
                                 ${receipt.items.map(item => `
                   <div class="item">
                     <div class="item-details">
                       <div><strong>${item.productName}</strong></div>
                       <div>Size: ${item.variantInfo.size}</div>
                       <div>${item.quantity} x $${item.unitPrice}</div>
                       ${item.discountPrice && item.discountPrice < item.unitPrice ? 
                         `<div style="color: #666; font-size: 6px;">Original: $${item.unitPrice} | Discounted: $${item.discountPrice}</div>` : 
                         ''
                       }
                       <div><strong>Total: $${item.totalPrice}</strong></div>
                     </div>
                   </div>
                 `).join('')}
              </div>
              
                             <div class="order-barcode-section">
                 <div style="font-weight: bold; margin-bottom: 1mm;">ORDER BARCODE:</div>
                 <div class="barcode-container">
                   <img 
                     src="https://barcodeapi.org/api/auto/${receipt.orderNumber}" 
                     alt="Order Barcode ${receipt.orderNumber}"
                     class="barcode-image"
                     onerror="this.style.display='none'"
                     onload="this.style.display='block'"
                   />
                 </div>
                 <div style="font-size: 6px; margin-top: 1mm; font-family: monospace;">${receipt.orderNumber}</div>
               </div>
              
              <div class="totals">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>$${receipt.subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span>Tax:</span>
                  <span>$${receipt.tax.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span>Discount:</span>
                  <span>$${receipt.discount.toFixed(2)}</span>
                </div>
                <div class="total-row final-total">
                  <span>TOTAL:</span>
                  <span>$${receipt.total.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span>Payment:</span>
                  <span>${receipt.paymentMethod.toUpperCase()}</span>
                </div>
              </div>
              
              <div class="divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
              
              <div class="footer">
                <div>Thank you for your purchase!</div>
                <div style="margin-top: 1mm;">Please come again</div>
                <div style="margin-top: 3mm; font-size: 6px;">
                  ╔══════════════════════════════════════════════════════════╗
                  ║                                                          ║
                  ║                    BELORELLA                             ║
                  ║              Premium Fashion & Lifestyle                 ║
                  ║                                                          ║
                  ╚══════════════════════════════════════════════════════════╝
                </div>
              </div>
            </body>
          </html>
        `;
      
             // Open print dialog with thermal receipt
       const printWindow = window.open('', '_blank');
       printWindow.document.write(thermalReceiptContent);
       printWindow.document.close();
       printWindow.print();
      
    } catch (error) {
      console.error('Error printing receipt:', error);
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
