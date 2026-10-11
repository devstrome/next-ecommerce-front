'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaExternalLinkAlt, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';

const EMPTY_FORM = {
  title: '',
  imageUrl: '',
  linkUrl: '',
  isActive: true,
  isUrgent: false,
  urgentDurationValue: 1,
  urgentDurationUnit: 'hours',
};

const URGENT_PRESETS = {
  '1h': { value: 1, unit: 'hours' },
  '6h': { value: 6, unit: 'hours' },
  '24h': { value: 24, unit: 'hours' },
  '3d': { value: 3, unit: 'days' },
  '1w': { value: 1, unit: 'weeks' },
};

const getDurationPreset = ({ urgentDurationValue, urgentDurationUnit }) =>
  Object.entries(URGENT_PRESETS).find(([, duration]) =>
    Number(duration.value) === Number(urgentDurationValue) && duration.unit === urgentDurationUnit
  )?.[0] || 'custom';

const AdminPopupAds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const router = useRouter();

  useEffect(() => { fetchAds(); }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/admin/popup-ads`);
      setAds(res.data);
    } catch { toast.error('Failed to load popup ads'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };

  const openEdit = (ad) => {
    setEditing(ad);
    setForm({
      ...EMPTY_FORM,
      title: ad.title || '',
      imageUrl: ad.imageUrl || '',
      linkUrl: ad.linkUrl || '',
      isActive: ad.isActive,
      isUrgent: Boolean(ad.isUrgent),
      urgentDurationValue: Number(ad.urgentDurationValue) || 1,
      urgentDurationUnit: ad.urgentDurationUnit || 'hours',
    });
    setShowForm(true);
  };

  const changeUrgentPreset = (preset) => {
    if (preset === 'custom') {
      setForm((current) => ({
        ...current,
        urgentDurationValue: 30,
        urgentDurationUnit: 'minutes',
      }));
      return;
    }
    const duration = URGENT_PRESETS[preset];
    setForm((current) => ({
      ...current,
      urgentDurationValue: duration.value,
      urgentDurationUnit: duration.unit,
    }));
  };

  const handleSave = async () => {
    if (!form.imageUrl) { toast.error('Image URL is required'); return; }
    try {
      if (editing) {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/admin/popup-ads/${editing._id}`, form);
        toast.success('Popup ad updated');
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/admin/popup-ads`, form);
        toast.success('Popup ad created');
      }
      setShowForm(false); setEditing(null); fetchAds();
    } catch { toast.error('Failed to save popup ad'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this popup ad?')) return;
    try { await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/admin/popup-ads/${id}`); toast.success('Deleted'); fetchAds(); }
    catch { toast.error('Failed to delete'); }
  };

  const toggleActive = async (ad) => {
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/admin/popup-ads/${ad._id}`, { isActive: !ad.isActive });
      fetchAds();
    } catch { toast.error('Failed to toggle'); }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-[#F4F4F4] transition"><FaArrowLeft className="text-[#1B1B1B]" /></button>
            <h1 className="text-2xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>Popup Ads</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-[#1B1B1B] text-white px-4 py-2 hover:bg-[#4A4A4A] transition"><FaPlus /> Add Popup</button>
        </div>

        {showForm && (
          <div className="bg-white p-6 mb-6 border border-[#BDBDBD]">
            <h2 className="text-lg font-semibold mb-4 text-[#1B1B1B]">{editing ? 'Edit Popup' : 'New Popup'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B]" placeholder="Sale! 50% Off" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Image URL *</label>
                <input type="text" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B]" placeholder="https://..." />
                {form.imageUrl && <img src={form.imageUrl} alt="preview" className="mt-2 h-24 border border-[#BDBDBD]" onError={(e) => e.target.style.display = 'none'} />}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Link URL (optional)</label>
                <input type="text" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B]" placeholder="/products or https://..." />
              </div>
              <label className="flex items-center gap-2 text-sm text-[#4A4A4A]">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="border-[#BDBDBD]" />
                Active
              </label>
              <div className="border border-[#F1D5DC] bg-[#FFF8FA] p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-[#1B1B1B]">
                  <input type="checkbox" checked={form.isUrgent} onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })} />
                  Urgent popup with automatic expiry
                </label>
                {form.isUrgent && (
                  <>
                    <p className="text-xs text-[#6B5560]">The popup will be disabled automatically when this duration ends.</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#4A4A4A] mb-1">Duration preset</label>
                        <select
                          value={getDurationPreset(form)}
                          onChange={(e) => changeUrgentPreset(e.target.value)}
                          className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B]"
                        >
                          <option value="1h">1 hour</option>
                          <option value="6h">6 hours</option>
                          <option value="24h">24 hours</option>
                          <option value="3d">3 days</option>
                          <option value="1w">1 week</option>
                          <option value="custom">Custom duration</option>
                        </select>
                      </div>
                      {getDurationPreset(form) === 'custom' && (
                        <div>
                          <label className="block text-xs font-medium text-[#4A4A4A] mb-1">Custom duration</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              max="10080"
                              value={form.urgentDurationValue}
                              onChange={(e) => setForm({ ...form, urgentDurationValue: e.target.value })}
                              className="w-full min-w-0 px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B]"
                            />
                            <select
                              value={form.urgentDurationUnit}
                              onChange={(e) => setForm({ ...form, urgentDurationUnit: e.target.value })}
                              className="px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B]"
                              aria-label="Urgent duration unit"
                            >
                              <option value="seconds">Seconds</option>
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                    {editing?.urgentExpiresAt && (
                      <p className="text-xs text-[#6B5560]">
                        Current expiry: {new Date(editing.urgentExpiresAt).toLocaleString()}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSave} className="px-4 py-2 bg-[#1B1B1B] text-white hover:bg-[#4A4A4A] transition">Save</button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-[#F4F4F4] text-[#4A4A4A] hover:bg-[#E8E8E8] transition">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-[#B1123B] mx-auto"></div></div>
        ) : ads.length === 0 ? (
          <div className="bg-white p-12 text-center border border-[#BDBDBD]">
            <p className="text-[#4A4A4A] text-lg">No popup ads yet</p>
            <p className="text-[#4A4A4A] text-sm mt-1">Click &quot;Add Popup&quot; to create one</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {ads.map((ad) => (
              <div key={ad._id} className="bg-white border border-[#BDBDBD] p-4 flex items-center gap-4">
                <img src={ad.imageUrl} alt={ad.title} className="w-20 h-20 object-cover border border-[#BDBDBD]" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <div className="w-20 h-20 bg-[#F4F4F4] hidden items-center justify-center text-[#4A4A4A] text-xs border border-[#BDBDBD]">No Img</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#1B1B1B] truncate">{ad.title || '(no title)'}</h3>
                  {ad.linkUrl && <p className="text-xs text-[#B1123B] truncate flex items-center gap-1"><FaExternalLinkAlt size={10} />{ad.linkUrl}</p>}
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 ${ad.isActive ? 'bg-green-100 text-green-700' : 'bg-[#F4F4F4] text-[#4A4A4A]'}`}>{ad.isActive ? 'Active' : 'Inactive'}</span>
                  {ad.isUrgent && (
                    <span className="inline-block mt-1 ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-800">
                      Urgent · expires {ad.urgentExpiresAt ? new Date(ad.urgentExpiresAt).toLocaleString() : 'not scheduled'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(ad)} className="p-2 hover:bg-[#F4F4F4] text-[#4A4A4A] hover:text-[#1B1B1B] min-h-[44px] min-w-[44px] flex items-center justify-center" title="Toggle active">{ad.isActive ? <FaToggleOn size={20} className="text-green-500" /> : <FaToggleOff size={20} />}</button>
                  <button onClick={() => openEdit(ad)} className="p-2 hover:bg-[#F7D5DF] text-[#B1123B] min-h-[44px] min-w-[44px] flex items-center justify-center"><FaEdit /></button>
                  <button onClick={() => handleDelete(ad._id)} className="p-2 hover:bg-red-50 text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"><FaTrash /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPopupAds;
