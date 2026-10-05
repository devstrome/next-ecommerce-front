'use client'
import { getStorage } from "../lib/storage"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch, FaFilter, FaInfoCircle } from 'react-icons/fa';
import { useRouter } from "next/navigation";

const RULE_TYPES = [
  { value: 'min_order', label: 'Minimum Order Amount', unit: 'BDT', hint: 'Blocks checkout when the order amount is below this value.' },
  { value: 'max_order', label: 'Maximum Order Amount', unit: 'BDT', hint: 'Blocks checkout when the order amount exceeds this value.' },
  { value: 'free_delivery_above', label: 'Free Delivery Above', unit: 'BDT', hint: 'Delivery charge becomes 0 when the order amount reaches this value. Wins over multipliers.' },
  { value: 'delivery_multiplier', label: 'Delivery Charge Multiplier', unit: '×', hint: 'Multiplies the delivery charge. Example: 2 = charge 2x. Applied in priority order.' },
  { value: 'extra_delivery_fee', label: 'Extra Delivery Fee', unit: 'BDT', hint: 'Flat amount added to the delivery charge (e.g. priority handling).' },
  { value: 'handling_fee_percent', label: 'Handling / Service Fee', unit: '%', hint: 'Percentage fee on the order amount after discount. Shown as a separate fee line.' },
  { value: 'cod_min', label: 'COD Minimum Order', unit: 'BDT', hint: 'Cash on Delivery blocked when order amount is below this value.' },
  { value: 'cod_max', label: 'COD Maximum Order', unit: 'BDT', hint: 'Cash on Delivery blocked when order amount exceeds this value.' },
  { value: 'max_qty_per_item', label: 'Max Quantity Per Product', unit: 'qty', hint: 'Limits how many units of a single product can be ordered.' },
];

const CheckoutRulesAdmin = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '', type: 'min_order', value: '', message: '', priority: 10, isActive: true });
  const [editingId, setEditingId] = useState(null);
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URI;

  const token = getStorage('adminAccessToken') || getStorage('adminToken') || getStorage('adminRefreshToken') || getStorage('accessToken');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const selectedType = RULE_TYPES.find(t => t.value === form.type);

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/checkout-rules/admin/all`, { headers });
      setItems(res.data);
    } catch (error) {
      console.error('Error loading checkout rules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, value: Number(form.value), priority: Number(form.priority) };
      if (editingId) {
        await axios.put(`${API}/api/checkout-rules/${editingId}`, payload, { headers });
      } else {
        await axios.post(`${API}/api/checkout-rules`, payload, { headers });
      }
      setForm({ name: '', type: 'min_order', value: '', message: '', priority: 10, isActive: true });
      setEditingId(null);
      load();
    } catch (error) {
      console.error('Error saving checkout rule:', error);
      alert(error.response?.data?.message || 'Failed to save rule');
    }
  };

  const edit = (it) => {
    setEditingId(it._id);
    setForm({
      name: it.name,
      type: it.type,
      value: it.value,
      message: it.message || '',
      priority: it.priority ?? 10,
      isActive: it.isActive,
    });
  };

  const del = async (id) => {
    if (window.confirm('Are you sure you want to delete this checkout rule?')) {
      try {
        await axios.delete(`${API}/api/checkout-rules/${id}`, { headers });
        load();
      } catch (error) {
        console.error('Error deleting checkout rule:', error);
      }
    }
  };

  const toggleActive = async (it) => {
    try {
      await axios.put(`${API}/api/checkout-rules/${it._id}`, { isActive: !it.isActive }, { headers });
      load();
    } catch (error) {
      console.error('Error toggling checkout rule status:', error);
    }
  };

  const typeLabel = (type) => RULE_TYPES.find(t => t.value === type)?.label || type;
  const typeUnit = (type) => RULE_TYPES.find(t => t.value === type)?.unit || '';
  const formatValue = (it) => {
    const unit = typeUnit(it.type);
    if (unit === '×') return `${Number(it.value)}×`;
    if (unit === '%') return `${Number(it.value)}%`;
    if (unit === 'qty') return `${Number(it.value)} / product`;
    return `BDT ${Number(it.value).toFixed(2)}`;
  };

  const filtered = items.filter(it =>
    it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    typeLabel(it.type).toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>Checkout Rules</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-white border border-[#BDBDBD]">
            <FaSearch className="text-[#4A4A4A] ml-2" />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 w-full sm:w-64 focus:outline-none bg-white focus:ring-2 focus:ring-[#B1123B]"
            />
          </div>
          <button
            onClick={submit}
            className="flex items-center justify-center bg-[#1B1B1B] text-white px-4 py-2 hover:bg-[#4A4A4A] transition min-h-[44px]"
          >
            <FaPlus className="mr-2" /> {editingId ? 'Update Rule' : 'Add Rule'}
          </button>
        </div>
      </div>

      <div className="p-4 border border-[#BDBDBD] w-full max-w-5xl bg-white">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center text-[#1B1B1B]">
            <FaFilter className="mr-2 text-[#B1123B]" />
            {editingId ? 'Edit Checkout Rule' : 'Add New Checkout Rule'}
          </h2>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Rule Name</label>
              <input
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Priority 2x Delivery"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Rule Type</label>
              <select
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                required
              >
                {RULE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">
                Value {selectedType ? `(${selectedType.unit})` : ''}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]"
                value={form.value}
                onChange={e => setForm({ ...form, value: e.target.value })}
                placeholder={selectedType?.unit === '×' ? 'e.g. 2' : selectedType?.unit === '%' ? 'e.g. 2' : '0.00'}
                required
              />
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">
                Customer Message <span className="text-[#9A9A9A]">(optional — shown instead of the default message)</span>
              </label>
              <input
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]"
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="e.g. Minimum order is BDT 500 to place an order"
              />
            </div>
            <div className="flex items-end gap-6">
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Priority (lower runs first)</label>
                <input
                  type="number"
                  className="w-32 px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]"
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div className="flex items-center pb-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  className="mr-2 border-[#BDBDBD]"
                />
                <label htmlFor="active" className="text-sm font-medium text-[#4A4A4A]">Active</label>
              </div>
            </div>
          </form>
          {selectedType && (
            <p className="mt-3 text-sm text-[#4A4A4A] bg-[#FAF8F6] border border-[#BDBDBD] p-3 flex items-start gap-2">
              <FaInfoCircle className="text-[#B1123B] mt-0.5" />
              <span>{selectedType.hint}</span>
            </p>
          )}
        </div>

        <div className="mb-8 p-4 border border-[#BDBDBD] bg-[#FAF8F6]">
          <h2 className="text-lg font-semibold mb-2 text-[#1B1B1B]">How rules are applied</h2>
          <ul className="text-sm text-[#4A4A4A] list-disc pl-5 space-y-1">
            <li>Rules run in <span className="font-medium">priority order</span> (lower number first).</li>
            <li>Blocking rules (min/max order, COD limits, max qty) stop checkout until resolved.</li>
            <li>Free delivery above threshold <span className="font-medium">wins over</span> multipliers/extra fees.</li>
            <li>Otherwise delivery = base charge × multipliers + extra fees (priority order).</li>
            <li>Handling fees are added as separate lines on the order total. Server always recomputes totals.</li>
          </ul>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border border-[#BDBDBD]">
            <thead>
              <tr className="bg-[#F4F4F4]">
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Name</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Type</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Value</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Priority</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Status</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-center font-semibold text-[#1B1B1B]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-b-2 border-[#B1123B]"></div>
                      <span className="ml-2 text-[#4A4A4A]">Loading checkout rules...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[#4A4A4A]">
                    {searchQuery ? 'No rules found matching your search.' : 'No checkout rules yet. Add your first rule above.'}
                  </td>
                </tr>
              ) : (
                filtered.map(it => (
                  <tr key={it._id} className="hover:bg-[#F4F4F4] border-b border-[#BDBDBD]">
                    <td className="py-3 px-4 font-medium text-[#1B1B1B]">
                      {it.name}
                      {it.message && <p className="text-xs text-[#9A9A9A] font-normal mt-0.5">"{it.message}"</p>}
                    </td>
                    <td className="py-3 px-4 text-[#4A4A4A]">{typeLabel(it.type)}</td>
                    <td className="py-3 px-4 text-[#1B1B1B] font-medium">{formatValue(it)}</td>
                    <td className="py-3 px-4 text-[#4A4A4A]">{it.priority ?? 10}</td>
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
              <span className="ml-2 text-[#4A4A4A]">Loading checkout rules...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-[#4A4A4A]">
              {searchQuery ? 'No rules found matching your search.' : 'No checkout rules yet.'}
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
                  <span>{typeLabel(it.type)}</span>
                  <span className="mx-2">•</span>
                  <span className="font-medium text-[#1B1B1B]">{formatValue(it)}</span>
                  <span className="mx-2">•</span>
                  <span>Priority {it.priority ?? 10}</span>
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

export default CheckoutRulesAdmin;
