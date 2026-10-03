'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getStorage } from '../../../../src/lib/storage';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

export default function AnnouncementsPageClient() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ text: '', link: '', active: true });

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } });

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get(`${API_URI}/api/admin/announcements`, authHeaders());
      setAnnouncements(res.data);
    } catch (err) {
      console.error('Failed to fetch announcements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    try {
      if (editingId) {
        await axios.put(`${API_URI}/api/admin/announcements/${editingId}`, form, authHeaders());
      } else {
        await axios.post(`${API_URI}/api/admin/announcements`, form, authHeaders());
      }
      setForm({ text: '', link: '', active: true });
      setEditingId(null);
      setShowForm(false);
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to save announcement', err);
    }
  };

  const handleEdit = (a) => {
    setForm({ text: a.text, link: a.link || '', active: a.active });
    setEditingId(a._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await axios.delete(`${API_URI}/api/admin/announcements/${id}`, authHeaders());
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const toggleActive = async (a) => {
    try {
      await axios.put(`${API_URI}/api/admin/announcements/${a._id}`, { active: !a.active }, authHeaders());
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to toggle', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-black">Announcements</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ text: '', link: '', active: true }); }}
          className="flex items-center gap-2 bg-maybelline-pink text-pure-white px-4 py-2 rounded-lg hover:bg-maybelline-magenta transition"
        >
          <FiPlus size={16} /> Add New
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-black">
              <FiX size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message Text *</label>
              <input
                type="text"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="e.g. Free shipping on orders over BDT 2,500 — Use code: FREESHIP"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
              <input
                type="text"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Active:</label>
              <button type="button" onClick={() => setForm({ ...form, active: !form.active })}>
                {form.active ? <FiToggleRight size={24} className="text-green-500" /> : <FiToggleLeft size={24} className="text-gray-400" />}
              </button>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex items-center gap-2 bg-maybelline-pink text-pure-white px-5 py-2.5 rounded-lg hover:bg-maybelline-magenta transition text-sm font-medium">
                <FiCheck size={16} /> {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No announcements yet. Create one!</div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a._id} className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-4 ${a.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black truncate">{a.text}</p>
                {a.link && <p className="text-xs text-maybelline-pink mt-1 truncate">{a.link}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(a)} title={a.active ? 'Deactivate' : 'Activate'} className="p-2 hover:bg-gray-100 rounded-lg transition">
                  {a.active ? <FiToggleRight size={20} className="text-green-500" /> : <FiToggleLeft size={20} className="text-gray-400" />}
                </button>
                <button onClick={() => handleEdit(a)} className="p-2 hover:bg-gray-100 rounded-lg transition text-blue-600">
                  <FiEdit2 size={16} />
                </button>
                <button onClick={() => handleDelete(a._id)} className="p-2 hover:bg-gray-100 rounded-lg transition text-red-500">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
