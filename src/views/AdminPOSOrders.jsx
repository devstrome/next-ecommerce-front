'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaSearch, 
  FaEye, 
  FaPrint, 
  FaUndo, 
  FaFilter, 
  FaDownload,
  FaCalendarAlt,
  FaStore,
  FaUser,
  FaMoneyBillWave,
  FaCreditCard,
  FaMobileAlt,
  FaUniversity,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaArrowLeft,
  FaReceipt,
  FaHistory,
  FaClipboardList,
  FaTruck,
  FaBox,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import { useRouter } from "next/navigation";
import { useAdmin } from '../context/AdminContext';
import { BRAND, formatBDT } from '../config/brand';
import { formatMeasureLine } from '../lib/measure';
import { printThermalReceipt } from '../lib/print/thermal';
import { buildA4Document } from '../lib/print/a4';
import { printDocument } from '../lib/print';

const AdminPOSOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    outlet: '',
    dateFrom: '',
    dateTo: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [refundData, setRefundData] = useState({
    refundAmount: 0,
    reason: ''
  });
  const [stats, setStats] = useState({});
  
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAdmin();

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
      toast.error('Please log in as admin to access POS orders');
      router.push('/admin');
      return;
    }
    
    if (isAuthenticated) {
      fetchOrders();
      fetchStats();
    }
  }, [pagination.page, filters, isAuthenticated, authLoading]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/orders?${params}`
      });
      setOrders(response.data.posOrders);
      setPagination({
        ...pagination,
        total: response.data.total,
        totalPages: response.data.totalPages
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

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

  const viewOrder = async (orderId) => {
    try {
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/orders/${orderId}`
      });
      setSelectedOrder(response.data.posOrder);
      setShowOrderModal(true);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Error fetching order details');
    }
  };

  const printReceipt = async (orderId) => {
    try {
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/orders/${orderId}/receipt`
      });
      const receipt = response.data.receipt;

      // Single shared thermal template (58/80mm) — same as the POS screen
      const width = Number(getStorage('posPaperWidth')) || 80;
      const ok = printThermalReceipt(receipt, { width });
      if (!ok) {
        toast.error('Print window blocked - allow popups for this site');
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Error printing receipt');
    }
  };

  const printInvoice = async (orderId) => {
    try {
      const response = await makeAuthenticatedRequest({
        method: 'GET',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/orders/${orderId}`
      });
      const order = response.data.posOrder;

      const origin = window.location.origin;
      const fetchImg = async (path) => {
        try {
          const res = await fetch(`${origin}${path}`);
          const blob = await res.blob();
          return await new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result); reader.readAsDataURL(blob); });
        } catch { return ''; }
      };
      const [logoDataURI, signDataURI, sealDataURI] = await Promise.all([
        fetchImg('/logo.png'), fetchImg('/sign.png'), fetchImg('/seal.png')
      ]);

      const itemRows = order.items.map(item => {
        const v = item.variantInfo || {};
        const details = [formatMeasureLine(v), v.color, item.scannedBarcode ? `BC: ${item.scannedBarcode}` : '']
          .filter(Boolean).join(' &bull; ');
        return `
        <tr>
          <td style="padding:10px 12px;font-weight:600;color:#1a1a1a">${item.productName || 'Product'}</td>
          <td style="padding:10px 12px;color:#666;font-size:12px">${details}</td>
          <td style="padding:10px 12px;text-align:right">${formatBDT(item.unitPrice)}</td>
          <td style="padding:10px 12px;text-align:center">${item.quantity}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:600">${formatBDT(item.totalPrice)}</td>
        </tr>`;
      }).join('');

      const generatedDate = new Date().toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' });

      const invoiceHeader = `
        <div class="inv-header">
          ${logoDataURI ? `<img src="${logoDataURI}" alt="${BRAND.NAME}" style="height:56px;object-fit:contain" />` : ''}
          <div class="brand">${BRAND.NAME}</div>
          <div class="sub">${BRAND.TAGLINE}</div>
        </div>`;

      const bodyHtml = `
        <div class="titlebar">
          <div>
            <div class="inv-title">POS INVOICE &mdash; #${order.orderNumber}</div>
            <div style="font-size:12px;color:#666">In-Store Purchase</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px">Generated</div>
            <div style="font-size:12px;color:#333">${generatedDate}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="info-label">Customer</div>
            <div style="font-size:13px;font-weight:600;color:#1a1a1a">${order.customer?.name || 'Walk-in'}</div>
            <div style="font-size:12px;color:#666">${order.customer?.phone || ''}</div>
            <div style="font-size:11px;color:#888">${order.customer?.email || ''}</div>
            <div style="font-size:11px;color:#888">${order.customer?.address || ''}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Order Info</div>
            <div style="font-size:12px;color:#333"><strong>Order:</strong> #${order.orderNumber}</div>
            <div style="font-size:12px;color:#333"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString('en-BD')}</div>
            <div style="font-size:12px;color:#333"><strong>Outlet:</strong> ${order.outlet || 'Main Outlet'}</div>
            <div style="font-size:12px;color:#333"><strong>Cashier:</strong> ${order.cashier ? (order.cashier.firstName || '') + ' ' + (order.cashier.lastName || '') : 'N/A'}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Payment</div>
            <div style="font-size:12px;color:#333"><strong>Method:</strong> ${(order.paymentMethod || 'N/A').toUpperCase()}</div>
            <div style="font-size:12px;color:#333"><strong>Status:</strong> <span style="color:#16A34A;font-weight:600">PAID</span></div>
            <div style="font-size:12px;color:#333"><strong>Order Status:</strong> ${(order.orderStatus || 'completed').toUpperCase()}</div>
            ${order.notes ? `<div style="font-size:11px;color:#666;margin-top:4px"><strong>Notes:</strong> ${order.notes}</div>` : ''}
          </div>
        </div>

        <table class="inv-table">
          <thead>
            <tr><th>Product</th><th>Details</th><th style="text-align:right">Price</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <div class="totals-wrap">
          <div class="totals-inner">
            <div class="totals-line"><span>Subtotal</span><span>${formatBDT(order.subtotal)}</span></div>
            <div class="totals-line"><span>Tax</span><span>${formatBDT(order.tax)}</span></div>
            <div class="totals-line"><span>Discount</span><span>${order.discount > 0 ? '-' + formatBDT(order.discount) : formatBDT(0)}</span></div>
            <div class="totals-grand"><span>TOTAL</span><span>${formatBDT(order.total)}</span></div>
            <div style="text-align:right;font-size:12px;color:#666">Paid via ${(order.paymentMethod || '').toUpperCase()}</div>
          </div>
        </div>

        <div class="auth-section">
          <div class="auth-box">
            ${signDataURI ? `<img src="${signDataURI}" alt="Signature" />` : `<div style="height:80px"></div>`}
            <div class="line"></div>
            <div class="label">Authorized Signature</div>
          </div>
          <div class="auth-box">
            ${sealDataURI ? `<img src="${sealDataURI}" alt="Seal" style="max-height:90px" />` : `<div style="height:90px"></div>`}
            <div class="label">Company Seal</div>
          </div>
          <div class="auth-box">
            <div style="padding-top:30px">
              <div class="line"></div>
              <div class="label">Date: ${generatedDate}</div>
            </div>
          </div>
        </div>`;

      const html = buildA4Document({
        title: `POS Invoice #${order.orderNumber}`,
        header: invoiceHeader,
        bodyHtml,
        pageHeader: `${BRAND.NAME} - POS Invoice #${order.orderNumber}`,
        pageFooter: BRAND.NAME,
        extraCss: `
          .inv-header { background: linear-gradient(135deg,#DC143C 0%,#9F123C 100%); padding: 16px 24px; border-radius: 6px; text-align: center; }
          .inv-header .brand { font-size: 26px; font-weight: 800; letter-spacing: 8px; color: white; text-transform: uppercase; margin: 6px 0 2px; }
          .inv-header .sub { font-size: 10px; letter-spacing: 3px; color: rgba(255,255,255,0.8); text-transform: uppercase; }
          .titlebar { background: #FFF1F2; padding: 12px 16px; border-bottom: 2px solid #FECDD3; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6mm; }
          .inv-title { font-size: 17px; font-weight: 700; color: #DC143C; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 6mm; }
          .info-card { background: #FFF8FA; border: 1px solid #FECDD3; border-radius: 8px; padding: 14px; break-inside: avoid; }
          .info-label { font-size: 9px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          table.inv-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 6mm; }
          table.inv-table th, table.inv-table td { border-bottom: 1px solid #eee; }
          table.inv-table th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #FECDD3; color: #DC143C; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; background: #FFF1F2; }
          table.inv-table tr { break-inside: avoid; }
          .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 4mm; }
          .totals-inner { width: 300px; }
          .totals-line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; color: #666; }
          .totals-grand { display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: 800; color: #DC143C; border-top: 2px solid #DC143C; margin-top: 4px; }
          .auth-section { padding-top: 6mm; border-top: 1px solid #FECDD3; display: flex; justify-content: space-between; align-items: flex-end; break-inside: avoid; }
          .auth-box { text-align: center; }
          .auth-box img { max-height: 80px; object-fit: contain; }
          .auth-box .label { font-size: 9px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          .auth-box .line { width: 140px; border-bottom: 1px solid #ccc; margin: 0 auto 6px; }
        `
      });

      if (!printDocument(html)) {
        toast.error('Print window blocked - allow popups for this site');
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Error printing invoice');
    }
  };

  const emailInvoice = async (orderId) => {
    try {
      await makeAuthenticatedRequest({
        method: 'POST',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/orders/${orderId}/invoice-email`
      });
      toast.success('Invoice sent to customer email');
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast.error(error.response?.data?.message || 'Error sending invoice email');
    }
  };

  const refundOrder = async () => {
    if (!selectedOrder) return;

    try {
              await makeAuthenticatedRequest({
          method: 'POST',
          url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/orders/${selectedOrder._id}/refund`,
          data: refundData
        });
      toast.success('Order refunded successfully');
      setShowRefundModal(false);
      setRefundData({ refundAmount: 0, reason: '' });
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error refunding order:', error);
      toast.error(error.response?.data?.message || 'Error refunding order');
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      await makeAuthenticatedRequest({
        method: 'DELETE',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/orders/${orderId}`
      });
      toast.success('Order deleted successfully');
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(error.response?.data?.message || 'Error deleting order');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await makeAuthenticatedRequest({
        method: 'PUT',
        url: `${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/pos/orders/${orderId}/status`,
        data: { orderStatus: status }
      });
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error updating order status');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-[#1B1B1B] text-white', icon: FaSpinner },
      processing: { color: 'bg-[#4A4A4A] text-white', icon: FaSpinner },
      completed: { color: 'bg-green-100 text-green-800', icon: FaCheck },
      cancelled: { color: 'bg-red-100 text-red-800', icon: FaTimes },
      refunded: { color: 'bg-[#F4F4F4] text-[#4A4A4A]', icon: FaUndo }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      cash: FaMoneyBillWave,
      card: FaCreditCard,
      mobile_payment: FaMobileAlt,
      bank_transfer: FaUniversity
    };
    const Icon = icons[method] || FaMoneyBillWave;
    return <Icon className="w-4 h-4" />;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#FAF8F6] p-4 sm:p-6">
      {/* Header */}
      <div className="w-full max-w-7xl mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center text-[#4A4A4A] hover:text-[#1B1B1B] transition min-h-[44px]"
            aria-label="Go Back"
          >
            <FaArrowLeft className="text-2xl" />
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>POS Orders</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/admin/dashboard/pos')}
            className="flex items-center bg-[#1B1B1B] text-white px-4 py-2 hover:bg-[#4A4A4A] transition min-h-[44px]"
          >
            <FaReceipt className="mr-2" />
            New POS Order
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="w-full max-w-7xl mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#BDBDBD] p-6 hover:bg-[#F4F4F4] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Today's Sales</p>
                <p className="text-2xl font-bold text-green-600">{formatBDT(stats.todaySales || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
                <FaMoneyBillWave className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#BDBDBD] p-6 hover:bg-[#F4F4F4] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Today's Orders</p>
                <p className="text-2xl font-bold text-[#1B1B1B]">{stats.todayOrders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-[#F4F4F4] flex items-center justify-center">
                <FaReceipt className="text-[#1B1B1B] text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#BDBDBD] p-6 hover:bg-[#F4F4F4] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Completed Orders</p>
                <p className="text-2xl font-bold text-[#1B1B1B]">{stats.completedOrders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-[#F4F4F4] flex items-center justify-center">
                <FaCheck className="text-[#1B1B1B] text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#BDBDBD] p-6 hover:bg-[#F4F4F4] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{stats.lowStockItems?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 flex items-center justify-center">
                <FaExclamationTriangle className="text-red-600 text-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="w-full max-w-7xl mb-8">
        <div className="bg-white border border-[#BDBDBD] p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-[#1B1B1B]">
            <FaFilter className="mr-2 text-[#B1123B]" />
            Filter Orders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Search</label>
                             <input
                 type="text"
                 placeholder="Search orders..."
                 value={filters.search}
                 onChange={(e) => handleFilterChange('search', e.target.value)}
                 className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
               />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Status</label>
                             <select
                 value={filters.status}
                 onChange={(e) => handleFilterChange('status', e.target.value)}
                 className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
               >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Outlet</label>
                             <input
                 type="text"
                 placeholder="Outlet"
                 value={filters.outlet}
                 onChange={(e) => handleFilterChange('outlet', e.target.value)}
                 className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
               />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Date From</label>
                             <input
                 type="date"
                 value={filters.dateFrom}
                 onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                 className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
               />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Date To</label>
                             <input
                 type="date"
                 value={filters.dateTo}
                 onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                 className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
               />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ search: '', status: '', outlet: '', dateFrom: '', dateTo: '' });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full px-4 py-2 bg-[#F4F4F4] text-[#1B1B1B] hover:bg-[#E8E8E8] transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="w-full max-w-7xl">
        <div className="bg-white border border-[#BDBDBD] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-12 w-12 border-b-2 border-[#B1123B] mx-auto mb-4"></div>
              <p className="text-[#4A4A4A]">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <FaBox className="text-[#BDBDBD] text-4xl mx-auto mb-4" />
              <p className="text-[#4A4A4A]">No orders found</p>
            </div>
          ) : (
            <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full bg-white border border-[#BDBDBD]">
                <thead>
                  <tr className="bg-[#F4F4F4]">
                    <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Order</th>
                    <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Customer</th>
                    <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Items</th>
                    <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Total</th>
                    <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Payment</th>
                    <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Status</th>
                    <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Date</th>
                    <th className="py-3 px-4 border-b border-[#BDBDBD] text-center font-semibold text-[#1B1B1B]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-[#F4F4F4] border-b border-[#BDBDBD]">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-[#1B1B1B]">{order.orderNumber}</p>
                          <p className="text-sm text-[#4A4A4A]">{order.outlet}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-[#1B1B1B]">{order.customer.name}</p>
                          <p className="text-sm text-[#4A4A4A]">{order.customer.phone}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-[#1B1B1B]">{order.items.length} items</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-[#1B1B1B]">{formatBDT(order.total)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getPaymentMethodIcon(order.paymentMethod)}
                          <span className="ml-2 text-sm text-[#1B1B1B]">
                            {order.paymentMethod.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(order.orderStatus)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#4A4A4A]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex space-x-2 justify-center">
                          <button
                            onClick={() => viewOrder(order._id)}
                            className="text-[#1B1B1B] hover:text-[#B1123B] p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="View Order"
                          >
                            <FaEye size={16} />
                          </button>
                          <button
                            onClick={() => printReceipt(order._id)}
                            className="text-green-600 hover:text-green-900 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Print Receipt"
                          >
                            <FaPrint size={16} />
                          </button>
                          <button
                            onClick={() => printInvoice(order._id)}
                            className="text-blue-600 hover:text-blue-900 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Print Invoice"
                          >
                            <FaDownload size={16} />
                          </button>
                          {order.customer?.email && (
                            <button
                              onClick={() => emailInvoice(order._id)}
                              className="text-purple-600 hover:text-purple-900 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Email Invoice"
                            >
                              <FaClipboardList size={16} />
                            </button>
                          )}
                          {order.orderStatus === 'completed' && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setRefundData({ refundAmount: order.total, reason: '' });
                                setShowRefundModal(true);
                              }}
                              className="text-red-600 hover:text-red-900 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Refund Order"
                            >
                              <FaUndo size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteOrder(order._id)}
                            className="text-red-600 hover:text-red-900 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Delete Order"
                          >
                            <FaTimes size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3 p-4">
              {orders.map((order) => (
                <div key={order._id} className="bg-white border border-[#BDBDBD] p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-[#1B1B1B]">{order.orderNumber}</p>
                      <p className="text-sm text-[#4A4A4A]">{order.outlet}</p>
                    </div>
                    {getStatusBadge(order.orderStatus)}
                  </div>
                  <div className="text-sm text-[#4A4A4A] mb-2">
                    <div>{order.customer.name} • {order.customer.phone}</div>
                    <div>{order.items.length} items • {formatBDT(order.total)}</div>
                    <div className="flex items-center mt-1">
                      {getPaymentMethodIcon(order.paymentMethod)}
                      <span className="ml-2">{order.paymentMethod.replace('_', ' ').toUpperCase()}</span>
                      <span className="ml-2">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => viewOrder(order._id)}
                      className="flex items-center bg-[#1B1B1B] text-white px-3 py-2 rounded text-sm hover:bg-[#4A4A4A] transition min-h-[44px] min-w-[44px]"
                      title="View Order"
                    >
                      <FaEye size={14} className="mr-1" /> View
                    </button>
                    <button
                      onClick={() => printReceipt(order._id)}
                      className="flex items-center bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition min-h-[44px] min-w-[44px]"
                      title="Print Receipt"
                    >
                      <FaPrint size={14} className="mr-1" /> Print
                    </button>
                    <button
                      onClick={() => printInvoice(order._id)}
                      className="flex items-center bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition min-h-[44px] min-w-[44px]"
                      title="Print Invoice"
                    >
                      <FaDownload size={14} className="mr-1" /> Invoice
                    </button>
                    {order.customer?.email && (
                      <button
                        onClick={() => emailInvoice(order._id)}
                        className="flex items-center bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition min-h-[44px] min-w-[44px]"
                        title="Email Invoice"
                      >
                        <FaClipboardList size={14} className="mr-1" /> Email
                      </button>
                    )}
                    {order.orderStatus === 'completed' && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setRefundData({ refundAmount: order.total, reason: '' });
                          setShowRefundModal(true);
                        }}
                        className="flex items-center bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition min-h-[44px] min-w-[44px]"
                        title="Refund Order"
                      >
                        <FaUndo size={14} className="mr-1" /> Refund
                      </button>
                    )}
                    <button
                      onClick={() => deleteOrder(order._id)}
                      className="flex items-center bg-red-700 text-white px-3 py-2 rounded text-sm hover:bg-red-800 transition min-h-[44px] min-w-[44px]"
                      title="Delete Order"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-[#BDBDBD] sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-[#BDBDBD] text-sm font-medium text-[#1B1B1B] bg-white hover:bg-[#F4F4F4] disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-[#BDBDBD] text-sm font-medium text-[#1B1B1B] bg-white hover:bg-[#F4F4F4] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-[#4A4A4A]">
                    Showing <span className="font-medium text-[#1B1B1B]">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium text-[#1B1B1B]">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium text-[#1B1B1B]">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex -space-x-px">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setPagination({ ...pagination, page })}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-[#1B1B1B] border-[#1B1B1B] text-white'
                            : 'bg-white border-[#BDBDBD] text-[#4A4A4A] hover:bg-[#F4F4F4]'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-[#BDBDBD] w-11/12 md:w-3/4 lg:w-1/2 bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">Order Details - {selectedOrder.orderNumber}</h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-[#4A4A4A] hover:text-[#1B1B1B]"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-[#1B1B1B]">Customer Information</h4>
                  <p className="text-[#4A4A4A]">Name: {selectedOrder.customer.name}</p>
                  <p className="text-[#4A4A4A]">Phone: {selectedOrder.customer.phone || 'N/A'}</p>
                  <p className="text-[#4A4A4A]">Email: {selectedOrder.customer.email || 'N/A'}</p>
                  <p className="text-[#4A4A4A]">Address: {selectedOrder.customer.address || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-[#1B1B1B]">Order Information</h4>
                  <p className="text-[#4A4A4A]">Date: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  <p className="text-[#4A4A4A]">Cashier: {selectedOrder.cashier?.firstName} {selectedOrder.cashier?.lastName}</p>
                  <p className="text-[#4A4A4A]">Outlet: {selectedOrder.outlet}</p>
                  <p className="text-[#4A4A4A]">Payment: {selectedOrder.paymentMethod.toUpperCase()}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-[#1B1B1B] mb-2">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-[#FAF8F6]">
                      <div>
                        <p className="font-medium text-[#1B1B1B]">{item.productName}</p>
                        <p className="text-sm text-[#4A4A4A]">
                          {[formatMeasureLine(item.variantInfo), item.variantInfo.color, `Qty: ${item.quantity}`].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <p className="font-medium text-[#1B1B1B]">{formatBDT(item.totalPrice)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#BDBDBD] pt-4">
                <div className="flex justify-between text-[#4A4A4A]">
                  <span>Subtotal:</span>
                  <span>{formatBDT(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#4A4A4A]">
                  <span>Tax:</span>
                  <span>{formatBDT(selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between text-[#4A4A4A]">
                  <span>Discount:</span>
                  <span>{formatBDT(selectedOrder.discount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t border-[#BDBDBD] pt-2 text-[#1B1B1B]">
                  <span>Total:</span>
                  <span>{formatBDT(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium text-[#1B1B1B]">Notes</h4>
                  <p className="text-[#4A4A4A]">{selectedOrder.notes}</p>
            </div>
          )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => printReceipt(selectedOrder._id)}
                  className="px-4 py-2 bg-green-600 text-white hover:bg-green-700"
                >
                  <FaPrint className="inline mr-2" />
                  Print Receipt
                </button>
                <button
                  onClick={() => printInvoice(selectedOrder._id)}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <FaDownload className="inline mr-2" />
                  Print Invoice
                </button>
                {selectedOrder.customer?.email && (
                  <button
                    onClick={() => emailInvoice(selectedOrder._id)}
                    className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700"
                  >
                    <FaClipboardList className="inline mr-2" />
                    Email Invoice
                  </button>
                )}
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 bg-[#4A4A4A] text-white hover:bg-[#1B1B1B]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-[#BDBDBD] w-96 bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">Refund Order</h3>
              <button
                onClick={() => setShowRefundModal(false)}
                className="text-[#4A4A4A] hover:text-[#1B1B1B]"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A]">Refund Amount</label>
                                 <input
                   type="number"
                   value={refundData.refundAmount}
                   onChange={(e) => setRefundData({ ...refundData, refundAmount: parseFloat(e.target.value) || 0 })}
                   className="mt-1 block w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                 />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A]">Reason</label>
                                 <textarea
                   value={refundData.reason}
                   onChange={(e) => setRefundData({ ...refundData, reason: e.target.value })}
                   rows={3}
                   className="mt-1 block w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                 />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 bg-[#4A4A4A] text-white hover:bg-[#1B1B1B]"
                >
                  Cancel
                </button>
                <button
                  onClick={refundOrder}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700"
                >
                  Process Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPOSOrders;
