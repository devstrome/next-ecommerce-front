'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useState, useEffect, useContext } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  FiDollarSign, FiShoppingCart, FiUsers, FiPackage,
  FiAlertTriangle, FiBell, FiTrendingUp, FiTruck,
  FiRefreshCw, FiCalendar, FiClock,
  FiMail, FiBox, FiCreditCard
} from 'react-icons/fi';
import axios from 'axios';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const MainContent = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const API_URI = process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000";

  const getAdminToken = () => {
    return getStorage("adminAccessToken") ||
           getStorage("adminToken") ||
           getStorage("adminRefreshToken") ||
           getStorage("accessToken");
  };

  const formatCurrency = (amount, currency = 'BDT') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchDashboardData = async () => {
    try {
      const token = getAdminToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await axios.get(`${API_URI}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDashboardData(response.data.stats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const token = getAdminToken();
      if (!token) return;

      const response = await axios.get(`${API_URI}/api/dashboard/realtime`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRealTimeData(response.data.realTimeData);
    } catch (error) {
      console.error('Error fetching real-time data:', error);
    }
  };

  useEffect(() => {
    const token = getAdminToken();
    if (!token || !API_URI) return;
    let alive = true;

    const newSocket = io(API_URI, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      if (!alive) return;
      setIsConnected(true);
      newSocket.emit('joinAdminRoom');
      newSocket.emit('joinDashboard');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {});

    newSocket.on('newOrder', (order) => {
      toast.info(`New order received: #${order.orderNumber}`);
      fetchRealTimeData();
    });

    newSocket.on('orderStatusUpdate', (data) => {
      toast.info(`Order #${data.orderNumber} status updated to ${data.status}`);
      fetchRealTimeData();
    });

    newSocket.on('lowStockAlert', (item) => {
      toast.warning(`Low stock alert: ${item.productId?.name || 'Product'} (${item.availableQuantity} left)`);
      fetchRealTimeData();
    });

    setSocket(newSocket);

    return () => {
      alive = false;
      if (newSocket.connected) newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchRealTimeData();

    const interval = setInterval(() => {
      fetchRealTimeData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const chartColors = {
    primary: '#B1123B',
    secondary: '#4A4A4A',
    accent: '#C9A96E',
    danger: '#E11D48',
    purple: '#8B5CF6',
    pink: '#F7D5DF'
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <FiAlertTriangle className="mx-auto text-3xl text-mid-gray mb-3" />
          <p className="text-dark-gray">Failed to load dashboard data</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-6 py-2 bg-black text-pure-white text-sm font-medium tracking-wider uppercase hover:bg-maybelline-pink transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-display-sm text-black">Dashboard</h1>
          <p className="text-dark-gray/70 text-sm mt-1">Welcome back. Here is your brand performance today.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-rose' : 'bg-mid-gray'}`}></div>
            <span className="text-xs text-dark-gray font-medium">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => {
              fetchDashboardData();
              fetchRealTimeData();
              toast.success('Dashboard refreshed');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-black text-pure-white text-xs font-medium tracking-wider uppercase hover:bg-maybelline-pink transition-colors"
          >
            <FiRefreshCw className="text-sm" />
            Refresh
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-1.5 text-xs text-mid-gray">
        <FiClock className="w-3.5 h-3.5" />
        Last updated: {formatTime(lastUpdate)}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs tracking-wider uppercase text-dark-gray font-medium">Today's Sales</span>
            <div className="p-2.5 bg-blush/50 rounded-full">
              <FiDollarSign className="text-maybelline-pink text-lg" />
            </div>
          </div>
          <p className="font-heading text-display-sm text-black">
            {formatCurrency(dashboardData.today.sales)}
          </p>
          <p className="text-xs text-dark-gray/60 mt-1">
            {dashboardData.today.orders} orders
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs tracking-wider uppercase text-dark-gray font-medium">This Week</span>
            <div className="p-2.5 bg-maybelline-light/50 rounded-full">
              <FiTrendingUp className="text-maybelline-pink text-lg" />
            </div>
          </div>
          <p className="font-heading text-display-sm text-black">
            {formatCurrency(dashboardData.week.sales)}
          </p>
          <p className="text-xs text-dark-gray/60 mt-1">
            {dashboardData.week.orders} orders
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs tracking-wider uppercase text-dark-gray font-medium">Total Users</span>
            <div className="p-2.5 bg-pure-white rounded-full">
              <FiUsers className="text-black text-lg" />
            </div>
          </div>
          <p className="font-heading text-display-sm text-black">
            {dashboardData.users.total.toLocaleString()}
          </p>
          <p className="text-xs text-dark-gray/60 mt-1">
            +{dashboardData.users.newToday} today
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs tracking-wider uppercase text-dark-gray font-medium">Inventory</span>
            <div className="p-2.5 bg-blush/30 rounded-full">
              <FiBox className="text-rose text-lg" />
            </div>
          </div>
          <p className="font-heading text-display-sm text-black">
            {dashboardData.inventory.totalItems.toLocaleString()}
          </p>
          <p className="text-xs text-dark-gray/60 mt-1">
            {dashboardData.inventory.lowStock} low stock
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="font-heading text-lg text-black mb-4">Sales Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboardData.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#4A4A4A' }} />
              <YAxis tick={{ fontSize: 12, fill: '#4A4A4A' }} />
              <Tooltip
                contentStyle={{ borderRadius: 0, border: '1px solid #F4F4F4', boxShadow: 'none' }}
                formatter={(value, name) => [
                  name === 'sales' ? formatCurrency(value) : value,
                  name === 'sales' ? 'Sales' : 'Orders'
                ]}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke={chartColors.primary}
                fill={chartColors.primary}
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="font-heading text-lg text-black mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.orderStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#B1123B"
                dataKey="count"
              >
                {dashboardData.orderStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={Object.values(chartColors)[index % Object.keys(chartColors).length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 0, border: '1px solid #F4F4F4' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Orders */}
        <div className="card p-5">
          <h3 className="font-heading text-base text-black mb-4 flex items-center gap-2">
            <FiShoppingCart className="text-maybelline-pink" />
            Recent Orders
          </h3>
          <div className="space-y-2.5">
            {realTimeData?.latestOrders?.length > 0 ? (
              realTimeData.latestOrders.map((order, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-pure-white">
                  <div>
                    <p className="text-sm font-medium text-black">
                      #{order.orderNumber || order._id?.slice(-6)}
                    </p>
                    <p className="text-xs text-dark-gray/70">
                      {order.userId?.firstName || order.cashier?.firstName || 'Customer'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-black">
                      {formatCurrency(order.grandTotal || order.total)}
                    </p>
                    <p className="text-xs text-dark-gray/60">
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-dark-gray/60 text-sm text-center py-6">No recent orders</p>
            )}
          </div>
        </div>

        {/* Unread Contacts */}
        <div className="card p-5">
          <h3 className="font-heading text-base text-black mb-4 flex items-center gap-2">
            <FiBell className="text-maybelline-pink" />
            Unread Messages
          </h3>
          <div className="space-y-2.5">
            {realTimeData?.unreadContacts?.length > 0 ? (
              realTimeData.unreadContacts.map((contact, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-pure-white border border-cool-gray">
                  <div>
                    <p className="text-sm font-medium text-black">
                      {contact.name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-dark-gray/70 truncate max-w-32">
                      {contact.message}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-dark-gray/60">
                      {formatTime(contact.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-dark-gray/60 text-sm text-center py-6">No unread messages</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Products */}
      {dashboardData.topProducts && dashboardData.topProducts.length > 0 && (
        <div className="card p-6">
          <h3 className="font-heading text-lg text-black mb-4">Top Selling Products</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-light-gray">
              <thead className="bg-pure-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mid-gray uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mid-gray uppercase tracking-wider">
                    Units Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-mid-gray uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-pure-white divide-y divide-light-gray">
                {dashboardData.topProducts.map((product, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        {product.product?.mainImage && (
                          <img
                            src={product.product.mainImage}
                            alt={product.product?.name || 'Product'}
                            className="w-10 h-10 object-cover rounded border border-light-gray flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-black">
                            {product.product?.name || 'Unknown Product'}
                          </div>
                          {product.product?.brand && (
                            <div className="text-xs text-mid-gray">{product.product.brand}</div>
                          )}
                          {Array.isArray(product.variants) && product.variants.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {product.variants.map((v, vi) => (
                                <div key={v.variantId || vi} className="flex flex-wrap items-center gap-x-2 text-xs text-dark-gray">
                                  <span className="inline-flex items-center bg-cool-gray rounded px-1.5 py-0.5 font-medium text-black">
                                    {v.color || 'Default'}
                                    {v.size ? ` · ${v.size}` : ''}
                                  </span>
                                  <span>{v.totalQuantity} sold</span>
                                  <span className="text-mid-gray">{formatCurrency(v.totalRevenue)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-dark-gray">
                        {product.totalQuantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-dark-gray">
                        {formatCurrency(product.totalRevenue)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI SEO Management */}
      <div className="card p-6 border-l-4 border-gold">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg text-black">AI SEO</h3>
            <p className="text-sm text-dark-gray/70">Auto-generates meta titles, descriptions, and keywords for every product</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const token = getAdminToken();
                  if (!token) { toast.error('Not authenticated'); return; }
                  const res = await axios.post(`${API_URI}/api/seo/generate`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  toast.success(`Generated SEO for ${res.data.count} products`);
                } catch (err) {
                  toast.error(err?.response?.data?.message || 'Failed');
                }
              }}
              className="px-3 py-2 bg-black text-pure-white text-xs font-medium tracking-wider uppercase hover:bg-maybelline-pink transition"
            >
              Generate Pending
            </button>
            <button
              onClick={async () => {
                if (!confirm('Force-regenerate SEO for ALL products? This will use AI credits.')) return;
                try {
                  const token = getAdminToken();
                  if (!token) { toast.error('Not authenticated'); return; }
                  const res = await axios.post(`${API_URI}/api/seo/force`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  toast.success(`Force-regenerated SEO for ${res.data.count} products`);
                } catch (err) {
                  toast.error(err?.response?.data?.message || 'Failed');
                }
              }}
              className="px-3 py-2 border border-black text-black text-xs font-medium tracking-wider uppercase hover:bg-black hover:text-pure-white transition"
            >
              Force All
            </button>
          </div>
        </div>
        <SeoStats tokenFn={getAdminToken} API_URI={API_URI} />
      </div>

    </div>
  );
};

const SeoStats = ({ tokenFn, API_URI }) => {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const token = tokenFn();
        if (!token) return;
        const res = await axios.get(`${API_URI}/api/seo/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch {}
    })();
  }, []);
  if (!stats) return <div className="text-sm text-mid-gray">Loading SEO stats...</div>;
  return (
    <div className="grid grid-cols-3 gap-4 mt-2">
      <div className="bg-pure-white p-3 text-center">
        <div className="text-2xl font-heading text-maybelline-pink">{stats.total}</div>
        <div className="text-xs text-mid-gray">Total Products</div>
      </div>
      <div className="bg-pure-white p-3 text-center">
        <div className="text-2xl font-heading text-black">{stats.withSEO}</div>
        <div className="text-xs text-mid-gray">With SEO</div>
      </div>
      <div className="bg-pure-white p-3 text-center">
        <div className="text-2xl font-heading text-dark-gray">{stats.pending || 0}</div>
        <div className="text-xs text-mid-gray">Pending</div>
      </div>
    </div>
  );
};

export default MainContent;
