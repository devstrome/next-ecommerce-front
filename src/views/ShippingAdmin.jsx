'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch, FaTruck } from 'react-icons/fa';
import { useRouter } from "next/navigation";
import { formatBDT } from '../config/brand';

const ShippingAdmin = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '', charge: '', estimatedDays: 3, isActive: true });
  const [editingId, setEditingId] = useState(null);
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URI;

  const token = getStorage('adminAccessToken') || getStorage('adminToken') || getStorage('adminRefreshToken') || getStorage('accessToken');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/shipping`);
      setItems(res.data);
    } catch (error) {
      console.error('Error loading shipping types:', error);
    } finally {
      setLoading(false);
    }
    try {
      const phoneRes = await axios.get(`${API}/api/delivery-setting`);
      setDeliveryPhone(phoneRes.data?.phone || '');
    } catch (error) {
      console.error('Error loading delivery phone:', error);
    }
  };

  const saveDeliveryPhone = async () => {
    try {
      setPhoneSaving(true);
      await axios.put(`${API}/api/delivery-setting`, { phone: deliveryPhone }, { headers });
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 2500);
    } catch (error) {
      console.error('Error saving delivery phone:', error);
      alert('Failed to save delivery contact number');
    } finally {
      setPhoneSaving(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  useEffect(() => {
    const onStore = () => load();
    window.addEventListener('storeChanged', onStore);
    return () => window.removeEventListener('storeChanged', onStore);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API}/api/shipping/${editingId}`, form, { headers });
      } else {
        await axios.post(`${API}/api/shipping`, form, { headers });
      }
      setForm({ name: '', charge: '', estimatedDays: 3, isActive: true });
      setEditingId(null);
      load();
    } catch (error) {
      console.error('Error saving shipping type:', error);
    }
  };

  const edit = (it) => {
    setEditingId(it._id);
    setForm({ name: it.name, charge: it.charge, estimatedDays: it.estimatedDays, isActive: it.isActive });
  };

  const del = async (id) => {
    if (window.confirm('Are you sure you want to delete this shipping type?')) {
      try {
        await axios.delete(`${API}/api/shipping/${id}`, { headers });
        load();
      } catch (error) {
        console.error('Error deleting shipping type:', error);
      }
    }
  };

  const toggleActive = async (it) => {
    try {
      await axios.put(`${API}/api/shipping/${it._id}`, { ...it, isActive: !it.isActive }, { headers });
      load();
    } catch (error) {
      console.error('Error toggling shipping type status:', error);
    }
  };

  const filtered = items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#FAF8F6] p-4 sm:p-6">
      <div className="w-full max-w-5xl mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-[#4A4A4A] hover:text-[#1B1B1B] transition min-h-[44px]"
            aria-label="Go Back"
          >
            <FaArrowLeft className="text-2xl" />
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>Shipping Management</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-white border border-[#BDBDBD]">
            <FaSearch className="text-[#4A4A4A] ml-2" />
            <input
              type="text"
              placeholder="Search shipping types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 w-full sm:w-64 focus:outline-none bg-white focus:ring-2 focus:ring-[#B1123B]"
            />
          </div>
          <button
            onClick={submit}
            className="flex items-center justify-center bg-[#1B1B1B] text-white px-4 py-2 hover:bg-[#4A4A4A] transition min-h-[44px]"
          >
            <FaPlus className="mr-2" /> {editingId ? 'Update Shipping' : 'Add Shipping'}
          </button>
        </div>
      </div>

      <div className="p-4 border border-[#BDBDBD] w-full max-w-5xl bg-white">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center text-[#1B1B1B]">
            <FaTruck className="mr-2 text-[#B1123B]" />
            {editingId ? 'Edit Shipping Type' : 'Add New Shipping Type'}
          </h2>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Name</label>
              <input 
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="Shipping name"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Charge (BDT)</label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]" 
                value={form.charge} 
                onChange={e => setForm({...form, charge: Number(e.target.value)})} 
                placeholder="0.00"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Estimated Days</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]" 
                value={form.estimatedDays} 
                onChange={e => setForm({...form, estimatedDays: Number(e.target.value)})} 
                placeholder="3"
                min="1"
              />
            </div>
            <div className="flex items-center">
              <input 
                id="active" 
                type="checkbox" 
                checked={form.isActive} 
                onChange={e => setForm({...form, isActive: e.target.checked})} 
                className="mr-2 border-[#BDBDBD]"
              />
              <label htmlFor="active" className="text-sm font-medium text-[#4A4A4A]">Active</label>
            </div>
          </form>
        </div>

        <div className="mb-8 p-4 border border-[#BDBDBD] bg-[#FAF8F6]">
          <h2 className="text-lg font-semibold mb-3 text-[#1B1B1B]">Delivery Contact Number</h2>
          <p className="text-sm text-[#4A4A4A] mb-3">Shown to customers at checkout for delivery inquiries.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="tel"
              className="flex-1 px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]"
              value={deliveryPhone}
              onChange={e => setDeliveryPhone(e.target.value)}
              placeholder="e.g. 01XXXXXXXXX"
            />
            <button
              onClick={saveDeliveryPhone}
              disabled={phoneSaving}
              className="bg-[#B1123B] text-white px-6 py-2 hover:bg-[#8E0E2F] transition min-h-[44px] disabled:opacity-50"
            >
              {phoneSaving ? 'Saving...' : phoneSaved ? 'Saved ✓' : 'Save Number'}
            </button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border border-[#BDBDBD]">
            <thead>
              <tr className="bg-[#F4F4F4]">
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Name</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Charge</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Estimated Days</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Status</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-center font-semibold text-[#1B1B1B]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-b-2 border-[#B1123B]"></div>
                      <span className="ml-2 text-[#4A4A4A]">Loading shipping types...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-[#4A4A4A]">
                    {searchQuery ? 'No shipping types found matching your search.' : 'No shipping types found.'}
                  </td>
                </tr>
              ) : (
                filtered.map(it => (
                  <tr key={it._id} className="hover:bg-[#F4F4F4] border-b border-[#BDBDBD]">
                    <td className="py-3 px-4 font-medium text-[#1B1B1B]">{it.name}</td>
                    <td className="py-3 px-4 text-[#1B1B1B]">{formatBDT(Number(it.charge).toFixed(2))}</td>
                    <td className="py-3 px-4 text-[#4A4A4A]">{it.estimatedDays} days</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleActive(it)}
                        className={`px-3 py-1 text-xs font-medium transition-colors min-h-[44px] ${
                          it.isActive 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-[#F4F4F4] text-[#4A4A4A] hover:bg-[#E8E8E8]'
                        }`}
                      >
                        {it.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center space-x-2">
                        <button 
                          className="flex items-center bg-[#1B1B1B] text-white px-3 py-1 text-sm hover:bg-[#4A4A4A] transition min-h-[44px]"
                          onClick={() => edit(it)}
                        >
                          <FaEdit className="mr-1" /> Edit
                        </button>
                        <button 
                          className="flex items-center bg-red-500 text-white px-3 py-1 text-sm hover:bg-red-600 transition min-h-[44px]"
                          onClick={() => del(it._id)}
                        >
                          <FaTrash className="mr-1" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3 p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-[#B1123B] mx-auto"></div>
              <span className="ml-2 text-[#4A4A4A]">Loading shipping types...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-[#4A4A4A]">
              {searchQuery ? 'No shipping types found matching your search.' : 'No shipping types found.'}
            </div>
          ) : (
            filtered.map(it => (
              <div key={it._id} className="bg-white border border-[#BDBDBD] p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-[#1B1B1B]">{it.name}</span>
                  <button
                    onClick={() => toggleActive(it)}
                    className={`px-3 py-1 text-xs font-medium transition-colors min-h-[44px] ${
                      it.isActive 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-[#F4F4F4] text-[#4A4A4A] hover:bg-[#E8E8E8]'
                    }`}
                  >
                    {it.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div className="text-sm text-[#4A4A4A] mb-3">
                  <span>{formatBDT(Number(it.charge).toFixed(2))}</span>
                  <span className="mx-2">•</span>
                  <span>{it.estimatedDays} days</span>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="flex items-center bg-[#1B1B1B] text-white px-3 py-2 text-sm hover:bg-[#4A4A4A] transition min-h-[44px] min-w-[44px]"
                    onClick={() => edit(it)}
                  >
                    <FaEdit className="mr-1" /> Edit
                  </button>
                  <button 
                    className="flex items-center bg-red-500 text-white px-3 py-2 text-sm hover:bg-red-600 transition min-h-[44px] min-w-[44px]"
                    onClick={() => del(it._id)}
                  >
                    <FaTrash className="mr-1" /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ShippingAdmin;
