'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { getStorage } from '../../../../src/lib/storage';
import { FiEdit2, FiArrowLeft, FiHelpCircle, FiTruck, FiRotateCcw, FiShield, FiFileText } from 'react-icons/fi';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

const PAGE_ICONS = {
  'faq': { icon: <FiHelpCircle size={28} />, color: 'text-blue-500' },
  'shipping-policy': { icon: <FiTruck size={28} />, color: 'text-green-500' },
  'return-policy': { icon: <FiRotateCcw size={28} />, color: 'text-orange-500' },
  'privacy': { icon: <FiShield size={28} />, color: 'text-purple-500' },
  'terms': { icon: <FiFileText size={28} />, color: 'text-red-500' },
};

export default function HelpPagesList() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } });

  const fetchPages = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URI}/api/admin/help-pages`, authHeaders());
      const data = res.data;
      setPages(Array.isArray(data) ? data : (data?.pages || data?.helpPages || []));
    } catch (err) {
      console.error('Failed to fetch help pages', err);
      setError(err.response?.data?.message || 'Failed to load help pages. API may be unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPages(); }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-3">
          <FiArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-black">Help Pages</h1>
        <p className="text-sm text-gray-500 mt-1">Manage FAQ, policies, and help content shown to customers.</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiHelpCircle size={28} className="text-red-400" />
          </div>
          <p className="text-red-600 font-medium">Failed to load help pages</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <button
            onClick={fetchPages}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-dark-gray transition-colors"
          >
            Retry
          </button>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No pages found. Restart the backend to seed defaults.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((p) => {
            const config = PAGE_ICONS[p.slug] || { icon: <FiFileText size={28} />, color: 'text-gray-500' };
            return (
              <Link
                key={p._id}
                href={`/admin/dashboard/help/edit/${p._id}`}
                className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-maybelline-pink transition-all duration-200 flex flex-col items-center text-center gap-3"
              >
                <div className={`w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center ${config.color} group-hover:scale-110 transition-transform`}>
                  {config.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-black group-hover:text-maybelline-pink transition-colors">{p.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">/{p.slug}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.active ? 'Active' : 'Inactive'}
                  </span>
                  <FiEdit2 size={14} className="text-gray-400 group-hover:text-maybelline-pink" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
