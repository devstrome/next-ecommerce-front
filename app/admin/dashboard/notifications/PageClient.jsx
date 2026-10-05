'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getStorage } from '../../../../src/lib/storage';
import { FiMail, FiSend, FiTrash2, FiPlus, FiEye, FiEyeOff, FiRefreshCw, FiUsers, FiUserPlus, FiSearch, FiChevronDown, FiChevronRight, FiAlertCircle } from 'react-icons/fi';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

export default function NotificationsPageClient() {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ subject: '', htmlContent: '' });
  const [preview, setPreview] = useState(false);
  const [stats, setStats] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');

  const [subscribers, setSubscribers] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  const [subPagination, setSubPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [subSearch, setSubSearch] = useState('');
  const [showSubscribers, setShowSubscribers] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } });

  const fetchNewsletters = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URI}/api/admin/newsletters`, authHeaders());
      setNewsletters(Array.isArray(res.data) ? res.data : (res.data?.newsletters || []));
    } catch (err) {
      console.error('Failed to fetch newsletters:', err);
      setError(err.response?.data?.message || 'Failed to load newsletters. API may be unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URI}/api/admin/subscribers/stats`, authHeaders());
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchSubscribers = async (page = 1) => {
    setSubLoading(true);
    try {
      const res = await axios.get(`${API_URI}/api/admin/subscribers?page=${page}&limit=20&search=${subSearch}`, authHeaders());
      setSubscribers(res.data.subscribers);
      setSubPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch subscribers:', err);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsletters();
    fetchStats();
  }, []);

  useEffect(() => {
    if (showSubscribers) fetchSubscribers(1);
  }, [showSubscribers]);

  const handleSubSearch = (e) => {
    e.preventDefault();
    fetchSubscribers(1);
  };

  const handleDeleteSubscriber = async (id) => {
    if (!confirm('Delete this subscriber?')) return;
    try {
      await axios.delete(`${API_URI}/api/admin/subscribers/${id}`, authHeaders());
      fetchSubscribers(subPagination.page);
      fetchStats();
    } catch (err) {
      alert('Failed to delete subscriber');
    }
  };

  const handleCreateDraft = async () => {
    if (!form.subject || !form.htmlContent) {
      alert('Subject and content are required');
      return;
    }
    try {
      await axios.post(`${API_URI}/api/admin/newsletters`, form, authHeaders());
      setForm({ subject: '', htmlContent: '' });
      setShowCompose(false);
      fetchNewsletters();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create newsletter');
    }
  };

  const handleSend = async (id) => {
    if (!confirm(`Send this newsletter to all ${stats?.totalSubscribed || 'subscribed'} users?`)) return;
    setSending(true);
    try {
      const res = await axios.post(`${API_URI}/api/admin/newsletters/${id}/send`, {}, authHeaders());
      alert(res.data.message);
      fetchNewsletters();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send newsletter');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this newsletter?')) return;
    try {
      await axios.delete(`${API_URI}/api/admin/newsletters/${id}`, authHeaders());
      fetchNewsletters();
    } catch (err) {
      alert('Failed to delete newsletter');
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-BD', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const handleBulkSubscribe = async () => {
    if (!confirm('Subscribe ALL registered users who are not yet subscribed?')) return;
    setBulkLoading(true);
    setBulkMessage('');
    try {
      const res = await axios.post(`${API_URI}/api/admin/users/subscribe-all`, {}, authHeaders());
      setBulkMessage(res.data.message);
      fetchStats();
    } catch (err) {
      setBulkMessage(err.response?.data?.message || 'Failed to subscribe users');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Newsletters</h1>
          <p className="text-dark-gray text-sm mt-1">Compose newsletters, manage subscribers, and send campaigns</p>
        </div>
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="flex items-center gap-2 bg-maybelline-pink text-pure-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-maybelline-magenta transition-colors"
        >
          <FiPlus size={18} />
          Compose Newsletter
        </button>
      </header>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FiAlertCircle className="text-red-500" size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-red-700">API Error</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-pure-white border border-cool-gray rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <FiUsers className="text-green-600" size={20} />
            </div>
            <span className="text-xs text-dark-gray uppercase tracking-wider font-medium">Subscribed</span>
          </div>
          <p className="text-2xl font-bold text-black">{stats?.totalSubscribed || 0}</p>
        </div>
        <div className="bg-pure-white border border-cool-gray rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <FiUserPlus className="text-blue-600" size={20} />
            </div>
            <span className="text-xs text-dark-gray uppercase tracking-wider font-medium">Registered</span>
          </div>
          <p className="text-2xl font-bold text-black">{stats?.registeredSubscribed || 0}</p>
        </div>
        <div className="bg-pure-white border border-cool-gray rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <FiMail className="text-purple-600" size={20} />
            </div>
            <span className="text-xs text-dark-gray uppercase tracking-wider font-medium">Email Only</span>
          </div>
          <p className="text-2xl font-bold text-black">{stats?.emailSubscribed || 0}</p>
        </div>
        <div className="bg-pure-white border border-cool-gray rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <FiUsers className="text-red-600" size={20} />
            </div>
            <span className="text-xs text-dark-gray uppercase tracking-wider font-medium">Unsubscribed</span>
          </div>
          <p className="text-2xl font-bold text-black">{stats?.totalUnsubscribed || 0}</p>
        </div>
      </div>

      {/* Force Subscribe All Users */}
      <div className="bg-pure-white border border-cool-gray rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <FiRefreshCw className="text-blue-600" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-black text-sm">Subscribe All Users</h3>
            <p className="text-dark-gray text-xs">Force subscribe every registered user who is not yet subscribed.</p>
          </div>
        </div>
        <button
          onClick={handleBulkSubscribe}
          disabled={bulkLoading}
          className="flex items-center gap-2 bg-maybelline-pink text-pure-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maybelline-magenta transition-colors disabled:opacity-50 sm:ml-auto"
        >
          <FiRefreshCw size={16} className={bulkLoading ? 'animate-spin' : ''} />
          {bulkLoading ? 'Subscribing...' : 'Subscribe All Users'}
        </button>
        {bulkMessage && (
          <p className="text-sm text-green-600 w-full sm:w-auto">{bulkMessage}</p>
        )}
      </div>

      {/* Compose Form */}
      {showCompose && (
        <div className="bg-pure-white border border-cool-gray rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-black mb-4">Compose Newsletter</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-gray mb-1">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Newsletter subject..."
              className="w-full px-4 py-2.5 border border-cool-gray rounded-lg text-sm focus:outline-none focus:border-maybelline-pink"
            />
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-dark-gray">Content (HTML)</label>
              <button
                onClick={() => setPreview(!preview)}
                className="flex items-center gap-1 text-xs text-maybelline-pink hover:text-maybelline-magenta"
              >
                {preview ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div
                className="w-full border border-cool-gray rounded-lg p-4 text-sm min-h-[200px] prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: form.htmlContent }}
              />
            ) : (
              <textarea
                value={form.htmlContent}
                onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                placeholder="<h2>Your Newsletter Title</h2><p>Your content here...</p>"
                rows={10}
                className="w-full px-4 py-2.5 border border-cool-gray rounded-lg text-sm font-mono focus:outline-none focus:border-maybelline-pink"
              />
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateDraft}
              className="px-4 py-2.5 border border-cool-gray rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Save as Draft
            </button>
            <button
              onClick={() => setShowCompose(false)}
              className="px-4 py-2.5 text-dark-gray text-sm font-medium hover:text-black transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Newsletters List */}
      <div className="bg-pure-white border border-cool-gray rounded-xl overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-cool-gray bg-gray-50">
          <h3 className="font-bold text-black text-sm">Past Newsletters</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-cool-gray">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-dark-gray">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-dark-gray">Status</th>
                <th className="text-left px-4 py-3 font-medium text-dark-gray">Sent</th>
                <th className="text-left px-4 py-3 font-medium text-dark-gray">Failed</th>
                <th className="text-left px-4 py-3 font-medium text-dark-gray">Date</th>
                <th className="text-right px-4 py-3 font-medium text-dark-gray">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cool-gray">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-dark-gray">Loading...</td></tr>
              ) : newsletters.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-dark-gray">No newsletters yet. Click &quot;Compose Newsletter&quot; to create one.</td></tr>
              ) : newsletters.map((nl) => (
                <tr key={nl._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-black">{nl.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${nl.status === 'sent' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                      {nl.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-gray">{nl.sentCount}</td>
                  <td className="px-4 py-3 text-dark-gray">{nl.failedCount}</td>
                  <td className="px-4 py-3 text-dark-gray">{formatDate(nl.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {nl.status === 'draft' && (
                        <button
                          onClick={() => handleSend(nl._id)}
                          disabled={sending}
                          className="flex items-center gap-1 px-3 py-1.5 bg-maybelline-pink text-pure-white rounded-lg text-xs font-medium hover:bg-maybelline-magenta transition-colors disabled:opacity-50"
                        >
                          <FiSend size={14} />
                          Send
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(nl._id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscribers Section */}
      <div className="bg-pure-white border border-cool-gray rounded-xl overflow-hidden">
        <button
          onClick={() => setShowSubscribers(!showSubscribers)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-cool-gray hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FiUsers size={18} className="text-maybelline-pink" />
            <h3 className="font-bold text-black text-sm">Subscriber List</h3>
            <span className="text-xs text-dark-gray">({stats?.totalSubscribed || 0} active)</span>
          </div>
          {showSubscribers ? <FiChevronDown size={18} className="text-dark-gray" /> : <FiChevronRight size={18} className="text-dark-gray" />}
        </button>

        {showSubscribers && (
          <div>
            {/* Search */}
            <form onSubmit={handleSubSearch} className="flex gap-2 p-4 border-b border-cool-gray">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-gray" size={18} />
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="Search by email..."
                  className="w-full pl-10 pr-4 py-2.5 border border-cool-gray rounded-lg text-sm focus:outline-none focus:border-maybelline-pink"
                />
              </div>
              <button type="submit" className="px-4 py-2.5 bg-black text-pure-white rounded-lg text-sm font-medium hover:bg-dark-gray transition-colors">
                Search
              </button>
            </form>

            {/* Subscribers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-cool-gray">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-dark-gray">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-gray">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-gray">Source</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-gray">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-dark-gray">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-dark-gray">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cool-gray">
                  {subLoading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-dark-gray">Loading subscribers...</td></tr>
                  ) : subscribers.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-dark-gray">No subscribers found</td></tr>
                  ) : subscribers.map((sub) => (
                    <tr key={sub._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-black">{sub.email}</td>
                      <td className="px-4 py-3 text-dark-gray">{sub.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-maybelline-light text-maybelline-pink rounded-full text-xs font-medium">
                          {sub.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${sub.subscribed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {sub.subscribed ? 'Active' : 'Unsubscribed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-dark-gray">{new Date(sub.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteSubscriber(sub._id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {subPagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-cool-gray">
                <span className="text-sm text-dark-gray">
                  Showing {((subPagination.page - 1) * subPagination.limit) + 1} to {Math.min(subPagination.page * subPagination.limit, subPagination.total)} of {subPagination.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchSubscribers(subPagination.page - 1)}
                    disabled={subPagination.page <= 1}
                    className="px-3 py-1 border border-cool-gray rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => fetchSubscribers(subPagination.page + 1)}
                    disabled={subPagination.page >= subPagination.pages}
                    className="px-3 py-1 border border-cool-gray rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
