'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { FaTruck, FaSearch, FaSync, FaExternalLinkAlt, FaBox, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

const STATUS_MAP = {
  queued: { color: 'bg-gray-100 text-gray-700', icon: FaClock, label: 'Queued' },
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: FaClock, label: 'Pending' },
  booked: { color: 'bg-blue-100 text-blue-800', icon: FaBox, label: 'Booked' },
  picked: { color: 'bg-indigo-100 text-indigo-800', icon: FaTruck, label: 'Picked' },
  in_transit: { color: 'bg-purple-100 text-purple-800', icon: FaTruck, label: 'In Transit' },
  delivered: { color: 'bg-green-100 text-green-800', icon: FaCheckCircle, label: 'Delivered' },
  returned: { color: 'bg-red-100 text-red-800', icon: FaTimesCircle, label: 'Returned' },
  cancelled: { color: 'bg-gray-200 text-gray-600', icon: FaTimesCircle, label: 'Cancelled' },
  failed: { color: 'bg-red-100 text-red-800', icon: FaTimesCircle, label: 'Failed' },
};

export default function CourierTrackingPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [trackingModal, setTrackingModal] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [dispatchingId, setDispatchingId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Brands live on Product, so they arrive via items.productId population.
  // Falls back to the order-item name when a product has been deleted.
  const brandsOf = (order) => {
    const list = (order?.items || [])
      .map((it) => it.productId?.brand || it.brand)
      .filter(Boolean);
    return [...new Set(list)];
  };

  const fetchShipments = async (page = 1, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('adminAccessToken');
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterService) params.append('service', filterService);
      if (filterStatus) params.append('status', filterStatus);
      if (search.trim()) params.append('search', search.trim());

      const res = await axios.get(`${API_URI}/api/courier/shipments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShipments(res.data.orders);
      setPagination({ page: res.data.page, totalPages: res.data.totalPages, total: res.data.total });
      setLastUpdated(new Date());
    } catch (err) {
      if (!silent) toast.error('Failed to load shipments');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchShipments(); }, [filterService, filterStatus]);

  // Server-side search: debounce so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => fetchShipments(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Auto-refresh: poll the list + listen for webhook-pushed status updates so
  // statuses change on screen without a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => fetchShipments(pagination.page, { silent: true }), 20000);
    return () => clearInterval(interval);
  }, [pagination.page, filterService, filterStatus, search]);

  useEffect(() => {
    const token = localStorage.getItem('adminAccessToken');
    if (!token) return;
    const socket = io(API_URI, {
      withCredentials: true,
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 3,
    });
    const onUpdate = () => fetchShipments(pagination.page, { silent: true });
    socket.on('connect', () => socket.emit('joinAdminRoom'));
    socket.on('courierStatusUpdate', onUpdate);
    socket.on('admin:updateOrder', onUpdate);
    return () => {
      socket.off('courierStatusUpdate', onUpdate);
      socket.off('admin:updateOrder', onUpdate);
      socket.disconnect();
    };
  }, [pagination.page]);

  const handleTrack = async (order) => {
    setTrackingModal(order);
    setTrackingData(null);
    setTrackingLoading(true);
    try {
      const token = localStorage.getItem('adminAccessToken');
      const res = await axios.get(`${API_URI}/api/courier/track/${order.orderId || order._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrackingData(res.data.tracking);
      // track returns the order too (items populated with brand) — refresh the
      // modal so brands show up even if the list was fetched before population.
      if (res.data.order) setTrackingModal(res.data.order);
    } catch (err) {
      toast.error('Failed to track shipment');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('adminAccessToken');
      await axios.put(`${API_URI}/api/courier/status/${orderId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Status updated');
      fetchShipments(pagination.page);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Stage 2: send a queued shipment to the actual courier API
  const handleDispatch = async (order) => {
    const service = order.courier?.service;
    if (!service || service === 'manual') {
      toast.info('Manual shipments are not sent to any courier API');
      return;
    }
    if (!window.confirm(`Dispatch order ${order.orderId} to the ${service.toUpperCase()} API now?`)) return;
    setDispatchingId(order._id);
    try {
      const token = localStorage.getItem('adminAccessToken');
      const res = await axios.post(
        `${API_URI}/api/courier/shipments/${order._id}/dispatch`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        const c = res.data.courier || {};
        toast.success(`Dispatched via ${service}${c.trackingNumber ? ` — Tracking: ${c.trackingNumber}` : ''}`);
        fetchShipments(pagination.page);
      } else {
        toast.error(res.data.message || 'Failed to dispatch');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch to courier API');
    } finally {
      setDispatchingId(null);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '-';

  // Cancel at the courier (Pathao) or mark cancelled locally (Steadfast)
  const handleCancel = async (order) => {
    const c = order.courier || {};
    const dispatched = !!c.consignmentId;
    const msg = dispatched
      ? `Cancel order ${order.orderId} with ${String(c.service || '').toUpperCase()}?\n\nConsignment ${c.consignmentId} will be cancelled at the courier.`
      : `Cancel the shipment for order ${order.orderId}?`;
    if (!window.confirm(msg)) return;
    setDispatchingId(order._id);
    try {
      const token = localStorage.getItem('adminAccessToken');
      const res = await axios.post(`${API_URI}/api/courier/shipments/${order._id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast[res.data.courierCancelled ? 'success' : 'warning'](res.data.message);
        fetchShipments(pagination.page);
      } else {
        toast.error(res.data.message || 'Failed to cancel');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel shipment');
    } finally {
      setDispatchingId(null);
    }
  };

  const openEdit = (order) => {
    const a = order.shippingAddress || {};
    setEditModal(order);
    setEditForm({
      fullName: a.fullName || '', phone: a.phone || '', address: a.address || '',
      city: a.city || '', postalCode: a.postalCode || '', state: a.state || '', country: a.country || '',
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminAccessToken');
      const res = await axios.put(`${API_URI}/api/courier/shipments/${editModal._id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success(res.data.changed?.length ? 'Details updated' : 'No changes to save');
        setEditModal(null);
        fetchShipments(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (order) => {
    const c = order.courier;
    const alreadySent = c?.consignmentId || c?.status === 'booked';
    const msg = alreadySent
      ? `Remove order ${order.orderId} from this list?\n\nIt was already sent to ${c.service.toUpperCase()} (consignment ${c.consignmentId || c.trackingNumber}). This only clears it here — void the consignment in the courier dashboard separately.`
      : `Remove order ${order.orderId} from the courier list?`;
    if (!window.confirm(msg)) return;
    setDispatchingId(order._id);
    try {
      const token = localStorage.getItem('adminAccessToken');
      const res = await axios.delete(`${API_URI}/api/courier/shipments/${order._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.message || 'Shipment removed');
      fetchShipments(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove shipment');
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1B1B1B] flex items-center gap-2">
              <FaTruck className="text-[#B1123B]" /> Courier Shipments
            </h1>
            <p className="text-sm text-[#4A4A4A] mt-1">
              {pagination.total} total shipments
              <span className="ml-2 inline-flex items-center gap-1 text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live
              </span>
              {lastUpdated && (
                <span className="ml-2 text-[#BDBDBD]">
                  · updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchShipments(pagination.page)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B1B1B] text-white rounded hover:bg-[#4A4A4A] transition min-h-[44px]"
          >
            <FaSync /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BDBDBD]" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, tracking, customer, phone, product, brand…"
              className="w-full pl-9 pr-3 py-2 border border-[#BDBDBD] rounded bg-white text-sm min-h-[44px]"
            />
          </div>
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-3 py-2 border border-[#BDBDBD] rounded bg-white text-sm min-h-[44px]"
          >
            <option value="">All Services</option>
            <option value="pathao">Pathao</option>
            <option value="steadfast">Steadfast</option>
            <option value="manual">Manual</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-[#BDBDBD] rounded bg-white text-sm min-h-[44px]"
          >
            <option value="">All Status</option>
            <option value="queued">Queued</option>
            <option value="booked">Booked</option>
            <option value="picked">Picked</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Shipments Table */}
        {loading ? (
          <div className="text-center py-12 text-[#4A4A4A]">Loading shipments...</div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-[#F4F4F4]">
            <FaTruck className="mx-auto text-3xl text-[#BDBDBD] mb-3" />
            <p className="text-[#4A4A4A]">No shipments found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl border border-[#F4F4F4] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FAF8F6] border-b border-[#F4F4F4]">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#4A4A4A]">Order ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#4A4A4A]">Brand</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#4A4A4A]">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#4A4A4A]">Service</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#4A4A4A]">Tracking</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#4A4A4A]">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#4A4A4A]">Booked</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#4A4A4A]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((order) => {
                      const st = STATUS_MAP[order.courier?.status] || STATUS_MAP.pending;
                      const StatusIcon = st.icon;
                      const dispatchError = order.courier?.status === 'failed' && order.courier?.lastError;
                      return (
                        <React.Fragment key={order._id}>
                        <tr className="border-b border-[#F4F4F4] hover:bg-[#FAF8F6]">
                          <td className="px-4 py-3 text-sm font-mono text-[#1B1B1B]">{order.orderId}</td>
                          <td className="px-4 py-3 text-xs">
                            {brandsOf(order).length ? (
                              <div className="flex flex-wrap gap-1">
                                {brandsOf(order).map((b) => (
                                  <span key={b} className="px-2 py-0.5 rounded bg-[#FDF2F5] text-[#B1123B] font-semibold border border-[#F3C6D3]">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#BDBDBD]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#1B1B1B]">
                            <div>{order.shippingAddress?.fullName}</div>
                            <div className="text-xs text-[#4A4A4A]">{order.shippingAddress?.phone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                              order.courier?.service === 'pathao' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {order.courier?.service}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-[#4A4A4A]">
                            {order.courier?.trackingNumber || order.courier?.consignmentId || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 w-fit ${st.color}`}>
                              <StatusIcon size={12} /> {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#4A4A4A]">{formatDate(order.courier?.bookedAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {(order.courier?.status === 'queued' || order.courier?.status === 'failed') && (
                                <button
                                  onClick={() => handleDispatch(order)}
                                  disabled={dispatchingId === order._id}
                                  className="text-xs px-2 py-1 bg-[#B1123B] text-white rounded hover:bg-[#1B1B1B] disabled:opacity-50 transition"
                                >
                                  {dispatchingId === order._id ? 'Sending…' : (order.courier?.status === 'failed' ? 'Retry Dispatch' : 'Send to API')}
                                </button>
                              )}
                              <button
                                onClick={() => handleTrack(order)}
                                className="text-xs px-2 py-1 bg-[#1B1B1B] text-white rounded hover:bg-[#B1123B] transition"
                              >
                                Track
                              </button>
                              {order.courier?.status === 'booked' && (
                                <button
                                  onClick={() => handleUpdateStatus(order._id, 'picked')}
                                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                >
                                  Mark Picked
                                </button>
                              )}
                              {order.courier?.status === 'picked' && (
                                <button
                                  onClick={() => handleUpdateStatus(order._id, 'in_transit')}
                                  className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                                >
                                  In Transit
                                </button>
                              )}
                              {order.courier?.status === 'in_transit' && (
                                <button
                                  onClick={() => handleUpdateStatus(order._id, 'delivered')}
                                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                >
                                  Delivered
                                </button>
                              )}
                              {order.courier?.status !== 'delivered' && order.courier?.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleCancel(order)}
                                  disabled={dispatchingId === order._id}
                                  className="text-xs px-2 py-1 bg-white border border-orange-400 text-orange-600 rounded hover:bg-orange-50 disabled:opacity-50 transition"
                                >
                                  {dispatchingId === order._id ? 'Cancelling…' : 'Cancel'}
                                </button>
                              )}
                              <button
                                onClick={() => openEdit(order)}
                                className="text-xs px-2 py-1 bg-white border border-[#BDBDBD] text-[#1B1B1B] rounded hover:bg-[#FAF8F6] transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(order)}
                                disabled={dispatchingId === order._id}
                                className="text-xs px-2 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 transition"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        {dispatchError && (
                          <tr className="bg-red-50 border-b border-[#F4F4F4]">
                            <td colSpan={8} className="px-4 py-2 text-xs text-red-700">
                              <span className="font-semibold">Dispatch failed:</span> {order.courier.lastError}
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {shipments.map((order) => {
                const st = STATUS_MAP[order.courier?.status] || STATUS_MAP.pending;
                const StatusIcon = st.icon;
                return (
                  <div key={order._id} className="bg-white rounded-xl border border-[#F4F4F4] p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-mono text-sm font-bold text-[#1B1B1B]">{order.orderId}</div>
                        <div className="text-xs text-[#4A4A4A]">{order.shippingAddress?.fullName} - {order.shippingAddress?.phone}</div>
                        {brandsOf(order).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {brandsOf(order).map((b) => (
                              <span key={b} className="px-2 py-0.5 rounded bg-[#FDF2F5] text-[#B1123B] text-[10px] font-semibold border border-[#F3C6D3]">
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${st.color}`}>
                        <StatusIcon size={12} /> {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                        order.courier?.service === 'pathao' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {order.courier?.service}
                      </span>
                      <span className="text-xs font-mono text-[#4A4A4A]">
                        {order.courier?.trackingNumber || order.courier?.consignmentId}
                      </span>
                    </div>
                    {order.courier?.status === 'failed' && order.courier?.lastError && (
                      <div className="mt-2 mb-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                        <span className="font-semibold">Dispatch failed:</span> {order.courier.lastError}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      {(order.courier?.status === 'queued' || order.courier?.status === 'failed') && (
                        <button
                          onClick={() => handleDispatch(order)}
                          disabled={dispatchingId === order._id}
                          className="flex-1 text-xs py-2 bg-[#B1123B] text-white rounded disabled:opacity-50"
                        >
                          {dispatchingId === order._id ? 'Sending…' : (order.courier?.status === 'failed' ? 'Retry Dispatch' : 'Send to API')}
                        </button>
                      )}
                      <button onClick={() => handleTrack(order)} className="flex-1 text-xs py-2 bg-[#1B1B1B] text-white rounded hover:bg-[#B1123B]">
                        Track Live
                      </button>
                      {order.courier?.status === 'booked' && (
                        <button onClick={() => handleUpdateStatus(order._id, 'picked')} className="flex-1 text-xs py-2 bg-blue-600 text-white rounded">
                          Mark Picked
                        </button>
                      )}
                      {order.courier?.status === 'picked' && (
                        <button onClick={() => handleUpdateStatus(order._id, 'in_transit')} className="flex-1 text-xs py-2 bg-purple-600 text-white rounded">
                          In Transit
                        </button>
                      )}
                      {order.courier?.status === 'in_transit' && (
                        <button onClick={() => handleUpdateStatus(order._id, 'delivered')} className="flex-1 text-xs py-2 bg-green-600 text-white rounded">
                          Delivered
                        </button>
                      )}
                      {order.courier?.status !== 'delivered' && order.courier?.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancel(order)}
                          disabled={dispatchingId === order._id}
                          className="flex-1 text-xs py-2 bg-white border border-orange-400 text-orange-600 rounded disabled:opacity-50"
                        >
                          {dispatchingId === order._id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                      <button onClick={() => openEdit(order)} className="flex-1 text-xs py-2 bg-white border border-[#BDBDBD] text-[#1B1B1B] rounded">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(order)}
                        disabled={dispatchingId === order._id}
                        className="flex-1 text-xs py-2 bg-white border border-red-300 text-red-600 rounded disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => fetchShipments(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-[#BDBDBD] rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-[#4A4A4A]">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchShipments(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-[#BDBDBD] rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Tracking Modal */}
        {trackingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#F4F4F4] sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[#1B1B1B]">Live Tracking</h2>
                    <p className="text-sm text-[#4A4A4A]">Order: {trackingModal.orderId}</p>
                  </div>
                  <button onClick={() => setTrackingModal(null)} className="text-[#BDBDBD] hover:text-[#4A4A4A] text-xl">
                    &times;
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-[#FAF8F6] rounded-lg p-3">
                    <div className="text-xs text-[#4A4A4A]">Service</div>
                    <div className="font-bold text-[#1B1B1B] uppercase">{trackingModal.courier?.service}</div>
                  </div>
                  <div className="bg-[#FAF8F6] rounded-lg p-3">
                    <div className="text-xs text-[#4A4A4A]">Tracking Number</div>
                    <div className="font-bold text-[#1B1B1B] font-mono">{trackingModal.courier?.trackingNumber || trackingModal.courier?.consignmentId}</div>
                  </div>
                  <div className="bg-[#FAF8F6] rounded-lg p-3">
                    <div className="text-xs text-[#4A4A4A]">Status</div>
                    <div className={`font-bold text-sm ${(STATUS_MAP[trackingModal.courier?.status] || STATUS_MAP.pending).color} px-2 py-1 rounded inline-block mt-1`}>
                      {(STATUS_MAP[trackingModal.courier?.status] || STATUS_MAP.pending).label}
                    </div>
                  </div>
                  <div className="bg-[#FAF8F6] rounded-lg p-3">
                    <div className="text-xs text-[#4A4A4A]">Booked At</div>
                    <div className="text-sm text-[#1B1B1B]">{formatDate(trackingModal.courier?.bookedAt)}</div>
                  </div>
                </div>

                {(trackingModal.items || []).length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-[#1B1B1B] mb-2 text-sm">Items &amp; Brands</h3>
                    <div className="space-y-2">
                      {trackingModal.items.map((it, idx) => {
                        const brand = it.productId?.brand || it.brand;
                        return (
                          <div key={idx} className="flex items-center gap-3 bg-[#FAF8F6] rounded-lg p-2">
                            {(it.mainImage || it.productId?.imageUrl) && (
                              <img
                                src={it.mainImage || it.productId.imageUrl}
                                alt={it.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-[#1B1B1B] truncate">{it.name}</div>
                              <div className="text-xs text-[#4A4A4A]">Qty {it.quantity}</div>
                            </div>
                            {brand ? (
                              <span className="px-2 py-1 rounded bg-[#FDF2F5] text-[#B1123B] text-xs font-semibold border border-[#F3C6D3]">
                                {brand}
                              </span>
                            ) : (
                              <span className="text-xs text-[#BDBDBD]">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {brandsOf(trackingModal).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {brandsOf(trackingModal).map((b) => (
                          <span key={b} className="px-2 py-0.5 rounded bg-[#FDF2F5] text-[#B1123B] text-xs font-semibold border border-[#F3C6D3]">
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {trackingLoading ? (
                  <div className="text-center py-8 text-[#4A4A4A]">Fetching live tracking data...</div>
                ) : trackingData ? (
                  <div className="bg-[#FAF8F6] rounded-lg p-4">
                    <h3 className="font-semibold text-[#1B1B1B] mb-3">Courier API Response</h3>
                    <pre className="text-xs text-[#4A4A4A] whitespace-pre-wrap bg-white p-3 rounded border border-[#F4F4F4] max-h-60 overflow-y-auto">
                      {JSON.stringify(trackingData, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#BDBDBD]">No tracking data available</div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Edit Recipient Modal */}
        {editModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#F4F4F4] sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[#1B1B1B]">Edit Recipient</h2>
                    <p className="text-sm text-[#4A4A4A]">Order: {editModal.orderId}</p>
                  </div>
                  <button onClick={() => setEditModal(null)} className="text-[#BDBDBD] hover:text-[#4A4A4A] text-xl">
                    &times;
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-[#4A4A4A] mb-1">Full Name</label>
                  <input
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-[#BDBDBD] rounded text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#4A4A4A] mb-1">Phone</label>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#BDBDBD] rounded text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#4A4A4A] mb-1">Address</label>
                  <textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#BDBDBD] rounded text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#4A4A4A] mb-1">City</label>
                    <input
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-[#BDBDBD] rounded text-sm min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4A4A4A] mb-1">Postal Code</label>
                    <input
                      value={editForm.postalCode}
                      onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-[#BDBDBD] rounded text-sm min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4A4A4A] mb-1">State / Division</label>
                    <input
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      className="w-full px-3 py-2 border border-[#BDBDBD] rounded text-sm min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4A4A4A] mb-1">Country</label>
                    <input
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      className="w-full px-3 py-2 border border-[#BDBDBD] rounded text-sm min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-[#B1123B] text-white rounded text-sm hover:bg-[#1B1B1B] disabled:opacity-50 min-h-[44px]"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditModal(null)}
                    className="px-6 py-2.5 border border-[#BDBDBD] rounded text-sm hover:bg-[#FAF8F6] min-h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-[#4A4A4A]">
                  Saved details are used the next time this order is sent to a courier API.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
