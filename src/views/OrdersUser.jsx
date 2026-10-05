'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useEffect, useState, useContext, useMemo } from 'react';
import { UserContext } from '../context/UserContext';
import { formatMeasureLine } from '../lib/measure';
import { formatBDT } from '../config/brand';
import axios from 'axios';
import Link from "next/link";
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import {
  FaBox,
  FaSearch,
  FaFilter,
  FaTimes,
  FaEye,
  FaTrash,
  FaWifi,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCreditCard,
  FaTruck,
  FaCheckCircle,
  FaClock,
  FaBan,
  FaUndoAlt,
  FaUpload
} from 'react-icons/fa';

function OrdersListPage() {
  const { user } = useContext(UserContext);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [refundModalOrder, setRefundModalOrder] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundImage, setRefundImage] = useState('');
  const [refundImageUploading, setRefundImageUploading] = useState(false);
  const [refundBkash, setRefundBkash] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URI;
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URI || API_BASE;

  const showNotification = (message) => {
    try {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission === 'granted') {
        new Notification('Order Update', { body: message });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') new Notification('Order Update', { body: message });
        });
      }
    } catch (e) {
      toast.info(message);
    }
  };

  const formatCurrency = (amount, currency = 'BDT', locale = 'en-BD') => {
    return formatBDT(amount);
  };

  const maskPhone = (num) => {
    if (!num) return '';
    const digits = num.replace(/\D/g, '');
    if (digits.length < 7) return num.replace(/\d/g, '*');
    const masked = `${digits.slice(0, 4)}${'*'.repeat(Math.max(0, digits.length - 7))}${digits.slice(-3)}`;
    return num.startsWith('+') ? `+${masked}` : masked;
  };

  const buildPaymentDetails = (order) => {
    if (!order?.paymentDetails) return [];
    const method = (order.paymentMethod || '').toLowerCase();
    const pd = order.paymentDetails;

    const walletMasked = pd.walletNumberMasked ||
      (pd.mobileNumber ? maskPhone(pd.mobileNumber) : null);

    const details = [];
    if (walletMasked) {
      details.push({ label: 'Wallet', value: walletMasked });
    }

    if (['bkash', 'nagad', 'rocket', 'upay'].includes(method)) {
      if (pd.transactionNumber) {
        details.push({ label: 'TRX ID', value: pd.transactionNumber });
      }
    }

    const shownKeys = new Set(['walletNumberMasked', 'mobileNumber', 'transactionNumber']);
    Object.entries(pd).forEach(([k, v]) => {
      if (v == null || v === '' || shownKeys.has(k)) return;
      const label = k
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (c) => c.toUpperCase());
      details.push({ label, value: String(v) });
    });

    return details;
  };

  useEffect(() => {
    if (!user || !SOCKET_URL) return;

    const accessToken = getStorage('accessToken');
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      timeout: 10000,
      auth: { token: accessToken || '' },
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      newSocket.emit('joinUserRoom', user._id);
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', () => {
      setConnectionStatus('error');
      newSocket.disconnect();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, SOCKET_URL]);

  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdate = (data) => {
      const { eventType, order, updateType } = data;

      switch (eventType || updateType) {
        case 'create':
        case 'order_created':
          setOrders(prevOrders => [order, ...prevOrders]);
          showNotification(`New order placed: #${order.orderId}`);
          toast.success(`Order #${order.orderId} placed successfully!`);
          break;
        case 'update':
        case 'order_updated':
        case 'status_updated':
        case 'product_added':
        case 'product_removed':
        case 'quantity_updated':
        case 'discount_updated':
          setOrders(prevOrders => prevOrders.map(o => o._id === order._id ? order : o));
          toast.info(`Order #${order.orderId} updated`);
          showNotification(`Order #${order.orderId} updated`);
          break;
        case 'cancel':
        case 'order_cancelled':
          setOrders(prevOrders => prevOrders.map(o => o._id === order._id ? order : o));
          toast.warn(`Order #${order.orderId} cancelled`);
          showNotification(`Order #${order.orderId} cancelled`);
          break;
        case 'delivered':
        case 'order_delivered':
          setOrders(prevOrders => prevOrders.map(o => o._id === order._id ? order : o));
          toast.success(`Order #${order.orderId} delivered!`);
          showNotification(`Order #${order.orderId} delivered!`);
          break;
        default:
          console.warn('Unknown order update type:', eventType || updateType);
      }
    };

    socket.on(`user:orderUpdate:${user._id}`, handleOrderUpdate);
    socket.on(`orderUpdated`, handleOrderUpdate);

    return () => {
      socket.off(`user:orderUpdate:${user._id}`, handleOrderUpdate);
      socket.off(`orderUpdated`, handleOrderUpdate);
    };
  }, [socket, user?._id]);

  useEffect(() => {
    if (!user) {
      setError('You must be logged in to view your orders.');
      setLoading(false);
      return;
    }
    if (!API_BASE) {
      setError('Missing API base URL configuration.');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/orders`, {
          params: { userId: user._id },
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (isMounted) {
          const list = Array.isArray(res.data) ? res.data : [];
          list.sort((a, b) => {
            const ta = new Date(a?.createdAt || 0).getTime();
            const tb = new Date(b?.createdAt || 0).getTime();
            return tb - ta;
          });
          setOrders(list);
          setFilteredOrders(list);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load orders');
          if (socket) {
            socket.emit('error', {
              userId: user._id,
              error: err.message,
              component: 'OrdersListPage'
            });
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, [user, API_BASE, socket]);

  useEffect(() => {
    let result = [...orders];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order =>
        order.orderId?.toString().toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(order =>
        order.orderStatus?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);

        switch (dateFilter) {
          case 'today':
            return orderDate.toDateString() === now.toDateString();
          case 'week':
            const oneWeekAgo = new Date(now);
            oneWeekAgo.setDate(now.getDate() - 7);
            return orderDate >= oneWeekAgo;
          case 'month':
            const oneMonthAgo = new Date(now);
            oneMonthAgo.setMonth(now.getMonth() - 1);
            return orderDate >= oneMonthAgo;
          case 'year':
            const oneYearAgo = new Date(now);
            oneYearAgo.setFullYear(now.getFullYear() - 1);
            return orderDate >= oneYearAgo;
          case 'custom':
            if (!startDate || !endDate) return true;
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return orderDate >= start && orderDate <= end;
          default:
            return true;
        }
      });
    }

    setFilteredOrders(result);
  }, [orders, searchTerm, statusFilter, dateFilter, startDate, endDate]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      setCancelLoadingId(orderId);
      setCancelError('');

      const res = await axios.patch(
        `${API_BASE}/api/orders/${orderId}/cancel`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getStorage('accessToken')}`
          },
        }
      );

      toast.success(res.data.message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order._id === orderId
            ? { ...order, orderStatus: 'canceled' }
            : order
        )
      );

    } catch (err) {
      const errorMessage = err.response?.data?.message ||
                          err.message ||
                          'Failed to cancel order';
      setCancelError(errorMessage);

      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    } finally {
      setCancelLoadingId(null);
    }
  };

  const canRequestRefund = (order) => {
    if (!order) return false;
    const rs = order.refundStatus || 'none';
    if (['pending', 'approved'].includes(rs)) return false;
    if (order.paymentStatus === 'refunded') return false;
    const st = (order.orderStatus || '').toLowerCase();
    if (st === 'cancelled' || st === 'canceled') return false;
    return true;
  };

  const refundStatusBadge = (order) => {
    const rs = order?.refundStatus;
    if (!rs || rs === 'none') return null;
    const map = {
      pending: { cls: 'text-black bg-pure-white border-cool-gray', icon: <FaClock />, label: 'Refund Requested' },
      approved: { cls: 'text-black bg-pure-white border-cool-gray', icon: <FaCheckCircle />, label: 'Refund Approved' },
      rejected: { cls: 'text-maybelline-pink bg-pure-white border-maybelline-pink', icon: <FaBan />, label: 'Refund Rejected' },
    };
    const cfg = map[rs];
    if (!cfg) return null;
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium font-sans ${cfg.cls}`}>
        {cfg.icon}
        <span>{cfg.label}</span>
      </span>
    );
  };

  const openRefundModal = (order) => {
    setRefundModalOrder(order);
    setRefundReason('');
    setRefundNote('');
    setRefundImage('');
    setRefundBkash('');
  };

  const handleRefundImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    try {
      setRefundImageUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      const res = await axios.post(`${API_BASE}/api/upload/refund-image`, formData, {
        headers: {
          'Authorization': `Bearer ${getStorage('accessToken')}`,
        },
      });
      setRefundImage(res.data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setRefundImageUploading(false);
      e.target.value = '';
    }
  };

  const handleRefundRequest = async () => {
    if (!refundModalOrder) return;
    if (!refundReason.trim()) {
      toast.error('Please provide a reason for the refund request');
      return;
    }
    if (!refundBkash.trim()) {
      toast.error('Please provide your bKash number to receive the refund amount');
      return;
    }
    try {
      setRefundSubmitting(true);
      const res = await axios.patch(
        `${API_BASE}/api/orders/${refundModalOrder.orderId}/refund-request`,
        { reason: refundReason.trim(), note: refundNote.trim(), refundImage, bkashNumber: refundBkash.trim() },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getStorage('accessToken')}`,
          },
        }
      );
      const updated = res.data.order;
      setOrders(prev => prev.map(o => (o.orderId === refundModalOrder.orderId ? updated : o)));
      toast.success(res.data.message || 'Refund request submitted');
      setRefundModalOrder(null);
      setRefundReason('');
      setRefundNote('');
      setRefundImage('');
      setRefundBkash('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit refund request');
    } finally {
      setRefundSubmitting(false);
    }
  };

  const getStatusColor = (status, colorMap) => {
    if (!status) return colorMap.default;
    return colorMap[status.toLowerCase()] || colorMap.default;
  };

  const statusColors = {
    pending: 'text-maybelline-pink bg-pure-white border-maybelline-pink',
    processing: 'text-black bg-pure-white border-cool-gray',
    shipped: 'text-dark-gray bg-pure-white border-mid-gray',
    delivered: 'text-black bg-pure-white border-cool-gray',
    canceled: 'text-maybelline-pink bg-pure-white border-maybelline-pink',
    cancelled: 'text-maybelline-pink bg-pure-white border-maybelline-pink',
    default: 'text-dark-gray bg-pure-white border-mid-gray',
  };

  const paymentColors = {
    pending: 'text-black bg-pure-white border-cool-gray',
    completed: 'text-maybelline-pink bg-pure-white border-maybelline-pink',
    failed: 'text-maybelline-pink bg-pure-white border-maybelline-pink',
    refunded: 'text-dark-gray bg-pure-white border-mid-gray',
    default: 'text-dark-gray bg-pure-white border-mid-gray',
  };

  const connectionStatusColors = {
    connected: 'text-black bg-pure-white border-cool-gray',
    disconnected: 'text-dark-gray bg-pure-white border-mid-gray',
    error: 'text-maybelline-pink bg-pure-white border-maybelline-pink',
    connecting: 'text-black bg-pure-white border-cool-gray'
  };

  const currency = useMemo(() => 'BDT', []);

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'canceled', label: 'Canceled' },
  ];

  const dateOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <FaClock className="text-black" />;
      case 'processing':
        return <FaBox className="text-black" />;
      case 'shipped':
        return <FaTruck className="text-dark-gray" />;
      case 'delivered':
        return <FaCheckCircle className="text-black" />;
      case 'canceled':
      case 'cancelled':
        return <FaBan className="text-maybelline-pink" />;
      default:
        return <FaClock className="text-dark-gray" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maybelline-pink mx-auto mb-4"></div>
            <p className="text-lg text-dark-gray font-sans">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-pure-white border border-maybelline-pink rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-maybelline-pink text-2xl" />
          </div>
          <h2 className="text-xl font-semibold text-black mb-2 font-heading">Error Loading Orders</h2>
          <p className="text-maybelline-pink text-lg mb-6 font-sans">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-pure-white border border-cool-gray rounded-full flex items-center justify-center mx-auto mb-4">
            <FaBox className="text-mid-gray text-2xl" />
          </div>
          <h2 className="text-xl font-semibold text-black mb-2 font-heading">No Orders Yet</h2>
          <p className="text-dark-gray mb-6 font-sans">You haven't placed any orders yet.</p>
          <Link href="/"
            className="btn-primary inline-flex"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3 font-heading">
              <div className="w-12 h-12 bg-maybelline-pink rounded-full flex items-center justify-center">
                <FaBox className="text-white text-xl" />
              </div>
              My Orders
            </h1>
            <p className="text-dark-gray font-sans">Track and manage your orders</p>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium font-sans ${connectionStatusColors[connectionStatus]}`}>
            {connectionStatus === 'connected' ? (
              <>
                <FaWifi />
                <span>Live updates connected</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <FaTimes />
                <span>Live updates disconnected</span>
              </>
            )}
          </div>
        </div>
      </div>

      {cancelError && (
        <div className="mb-6 p-4 border border-maybelline-pink rounded-xl bg-pure-white">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="text-maybelline-pink mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-maybelline-pink font-medium">Error</p>
              <p className="text-maybelline-pink/80 text-sm font-sans">{cancelError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="card rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label htmlFor="search" className="block text-sm font-medium text-dark-gray mb-2 flex items-center gap-2 font-sans">
              <FaSearch className="text-mid-gray" />
              Search Order ID
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by order ID..."
              className="w-full px-4 py-3 border border-cool-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-maybelline-pink transition-all duration-200 font-sans"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="status" className="block text-sm font-medium text-dark-gray mb-2 flex items-center gap-2 font-sans">
              <FaFilter className="text-mid-gray" />
              Status
            </label>
            <select
              id="status"
              className="w-full px-4 py-3 border border-cool-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-maybelline-pink transition-all duration-200 font-sans"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="date" className="block text-sm font-medium text-dark-gray mb-2 flex items-center gap-2 font-sans">
              <FaCalendarAlt className="text-mid-gray" />
              Date Range
            </label>
            <select
              id="date"
              className="w-full px-4 py-3 border border-cool-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-maybelline-pink transition-all duration-200 font-sans"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              {dateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-4 py-3 bg-pure-white border border-cool-gray text-black rounded-lg hover:border-maybelline-pink hover:text-maybelline-pink transition-all duration-200 font-medium flex items-center justify-center gap-2 font-sans"
            >
              <FaTimes />
              Reset
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-dark-gray mb-2 font-sans">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  className="w-full px-4 py-3 border border-cool-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-maybelline-pink transition-all duration-200 font-sans"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-dark-gray mb-2 font-sans">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  className="w-full px-4 py-3 border border-cool-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-maybelline-pink transition-all duration-200 font-sans"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-dark-gray flex items-center gap-2 font-sans">
          <FaBox className="text-mid-gray" />
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="card rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-pure-white border border-cool-gray rounded-full flex items-center justify-center mx-auto mb-4">
            <FaSearch className="text-mid-gray text-2xl" />
          </div>
          <h3 className="text-lg font-semibold text-black mb-2 font-heading">No Orders Found</h3>
          <p className="text-dark-gray mb-6 font-sans">No orders match your search criteria.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateFilter('all');
              setStartDate('');
              setEndDate('');
            }}
            className="btn-primary"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const paymentDetails = buildPaymentDetails(order);
            const createdAt = order?.createdAt
              ? new Date(order.createdAt).toLocaleString()
              : 'N/A';
            const total = order?.totalAmount || 0;
            const discount = order?.discountAmount || 0;

            return (
              <div
                key={order.orderId}
                className="card rounded-xl"
              >
                <div className="px-6 py-4 border-b border-cool-gray">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Link href={`/profile/orders/${order.orderId}`}
                        className="text-xl font-bold text-black hover:text-maybelline-pink transition-colors duration-200 font-heading"
                      >
                        Order #{order.orderId}
                      </Link>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium font-sans ${getStatusColor(order.orderStatus, statusColors)}`}>
                        {getStatusIcon(order.orderStatus)}
                        <span>{order.orderStatus || 'N/A'}</span>
                      </div>
                      {refundStatusBadge(order)}
                    </div>
                    <div className="text-sm text-dark-gray flex items-center gap-2 font-sans">
                      <FaCalendarAlt className="text-mid-gray" />
                      {createdAt}
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-black flex items-center gap-2 font-heading">
                        <FaCreditCard className="text-maybelline-pink" />
                        Payment Info
                      </h4>
                      <div className="space-y-2">
                        <p className="text-sm font-sans">
                          <span className="font-medium">Status:</span>{' '}
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-sans ${getStatusColor(order.paymentStatus, paymentColors)}`}>
                            {order.paymentStatus || 'N/A'}
                          </span>
                        </p>
                        <p className="text-sm font-sans">
                          <span className="font-medium">Method:</span>{' '}
                          <span className="text-black">{(order.paymentMethod || 'N/A').toUpperCase()}</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-black flex items-center gap-2 font-heading">
                        <FaMapMarkerAlt className="text-maybelline-pink" />
                        Shipping Address
                      </h4>
                      {order.shippingAddress ? (
                        <div className="text-sm space-y-1 font-sans">
                          <p className="font-medium">{order.shippingAddress.fullName}</p>
                          <p className="text-dark-gray">Phone: {order.shippingAddress.phone}</p>
                          <p className="text-dark-gray">{order.shippingAddress.address}</p>
                          <p className="text-dark-gray">
                            {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                          </p>
                          <p className="text-dark-gray">{order.shippingAddress.country}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-dark-gray font-sans">No address provided</p>
                      )}

                      {order.shipping && (
                        <div className="mt-3 pt-3 border-t border-cool-gray">
                          <h5 className="font-medium text-black flex items-center gap-2 font-heading">
                            <FaTruck className="text-maybelline-pink" />
                            Shipping Method
                          </h5>
                          <div className="text-sm space-y-1 font-sans">
                            <p className="text-dark-gray">
                              <span className="font-medium">Method:</span> {order.shipping.name}
                            </p>
                            <p className="text-dark-gray">
                              <span className="font-medium">Cost:</span> {formatCurrency(order.shipping.charge, currency)}
                            </p>
                            <p className="text-dark-gray">
                              <span className="font-medium">Estimated Delivery:</span> {order.shipping.estimatedDays} days
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-black flex items-center gap-2 font-heading">
                        <FaBox className="text-maybelline-pink" />
                        Order Summary
                      </h4>
                      <div className="space-y-2">
                        <p className="text-sm font-sans">
                          <span className="font-medium">Subtotal:</span>{' '}
                          <span className="text-black">{formatCurrency(total + discount, currency)}</span>
                        </p>
                        {discount > 0 && (
                          <p className="text-sm font-sans">
                            <span className="font-medium">Discount:</span>{' '}
                            <span className="text-maybelline-pink font-medium">-{formatCurrency(discount, currency)}</span>
                          </p>
                        )}
                        {order.shippingCost > 0 && (
                          <p className="text-sm font-sans">
                            <span className="font-medium">Shipping:</span>{' '}
                            <span className="text-black font-medium">{formatCurrency(order.shippingCost, currency)}</span>
                          </p>
                        )}
                        {(order.extraFees || []).map((fee, idx) => (
                          <p key={fee.ruleId || idx} className="text-sm font-sans">
                            <span className="font-medium">{fee.label}:</span>{' '}
                            <span className="text-black font-medium">{formatCurrency(fee.amount || 0, currency)}</span>
                          </p>
                        ))}
                        <p className="text-sm font-sans">
                          <span className="font-medium">Total:</span>{' '}
                          <span className="text-lg font-bold text-maybelline-pink">{formatCurrency(order.grandTotal, currency)}</span>
                        </p>
                        <p className="text-sm font-sans">
                          <span className="font-medium">Items:</span>{' '}
                          <span className="text-black">{order.items?.length || 0}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {paymentDetails.length > 0 && (
                    <div className="card rounded-xl p-4">
                      <h4 className="font-semibold text-black mb-3 flex items-center gap-2 font-heading">
                        <FaCreditCard className="text-maybelline-pink" />
                        Payment Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {paymentDetails.map((detail, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="font-medium text-dark-gray text-sm font-sans">
                              {detail.label}:
                            </span>
                            <span className="text-black text-sm font-sans">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.items?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-black mb-4 flex items-center gap-2 font-heading">
                        <FaBox className="text-maybelline-pink" />
                        Order Items
                      </h4>
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div
                            key={item._id || index}
                            className="flex items-start gap-4 p-4 card rounded-xl"
                          >
                            <img
                              src={item.mainImage}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-lg border border-cool-gray"
                              loading="lazy"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-black font-heading">{item.name}</p>
                              <div className="text-sm text-dark-gray space-y-1 mt-1 font-sans">
                                {item.color && <p>Color: {item.color}</p>}
                                {item.size && (
                                  <p>
                                    {formatMeasureLine(item)}
                                  </p>
                                )}
                                <p>Quantity: {item.quantity}</p>
                                <p className="font-medium text-black">
                                  Price: {formatCurrency(item.price || 0, currency)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-cool-gray">
                    <div className="flex gap-3">
                      <Link href={`/profile/orders/${order.orderId}`}
                        className="btn-primary"
                      >
                        <FaEye />
                        View Details
                      </Link>

                      {canRequestRefund(order) && (
                        <button
                          onClick={() => openRefundModal(order)}
                          className="btn-primary bg-pure-white text-black border border-cool-gray hover:border-maybelline-pink hover:text-maybelline-pink hover:shadow-none"
                        >
                          <FaUndoAlt />
                          Request Refund
                        </button>
                      )}

                      {order.orderStatus?.toLowerCase() === 'pending' && (
                        <button
                          disabled={cancelLoadingId === order.orderId}
                          onClick={() => handleCancelOrder(order.orderId)}
                          className="btn-primary bg-pure-white text-maybelline-pink border border-maybelline-pink hover:bg-pure-white hover:border-maybelline-pink hover:text-maybelline-pink hover:shadow-none"
                        >
                          {cancelLoadingId === order.orderId ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-maybelline-pink"></div>
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <FaTrash />
                              Cancel Order
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black flex items-center gap-2 font-heading">
                <FaUndoAlt className="text-maybelline-pink" />
                Request Refund
              </h3>
              <button
                onClick={() => setRefundModalOrder(null)}
                className="text-mid-gray hover:text-black"
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <p className="text-sm text-dark-gray mb-4 font-sans">
              Order <span className="font-medium text-black">#{refundModalOrder.orderId}</span>
              {' \u2014 '}
              {formatCurrency(refundModalOrder.grandTotal || refundModalOrder.totalAmount || 0, currency)}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-gray mb-1 font-sans">
                  Reason <span className="text-maybelline-pink">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-cool-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink font-sans"
                  placeholder="Why are you requesting a refund?"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-gray mb-1 font-sans">
                  Additional Note (optional)
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-cool-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink font-sans"
                  placeholder="Any extra details..."
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-gray mb-1 font-sans">
                  Photo (optional)
                </label>
                {!refundImage ? (
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-cool-gray rounded-lg cursor-pointer hover:border-maybelline-pink hover:text-maybelline-pink text-dark-gray transition-all font-sans">
                    <FaUpload />
                    {refundImageUploading ? 'Uploading...' : 'Attach photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={refundImageUploading}
                      onChange={handleRefundImageSelect}
                    />
                  </label>
                ) : (
                  <div className="relative inline-block">
                    <img
                      src={refundImage}
                      alt="Refund evidence"
                      className="h-24 w-24 object-cover rounded-lg border border-cool-gray"
                    />
                    <button
                      type="button"
                      onClick={() => setRefundImage('')}
                      className="absolute -top-2 -right-2 text-white bg-maybelline-pink rounded-full w-6 h-6 flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-gray mb-1 font-sans">
                  bKash Number <span className="text-maybelline-pink">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-cool-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink font-sans"
                  placeholder="Your bKash number (refund will be sent here)"
                  value={refundBkash}
                  onChange={(e) => setRefundBkash(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 text-xs text-dark-gray font-sans bg-pure-white border border-cool-gray rounded-lg p-3 space-y-1.5">
              <p><span className="font-medium text-black">Delivery charge</span> must be paid before the parcel is sent.</p>
              <p><span className="font-medium text-black">Please note:</span> if the product is damaged <em>after</em> delivery, a refund will not be available — upload images as soon as possible. Request timestamps are checked.</p>
              <p>Need help? Use the <span className="font-medium text-black">message</span> option (the chat button) to message our admins directly about your refund.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRefundRequest}
                disabled={refundSubmitting || !refundReason.trim() || !refundBkash.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {refundSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                onClick={() => setRefundModalOrder(null)}
                className="px-4 py-2 border border-cool-gray text-dark-gray rounded-lg hover:border-black hover:text-black transition-all font-sans"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersListPage;
