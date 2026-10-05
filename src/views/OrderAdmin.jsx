'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAdmin } from '../context/AdminContext';
import RefundStatusTracker from '../components/RefundStatusTracker';
import AdminCreateOrderModal from '../components/AdminCreateOrderModal';
import QRScanner from '../components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { toast } from 'react-toastify';
import { printDocument } from '../lib/print';
import { formatMeasureLine } from '../lib/measure';
import { formatBDT } from '../config/brand';
import { 
  FaFilter, 
  FaPrint, 
  FaDownload, 
  FaSearch, 
  FaCalendarAlt,
  FaUser,
  FaCreditCard,
  FaBox,
  FaSignature,
  FaTimes,
  FaEye,
  FaEdit,
  FaSyncAlt,
  FaPlus
} from 'react-icons/fa';

const statusColors = {
  orderStatus: {
    pending: 'bg-maybelline-light text-maybelline-magenta',
    processing: 'bg-maybelline-light text-maybelline-magenta',
    shipped: 'bg-maybelline-light text-maybelline-magenta',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  },
  paymentStatus: {
    pending: 'bg-maybelline-light text-maybelline-magenta',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-purple-100 text-purple-800',
  },
  refundStatus: {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  },
};

const paymentMethodIcons = {
  bkash: 'text-[#e2136e]',
  nagad: 'text-[#e21818]',
  cash: 'text-gray-600',
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URI || '';

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const formatCurrency = (amount) => {
  return formatBDT(amount);
};

const AdminOrdersPage = () => {
  const { isAuthenticated, loading: authLoading, logout } = useAdmin();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanningForOrder, setScanningForOrder] = useState(null);
  const [scanningForItem, setScanningForItem] = useState(null);
  const [scanningMode, setScanningMode] = useState('qr'); // 'qr' or 'barcode'
  const socketRef = useRef(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    orderStatus: '',
    paymentStatus: '',
    paymentMethod: '',
    refundStatus: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });
  const [refundNoteInput, setRefundNoteInput] = useState('');
  
  // Print states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState(null);
  
  // Order editing states
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  
  // Product search states
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [selectedProductStock, setSelectedProductStock] = useState({});
  const [printSettings, setPrintSettings] = useState({
    includeSignature: true,
    includeQRCode: true,
    includeBarcode: true,
    showLogo: true,
    paperSize: 'A4'
  });

  const [courierLoading, setCourierLoading] = useState(false);
  const [sendingPdf, setSendingPdf] = useState(false);
  const [courierService, setCourierService] = useState('pathao');

  // Initialize Socket.IO connection when authenticated
 // In your AdminOrdersPage component
useEffect(() => {
  if (!isAuthenticated || !API_BASE_URL) return;

  const adminToken = getStorage('adminAccessToken') || getStorage('adminRefreshToken');
  socketRef.current = io(API_BASE_URL, {
    withCredentials: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 5000,
    timeout: 10000,
    auth: { token: adminToken || '' },
    transports: ['polling', 'websocket'],
  });

  socketRef.current.on('connect', () => {
    socketRef.current.emit('joinAdminRoom');
  });

  socketRef.current.on('connect_error', () => {
    if (socketRef.current) socketRef.current.disconnect();
  });

  socketRef.current.on('admin:newOrder', (newOrder) => {
    setOrders(prev => [newOrder, ...prev]);
    showNotification(`New order #${newOrder.orderId}`);
  });

  socketRef.current.on('admin:updateOrder', (updatedOrder) => {
    setOrders(prev => prev.map(order => 
      order._id === updatedOrder._id ? { ...order, ...updatedOrder } : order
    ));
    if (editingOrder?._id === updatedOrder._id) {
      setEditingOrder(prev => (prev ? { ...prev, ...updatedOrder } : updatedOrder));
    }
    showNotification(`Order #${updatedOrder.orderId} updated`);
  });

  socketRef.current.on('admin:cancelOrder', (cancelledOrder) => {
    setOrders(prev => prev.map(order => 
      order._id === cancelledOrder._id ? { ...order, ...cancelledOrder } : order
    ));
    showNotification(`Order #${cancelledOrder.orderId} cancelled`);
  });

  socketRef.current.on('admin:orderDeleted', (deletedOrder) => {
    setOrders(prev => prev.filter(order => order._id !== deletedOrder._id));
    showNotification(`Order #${deletedOrder.orderId} deleted`);
  });

  socketRef.current.on('stockUpdate', (stockData) => {
    showNotification(`Stock updated for product: ${stockData.action === 'decrease' ? 'Decreased' : 'Increased'} stock for size ${stockData.size}`);
  });

  return () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };
}, [isAuthenticated, editingOrder]);

  const showNotification = (message) => {
    if (Notification.permission === 'granted') {
      new Notification('Order Update', { body: message });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Order Update', { body: message });
        }
      });
    }
  };

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/allorders?page=${page}&limit=${pagination.limit}`, {
        headers: {
          Authorization: `Bearer ${getStorage('adminAccessToken')}`
        }
      });
      
      if (res.data && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
        setPagination({
          page: res.data.meta.page,
          limit: res.data.meta.limit,
          total: res.data.meta.total,
          pages: res.data.meta.pages
        });
      } else {
        setOrders([]);
        setError('Orders data is invalid');
      }
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
      setError('Failed to fetch orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/admin/login';
    } else if (isAuthenticated) {
      fetchOrders(currentPage);
    }
  }, [isAuthenticated, authLoading, currentPage]);

  const filteredOrders = (orders || []).filter(order => {
    // Text search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = (
        order.orderId.toString().toLowerCase().includes(searchLower) ||
        order.userId.toLowerCase().includes(searchLower) ||
        (order.shippingAddress?.fullName?.toLowerCase().includes(searchLower) ?? false)
      );
      if (!matchesSearch) return false;
    }

    // Status filters
    if (filters.orderStatus && order.orderStatus !== filters.orderStatus) return false;
    if (filters.paymentStatus && order.paymentStatus !== filters.paymentStatus) return false;
    if (filters.paymentMethod && order.paymentMethod !== filters.paymentMethod) return false;
    if (filters.refundStatus && (order.refundStatus || 'none') !== filters.refundStatus) return false;

    // Date filters
    if (filters.dateFrom) {
      const orderDate = new Date(order.createdAt);
      const fromDate = new Date(filters.dateFrom);
      if (orderDate < fromDate) return false;
    }
    if (filters.dateTo) {
      const orderDate = new Date(order.createdAt);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      if (orderDate > toDate) return false;
    }

    // Amount filters
    if (filters.minAmount && order.totalAmount < parseFloat(filters.minAmount)) return false;
    if (filters.maxAmount && order.totalAmount > parseFloat(filters.maxAmount)) return false;

    return true;
  });

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = (filteredOrders || []).slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil((filteredOrders || []).length / ordersPerPage);

  const handleUpdateStatus = async (orderId, field, value) => {
    try {
      setUpdatingOrderId(orderId);
      await axios.patch(
        `${API_BASE_URL}/api/orders/${orderId}/status`, 
        { [field]: value },
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );
      await fetchOrders(currentPage);
      if (editingOrder?._id === orderId) {
        setEditingOrder(prev => ({ ...prev, [field]: value }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
      alert('Failed to update status');
      console.error(err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSendToCourier = async (orderId, service) => {
    if (!window.confirm(`Queue this order for ${service.toUpperCase()}? It will be dispatched to the courier API from the Courier page.`)) return;
    setCourierLoading(true);
    try {
      const token = localStorage.getItem('adminAccessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/courier/shipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, service }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Queued for ${service}. Dispatch it from the Courier page.`);
        setEditingOrder((prev) => (prev && prev._id === orderId ? { ...prev, courier: data.courier } : prev));
        fetchOrders(currentPage);
      } else {
        toast.error(data.message || 'Failed to queue courier');
      }
    } catch (err) {
      toast.error('Failed to queue courier');
    } finally {
      setCourierLoading(false);
    }
  };

  // Admin full update using new PUT endpoint
  const handleAdminUpdate = async (orderId, payload) => {
    try {
      setUpdatingOrderId(orderId);
      await axios.put(`${API_BASE_URL}/api/orders/${orderId}`,
        payload,
        { headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } }
      );
      await fetchOrders(currentPage);
    } catch (err) {
      if (err.response?.status === 401) logout();
      alert('Failed to update order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await axios.patch(
        `${API_BASE_URL}/api/orders/cancel/${orderId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminRefreshToken')}`
          }
        }
      );
      await fetchOrders(currentPage);
      if (editingOrder?._id === orderId) setEditingOrder(null);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
      alert('Failed to cancel order');
      console.error(err);
    }
  };

  const handleRefundOrder = async (orderId) => {
    const refundReason = prompt('Enter refund reason (optional):') || 'Admin refund';
    if (!window.confirm(`Are you sure you want to refund this order?\nReason: ${refundReason}`)) return;
    
    try {
      await axios.patch(
        `${API_BASE_URL}/api/orders/${orderId}/refund`,
        { refundReason },
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );
      await fetchOrders(currentPage);
      if (editingOrder?._id === orderId) {
        setEditingOrder(null);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
      alert('Failed to refund order');
      console.error(err);
    }
  };

  // Admin: approve or reject a user's refund request
  const handleRefundRequestDecision = async (orderId, action) => {
    const adminNote = refundNoteInput.trim();
    if (action === 'reject' && !adminNote) {
      toast.error('Please enter a note explaining the rejection');
      return;
    }
    const confirmMsg = action === 'approve'
      ? 'Approve this refund request? The order will be cancelled, inventory released and the payment marked as refunded (if paid).'
      : 'Reject this refund request?';
    if (!window.confirm(confirmMsg)) return;

    try {
      setUpdatingOrderId(orderId);
      await axios.patch(
        `${API_BASE_URL}/api/orders/${orderId}/refund-request/admin`,
        { action, adminNote },
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );
      toast.success(action === 'approve' ? 'Refund request approved' : 'Refund request rejected');
      await fetchOrders(currentPage);
      if (editingOrder?._id === orderId) {
        try {
          const fresh = await axios.get(`${API_BASE_URL}/api/orders/${orderId}`);
          setEditingOrder(fresh.data);
        } catch (fetchErr) {
          console.error(fetchErr);
          setEditingOrder(prev => (prev ? {
            ...prev,
            refundStatus: action === 'approve' ? 'approved' : 'rejected',
            refundAdminNote: adminNote,
            refundProcessedAt: new Date().toISOString(),
            ...(action === 'approve' ? {
              orderStatus: 'cancelled',
              isActive: false,
              paymentStatus: prev.paymentStatus === 'completed' ? 'refunded' : prev.paymentStatus,
            } : {}),
          } : prev));
        }
      }
      setRefundNoteInput('');
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
      toast.error(err.response?.data?.message || 'Failed to process refund request');
      console.error(err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/api/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );
      await fetchOrders(currentPage);
      if (editingOrder?._id === orderId) setEditingOrder(null);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
      alert('Failed to delete order');
      console.error(err);
    }
  };

  const handleSendFinalizationEmail = async (orderId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/orders/${orderId}/send-finalization-email`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Finalization email sent successfully!');
        await fetchOrders(currentPage);
      } else {
        toast.error('Failed to send finalization email');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
      toast.error('Failed to send finalization email');
      console.error(err);
    }
  };

  const handleSendPdfDeliveredPaid = async () => {
    if (!selectedOrderForPrint) return;
    const orderId = selectedOrderForPrint._id;

    if (!window.confirm('Mark this order as Delivered + Paid and send PDF invoice to customer?')) return;

    setSendingPdf(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/orders/${orderId}/send-invoice-email`,
        {},
        { headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } }
      );

      await fetchOrders(currentPage);

      const updated = { ...selectedOrderForPrint, orderStatus: 'delivered', paymentStatus: 'completed' };
      setSelectedOrderForPrint(updated);
      setEditingOrder(prev => prev && prev._id === orderId ? { ...prev, orderStatus: 'delivered', paymentStatus: 'completed' } : prev);

      if (res.data.success) {
        const parts = ['Order marked as Delivered + Paid.'];
        if (res.data.pdfGenerated) parts.push('PDF generated.');
        if (res.data.emailSent) parts.push('Invoice sent to customer!');
        else parts.push('Email sending failed.');
        toast.success(parts.join(' '));
      } else {
        toast.error(res.data.message || 'Failed to process order');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
      toast.error(err.response?.data?.message || 'Failed to process order');
      console.error(err);
    } finally {
      setSendingPdf(false);
    }
  };

  // 🔹 Inventory Scanning Functions
  const handleScanInventory = async (scannedCode) => {
    const orderId = scanningForOrder?._id;
    const itemIdx = scanningForItem;

    try {
      const inventoryResponse = await axios.get(
        `${API_BASE_URL}/api/inventory/scan`,
        {
          params: { code: scannedCode },
          headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
        }
      );

      const inventoryItem = inventoryResponse.data.inventory;

      if (inventoryItem.status !== 'active' || inventoryItem.assignedQuantity > 0) {
        toast.error(`Item not available (status: ${inventoryItem.status})`);
        return;
      }

      const orderItem = scanningForOrder?.items[scanningForItem];
      if (!orderItem) {
        toast.error('Order item not found');
        return;
      }

      if (inventoryItem.size !== orderItem.size) {
        toast.error(`Size mismatch: scanned ${inventoryItem.size}, expected ${orderItem.size}`);
        return;
      }

      const assignResponse = await axios.post(
        `${API_BASE_URL}/api/orders/${scanningForOrder._id}/assign-inventory`,
        { orderItemIndex: scanningForItem, inventoryId: inventoryItem._id, scannedCode },
        { headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } }
      );

      if (assignResponse.data.success) {
        toast.success(`Assigned ${inventoryItem.barcode} to order`);

        if (socketRef.current) {
          socketRef.current.emit('inventoryAssigned', {
            productId: orderItem.productId,
            variantId: orderItem.variantId,
            size: orderItem.size,
            inventoryId: inventoryItem._id,
            orderId: scanningForOrder._id,
            timestamp: new Date()
          });
        }

        await fetchOrders(currentPage);
        if (editingOrder?._id === scanningForOrder._id) {
          const updated = orders.find(o => o._id === scanningForOrder._id);
          if (updated) setEditingOrder(updated);
        }
      } else {
        toast.error(assignResponse.data.message || 'Failed to assign inventory');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      } else {
        toast.error(err.response?.data?.message || err.message || 'Scan failed');
      }
    } finally {
      setIsScannerOpen(false);
      setScanningForOrder(null);
      setScanningForItem(null);
    }
  };

  const openScanner = (order, itemIndex, mode = 'qr') => {
    setScanningForOrder(order);
    setScanningForItem(itemIndex);
    setScanningMode(mode);
    setIsScannerOpen(true);
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
    setScanningForOrder(null);
    setScanningForItem(null);
  };

  // 🔹 Remove inventory item from order
  const handleRemoveInventory = async (orderId, orderItemIndex, inventoryId) => {
    if (!window.confirm('Are you sure you want to remove this inventory item from the order?')) return;
    
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/orders/${orderId}/remove-inventory`,
        {
          data: {
            orderItemIndex,
            inventoryId
          },
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );

      if (response.data.success) {
        // Get the order to find the item details
        const order = orders.find(o => o._id === orderId);
        if (order && order.items && order.items[orderItemIndex]) {
          const orderItem = order.items[orderItemIndex];
          
          // Refresh stock data for this product
          await fetchProductStock(orderItem.productId);
        }

        alert('Inventory item removed successfully and stock increased!');
        
        // Emit socket event for inventory removal
        if (socketRef.current) {
          const eventData = {
            productId: orderItem.productId,
            variantId: orderItem.variantId,
            size: orderItem.size,
            action: 'inventory_removed',
            inventoryId: inventoryId,
            orderId: orderId,
            timestamp: new Date()
          };
          socketRef.current.emit('inventoryRemoved', eventData);
        } else {
        }
        
        // Refresh the order data
        await fetchOrders(currentPage);
        if (editingOrder?._id === orderId) {
          // Update the editing order with new data
          const updatedOrder = orders.find(o => o._id === orderId);
          if (updatedOrder) {
            setEditingOrder(updatedOrder);
          }
        }
      } else {
        alert('Failed to remove inventory item: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error removing inventory:', err);
      if (err.response?.status === 401) {
        logout();
      } else {
        alert('Failed to remove inventory item: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // 🔹 View assigned inventory details
  const [viewingInventory, setViewingInventory] = useState(null);
  const [inventoryDetails, setInventoryDetails] = useState(null);

  const handleViewInventory = async (inventoryIds) => {
    if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
      alert('No inventory items assigned');
      return;
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/inventory/batch`,
        {
          params: { ids: inventoryIds.join(',') },
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );

      if (response.data.success) {
        setInventoryDetails(response.data.inventory);
        setViewingInventory(true);
      } else {
        alert('Failed to fetch inventory details');
      }
    } catch (err) {
      console.error('Error fetching inventory details:', err);
      if (err.response?.status === 401) {
        logout();
      } else {
        alert('Failed to fetch inventory details: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // Filter functions
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      orderStatus: '',
      paymentStatus: '',
      paymentMethod: '',
      refundStatus: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: ''
    });
  };

  // Print functions
  const openPrintModal = (order) => {
    setSelectedOrderForPrint(order);
    setShowPrintModal(true);
  };

  const closePrintModal = () => {
    setShowPrintModal(false);
    setSelectedOrderForPrint(null);
  };

     const generateSVGBarcode = (text) => {
     if (!text || text.trim() === '') {
       return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30" width="100%" height="100%">
         <rect width="100" height="30" fill="#fff"/>
         <text x="50" y="18" text-anchor="middle" font-family="monospace" font-size="8" fill="#999">No Barcode</text>
       </svg>`;
     }

     try {
       const uid = `bc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
       const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
       svgEl.setAttribute('id', uid);
       svgEl.style.position = 'absolute';
       svgEl.style.left = '-9999px';
       svgEl.style.top = '-9999px';
       document.body.appendChild(svgEl);

       JsBarcode(svgEl, text, {
         format: 'CODE128',
         width: 1,
         height: 30,
         displayValue: false,
         background: '#ffffff',
         lineColor: '#000000',
         margin: 3,
       });

       const serializer = new XMLSerializer();
       let svgStr = serializer.serializeToString(svgEl);
       document.body.removeChild(svgEl);

       svgStr = svgStr.replace(/<svg([^>]+)>/, '<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet">');
       return svgStr;
     } catch (e) {
       return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 25" width="100%" height="100%">
         <rect width="80" height="25" fill="#fff"/>
         <text x="40" y="15" text-anchor="middle" font-family="monospace" font-size="5" fill="#000">${text}</text>
       </svg>`;
     }
   };

   // Generate QR Code SVG synchronously using qrcode.create
   const generateQRCodeSVG = (text, size = 36) => {
     if (!text || text.trim() === '') {
       return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
         <rect width="${size}" height="${size}" fill="#fff"/>
         <text x="${size/2}" y="${size/2}" text-anchor="middle" font-family="monospace" font-size="6" fill="#ccc">QR</text>
       </svg>`;
     }

     try {
       const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
       const n = qr.modules.size;
       const cell = size / n;
       let cells = '';
       for (let r = 0; r < n; r++) {
         for (let c = 0; c < n; c++) {
           if (qr.modules.data[r * n + c]) {
             cells += `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="#000"/>`;
           }
         }
       }
       return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
         <rect width="${size}" height="${size}" fill="#fff"/>${cells}</svg>`;
     } catch {
       return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
         <rect width="${size}" height="${size}" fill="#fff"/>
         <text x="${size/2}" y="${size/2}" text-anchor="middle" font-family="monospace" font-size="5" fill="#000">${text}</text>
       </svg>`;
     }
   };

  const printOrder = () => {
    if (!selectedOrderForPrint) return;

    const order = selectedOrderForPrint;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order #${order.orderId} - BELORELLA</title>
          <style>
            @media print {
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              @page {
                size: A4;
                margin: 1.5cm 2cm 2cm;
                @top-center { content: "BELORELLA — Order #${order.orderId}"; font-family: 'Segoe UI', Arial, sans-serif; font-size: 8pt; color: #888; }
                @bottom-center { content: "Page " counter(page) " of " counter(pages); font-family: 'Segoe UI', Arial, sans-serif; font-size: 8pt; color: #888; }
                @bottom-left { content: "BELORELLA"; font-family: 'Segoe UI', Arial, sans-serif; font-size: 7.5pt; color: #999; }
              }
              body { 
                margin: 0; 
                padding: 0;
                font-family: 'Segoe UI', Arial, sans-serif;
              }
              .no-print { display: none; }
            }
            thead { display: table-header-group; }
            tr, .info-section, .total-row { break-inside: avoid; page-break-inside: avoid; }
            h3, h4 { break-after: avoid; page-break-after: avoid; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              background: #fff;
              color: #000;
              font-size: 11px;
              line-height: 1.4;
              box-sizing: border-box;
              overflow-x: hidden;
            }
            *, *::before, *::after { box-sizing: border-box; }
            .header {
              text-align: center;
              margin-bottom: 18px;
              padding-bottom: 14px;
              border-bottom: 2px solid #000;
            }
            .logo {
              max-width: 120px;
              height: auto;
              margin-bottom: 8px;
              border: none !important;
              outline: none !important;
              border-radius: 25px;
              padding: 4px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              background: #fff;
            }
            .seal {
              max-width: 80px;
              height: auto;
              margin-top: 8px;
              opacity: 0.85;
            }
            .sign {
              max-width: 140px;
              height: auto;
              margin-top: 8px;
            }
            .company-name {
              font-size: 22px;
              font-weight: 700;
              color: #000;
              margin: 8px 0 2px;
              text-transform: uppercase;
              letter-spacing: 3px;
            }
            .header p {
              color: #555;
              margin: 2px 0;
              font-size: 11px;
            }
            .order-title {
              font-size: 16px;
              font-weight: 700;
              color: #fff;
              margin: 16px 0;
              text-align: center;
              background: linear-gradient(135deg, #DC143C 0%, #9F1239 100%);
              padding: 10px 14px;
              border-radius: 6px;
            }
            .order-info {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 12px;
              margin-bottom: 18px;
            }
            .info-section {
              padding: 10px 12px;
              border: 1px solid #ccc;
            }
            .info-section h3 {
              margin: 0 0 8px 0;
              color: #000;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 4px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
              padding: 2px 0;
            }
            .info-label {
              font-weight: 600;
              color: #333;
              font-size: 10px;
            }
            .info-value {
              font-weight: 400;
              color: #000;
              font-size: 10px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
              border: 1px solid #ccc;
            }
            .items-table th {
              background: #eee;
              color: #000;
              padding: 7px 8px;
              text-align: left;
              font-weight: 700;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 2px solid #000;
            }
            .items-table td {
              padding: 6px 8px;
              border-bottom: 1px solid #ddd;
              font-size: 10px;
              vertical-align: middle;
            }
            .items-table tr:last-child td {
              border-bottom: none;
            }
            .product-info {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .product-image {
              width: 36px;
              height: 36px;
              object-fit: contain;
              border: 1px solid #ccc;
              background: #fff;
              padding: 1px;
            }
            .product-details h4 {
              margin: 0 0 1px 0;
              color: #000;
              font-size: 11px;
              font-weight: 600;
            }
            .product-details p {
              margin: 0;
              color: #555;
              font-size: 10px;
            }
            .barcode-container {
              display: flex;
              align-items: center;
              gap: 4px;
              margin: 2px 0;
            }
            .barcode-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;
            }
            .barcode-label {
              font-size: 8px;
              color: #555;
              font-weight: 600;
            }
            .qr-code {
              width: 24px;
              height: 24px;
              border: 1px solid #ccc;
            }
            .barcode-svg {
              height: 18px;
              border: 1px solid #ccc;
            }
            .total-section {
              border: 1.5px solid #000;
              padding: 12px 16px;
              margin-bottom: 16px;
              width: 280px;
              margin-left: auto;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
              font-size: 11px;
              padding: 2px 0;
            }
            .total-final {
              font-size: 14px;
              font-weight: 700;
              border-top: 2px solid #000;
              padding-top: 6px;
              margin-top: 3px;
            }
            .footer {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-top: 24px;
            }
            .signature-section {
              text-align: center;
              padding: 14px;
              border: 1px dashed #999;
            }
            .signature-line {
              width: 160px;
              height: 1px;
              background: #000;
              margin: 14px auto 6px;
            }
            .signature-label {
              font-weight: 600;
              color: #000;
              margin-bottom: 3px;
              font-size: 11px;
            }
            .signature-name {
              font-size: 10px;
              color: #555;
            }
            .certification {
              padding: 14px 16px;
              border: 1px solid #ccc;
            }
            .certification h4 {
              color: #000;
              margin: 0 0 6px 0;
              font-size: 12px;
            }
            .certification p {
              margin: 3px 0;
              font-size: 10px;
              color: #333;
            }
            .copyright-section {
              text-align: center;
              margin-top: 18px;
              padding-top: 10px;
              border-top: 1px solid #ccc;
            }
            .copyright-section p {
              color: #555;
              font-size: 9px;
              margin: 1px 0;
            }
          </style>
        </head>
        <body>

          <div class="header">
            ${printSettings.showLogo ? `
              <img src="/logo.png" alt="BELORELLA" class="logo">
            ` : ''}
                         <div class="company-name">BELORELLA</div>
             <p>Premium Fashion & Lifestyle</p>
             <p>Order Invoice & Certificate</p>
          </div>

          <div class="order-title">
            ORDER INVOICE — #${order.orderId}
          </div>

          <div class="order-info">
            <div class="info-section">
              <h3>Order Information</h3>
              <div class="info-row">
                <span class="info-label">Order ID:</span>
                <span class="info-value">#${order.orderId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Order Date:</span>
                <span class="info-value">${formatDate(order.createdAt)}</span>
              </div>
                <div class="info-row">
                  <span class="info-label">Order Status:</span>
                  <span class="info-value">
                   Delivered
                 </span>
                </div>
                <div class="info-row">
                  <span class="info-label">Payment Status:</span>
                  <span class="info-value">
                    Completed
                  </span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span class="info-value">${order.paymentMethod || 'N/A'}</span>
              </div>
            </div>

            <div class="info-section">
              <h3>Customer Information</h3>
              ${order.shippingAddress ? `
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${order.shippingAddress.fullName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone:</span>
                  <span class="info-value">${order.shippingAddress.phone}</span>
                </div>
                                 <div class="info-row">
                   <span class="info-label">Address:</span>
                   <span class="info-value">${order.shippingAddress.address}</span>
                 </div>
                 <div class="info-row">
                   <span class="info-label">City:</span>
                   <span class="info-value">${order.shippingAddress.city}</span>
                 </div>
                 <div class="info-row">
                   <span class="info-label">State:</span>
                   <span class="info-value">${order.shippingAddress.state}</span>
                 </div>
              ` : `
                <div class="info-row">
                  <span class="info-label">User ID:</span>
                  <span class="info-value">${order.userId}</span>
                </div>
              `}
            </div>

            <div class="info-section">
              <h3>Shipping Information</h3>
              ${order.shipping ? `
                <div class="info-row">
                  <span class="info-label">Shipping Method:</span>
                  <span class="info-value">${order.shipping.name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Shipping Cost:</span>
                  <span class="info-value">${formatCurrency(order.shipping.charge)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Estimated Delivery:</span>
                  <span class="info-value">${order.shipping.estimatedDays} days</span>
                </div>
              ` : `
                <div class="info-row">
                  <span class="info-label">Shipping Method:</span>
                  <span class="info-value">Standard Shipping</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Shipping Cost:</span>
                  <span class="info-value">${formatCurrency(order.shippingCost || 0)}</span>
                </div>
              `}
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Details</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Total</th>
                ${printSettings.includeQRCode || printSettings.includeBarcode ? '<th>Codes</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item, idx) => `
                <tr>
                  <td>
                    <div class="product-info">
                      <img src="${item.mainImage}" alt="${item.name}" class="product-image">
                      <div class="product-details">
                        <h4>${item.name}</h4>
                        <p>SKU: ${item.sku || item.productId}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      ${item.size ? `<p><strong>${formatMeasureLine(item)}</strong></p>` : ''}
                      ${item.color ? `<p><strong>Color:</strong> ${item.color}</p>` : ''}
                    </div>
                  </td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${item.quantity}</td>
                  <td><strong>${formatCurrency(item.price * item.quantity)}</strong></td>
                  ${printSettings.includeQRCode || printSettings.includeBarcode ? `
                    <td>
                      ${item.assignedInventoryItems && item.assignedInventoryItems.length > 0 ? 
                        item.assignedInventoryItems.map(inventoryId => `
                          <div class="barcode-container">
                            ${printSettings.includeBarcode ? `
                              <div class="barcode-item">
                                <div class="barcode-label">Barcode</div>
                                <div class="barcode-svg" style="width: 80px;">
                                  ${generateSVGBarcode(inventoryId)}
                                </div>
                              </div>
                            ` : ''}
                                                         ${printSettings.includeQRCode ? `
                               <div class="barcode-item">
                                 <div class="barcode-label">QR Code</div>
                                 <div class="qr-code">
                                   ${generateQRCodeSVG(inventoryId, 36)}
                                 </div>
                               </div>
                             ` : ''}
                          </div>
                        `).join('') : 
                        '<p style="color: #6c757d; font-size: 12px;">No inventory assigned</p>'
                      }
                    </td>
                  ` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
                              <span>Subtotal:</span>
                <span>${formatCurrency(order.totalAmount)}</span>
            </div>
            ${order.discountAmount > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span>-${formatCurrency(order.discountAmount)}</span>
              </div>
            ` : ''}
            ${order.couponCode ? `
              <div class="total-row">
                <span>Coupon Applied:</span>
                <span>${order.couponCode}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span>Shipping:</span>
              <span>${formatCurrency(order.shippingCost || 0)}</span>
            </div>
            ${order.extraFeeTotal > 0 ? `
              <div class="total-row">
                <span>Extra Fees:</span>
                <span>${formatCurrency(order.extraFeeTotal)}</span>
              </div>
            ` : ''}
            <div class="total-row total-final">
              <span>Total Amount:</span>
              <span>${formatCurrency(order.grandTotal)}</span>
            </div>
          </div>

                       <div class="footer">
               ${printSettings.includeSignature ? `
                 <div class="signature-section">
                    <img src="/seal.png" alt="BELORELLA Seal" class="seal" style="display:block; margin:0 auto 8px;">
                    <div class="signature-label">Authorized Signature</div>
                    <div class="signature-line"></div>
                    <img src="/sign.png" alt="Authorized Signature" class="sign" style="display:block; margin:0 auto 4px;">
                    <div class="signature-name">BELORELLA Management</div>
                    <div class="signature-name">Date: ${new Date().toLocaleDateString()}</div>
                 </div>
               ` : ''}
               
               <div class="certification">
                 <h4>Quality Certification</h4>
                 <p>• All products are genuine and authentic</p>
                 <p>• Quality checked before dispatch</p>
                 <p>• 7-day return policy applies</p>
                 <p>• Customer satisfaction guaranteed</p>
                             <p style="margin-top: 15px; font-weight: 600;">
                  Thank you for choosing BELORELLA!
                </p>
               </div>
             </div>

             <div class="copyright-section">
               <p>© ${new Date().getFullYear()} BELORELLA. All rights reserved. | Premium Fashion &amp; Lifestyle</p>
               <p>This document is computer generated and does not require a physical signature.</p>
             </div>
        </body>
      </html>
    `;

    if (!printDocument(html)) {
      toast.error('Print window blocked - allow popups for this site');
    }
  };

  const startEditing = (order) => {
    setEditingOrder(order);
    setRefundNoteInput('');
  };

  const cancelEditing = () => {
    setEditingOrder(null);
    setRefundNoteInput('');
  };

  // Refresh the open specific-order panel with fresh data from the server
  const handleRefreshEditingOrder = async () => {
    if (!editingOrder) return;
    try {
      setUpdatingOrderId(editingOrder._id);
      const fresh = await axios.get(`${API_BASE_URL}/api/orders/${editingOrder.orderId}`);
      setEditingOrder(fresh.data);
      toast.success(`Order #${editingOrder.orderId} refreshed`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to refresh order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const isMobilePayment = (order) => {
    return order.paymentMethod && ['bkash', 'nagad'].includes(order.paymentMethod.toLowerCase());
  };

  const getPaymentMethodIcon = (method) => {
    if (!method) return null;
    const methodLower = method.toLowerCase();
    if (methodLower.includes('bkash')) return 'text-[#e2136e]';
    if (methodLower.includes('nagad')) return 'text-[#e21818]';
    if (methodLower.includes('cash')) return 'text-gray-600';
    return 'text-maybelline-pink';
  };

  // 🔹 Fetch product stock information
  const [productStockData, setProductStockData] = useState({});

  const fetchProductStock = async (productId) => {
    if (productStockData[productId]) return productStockData[productId];
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/products/${productId}`,
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );
      
      if (response.data) {
        const stockInfo = {};
        (response.data.variants || []).forEach(variant => {
          stockInfo[variant._id] = {
            sizes: variant.sizes,
            stockBySize: variant.stockBySize || [],
            stock: variant.stock || 0
          };
        });
        
        setProductStockData(prev => ({
          ...prev,
          [productId]: stockInfo
        }));
        
        return stockInfo;
      }
    } catch (error) {
      console.error('Error fetching product stock:', error);
    }
    return null;
  };

  // 🔹 Fetch all products for client-side filtering
  const fetchAllProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/products?limit=1000`, // Fetch a large number of products
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );
      
      if (Array.isArray(response.data)) {
        setAllProducts(response.data);
        setFilteredProducts(response.data);
      } else {
        setAllProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('Error fetching all products:', error);
      setAllProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // 🔹 Filter products client-side based on search query
  const filterProducts = (query) => {
    if (!query.trim()) {
      setFilteredProducts(allProducts);
      return;
    }

    const filtered = allProducts.filter(product => {
      const searchTerm = query.toLowerCase();
      return (
        product.name?.toLowerCase().includes(searchTerm) ||
        product.brand?.toLowerCase().includes(searchTerm) ||
        product.categories?.some(cat => cat.toLowerCase().includes(searchTerm)) ||
        product.description?.toLowerCase().includes(searchTerm)
      );
    });
    
    setFilteredProducts(filtered);
  };

  // 🔹 Fetch product stock information
  const fetchProductStockForSelection = async (productId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/products/${productId}`,
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );
      
      if (response.data) {
        const stockInfo = {};
        (response.data.variants || []).forEach(variant => {
          stockInfo[variant._id] = {
            sizes: variant.sizes,
            stockBySize: variant.stockBySize || [],
            stock: variant.stock || 0
          };
        });
        setSelectedProductStock(stockInfo);
      }
    } catch (error) {
      console.error('Error fetching product stock:', error);
    }
  };

  // 🔹 Get stock for specific variant and size
  const getVariantStock = (variantId, size) => {
    const stockData = selectedProductStock[variantId];
    if (!stockData || !stockData.stockBySize || !Array.isArray(stockData.stockBySize)) {
      return 'N/A';
    }
    
    const sizeIndex = stockData.sizes?.indexOf(size);
    if (sizeIndex !== -1 && sizeIndex < stockData.stockBySize.length) {
      return stockData.stockBySize[sizeIndex] || 0;
    }
    return stockData.stock || 'N/A';
  };

  const getVariantPrice = (variant, size, product) => {
    if (variant?.prices && Array.isArray(variant.prices) && variant.prices.length > 0) {
      const sizeIdx = variant.sizes?.indexOf(size);
      if (sizeIdx !== -1 && sizeIdx < variant.prices.length && variant.prices[sizeIdx] > 0) {
        return variant.prices[sizeIdx];
      }
      if (variant.prices[0] > 0) return variant.prices[0];
    }
    if (product?.mainPrice > 0) return product.mainPrice;
    if (product?.discountPrice > 0) return product.discountPrice;
    return 0;
  };

  // 🔹 Add product to order
  const handleAddProductToOrder = async () => {
    if (!selectedProduct || !selectedVariant || !selectedSize || selectedQuantity < 1) {
      alert('Please select all required fields');
      return;
    }

    try {
      const newItem = {
        productId: selectedProduct._id,
        variantId: selectedVariant._id,
        name: selectedProduct.name,
        size: selectedSize,
        color: selectedVariant.colorName || selectedVariant.color?.name || '',
        quantity: selectedQuantity,
        price: getVariantPrice(selectedVariant, selectedSize, selectedProduct),
        mainImage: selectedVariant.images?.[0] || selectedProduct.images?.[0] || '',
        measureType: selectedProduct.measureType,
        unitName: selectedProduct.unitName
      };

      const response = await axios.put(
        `${API_BASE_URL}/api/orders/${editingOrder._id}`,
        {
          items: [...editingOrder.items, newItem]
        },
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );

      if (response.data?._id) {
        // Emit socket event for order update
        if (socketRef.current) {
          socketRef.current.emit('orderUpdated', {
            orderId: editingOrder._id,
            updateType: 'product_added',
            newItem: newItem,
            timestamp: new Date()
          });
        }

        // Update local state
        setEditingOrder(response.data);
        setShowAddProductModal(false);
        
        // Reset form
        setSelectedProduct(null);
        setSelectedVariant(null);
        setSelectedSize('');
        setSelectedQuantity(1);
        
        await fetchOrders(currentPage);
        toast.success('Product added to order successfully!');
      }
    } catch (error) {
      console.error('Error adding product to order:', error);
      alert('Failed to add product to order: ' + (error.response?.data?.message || error.message));
    }
  };

  // 🔹 Update order discount
  const handleUpdateDiscount = async () => {
    try {
      // Calculate the actual discount amount based on type
      let actualDiscountAmount = 0;
      if (discountType === 'percentage') {
        // For percentage, calculate the amount from the percentage
        actualDiscountAmount = (editingOrder.totalAmount * parseFloat(discountAmount)) / 100;
      } else {
        // For fixed amount, use the amount directly
        actualDiscountAmount = parseFloat(discountAmount);
      }

      const discountData = {
        discountAmount: actualDiscountAmount,
        discountType: discountType,
        discountPercentage: discountType === 'percentage' ? parseFloat(discountAmount) : null
      };

      const response = await axios.put(
        `${API_BASE_URL}/api/orders/${editingOrder._id}`,
        discountData,
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );

      if (response.data?._id) {
        // Emit socket event for order update
        if (socketRef.current) {
          socketRef.current.emit('orderUpdated', {
            orderId: editingOrder._id,
            updateType: 'discount_updated',
            discountData: discountData,
            timestamp: new Date()
          });
        }

        // Update local state
        setEditingOrder(response.data);
        setShowDiscountModal(false);
        
        await fetchOrders(currentPage);
        toast.success('Discount updated successfully!');
      }
    } catch (error) {
      console.error('Error updating discount:', error);
      toast.error('Failed to update discount: ' + (error.response?.data?.message || error.message));
    }
  };

  // 🔹 Calculate discount preview
  const calculateDiscountPreview = () => {
    if (!discountAmount || discountAmount <= 0) {
      return {
        discountAmount: 0,
        finalTotal: editingOrder?.totalAmount || 0
      };
    }

    let calculatedDiscount = 0;
    if (discountType === 'percentage') {
      calculatedDiscount = (editingOrder?.totalAmount * parseFloat(discountAmount)) / 100;
    } else {
      calculatedDiscount = parseFloat(discountAmount);
    }

    return {
      discountAmount: calculatedDiscount,
      finalTotal: (editingOrder?.totalAmount || 0) - calculatedDiscount
    };
  };

  // 🔹 Load existing discount when modal opens
  const loadExistingDiscount = () => {
    if (editingOrder?.discountAmount && editingOrder?.discountAmount > 0) {
      // If there's an existing discount, try to determine the type
      if (editingOrder.discountPercentage) {
        setDiscountType('percentage');
        setDiscountAmount(editingOrder.discountPercentage);
      } else {
        // Calculate percentage if it's not stored
        const calculatedPercentage = (editingOrder.discountAmount / editingOrder.totalAmount) * 100;
        if (calculatedPercentage <= 100) {
          setDiscountType('percentage');
          setDiscountAmount(calculatedPercentage.toFixed(2));
        } else {
          setDiscountType('fixed');
          setDiscountAmount(editingOrder.discountAmount);
        }
      }
    } else {
      // Reset to defaults if no discount
      setDiscountType('percentage');
      setDiscountAmount(0);
    }
  };

  // 🔹 Update item quantity
  const handleUpdateItemQuantity = async (itemIndex, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      const updatedItems = [...editingOrder.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        quantity: newQuantity
      };

      const response = await axios.put(
        `${API_BASE_URL}/api/orders/${editingOrder._id}`,
        {
          items: updatedItems
        },
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );

      if (response.data?._id) {
        // Emit socket event for order update
        if (socketRef.current) {
          socketRef.current.emit('orderUpdated', {
            orderId: editingOrder._id,
            updateType: 'quantity_updated',
            itemIndex: itemIndex,
            newQuantity: newQuantity,
            timestamp: new Date()
          });
        }

        // Update local state
        setEditingOrder(response.data);
        
        await fetchOrders(currentPage);
        toast.success('Quantity updated successfully!');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity: ' + (error.response?.data?.message || error.message));
    }
  };

  // 🔹 Remove item from order
  const handleRemoveItem = async (itemIndex) => {
    const itemToRemove = editingOrder.items[itemIndex];
    const hasAssignedInventory = itemToRemove.assignedInventoryItems && itemToRemove.assignedInventoryItems.length > 0;
    
    let confirmMessage = 'Are you sure you want to remove this item from the order?';
    if (hasAssignedInventory) {
      confirmMessage += `\n\nThis will also release ${itemToRemove.assignedInventoryItems.length} assigned inventory item(s) and restore product stock.`;
    }
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const updatedItems = editingOrder.items.filter((_, index) => index !== itemIndex);

      const response = await axios.put(
        `${API_BASE_URL}/api/orders/${editingOrder._id}`,
        {
          items: updatedItems
        },
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminAccessToken')}`
          }
        }
      );

      if (response.data?._id) {
        // Emit socket event for order update
        if (socketRef.current) {
          socketRef.current.emit('orderUpdated', {
            orderId: editingOrder._id,
            updateType: 'item_removed',
            itemIndex: itemIndex,
            removedItem: itemToRemove,
            timestamp: new Date()
          });
        }

        // Update local state
        setEditingOrder(response.data);
        
        // Refresh stock data for the removed item's product
        if (itemToRemove.productId) {
          await fetchProductStock(itemToRemove.productId);
        }
        
        await fetchOrders(currentPage);
        const successMessage = hasAssignedInventory 
          ? `Item removed successfully! ${itemToRemove.assignedInventoryItems.length} inventory item(s) released and stock restored.`
          : 'Item removed from order successfully!';
        
        toast.success(successMessage);
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item: ' + (error.response?.data?.message || error.message));
    }
  };

  // 🔹 Get stock for specific item
  const getItemStock = (item) => {
    const stockData = productStockData[item.productId];
    if (!stockData || !stockData[item.variantId]) return 'N/A';
    
    const variantStock = stockData[item.variantId];
    if (variantStock.stockBySize && Array.isArray(variantStock.stockBySize)) {
      const sizeIndex = variantStock.sizes?.indexOf(item.size);
      if (sizeIndex !== -1 && sizeIndex < variantStock.stockBySize.length) {
        return variantStock.stockBySize[sizeIndex] || 0;
      }
    }
    return variantStock.stock || 'N/A';
  };

  // 🔹 Load stock data when editing order
  useEffect(() => {
    if (editingOrder && editingOrder.items) {
      editingOrder.items.forEach(item => {
        fetchProductStock(item.productId);
      });
    }
  }, [editingOrder]);

  // 🔹 Reset search when add product modal is opened
  useEffect(() => {
    if (showAddProductModal) {
      setProductSearchQuery('');
      setSelectedProduct(null);
      setSelectedVariant(null);
      setSelectedSize('');
      setSelectedQuantity(1);
      setSelectedProductStock({});
      setFilteredProducts(allProducts);
    }
  }, [showAddProductModal]);

  // 🔹 Fetch all products when add product modal opens
  useEffect(() => {
    if (showAddProductModal && allProducts.length === 0) {
      fetchAllProducts();
    }
  }, [showAddProductModal]);

  // 🔹 Filter products when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      filterProducts(productSearchQuery);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [productSearchQuery, allProducts]);

  // 🔹 Load existing discount when discount modal opens
  useEffect(() => {
    if (showDiscountModal && editingOrder) {
      loadExistingDiscount();
    }
  }, [showDiscountModal, editingOrder]);

  // 🔹 Fetch stock when product is selected
  useEffect(() => {
    if (selectedProduct) {
      fetchProductStockForSelection(selectedProduct._id);
    }
  }, [selectedProduct]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8 md:pt-40 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maybelline-pink"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders Management</h1>
          <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search orders..."
              className="px-3 sm:px-4 py-2 border rounded w-full bg-white sm:max-w-xs focus:outline-none focus:ring-2 focus:ring-maybelline-pink min-h-[44px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 sm:px-4 py-2 rounded transition flex items-center space-x-2 min-h-[44px] whitespace-nowrap ${
                showFilters ? 'bg-maybelline-pink text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FaFilter />
              <span className="hidden sm:inline">Filters</span>
            </button>
            <button
              onClick={() => fetchOrders(currentPage)}
              className="bg-maybelline-pink hover:bg-maybelline-magenta text-white px-3 sm:px-4 py-2 rounded transition min-h-[44px] whitespace-nowrap"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowCreateOrderModal(true)}
              className="bg-gray-900 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded transition min-h-[44px] whitespace-nowrap flex items-center gap-2"
            >
              <FaPlus />
              <span>Create Order</span>
            </button>
          </div>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FaFilter className="mr-2 text-maybelline-pink" />
                Filter Orders
              </h3>
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All Filters
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                <select
                  value={filters.orderStatus}
                  onChange={(e) => handleFilterChange('orderStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white"
                >
                  <option value="">All Payment Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white"
                >
                  <option value="">All Methods</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Request</label>
                <select
                  value={filters.refundStatus}
                  onChange={(e) => handleFilterChange('refundStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white"
                >
                  <option value="">All Refund Requests</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white"
                    placeholder="From Date"
                  />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white"
                    placeholder="To Date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Range</label>
                <div className="space-y-2">
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white"
                    placeholder="Min Amount"
                  />
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white"
                    placeholder="Max Amount"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(filteredOrders || []).length} of {(orders || []).length} orders
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                >
                  Close Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {editingOrder && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-lg border border-gray-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-semibold">
                Order Details #{editingOrder.orderId}
                <span className="ml-4 text-sm font-normal text-gray-500">
                  {formatDate(editingOrder.createdAt)}
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshEditingOrder}
                  disabled={updatingOrderId === editingOrder._id}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition disabled:opacity-50"
                  title="Refresh this order"
                >
                  <FaSyncAlt className={updatingOrderId === editingOrder._id ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button
                  onClick={cancelEditing}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium">#{editingOrder.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-medium">{editingOrder.userId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span>{formatDate(editingOrder.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Updated:</span>
                    <span>{formatDate(editingOrder.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active:</span>
                    <span className={editingOrder.isActive ? 'text-green-600' : 'text-red-600'}>
                      {editingOrder.isActive ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">Payment Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment Method:</span>
                    <div className="flex items-center">
                      <span className={`mr-2 ${getPaymentMethodIcon(editingOrder.paymentMethod)}`}>
                        {editingOrder.paymentMethod === 'bkash' && (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                          </svg>
                        )}
                        {editingOrder.paymentMethod === 'nagad' && (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                          </svg>
                        )}
                        {editingOrder.paymentMethod?.toLowerCase().includes('cash') && (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                          </svg>
                        )}
                      </span>
                      <span className="font-medium">
                        {editingOrder.paymentMethod || 'N/A'}
                        {editingOrder.selectedPaymentMethod?.label && (
                          <span className="text-sm text-gray-500 block">{editingOrder.selectedPaymentMethod.label}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      statusColors.paymentStatus[editingOrder.paymentStatus] || 'bg-gray-100'
                    }`}>
                      {editingOrder.paymentStatus.charAt(0).toUpperCase() + editingOrder.paymentStatus.slice(1)}
                    </span>
                  </div>
                  
                  {isMobilePayment(editingOrder) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="font-mono">
                        {editingOrder.paymentDetails?.trxId || 'Not provided'}
                      </span>
                    </div>
                  )}
                  
                  {isMobilePayment(editingOrder) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wallet Number:</span>
                      <span className="font-mono">
                        {editingOrder.paymentDetails?.walletNumberMasked || 
                         editingOrder.selectedPaymentMethod?.walletNumberMasked || 
                         'Not provided'}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal:</span>
                <span>{formatCurrency(editingOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="text-red-600">
                      -{formatCurrency(editingOrder.discountAmount || 0)}
                      {editingOrder.discountPercentage && (
                        <span className="text-xs text-gray-500 ml-1">({editingOrder.discountPercentage}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span className="text-gray-700">Total:</span>
                    <span className="text-lg">{formatCurrency(editingOrder.grandTotal || 0)}</span>
                  </div>
                  {editingOrder.couponCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coupon:</span>
                      <span className="text-maybelline-pink">{editingOrder.couponCode}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">Refund Request</h3>
                {editingOrder.refundStatus && editingOrder.refundStatus !== 'none' ? (
                  <div className="space-y-2">
                    <RefundStatusTracker order={editingOrder} />
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors.refundStatus[editingOrder.refundStatus] || 'bg-gray-100 text-gray-800'}`}>
                        {editingOrder.refundStatus.charAt(0).toUpperCase() + editingOrder.refundStatus.slice(1)}
                      </span>
                    </div>
                    {editingOrder.refundBkashNumber && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">bKash Number:</span>
                        <span className="text-right text-sm font-medium">{editingOrder.refundBkashNumber}</span>
                      </div>
                    )}
                    {editingOrder.refundReason && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">Reason:</span>
                        <span className="text-right text-sm">{editingOrder.refundReason}</span>
                      </div>
                    )}
                    {editingOrder.refundNote && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">Note:</span>
                        <span className="text-right text-sm">{editingOrder.refundNote}</span>
                      </div>
                    )}
                    {editingOrder.refundImage && (
                      <div>
                        <span className="text-gray-600 text-sm">Photo:</span>
                        <a href={editingOrder.refundImage} target="_blank" rel="noreferrer" className="block">
                          <img
                            src={editingOrder.refundImage}
                            alt="Refund evidence"
                            className="mt-1 h-24 w-24 object-cover rounded border border-gray-300"
                          />
                        </a>
                      </div>
                    )}
                    {editingOrder.refundRequestedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Requested:</span>
                        <span className="text-sm">{formatDate(editingOrder.refundRequestedAt)}</span>
                      </div>
                    )}
                    {editingOrder.refundAdminNote && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">Admin Response:</span>
                        <span className="text-right text-sm">{editingOrder.refundAdminNote}</span>
                      </div>
                    )}
                    {editingOrder.refundProcessedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Processed:</span>
                        <span className="text-sm">{formatDate(editingOrder.refundProcessedAt)}</span>
                      </div>
                    )}
                    {editingOrder.refundStatus === 'pending' && (
                      <div className="pt-2 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin Note (required to reject)
                        </label>
                        <textarea
                          rows={2}
                          value={refundNoteInput}
                          onChange={(e) => setRefundNoteInput(e.target.value)}
                          placeholder="Optional when approving, required when rejecting"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink text-sm"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            disabled={updatingOrderId === editingOrder._id}
                            onClick={() => handleRefundRequestDecision(editingOrder._id, 'approve')}
                            className="px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                          >
                            Approve Refund
                          </button>
                          <button
                            disabled={updatingOrderId === editingOrder._id}
                            onClick={() => handleRefundRequestDecision(editingOrder._id, 'reject')}
                            className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No refund request for this order.</p>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">Customer Information</h3>
                {editingOrder.shippingAddress ? (
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">{editingOrder.shippingAddress.fullName}</p>
                      <p className="text-maybelline-pink">{editingOrder.shippingAddress.phone}</p>
                    </div>
                    <div className="text-sm">
                      <p>{editingOrder.shippingAddress.address}</p>
                      <p>{editingOrder.shippingAddress.city}, {editingOrder.shippingAddress.state}</p>
                      <p>{editingOrder.shippingAddress.postalCode}, {editingOrder.shippingAddress.country}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No shipping address provided</p>
                )}
                
                {/* Shipping Method Information */}
                {editingOrder.shipping && (
                  <div className="mt-4 pt-3 border-t border-gray-300">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-maybelline-pink" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z" />
                      </svg>
                      Shipping Method
                    </h4>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Method:</span> {editingOrder.shipping.name}</p>
                      <p><span className="font-medium">Cost:</span> {formatCurrency(editingOrder.shipping.charge)}</p>
                      <p><span className="font-medium">Estimated Delivery:</span> {editingOrder.shipping.estimatedDays} days</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-3">Order Status</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusColors.orderStatus).map(([status, colorClass]) => (
                    <button
                      key={status}
                      disabled={updatingOrderId === editingOrder._id}
                      onClick={() => handleUpdateStatus(editingOrder._id, 'orderStatus', status)}
                      className={`px-4 py-2 rounded transition ${
                        editingOrder.orderStatus === status 
                          ? `${colorClass} ring-2 ring-offset-2 ring-gray-400`
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-3">Payment Status</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusColors.paymentStatus).map(([status, colorClass]) => (
                    <button
                      key={status}
                      disabled={updatingOrderId === editingOrder._id}
                      onClick={() => handleUpdateStatus(editingOrder._id, 'paymentStatus', status)}
                      className={`px-4 py-2 rounded transition ${
                        editingOrder.paymentStatus === status 
                          ? `${colorClass} ring-2 ring-offset-2 ring-gray-400`
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Courier Service Section */}
            <div className="border border-[#F4F4F4] rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-[#1B1B1B] mb-3">Ship with Courier</h3>
              {editingOrder?.courier?.service ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-[#4A4A4A]">Service:</span>
                    <span className="text-xs font-bold text-[#1B1B1B] uppercase">{editingOrder.courier.service}</span>
                    {editingOrder.courier.trackingNumber && (
                      <span className="text-xs text-[#4A4A4A]">| Tracking: {editingOrder.courier.trackingNumber}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#4A4A4A]">Status:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      editingOrder.courier.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      editingOrder.courier.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                      editingOrder.courier.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{editingOrder.courier.status}</span>
                  </div>
                  {editingOrder.courier.status === 'queued' && (
                    <p className="text-xs text-[#4A4A4A]">
                      Queued — dispatch it to {editingOrder.courier.service} from the{' '}
                      <a href="/admin/dashboard/courier" className="underline text-[#B1123B]">Courier page</a>.
                    </p>
                  )}
                  {editingOrder.courier.status === 'failed' && editingOrder.courier.lastError && (
                    <p className="text-xs text-red-600">{editingOrder.courier.lastError}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={courierService}
                    onChange={(e) => setCourierService(e.target.value)}
                    className="px-3 py-2 border border-[#BDBDBD] rounded text-sm bg-white"
                  >
                    <option value="pathao">Pathao Courier</option>
                    <option value="steadfast">Steadfast Courier</option>
                    <option value="manual">Manual (no API)</option>
                  </select>
                  <button
                    onClick={() => handleSendToCourier(editingOrder._id, courierService)}
                    disabled={courierLoading}
                    className="px-4 py-2 bg-[#B1123B] text-white rounded text-sm hover:bg-[#1B1B1B] disabled:opacity-50 min-h-[44px]"
                  >
                    {courierLoading ? 'Queueing...' : 'Send to Courier'}
                  </button>
                </div>
              )}
            </div>

                          <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Order Items ({(editingOrder.items || []).length})</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowAddProductModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Product
                    </button>
                    <button
                      onClick={() => setShowDiscountModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Edit Discount
                    </button>
                  </div>
                </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(editingOrder.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img className="h-10 w-10 rounded-md object-cover" src={item.mainImage} alt={item.name} />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">SKU: {item.sku || item.productId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.size && <span>{formatMeasureLine(item)}</span>}
                            {item.color && <span className="ml-2">Color: {item.color}</span>}
                          </div>
                          
                          {/* Show stock information */}
                          <div className="text-xs text-gray-400 mt-1">
                            Stock: <span className={(() => {
                              const stock = getItemStock(item);
                              if (stock === 'N/A') return 'text-gray-400';
                              if (stock <= 0) return 'text-red-500 font-semibold';
                              if (stock < 5) return 'text-maybelline-pink font-semibold';
                              return 'text-green-500';
                            })()}>
                              {getItemStock(item)}
                            </span>
                            {(() => {
                              const stock = getItemStock(item);
                              if (stock === 'N/A') return null;
                              if (stock <= 0) return ' (Out of Stock)';
                              if (stock < 5) return ' (Low Stock)';
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          <div className="flex items-center justify-end space-x-2">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                              <span className="min-w-[2rem] text-center">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                                className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-600 hover:text-red-800 ml-2"
                              title="Remove item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          {item.inventoryAssigned ? (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Assigned
                              </span>
                              <span className="text-xs text-gray-500 mt-1">
                                {item.assignedInventoryItems?.length || 0} items
                              </span>
                              
                                                             {/* 🔹 Assigned Inventory Items List */}
                               {item.assignedInventoryItems && item.assignedInventoryItems.length > 0 && (
                                 <div className="mt-2 w-full max-w-xs">
                                   <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto">
                                     <div className="text-xs font-medium text-gray-700 mb-1">Assigned Items:</div>
                                     {item.assignedInventoryItems.map((inventoryId, invIdx) => (
                                       <div key={invIdx} className="flex items-center justify-between bg-white rounded p-1 mb-1 text-xs">
                                         <div className="flex items-center space-x-2">
                                           <span className="text-gray-600 truncate">
                                             {inventoryId}
                                           </span>
                                           <div className="flex space-x-1">
                                             <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                                               <QRCodeSVG value={inventoryId} size={12} />
                                             </div>
                                           </div>
                                         </div>
                                         <div className="flex space-x-1">
                                           <button
                                             onClick={() => handleViewInventory([inventoryId])}
                                             className="text-maybelline-pink hover:text-maybelline-magenta"
                                             title="View Details"
                                           >
                                             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                               <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                               <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                             </svg>
                                           </button>
                                           <button
                                             onClick={() => handleRemoveInventory(editingOrder._id, idx, inventoryId)}
                                             className="text-red-600 hover:text-red-800"
                                             title="Remove"
                                           >
                                             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                               <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                             </svg>
                                           </button>
                                         </div>
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               )}

                              <div className="mt-2 space-x-1">
                                <button
                                  onClick={() => openScanner(editingOrder, idx, 'qr')}
                                  className="inline-flex items-center px-2 py-1 text-xs bg-maybelline-pink text-white rounded hover:bg-maybelline-magenta"
                                  title="Scan QR Code"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                                  </svg>
                                  QR
                                </button>
                                <button
                                  onClick={() => openScanner(editingOrder, idx, 'barcode')}
                                  className="inline-flex items-center px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                  title="Scan Barcode"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                                  </svg>
                                  Bar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-maybelline-light text-maybelline-magenta">
                                ⚠ Not Assigned
                              </span>
                              <div className="mt-2 space-x-1">
                                <button
                                  onClick={() => openScanner(editingOrder, idx, 'qr')}
                                  className="inline-flex items-center px-2 py-1 text-xs bg-maybelline-pink text-white rounded hover:bg-maybelline-magenta"
                                  title="Scan QR Code"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                                  </svg>
                                  QR
                                </button>
                                <button
                                  onClick={() => openScanner(editingOrder, idx, 'barcode')}
                                  className="inline-flex items-center px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                  title="Scan Barcode"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                                  </svg>
                                  Bar
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-end border-t pt-6">
              {editingOrder.paymentStatus === 'completed' && editingOrder.orderStatus !== 'cancelled' && (
                <button
                  disabled={updatingOrderId === editingOrder._id}
                  onClick={() => handleRefundOrder(editingOrder._id)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  Refund Order
                </button>
              )}
              {editingOrder.orderStatus !== 'cancelled' && editingOrder.orderStatus !== 'finalized' && (
                <button
                  disabled={updatingOrderId === editingOrder._id}
                  onClick={() => handleSendFinalizationEmail(editingOrder._id)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  Send Finalization Email
                </button>
              )}
              {editingOrder.orderStatus !== 'delivered' && editingOrder.orderStatus !== 'cancelled' && (
                <button
                  disabled={updatingOrderId === editingOrder._id}
                  onClick={() => {
                    setSelectedOrderForPrint(editingOrder);
                    handleSendPdfDeliveredPaid();
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 flex items-center gap-2"
                >
                  <FaDownload />
                  Send PDF (Delivered + Paid)
                </button>
              )}
              <button
                disabled={updatingOrderId === editingOrder._id}
                onClick={() => handleCancelOrder(editingOrder._id)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-maybelline-pink hover:bg-maybelline-magenta focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maybelline-pink disabled:opacity-50"
              >
                Cancel Order
              </button>
              <button
                disabled={updatingOrderId === editingOrder._id}
                onClick={() => handleDeleteOrder(editingOrder._id)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                Delete Order
              </button>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maybelline-pink"></div>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  currentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.orderId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.shippingAddress?.fullName || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{order.userId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(order.totalAmount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`mr-1 ${getPaymentMethodIcon(order.paymentMethod)}`}>
                            {order.paymentMethod === 'bkash' && (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                              </svg>
                            )}
                            {order.paymentMethod === 'nagad' && (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                              </svg>
                            )}
                            {order.paymentMethod?.toLowerCase().includes('cash') && (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                              </svg>
                            )}
                          </span>
                          <span className="text-sm">
                            {order.paymentMethod || 'N/A'}
                          </span>
                        </div>
                        {isMobilePayment(order) && order.paymentDetails?.trxId && (
                          <div className="text-xs text-gray-500 mt-1">
                            TRX: {order.paymentDetails.trxId}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusColors.orderStatus[order.orderStatus] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                        </span>
                        {order.refundStatus && order.refundStatus !== 'none' && (
                          <span className={`mt-1 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            statusColors.refundStatus[order.refundStatus] || 'bg-gray-100 text-gray-800'
                          }`}>
                            Refund {order.refundStatus}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openPrintModal(order)}
                            className="text-purple-600 hover:text-purple-900 flex items-center"
                            title="Print Order"
                          >
                            <FaPrint className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startEditing(order)}
                            className="text-maybelline-pink hover:text-maybelline-magenta flex items-center"
                            title="View Details"
                          >
                            <FaEye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-gray-200">
            {loading ? (
              <div className="p-6 text-center">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maybelline-pink"></div>
                </div>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">{error}</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No orders found</div>
            ) : (
              currentOrders.map((order) => (
                <div key={order._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">#{order.orderId}</p>
                      <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        statusColors.orderStatus[order.orderStatus] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                      </span>
                      {order.refundStatus && order.refundStatus !== 'none' && (
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusColors.refundStatus[order.refundStatus] || 'bg-gray-100 text-gray-800'
                        }`}>
                          Refund {order.refundStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-900 mb-1">{order.shippingAddress?.fullName || 'N/A'}</div>
                  <div className="text-xs text-gray-500 mb-2">{order.userId}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`mr-1 ${getPaymentMethodIcon(order.paymentMethod)}`}>
                        {order.paymentMethod === 'bkash' && (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                          </svg>
                        )}
                        {order.paymentMethod === 'nagad' && (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                          </svg>
                        )}
                      </span>
                      <span className="text-sm font-medium">{formatCurrency(order.totalAmount || 0)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openPrintModal(order)}
                        className="text-purple-600 hover:text-purple-900 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Print Order"
                      >
                        <FaPrint className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEditing(order)}
                        className="text-maybelline-pink hover:text-maybelline-magenta p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="View Details"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredOrders.length > ordersPerPage && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstOrder + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(indexOfLastOrder, filteredOrders.length)}</span> of{' '}
                    <span className="font-medium">{filteredOrders.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span className="sr-only">First</span>
                      &laquo;
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span className="sr-only">Previous</span>
                      &lsaquo;
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-maybelline-light border-maybelline-pink text-maybelline-pink'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span className="sr-only">Next</span>
                      &rsaquo;
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span className="sr-only">Last</span>
                      &raquo;
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔹 Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Product to Order
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    placeholder="Search by product name, category, or brand..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink pr-10 bg-white text-gray-900"
                  />
                  {isLoadingProducts && (
                    <div className="absolute right-3 top-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-maybelline-pink"></div>
                    </div>
                  )}
                </div>
                
                {/* Search Results */}
                {filteredProducts.length > 0 ? (
                  <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                    {filteredProducts.map(product => (
                      <div
                        key={product._id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setSelectedVariant(null);
                          setSelectedSize('');
                          setProductSearchQuery(product.name);
                        }}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={product.mainImage || '/default-product.png'}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{product.name}</h4>
                            <p className="text-sm text-gray-500">
                              {product.categories?.join(', ')} • {product.brand || 'No Brand'}
                            </p>
                            <p className="text-sm font-medium text-green-600">
                              {formatCurrency(Number(product.mainPrice) || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 p-4 text-center text-gray-500 border border-gray-200 rounded-md">
                    {isLoadingProducts ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-maybelline-pink"></div>
                        <span>Loading products...</span>
                      </div>
                    ) : productSearchQuery.trim() ? (
                      <span>No products found matching "{productSearchQuery}"</span>
                    ) : (
                      <span>Start typing to search products</span>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Product Display */}
              {selectedProduct && (
                <div className="bg-maybelline-light p-4 rounded-lg border border-maybelline-light">
                  <h4 className="font-medium text-maybelline-magenta mb-2">Selected Product</h4>
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedProduct.mainImage || '/default-product.png'}
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{selectedProduct.name}</h5>
                      <p className="text-sm text-gray-600">
                        {selectedProduct.categories?.join(', ')} • {selectedProduct.brand || 'No Brand'}
                      </p>
                      <p className="text-sm font-medium text-green-600">
                        {formatCurrency(Number(selectedProduct.mainPrice) || 0)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setSelectedVariant(null);
                        setSelectedSize('');
                        setProductSearchQuery('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Variant Selection */}
              {selectedProduct && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Variant & Size</label>
                  <div className="space-y-3">
                    {selectedProduct.variants.map(variant => (
                      <div key={variant._id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center space-x-3 mb-3">
                          <img
                            src={variant.images?.[0] || selectedProduct.images?.[0] || '/default-product.png'}
                            alt={variant.colorName || variant.color?.name || 'Default'}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">
                              {variant.colorName || variant.color?.name || 'Default'}
                            </h5>
                            <p className="text-sm font-medium text-green-600">
                              {formatCurrency(getVariantPrice(variant, variant.sizes?.[0], selectedProduct))}
                            </p>
                          </div>
                        </div>
                        
                        {/* Size Selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Available Sizes:</label>
                          <div className="grid grid-cols-3 gap-2">
                            {variant.sizes.map(size => {
                              const stock = getVariantStock(variant._id, size);
                              const isOutOfStock = stock === 0 || stock === 'N/A';
                              const isLowStock = stock > 0 && stock < 5;
                              
                              return (
                                <button
                                  key={size}
                                  onClick={() => {
                                    setSelectedVariant(variant);
                                    setSelectedSize(size);
                                  }}
                                  disabled={isOutOfStock}
                                  className={`p-2 text-sm border rounded-md transition ${
                                    selectedVariant?._id === variant._id && selectedSize === size
                                      ? 'bg-maybelline-light0 text-white border-maybelline-pink'
                                      : isOutOfStock
                                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                      : isLowStock
                                      ? 'bg-maybelline-light text-maybelline-magenta border-maybelline-light hover:bg-maybelline-light'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="font-medium">{size}</div>
                                  <div className={`text-xs ${
                                    isOutOfStock ? 'text-gray-400' :
                                    isLowStock ? 'text-maybelline-pink' : 'text-green-600'
                                  }`}>
                                    {isOutOfStock ? 'Out of Stock' : `${stock} in stock`}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selection */}
              {selectedVariant && selectedSize && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={getVariantStock(selectedVariant._id, selectedSize)}
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 text-center px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white text-gray-900"
                    />
                    <button
                      onClick={() => {
                        const maxStock = getVariantStock(selectedVariant._id, selectedSize);
                        if (maxStock !== 'N/A' && selectedQuantity < maxStock) {
                          setSelectedQuantity(selectedQuantity + 1);
                        }
                      }}
                      disabled={getVariantStock(selectedVariant._id, selectedSize) === 'N/A' || selectedQuantity >= getVariantStock(selectedVariant._id, selectedSize)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    <span className="text-sm text-gray-500">
                      Max: {getVariantStock(selectedVariant._id, selectedSize)}
                    </span>
                  </div>
                </div>
              )}

              {/* Product Preview */}
              {selectedProduct && selectedVariant && selectedSize && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Order Item Preview</h4>
                  <div className="flex items-center space-x-4">
                    <img
                      src={selectedVariant.images?.[0] || selectedProduct.images?.[0] || '/default-product.png'}
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                      <p className="text-sm text-gray-600">
                        {selectedVariant.colorName || selectedVariant.color?.name || 'Default'} • Size: {selectedSize}
                      </p>
                      <p className="text-sm text-gray-500">
                        Stock: {getVariantStock(selectedVariant._id, selectedSize)} available
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-green-600">
                          {formatCurrency(getVariantPrice(selectedVariant, selectedSize, selectedProduct))} × {selectedQuantity}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(getVariantPrice(selectedVariant, selectedSize, selectedProduct) * selectedQuantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddProductModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProductToOrder}
                disabled={!selectedProduct || !selectedVariant || !selectedSize || selectedQuantity < 1 || getVariantStock(selectedVariant?._id, selectedSize) === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Update Order Discount
              </h3>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white text-gray-900"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (BDT)</option>
                </select>
              </div>

              {/* Discount Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Amount {discountType === 'percentage' ? '(%)' : '(BDT)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : undefined}
                  step={discountType === 'percentage' ? 0.01 : 0.01}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white text-gray-900"
                />
              </div>

              {/* Discount Preview */}
              {discountAmount > 0 && (
                <div className="bg-maybelline-light p-4 rounded-lg border border-maybelline-light">
                  <h4 className="font-medium text-maybelline-magenta mb-2">Discount Preview</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-maybelline-magenta">Subtotal:</span>
                      <span className="text-maybelline-magenta font-medium">{formatCurrency(editingOrder?.totalAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-maybelline-magenta">Discount ({discountType === 'percentage' ? `${discountAmount}%` : 'Fixed'}):</span>
                      <span className="text-red-600 font-medium">-{formatCurrency(calculateDiscountPreview().discountAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-maybelline-light pt-2">
                      <span className="text-maybelline-magenta font-semibold">Final Total:</span>
                      <span className="text-maybelline-magenta font-bold text-lg">{formatCurrency(calculateDiscountPreview().finalTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Current Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(editingOrder?.totalAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Discount:</span>
                    <span>{editingOrder?.discountAmount ? formatCurrency(editingOrder.discountAmount) : 'None'}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{formatCurrency(editingOrder?.grandTotal || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDiscount}
                disabled={!discountAmount || discountAmount <= 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Inventory Details Modal */}
      {viewingInventory && inventoryDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <svg className="w-5 h-5 mr-2 text-maybelline-pink" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Assigned Inventory Details
              </h3>
              <button
                onClick={() => setViewingInventory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {Array.isArray(inventoryDetails) ? (
                inventoryDetails.map((inventory, index) => (
                  <div key={inventory._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Inventory Item #{index + 1}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-mono text-gray-800">{inventory._id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">QR Code:</span>
                            <span className="font-mono text-gray-800">{inventory.qrCode}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Barcode:</span>
                            <span className="font-mono text-gray-800">{inventory.barcode}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              inventory.status === 'active' ? 'bg-green-100 text-green-800' :
                              inventory.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {inventory.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Size:</span>
                            <span className="text-gray-800">{formatMeasureLine(inventory) || inventory.size || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Price:</span>
                            <span className="text-gray-800">{formatBDT(inventory.price)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Product Information</h4>
                        <div className="space-y-2 text-sm">
                          {inventory.productId && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Product Name:</span>
                                <span className="text-gray-800">{inventory.productId.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Product ID:</span>
                                <span className="font-mono text-gray-800">{inventory.productId._id}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Variant ID:</span>
                            <span className="font-mono text-gray-800">{inventory.variantId}</span>
                          </div>
                          {inventory.color && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Color:</span>
                              <span className="text-gray-800">{inventory.color.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Inventory Item</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">ID:</span>
                          <span className="font-mono text-gray-800">{inventoryDetails._id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">QR Code:</span>
                          <span className="font-mono text-gray-800">{inventoryDetails.qrCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Barcode:</span>
                          <span className="font-mono text-gray-800">{inventoryDetails.barcode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            inventoryDetails.status === 'active' ? 'bg-green-100 text-green-800' :
                            inventoryDetails.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {inventoryDetails.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Product Information</h4>
                      <div className="space-y-2 text-sm">
                        {inventoryDetails.productId && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Product Name:</span>
                              <span className="text-gray-800">{inventoryDetails.productId.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Product ID:</span>
                              <span className="font-mono text-gray-800">{inventoryDetails.productId._id}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingInventory(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 QR/Barcode Scanner Modal */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={closeScanner}
        onScan={handleScanInventory}
        mode={scanningMode}
        title={scanningForOrder && scanningForItem !== null 
          ? `Scan ${scanningMode.toUpperCase()} for Order #${scanningForOrder.orderId} - Item ${scanningForItem + 1}`
          : 'Scan QR Code or Barcode'
        }
      />

      {/* 🔹 Print Order Modal */}
      <AdminCreateOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        onCreated={() => fetchOrders(currentPage)}
      />

      {showPrintModal && selectedOrderForPrint && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <FaPrint className="mr-2 text-purple-500" />
                Print Order #{selectedOrderForPrint.orderId}
              </h3>
              <button
                onClick={closePrintModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Print Settings */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Print Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showLogo"
                      checked={printSettings.showLogo}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, showLogo: e.target.checked }))}
                      className="rounded border-gray-300 text-maybelline-pink focus:ring-maybelline-pink"
                    />
                    <label htmlFor="showLogo" className="ml-2 text-sm font-medium text-gray-700">
                      Include BELORELLA Logo
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeSignature"
                      checked={printSettings.includeSignature}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, includeSignature: e.target.checked }))}
                      className="rounded border-gray-300 text-maybelline-pink focus:ring-maybelline-pink"
                    />
                    <label htmlFor="includeSignature" className="ml-2 text-sm font-medium text-gray-700">
                      Include Owner Signature
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeQRCode"
                      checked={printSettings.includeQRCode}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, includeQRCode: e.target.checked }))}
                      className="rounded border-gray-300 text-maybelline-pink focus:ring-maybelline-pink"
                    />
                    <label htmlFor="includeQRCode" className="ml-2 text-sm font-medium text-gray-700">
                      Include QR Codes
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeBarcode"
                      checked={printSettings.includeBarcode}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, includeBarcode: e.target.checked }))}
                      className="rounded border-gray-300 text-maybelline-pink focus:ring-maybelline-pink"
                    />
                    <label htmlFor="includeBarcode" className="ml-2 text-sm font-medium text-gray-700">
                      Include Barcodes
                    </label>
                  </div>
                </div>
              </div>

              {/* Order Preview */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Order Preview</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium">#{selectedOrderForPrint.orderId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{selectedOrderForPrint.shippingAddress?.fullName || selectedOrderForPrint.userId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium">{formatCurrency(selectedOrderForPrint.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{selectedOrderForPrint.items.length} products</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status:</span>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                      Delivered
                    </span>
                  </div>
                </div>
              </div>

              {/* Print Features */}
              <div className="bg-maybelline-light p-4 rounded-lg">
                <h4 className="text-lg font-medium text-maybelline-magenta mb-2">Print Features</h4>
                <ul className="text-sm text-maybelline-magenta space-y-1">
                  <li>• Professional A4 layout with BELORELLA branding</li>
                  <li>• Complete order details and customer information</li>
                  <li>• Product images, prices, and specifications</li>
                  <li>• Individual barcodes and QR codes for each inventory item</li>
                  <li>• Owner signature for certification</li>
                  <li>• Quality certification and warranty information</li>
                  <li>• Print-ready format optimized for A4 paper</li>
                  <li>• Current order status and payment information</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={closePrintModal}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              {selectedOrderForPrint.orderStatus !== 'delivered' && selectedOrderForPrint.orderStatus !== 'cancelled' && (
                <button
                  onClick={handleSendPdfDeliveredPaid}
                  disabled={sendingPdf}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {sendingPdf ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <FaDownload />
                  )}
                  <span>{sendingPdf ? 'Sending...' : 'Send PDF (Delivered + Paid)'}</span>
                </button>
              )}
              <button
                onClick={printOrder}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition flex items-center space-x-2"
              >
                <FaPrint />
                <span>Print Order</span>
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default AdminOrdersPage;
