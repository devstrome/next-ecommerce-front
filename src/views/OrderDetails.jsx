'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useEffect, useState, useContext, useRef } from 'react';
import Link from "next/link"
import { useRouter, useParams } from "next/navigation";
import { UserContext } from '../context/UserContext';
import RefundStatusTracker from '../components/RefundStatusTracker';
import { formatMeasureLine } from '../lib/measure';
import { formatBDT } from '../config/brand';
import axios from 'axios';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import {
  FaBox,
  FaTruck,
  FaCheckCircle,
  FaClock,
  FaBan,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaCreditCard,
  FaPhone,
  FaCalendarAlt,
  FaTrash,
  FaExclamationTriangle,
  FaShare,
  FaEye,
  FaCheck,
  FaSpinner,
  FaUndoAlt,
  FaTimes,
  FaUpload
} from 'react-icons/fa';

function OrderDetails() {
  const { orderId } = useParams();
  const { user } = useContext(UserContext);
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundImage, setRefundImage] = useState('');
  const [refundImageUploading, setRefundImageUploading] = useState(false);
  const [refundBkash, setRefundBkash] = useState('');
  const socketRef = useRef(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URI;
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URI || API_BASE;

  const formatCurrency = (amount, currency = 'BDT', locale = 'en-BD') => {
    return formatBDT(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusStep = (status) => {
    const statusSteps = {
      'pending': 1,
      'processing': 2,
      'shipped': 3,
      'delivered': 4,
      'cancelled': 0,
      'canceled': 0
    };
    return statusSteps[status?.toLowerCase()] || 0;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'text-black bg-pure-white border-maybelline-pink',
      'processing': 'text-black bg-pure-white border-maybelline-pink',
      'shipped': 'text-dark-gray bg-pure-white border-mid-gray',
      'delivered': 'text-maybelline-pink bg-pure-white border-maybelline-pink',
      'cancelled': 'text-maybelline-pink bg-pure-white border-maybelline-pink',
      'canceled': 'text-maybelline-pink bg-pure-white border-maybelline-pink'
    };
    return colors[status?.toLowerCase()] || 'text-dark-gray bg-pure-white border-mid-gray';
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <FaClock className="text-black" />;
      case 'processing':
        return <FaBox className="text-black" />;
      case 'shipped':
        return <FaTruck className="text-dark-gray" />;
      case 'delivered':
        return <FaCheckCircle className="text-maybelline-pink" />;
      case 'cancelled':
      case 'canceled':
        return <FaBan className="text-maybelline-pink" />;
      default:
        return <FaClock className="text-dark-gray" />;
    }
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE}/api/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${getStorage('accessToken')}`
          }
        });
        setOrder(response.data);
        setError('');
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError(err.response?.data?.message || 'Failed to load order details');
        if (err.response?.status === 404) {
          toast.error('Order not found');
          router.push('/profile/orders');
        }
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, API_BASE, router]);

  useEffect(() => {
    if (!user || !SOCKET_URL) return;

    const accessToken = getStorage('accessToken');
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      timeout: 10000,
      auth: { token: accessToken || '' },
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('joinUserRoom', user._id);
    });

    socketRef.current.on('connect_error', () => {
      if (socketRef.current) socketRef.current.disconnect();
    });

    const handleOrderUpdate = (data) => {
      const { eventType, order: updatedOrder, updateType } = data;

      if (updatedOrder && updatedOrder.orderId === orderId) {
        setOrder(updatedOrder);

        switch (eventType || updateType) {
          case 'status_updated':
            toast.info(`Order #${orderId} status updated to ${updatedOrder.orderStatus}`);
            break;
          case 'product_added':
            toast.info(`Product added to order #${orderId}`);
            break;
          case 'product_removed':
            toast.info(`Product removed from order #${orderId}`);
            break;
          case 'quantity_updated':
            toast.info(`Quantity updated in order #${orderId}`);
            break;
          case 'discount_updated':
            toast.info(`Discount updated for order #${orderId}`);
            break;
          default:
            toast.info(`Order #${orderId} updated`);
        }
      }
    };

    socketRef.current.on(`user:orderUpdate:${user._id}`, handleOrderUpdate);
    socketRef.current.on('orderUpdated', handleOrderUpdate);

    return () => {
      if (socketRef.current) {
        socketRef.current.off(`user:orderUpdate:${user._id}`, handleOrderUpdate);
        socketRef.current.off('orderUpdated', handleOrderUpdate);
        socketRef.current.disconnect();
      }
    };
  }, [user, SOCKET_URL, orderId]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    try {
      setCancelLoading(true);
      const response = await axios.patch(
        `${API_BASE}/api/orders/${orderId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${getStorage('accessToken')}`
          }
        }
      );

      setOrder(response.data.order);
      toast.success('Order cancelled successfully');
    } catch (err) {
      console.error('Error cancelling order:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  const canRequestRefund = (ord) => {
    if (!ord) return false;
    const rs = ord.refundStatus || 'none';
    if (['pending', 'approved'].includes(rs)) return false;
    if (ord.paymentStatus === 'refunded') return false;
    const st = (ord.orderStatus || '').toLowerCase();
    if (st === 'cancelled' || st === 'canceled') return false;
    return true;
  };

  const refundStatusChip = (ord) => {
    const rs = ord?.refundStatus;
    if (!rs || rs === 'none') return null;
    const map = {
      pending: { cls: 'text-black bg-pure-white border-cool-gray', icon: <FaClock />, label: 'Refund Requested' },
      approved: { cls: 'text-black bg-pure-white border-cool-gray', icon: <FaCheckCircle />, label: 'Refund Approved' },
      rejected: { cls: 'text-maybelline-pink bg-pure-white border-maybelline-pink', icon: <FaBan />, label: 'Refund Rejected' },
    };
    const cfg = map[rs];
    if (!cfg) return null;
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium font-sans ${cfg.cls}`}>
        {cfg.icon}
        <span>{cfg.label}</span>
      </span>
    );
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
    if (!order) return;
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
      const response = await axios.patch(
        `${API_BASE}/api/orders/${order.orderId}/refund-request`,
        { reason: refundReason.trim(), note: refundNote.trim(), refundImage, bkashNumber: refundBkash.trim() },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getStorage('accessToken')}`,
          },
        }
      );
      setOrder(response.data.order);
      toast.success(response.data.message || 'Refund request submitted');
      setShowRefundModal(false);
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

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Order #${order?.orderId}`,
          text: `Check out my order #${order?.orderId}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Order link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pure-white flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-maybelline-pink mx-auto mb-4" />
          <p className="text-lg text-dark-gray font-sans">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-pure-white flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="text-4xl text-maybelline-pink mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-black mb-2 font-heading">Error Loading Order</h2>
          <p className="text-dark-gray mb-4 font-sans">{error}</p>
          <Link href="/profile/orders"
            className="btn-primary"
          >
            <FaArrowLeft />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-pure-white flex items-center justify-center">
        <div className="text-center">
          <FaBox className="text-4xl text-mid-gray mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-black mb-2 font-heading">Order Not Found</h2>
          <p className="text-dark-gray mb-4 font-sans">The order you're looking for doesn't exist.</p>
          <Link href="/profile/orders"
            className="btn-primary"
          >
            <FaArrowLeft />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const currentStep = getStatusStep(order.orderStatus);
  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-pure-white">
      <div className="card rounded-none border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/profile/orders"
                className="p-2 text-mid-gray hover:text-black transition-colors"
              >
                <FaArrowLeft className="text-xl" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-black font-heading">
                  Order #{order.orderId}
                </h1>
                <p className="text-dark-gray font-sans">
                  Placed on {formatDate(order.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="p-2 text-mid-gray hover:text-black transition-colors"
                title="Share Order"
              >
                <FaShare className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card rounded-xl p-6">
              <h2 className="text-lg font-semibold text-black mb-4 font-heading">Order Status</h2>

              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium font-sans ${getStatusColor(order.orderStatus)}`}>
                  {getStatusIcon(order.orderStatus)}
                  <span className="capitalize">{order.orderStatus}</span>
                </span>
                {refundStatusChip(order)}
              </div>

              {order.orderStatus?.toLowerCase() !== 'cancelled' && order.orderStatus?.toLowerCase() !== 'canceled' && (
                <div className="relative">
                  <div className="hidden md:block">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          currentStep >= 1 ? 'bg-maybelline-pink text-white' : 'bg-cool-gray text-dark-gray'
                        }`}>
                          {currentStep >= 1 ? <FaCheck /> : '1'}
                        </div>
                        <span className={`text-sm font-medium font-sans ${
                          currentStep >= 1 ? 'text-black' : 'text-dark-gray'
                        }`}>
                          Order Placed
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          currentStep >= 2 ? 'bg-maybelline-pink text-white' : 'bg-cool-gray text-dark-gray'
                        }`}>
                          {currentStep >= 2 ? <FaCheck /> : '2'}
                        </div>
                        <span className={`text-sm font-medium font-sans ${
                          currentStep >= 2 ? 'text-black' : 'text-dark-gray'
                        }`}>
                          Processing
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          currentStep >= 3 ? 'bg-maybelline-pink text-white' : 'bg-cool-gray text-dark-gray'
                        }`}>
                          {currentStep >= 3 ? <FaCheck /> : '3'}
                        </div>
                        <span className={`text-sm font-medium font-sans ${
                          currentStep >= 3 ? 'text-black' : 'text-dark-gray'
                        }`}>
                          Shipped
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          currentStep >= 4 ? 'bg-maybelline-pink text-white' : 'bg-cool-gray text-dark-gray'
                        }`}>
                          {currentStep >= 4 ? <FaCheck /> : '4'}
                        </div>
                        <span className={`text-sm font-medium font-sans ${
                          currentStep >= 4 ? 'text-black' : 'text-dark-gray'
                        }`}>
                          Delivered
                        </span>
                      </div>
                    </div>

                    <div className="relative h-2 bg-cool-gray rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-maybelline-pink transition-all duration-500"
                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="md:hidden">
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                            currentStep >= 1 ? 'bg-maybelline-pink text-white' : 'bg-cool-gray text-dark-gray'
                          }`}>
                            {currentStep >= 1 ? <FaCheck /> : '1'}
                          </div>
                          {currentStep < 4 && (
                            <div className={`absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-8 ${
                              currentStep >= 1 ? 'bg-maybelline-pink' : 'bg-cool-gray'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm font-medium font-sans ${
                            currentStep >= 1 ? 'text-black' : 'text-dark-gray'
                          }`}>
                            Order Placed
                          </span>
                          <p className="text-xs text-dark-gray mt-1 font-sans">Your order has been received</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                            currentStep >= 2 ? 'bg-maybelline-pink text-white' : 'bg-cool-gray text-dark-gray'
                          }`}>
                            {currentStep >= 2 ? <FaCheck /> : '2'}
                          </div>
                          {currentStep < 4 && (
                            <div className={`absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-8 ${
                              currentStep >= 2 ? 'bg-maybelline-pink' : 'bg-cool-gray'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm font-medium font-sans ${
                            currentStep >= 2 ? 'text-black' : 'text-dark-gray'
                          }`}>
                            Processing
                          </span>
                          <p className="text-xs text-dark-gray mt-1 font-sans">Your order is being prepared</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                            currentStep >= 3 ? 'bg-maybelline-pink text-white' : 'bg-cool-gray text-dark-gray'
                          }`}>
                            {currentStep >= 3 ? <FaCheck /> : '3'}
                          </div>
                          {currentStep < 4 && (
                            <div className={`absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-8 ${
                              currentStep >= 3 ? 'bg-maybelline-pink' : 'bg-cool-gray'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm font-medium font-sans ${
                            currentStep >= 3 ? 'text-black' : 'text-dark-gray'
                          }`}>
                            Shipped
                          </span>
                          <p className="text-xs text-dark-gray mt-1 font-sans">Your order is on its way</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                            currentStep >= 4 ? 'bg-maybelline-pink text-white' : 'bg-cool-gray text-dark-gray'
                          }`}>
                            {currentStep >= 4 ? <FaCheck /> : '4'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm font-medium font-sans ${
                            currentStep >= 4 ? 'text-black' : 'text-dark-gray'
                          }`}>
                            Delivered
                          </span>
                          <p className="text-xs text-dark-gray mt-1 font-sans">Your order has been delivered</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-maybelline-pink rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-black">Order Placed</p>
                    <p className="text-sm text-dark-gray font-sans">{formatDate(order.createdAt)}</p>
                  </div>
                </div>

                {order.orderStatus !== 'pending' && (
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-maybelline-pink rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-black">Order Processing</p>
                      <p className="text-sm text-dark-gray font-sans">Your order is being prepared</p>
                    </div>
                  </div>
                )}

                {['shipped', 'delivered'].includes(order.orderStatus?.toLowerCase()) && (
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-maybelline-pink rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-black">Order Shipped</p>
                      <p className="text-sm text-dark-gray font-sans">Your order is on its way</p>
                    </div>
                  </div>
                )}

                {order.orderStatus === 'delivered' && (
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-maybelline-pink rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-black">Order Delivered</p>
                      <p className="text-sm text-dark-gray font-sans">Your order has been delivered</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card rounded-xl p-6">
              <h2 className="text-lg font-semibold text-black mb-4 font-heading">Order Items</h2>
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 card rounded-lg">
                    <img
                      src={item.mainImage}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg border border-cool-gray"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-black font-heading">{item.name}</h3>
                      <div className="text-sm text-dark-gray space-y-1 mt-1 font-sans">
                        {item.color && <p>Color: {item.color}</p>}
                        {item.size && (
                          <p>
                            {formatMeasureLine(item)}
                          </p>
                        )}
                        <p>Quantity: {item.quantity}</p>
                        <p className="font-medium text-black">
                          Price: {formatCurrency(item.price || 0)}
                        </p>
                        {item.discountApplied > 0 && (
                          <p className="text-maybelline-pink">
                            Discount: {formatCurrency(item.discountApplied)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black">
                        {formatCurrency((item.price - (item.discountApplied || 0)) * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {order.shipping && (
              <div className="card rounded-xl p-6">
                <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2 font-heading">
                  <FaTruck className="text-maybelline-pink" />
                  Shipping Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-dark-gray font-sans">Shipping Method</p>
                    <p className="text-black font-sans">{order.shipping.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark-gray font-sans">Estimated Delivery</p>
                    <p className="text-black font-sans">{order.shipping.estimatedDays} days</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark-gray font-sans">Shipping Cost</p>
                    <p className="text-black font-sans">{formatCurrency(order.shipping.charge)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card rounded-xl p-6">
              <h2 className="text-lg font-semibold text-black mb-4 font-heading">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-gray font-sans">Subtotal</span>
                  <span className="font-medium text-black">{formatCurrency(order.totalAmount)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-maybelline-pink">
                    <span className="font-sans">Discount</span>
                    <span className="font-medium">-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-dark-gray font-sans">Shipping</span>
                  <span className="font-medium text-black">{formatCurrency(order.shippingCost || 0)}</span>
                </div>
                {(order.extraFees || []).map((fee, idx) => (
                  <div key={fee.ruleId || idx} className="flex justify-between">
                    <span className="text-dark-gray font-sans">{fee.label}</span>
                    <span className="font-medium text-black">{formatCurrency(fee.amount || 0)}</span>
                  </div>
                ))}
                <div className="border-t border-cool-gray pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-black">Total</span>
                    <span className="text-maybelline-pink">{formatCurrency(order.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card rounded-xl p-6">
              <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2 font-heading">
                <FaMapMarkerAlt className="text-maybelline-pink" />
                Shipping Address
              </h2>
              <div className="space-y-2">
                <p className="font-medium text-black font-sans">{order.shippingAddress?.fullName}</p>
                <p className="text-dark-gray font-sans">{order.shippingAddress?.address}</p>
                <p className="text-dark-gray font-sans">
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
                </p>
                <p className="text-dark-gray font-sans">{order.shippingAddress?.country}</p>
                <p className="text-dark-gray flex items-center gap-2 font-sans">
                  <FaPhone className="text-sm" />
                  {order.shippingAddress?.phone}
                </p>
              </div>
            </div>

            <div className="card rounded-xl p-6">
              <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2 font-heading">
                <FaCreditCard className="text-maybelline-pink" />
                Payment Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-dark-gray font-sans">Payment Method</p>
                  <p className="text-black font-sans">{order.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-dark-gray font-sans">Payment Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-sans ${
                    order.paymentStatus === 'completed' ? 'text-maybelline-pink bg-pure-white border border-maybelline-pink' :
                    order.paymentStatus === 'pending' ? 'text-black bg-pure-white border border-cool-gray' :
                    'text-maybelline-pink bg-pure-white border border-maybelline-pink'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
                {order.paymentDetails && Object.keys(order.paymentDetails).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-dark-gray font-sans">Payment Details</p>
                    <div className="text-sm text-dark-gray space-y-1 font-sans">
                      {Object.entries(order.paymentDetails).map(([key, value]) => (
                        <p key={key}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {value}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card rounded-xl p-6">
              <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2 font-heading">
                <FaUndoAlt className="text-maybelline-pink" />
                Refund
              </h2>

              {order.refundStatus && order.refundStatus !== 'none' ? (
                <div className="space-y-3">
                  <RefundStatusTracker order={order} />
                  <div className="flex items-center justify-between gap-3">
                    {refundStatusChip(order)}
                    {order.refundProcessedAt && (
                      <span className="text-xs text-dark-gray font-sans">
                        {formatDate(order.refundProcessedAt)}
                      </span>
                    )}
                  </div>
                  {order.refundReason && (
                    <div>
                      <p className="text-sm font-medium text-black font-sans">Your Reason</p>
                      <p className="text-sm text-dark-gray font-sans">{order.refundReason}</p>
                    </div>
                  )}
                  {order.refundNote && (
                    <div>
                      <p className="text-sm font-medium text-black font-sans">Your Note</p>
                      <p className="text-sm text-dark-gray font-sans">{order.refundNote}</p>
                    </div>
                  )}
                  {order.refundImage && (
                    <div>
                      <p className="text-sm font-medium text-black font-sans">Photo</p>
                      <a href={order.refundImage} target="_blank" rel="noreferrer">
                        <img
                          src={order.refundImage}
                          alt="Refund evidence"
                          className="h-24 w-24 object-cover rounded-lg border border-cool-gray"
                        />
                      </a>
                    </div>
                  )}
                  {order.refundBkashNumber && (
                    <div>
                      <p className="text-sm font-medium text-black font-sans">bKash Number</p>
                      <p className="text-sm text-dark-gray font-sans">{order.refundBkashNumber}</p>
                    </div>
                  )}
                  {order.refundRequestedAt && (
                    <p className="text-xs text-dark-gray font-sans">
                      Requested: {formatDate(order.refundRequestedAt)}
                    </p>
                  )}
                  {order.refundStatus === 'pending' && (
                    <p className="text-sm text-dark-gray font-sans">
                      Your refund request is under review. We will notify you once it is processed.
                      Need help? Use the <span className="font-medium text-black">message</span> option (the chat button) to message our admins directly about your refund.
                    </p>
                  )}
                  {order.refundStatus === 'approved' && (
                    <p className="text-sm text-black font-sans">
                      {order.paymentStatus === 'refunded'
                        ? 'Your payment has been refunded.'
                        : 'Your refund has been approved.'}
                    </p>
                  )}
                  {order.refundStatus === 'rejected' && order.refundAdminNote && (
                    <div>
                      <p className="text-sm font-medium text-maybelline-pink font-sans">Admin Response</p>
                      <p className="text-sm text-dark-gray font-sans">{order.refundAdminNote}</p>
                    </div>
                  )}
                  {canRequestRefund(order) && (
                    <button
                      onClick={() => {
                        setRefundReason('');
                        setRefundNote('');
                        setRefundImage('');
                        setRefundBkash('');
                        setShowRefundModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pure-white text-black border border-cool-gray rounded-lg hover:border-maybelline-pink hover:text-maybelline-pink transition-colors font-sans"
                    >
                      <FaUndoAlt />
                      Request Refund Again
                    </button>
                  )}
                </div>
              ) : canRequestRefund(order) ? (
                <div className="space-y-3">
                  <p className="text-sm text-dark-gray font-sans">
                    If something is wrong with your order, you can request a refund. Our team will review your request.
                  </p>
                  <button
                    onClick={() => {
                      setRefundReason('');
                      setRefundNote('');
                      setRefundImage('');
                      setRefundBkash('');
                      setShowRefundModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pure-white text-black border border-cool-gray rounded-lg hover:border-maybelline-pink hover:text-maybelline-pink transition-colors font-sans"
                  >
                    <FaUndoAlt />
                    Request Refund
                  </button>
                </div>
              ) : (
                <p className="text-sm text-dark-gray font-sans">
                  {order.paymentStatus === 'refunded'
                    ? 'This order has already been refunded.'
                    : 'Refund is not available for this order.'}
                </p>
              )}
            </div>

            {order.orderStatus?.toLowerCase() === 'pending' && (
              <div className="card rounded-xl p-6">
                <h2 className="text-lg font-semibold text-black mb-4 font-heading">Actions</h2>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pure-white text-maybelline-pink border border-maybelline-pink rounded-lg hover:bg-pure-white hover:border-maybelline-pink disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
                >
                  {cancelLoading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <FaTrash />
                      Cancel Order
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black flex items-center gap-2 font-heading">
                <FaUndoAlt className="text-maybelline-pink" />
                Request Refund
              </h3>
              <button
                onClick={() => setShowRefundModal(false)}
                className="text-mid-gray hover:text-black"
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <p className="text-sm text-dark-gray mb-4 font-sans">
              Order <span className="font-medium text-black">#{order.orderId}</span>
              {' \u2014 '}
              {formatCurrency(order.grandTotal || order.totalAmount || 0)}
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
                onClick={() => setShowRefundModal(false)}
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

export default OrderDetails;
