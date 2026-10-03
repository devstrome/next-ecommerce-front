'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useEffect, useState, useContext, useRef } from 'react';
import Link from "next/link"
import { useRouter, useParams } from "next/navigation";
import { UserContext } from '../context/UserContext';
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
  FaSpinner
} from 'react-icons/fa';

function OrderDetails() {
  const { orderId } = useParams();
  const { user } = useContext(UserContext);
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const socketRef = useRef(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URI;
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URI || API_BASE;

  const formatCurrency = (amount, currency = 'BDT', locale = 'en-BD') => {
    if (typeof amount !== 'number') return 'BDT0.00';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `BDT${amount.toFixed(2)}`;
    }
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

              <div className="mb-6">
                <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium font-sans ${getStatusColor(order.orderStatus)}`}>
                  {getStatusIcon(order.orderStatus)}
                  <span className="capitalize">{order.orderStatus}</span>
                </span>
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
                            {item.measureType}: {item.size}
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
    </div>
  );
}

export default OrderDetails;
