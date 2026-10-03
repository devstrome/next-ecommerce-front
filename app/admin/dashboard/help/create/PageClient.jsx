'use client'
import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { getStorage } from '../../../../../src/lib/storage';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

export default function HelpPageCreate() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', content: '', icon: '', order: 0, active: true, seo: { metaTitle: '', metaDescription: '', metaKeywords: '' } });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API_URI}/api/admin/help-pages`, form, { headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } });
      router.push('/admin/dashboard/help');
    } catch (err) {
      console.error('Failed to create', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/admin/dashboard/help" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-4">
        <FiArrowLeft size={14} /> Back to Help Pages
      </Link>
      <h1 className="text-2xl font-bold text-black mb-6">Create Help Page</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon (emoji)</label>
              <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. ❓" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-maybelline-pink" />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML)</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={15} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-maybelline-pink focus:border-transparent" placeholder="<h2>Title</h2><p>Content...</p>" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-black">SEO</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
            <input type="text" value={form.seo.metaTitle} onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaTitle: e.target.value } })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
            <textarea value={form.seo.metaDescription} onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaDescription: e.target.value } })} rows={2} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
            <input type="text" value={form.seo.metaKeywords} onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaKeywords: e.target.value } })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent" />
          </div>
        </div>

        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-maybelline-pink text-pure-white px-6 py-3 rounded-lg hover:bg-maybelline-magenta transition disabled:opacity-50 font-medium">
          <FiSave size={16} /> {saving ? 'Saving...' : 'Create Page'}
        </button>
      </form>
    </div>
  );
}
