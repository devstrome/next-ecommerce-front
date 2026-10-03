'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTruck, FaSearch, FaSync, FaExternalLinkAlt, FaBox, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

const STATUS_MAP = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: FaClock, label: 'Pending' },
  booked: { color: 'bg-blue-100 text-blue-800', icon: FaBox, label: 'Booked' },
  picked: { color: 'bg-indigo-100 text-indigo-800', icon: FaTruck, label: 'Picked' },
  in_transit: { color: 'bg-purple-100 text-purple-800', icon: FaTruck, label: 'In Transit' },
  delivered: { color: 'bg-green-100 text-green-800', icon: FaCheckCircle, label: 'Delivered' },
  returned: { color: 'bg-red-100 text-red-800', icon: FaTimesCircle, label: 'Returned' },
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

  const fetchShipments = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminAccessToken');
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterService) params.append('service', filterService);
      if (filterStatus) params.append('status', filterStatus);

      const res = await axios.get(`${API_URI}/api/courier/shipments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShipments(res.data.orders);
      setPagination({ page: res.data.page, totalPages: res.data.totalPages, total: res.data.total });
    } catch (err) {
      toast.error('Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShipments(); }, [filterService, filterStatus]);

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

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '-';

  return (
    <div className="min-h-screen bg-[#FAF8F6] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1B1B1B] flex items-center gap-2">
              <FaTruck className="text-[#B1123B]" /> Courier Shipments
            </h1>
            <p className="text-sm text-[#4A4A4A] mt-1">{pagination.total} total shipments</p>
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
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-3 py-2 border border-[#BDBDBD] rounded bg-white text-sm min-h-[44px]"
          >
            <option value="">All Services</option>
            <option value="pathao">Pathao</option>
            <option value="redex">RedEx</option>
            <option value="manual">Manual</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-[#BDBDBD] rounded bg-white text-sm min-h-[44px]"
          >
            <option value="">All Status</option>
            <option value="booked">Booked</option>
            <option value="picked">Picked</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
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
                      return (
                        <tr key={order._id} className="border-b border-[#F4F4F4] hover:bg-[#FAF8F6]">
                          <td className="px-4 py-3 text-sm font-mono text-[#1B1B1B]">{order.orderId}</td>
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
                            </div>
                          </td>
                        </tr>
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
                    <div className="flex gap-2 mt-2">
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
      </div>
    </div>
  );
}
