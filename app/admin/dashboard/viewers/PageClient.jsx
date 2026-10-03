'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { getStorage } from '../../../../src/lib/storage';
import { FiMonitor, FiUsers, FiEye, FiRefreshCw } from 'react-icons/fi';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } });

export default function ViewersPageClient() {
  const [totalViewers, setTotalViewers] = useState(0);
  const [productsBeingViewed, setProductsBeingViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  const fetchViewers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URI}/api/dashboard/viewers`, authHeaders());
      const data = res.data.viewerStats || res.data;
      setTotalViewers(data.totalViewers || 0);
      setProductsBeingViewed(data.productsBeingViewed || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch viewer data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchViewers();

    const token = getStorage('adminAccessToken');

    try {
      socketRef.current = io(API_URI, {
        transports: ['polling', 'websocket'],
        auth: { token: token || '' },
        reconnectionAttempts: 3,
        reconnectionDelay: 5000,
        timeout: 10000,
      });

      socketRef.current.on('connect', () => {
        setSocketConnected(true);
        socketRef.current.emit('joinAdminRoom');
      });

      socketRef.current.on('disconnect', () => {
        setSocketConnected(false);
      });

      socketRef.current.on('connect_error', () => {
        setSocketConnected(false);
        if (socketRef.current) socketRef.current.disconnect();
      });

      socketRef.current.on('viewerCountUpdate', (data) => {
        if (data && typeof data === 'object' && data.productId) {
          setProductsBeingViewed(prev => {
            const exists = prev.some(p => p._id === data.productId);
            if (exists) {
              return prev.map(p =>
                p._id === data.productId ? { ...p, viewerCount: data.viewerCount } : p
              );
            }
            return prev;
          });
        }
        setLastUpdated(new Date());
        fetchViewers();
      });
    } catch (err) {
      console.error('Socket connection failed', err);
    }

    pollRef.current = setInterval(() => {
      fetchViewers();
    }, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [fetchViewers]);

  const maxViewerCount = Math.max(...productsBeingViewed.map(p => p.viewerCount || 0), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <FiMonitor className="text-maybelline-pink" /> Live Viewers
          </h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${socketConnected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {socketConnected ? 'Live' : 'Polling'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <p className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <button
            onClick={fetchViewers}
            className="flex items-center gap-2 bg-maybelline-pink text-pure-white px-4 py-2 rounded-lg hover:bg-maybelline-magenta transition text-sm font-medium"
          >
            <FiRefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading viewer data...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-maybelline-light flex items-center justify-center">
                  <FiUsers className="text-maybelline-pink" />
                </div>
                <span className="text-sm font-medium text-gray-600">Total Viewers</span>
              </div>
              <p className="text-3xl font-bold text-black">{totalViewers}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FiEye className="text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Products Being Viewed</span>
              </div>
              <p className="text-3xl font-bold text-black">{productsBeingViewed.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <FiMonitor className="text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Connection Status</span>
              </div>
              <p className={`text-lg font-bold ${socketConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                {socketConnected ? 'Socket Connected' : 'Fallback Polling'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-black mb-4">Products Being Viewed</h2>
            {productsBeingViewed.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FiEye size={48} className="mx-auto mb-3 opacity-30" />
                <p>No products are currently being viewed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {productsBeingViewed.map((product) => (
                  <div key={product._id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      {product.mainImage && (
                        <img
                          src={product.mainImage}
                          alt={product.name}
                          className="w-12 h-12 object-contain rounded-lg bg-white border border-gray-200"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">{product.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <FiUsers size={12} className="text-maybelline-pink" />
                          <span className="text-xs font-semibold text-maybelline-pink">
                            {product.viewerCount} {product.viewerCount === 1 ? 'viewer' : 'viewers'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-maybelline-pink h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max((product.viewerCount / maxViewerCount) * 100, 5)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
