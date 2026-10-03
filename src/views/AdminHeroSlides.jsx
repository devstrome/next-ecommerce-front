'use client'
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getStorage } from '../lib/storage';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaToggleOn, FaToggleOff, FaGripVertical } from 'react-icons/fa';
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

const GRADIENTS = [
  { value: 'from-maybelline-light via-pure-white to-maybelline-rose/10', label: 'Pink Rose' },
  { value: 'from-cool-gray via-pure-white to-maybelline-light', label: 'Soft Gray' },
  { value: 'from-maybelline-light via-pure-white to-cool-gray', label: 'Light to Gray' },
  { value: 'from-pure-white via-maybelline-light/20 to-maybelline-rose/10', label: 'Blush White' },
  { value: 'from-maybelline-pink/5 via-pure-white to-maybelline-light', label: 'Subtle Pink' },
  { value: 'from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]', label: 'Dark' },
];

function authHeaders() {
  const token = getStorage('adminAccessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const AdminHeroSlides = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    tag: '', title: '', highlight: '', subtitle: '', cta: 'Shop Now',
    link: '/products', bgImage: '', textColor: '#1A1A1A', highlightColor: '#DC143C',
    bgGradient: GRADIENTS[0].value, order: 0, isActive: true,
  });
  const router = useRouter();
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => { fetchSlides(); }, []);

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URI}/api/admin/hero-slides`, { headers: authHeaders() });
      setSlides(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load hero slides');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      tag: '', title: '', highlight: '', subtitle: '', cta: 'Shop Now',
      link: '/products', bgImage: '', textColor: '#1A1A1A', highlightColor: '#DC143C',
      bgGradient: GRADIENTS[0].value, order: slides.length, isActive: true,
    });
    setShowForm(true);
  };

  const openEdit = (slide) => {
    setEditing(slide);
    setForm({
      tag: slide.tag || '', title: slide.title || '', highlight: slide.highlight || '',
      subtitle: slide.subtitle || '', cta: slide.cta || 'Shop Now', link: slide.link || '/products',
      bgImage: slide.bgImage || '', textColor: slide.textColor || '#1A1A1A',
      highlightColor: slide.highlightColor || '#DC143C',
      bgGradient: slide.bgGradient || GRADIENTS[0].value,
      order: slide.order || 0, isActive: slide.isActive !== false,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API_URI}/api/admin/hero-slides/${editing._id}`, form, { headers: authHeaders() });
        toast.success('Hero slide updated');
      } else {
        await axios.post(`${API_URI}/api/admin/hero-slides`, form, { headers: authHeaders() });
        toast.success('Hero slide created');
      }
      setShowForm(false);
      setEditing(null);
      fetchSlides();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save hero slide');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hero slide?')) return;
    try {
      await axios.delete(`${API_URI}/api/admin/hero-slides/${id}`, { headers: authHeaders() });
      toast.success('Deleted');
      fetchSlides();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const toggleActive = async (slide) => {
    try {
      await axios.put(`${API_URI}/api/admin/hero-slides/${slide._id}/toggle`, {}, { headers: authHeaders() });
      fetchSlides();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to toggle');
    }
  };

  const handleDragStart = (index) => { dragItem.current = index; };
  const handleDragEnter = (index) => { dragOverItem.current = index; };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const reordered = [...slides];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOverItem.current, 0, dragged);
    setSlides(reordered);
    dragItem.current = null;
    dragOverItem.current = null;
    try {
      const orderedIds = reordered.map(s => s._id);
      await axios.put(`${API_URI}/api/admin/hero-slides-reorder`, { orderedIds }, { headers: authHeaders() });
      toast.success('Order updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save order');
    }
  };

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-[#FAF8F6] p-3 sm:p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => router.back()} className="p-2 hover:bg-[#F4F4F4] transition flex-shrink-0">
              <FaArrowLeft className="text-[#1B1B1B]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-[#1B1B1B] truncate" style={{ fontFamily: "'Inter', serif" }}>Hero Slides</h1>
              <p className="text-xs sm:text-sm text-[#4A4A4A] truncate">Manage the homepage hero carousel. Drag to reorder.</p>
            </div>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 sm:gap-2 bg-[#1B1B1B] text-white px-3 py-2 sm:px-4 hover:bg-[#4A4A4A] transition flex-shrink-0 text-sm sm:text-base">
            <FaPlus /> <span className="hidden xs:inline">Add Slide</span><span className="xs:hidden">Add</span>
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white p-4 sm:p-6 mb-4 sm:mb-6 border border-[#BDBDBD]">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#1B1B1B]">{editing ? 'Edit Hero Slide' : 'New Hero Slide'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Tag Label</label>
                <input type="text" value={form.tag} onChange={(e) => setField('tag', e.target.value)} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] text-sm" placeholder="New Arrivals" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setField('title', e.target.value)} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] text-sm" placeholder="New Collection" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Highlighted Word</label>
                <input type="text" value={form.highlight} onChange={(e) => setField('highlight', e.target.value)} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] text-sm" placeholder="Collection" />
                <p className="text-[10px] sm:text-xs text-[#9A9A9A] mt-1">Appears in highlight color</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Subtitle</label>
                <input type="text" value={form.subtitle} onChange={(e) => setField('subtitle', e.target.value)} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] text-sm" placeholder="Discover the season's defining looks" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Button Text</label>
                <input type="text" value={form.cta} onChange={(e) => setField('cta', e.target.value)} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] text-sm" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Button Link</label>
                <input type="text" value={form.link} onChange={(e) => setField('link', e.target.value)} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] text-sm" placeholder="/products" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Background Image URL</label>
                <input type="text" value={form.bgImage} onChange={(e) => setField('bgImage', e.target.value)} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] text-sm" placeholder="https://..." />
                {form.bgImage && <img src={form.bgImage} alt="preview" className="mt-2 h-16 sm:h-20 w-full sm:w-auto object-cover border border-[#BDBDBD] rounded" onError={(e) => e.target.style.display='none'} />}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Background Gradient</label>
                <select value={form.bgGradient} onChange={(e) => setField('bgGradient', e.target.value)} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] text-sm">
                  {GRADIENTS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Text Color</label>
                <div className="flex gap-2">
                  <input type="color" value={form.textColor} onChange={(e) => setField('textColor', e.target.value)} className="w-10 h-10 min-w-[40px] border border-[#BDBDBD] cursor-pointer rounded" />
                  <input type="text" value={form.textColor} onChange={(e) => setField('textColor', e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] font-mono text-xs sm:text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Highlight Color</label>
                <div className="flex gap-2">
                  <input type="color" value={form.highlightColor} onChange={(e) => setField('highlightColor', e.target.value)} className="w-10 h-10 min-w-[40px] border border-[#BDBDBD] cursor-pointer rounded" />
                  <input type="text" value={form.highlightColor} onChange={(e) => setField('highlightColor', e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] font-mono text-xs sm:text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#4A4A4A] mb-1">Sort Order</label>
                <input type="number" value={form.order} onChange={(e) => setField('order', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] text-sm" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs sm:text-sm text-[#4A4A4A]">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} className="border-[#BDBDBD] w-4 h-4" />
                  Active
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 sm:p-4 bg-[#FAF8F6] border border-[#E8E8E8] rounded overflow-hidden">
              <p className="text-[10px] sm:text-xs font-medium text-[#4A4A4A] mb-2">Preview</p>
              <div className="relative overflow-hidden rounded" style={{ background: `linear-gradient(135deg, ${form.highlightColor}10, white, ${form.highlightColor}05)` }}>
                <div className="p-4 sm:p-6">
                  {form.tag && <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: form.highlightColor }}>{form.tag}</p>}
                  <h3 className="text-base sm:text-xl font-bold leading-tight" style={{ color: form.textColor }}>
                    {form.title?.split(form.highlight || '___').map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && <span style={{ color: form.highlightColor }}>{form.highlight}</span>}
                      </React.Fragment>
                    ))}
                  </h3>
                  {form.subtitle && <p className="text-xs sm:text-sm text-[#4A4A4A] mt-1">{form.subtitle}</p>}
                  {form.cta && <button className="mt-3 px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-semibold text-white" style={{ backgroundColor: form.highlightColor }}>{form.cta}</button>}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="w-full sm:w-auto px-5 py-2.5 bg-[#F4F4F4] text-[#4A4A4A] hover:bg-[#E8E8E8] transition text-sm font-medium">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="w-full sm:w-auto px-5 py-2.5 bg-[#1B1B1B] text-white hover:bg-[#4A4A4A] transition disabled:opacity-50 text-sm font-medium">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-maybelline-pink mx-auto" /></div>
        ) : slides.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white border border-[#BDBDBD]">
            <p className="text-[#4A4A4A] text-base sm:text-lg mb-4">No hero slides yet</p>
            <button onClick={openCreate} className="bg-[#1B1B1B] text-white px-5 sm:px-6 py-2.5 hover:bg-[#4A4A4A] transition text-sm">Create First Slide</button>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {slides.map((slide, index) => (
              <div
                key={slide._id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`bg-white border border-[#BDBDBD] p-3 sm:p-4 transition-all ${!slide.isActive ? 'opacity-50' : ''} hover:shadow-md cursor-move`}
              >
                {/* Desktop layout */}
                <div className="hidden sm:flex items-center gap-4">
                  <FaGripVertical className="text-[#BDBDBD] flex-shrink-0 cursor-grab" />
                  <div className="flex-shrink-0 w-40 h-20 rounded overflow-hidden flex items-center justify-center text-xs font-semibold border border-[#E8E8E8]" style={{
                    background: slide.bgImage ? `url(${slide.bgImage}) center/cover` : `linear-gradient(135deg, ${slide.highlightColor || '#DC143C'}10, white, ${slide.highlightColor || '#DC143C'}05)`,
                    color: slide.textColor || '#1A1A1A',
                  }}>
                    {!slide.bgImage && <div className="text-center p-2">
                      {slide.tag && <div className="text-[9px] uppercase tracking-wider" style={{ color: slide.highlightColor }}>{slide.tag}</div>}
                      <div className="font-bold text-sm">{slide.title}</div>
                    </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#1B1B1B] truncate">{slide.title}</h3>
                    {slide.subtitle && <p className="text-sm text-[#4A4A4A] truncate">{slide.subtitle}</p>}
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#9A9A9A]">
                      <span>Order: {slide.order}</span>
                      <span>·</span>
                      <span>Link: {slide.link}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleActive(slide)} title={slide.isActive ? 'Deactivate' : 'Activate'} className="p-2 hover:bg-[#F4F4F4] transition min-w-[44px] min-h-[44px] flex items-center justify-center">
                      {slide.isActive ? <FaToggleOn className="text-maybelline-pink text-lg" /> : <FaToggleOff className="text-[#BDBDBD] text-lg" />}
                    </button>
                    <button onClick={() => openEdit(slide)} title="Edit" className="p-2 hover:bg-[#F4F4F4] transition min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <FaEdit className="text-[#4A4A4A]" />
                    </button>
                    <button onClick={() => handleDelete(slide._id)} title="Delete" className="p-2 hover:bg-red-50 transition min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <FaTrash className="text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Mobile layout */}
                <div className="sm:hidden">
                  {slide.bgImage && <div className="w-full h-28 mb-2 rounded overflow-hidden border border-[#E8E8E8]" style={{ background: `url(${slide.bgImage}) center/cover` }} />}
                  <div className="flex items-start gap-3">
                    <FaGripVertical className="text-[#BDBDBD] flex-shrink-0 cursor-grab mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-[#1B1B1B] truncate">{slide.title}</h3>
                          {slide.subtitle && <p className="text-xs text-[#4A4A4A] truncate">{slide.subtitle}</p>}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-[#9A9A9A]">
                            <span>Order: {slide.order}</span>
                            <span>·</span>
                            <span className="truncate">{slide.link}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <button onClick={() => toggleActive(slide)} title={slide.isActive ? 'Deactivate' : 'Activate'} className="p-2.5 hover:bg-[#F4F4F4] transition min-w-[44px] min-h-[44px] flex items-center justify-center">
                          {slide.isActive ? <FaToggleOn className="text-maybelline-pink text-lg" /> : <FaToggleOff className="text-[#BDBDBD] text-lg" />}
                        </button>
                        <button onClick={() => openEdit(slide)} title="Edit" className="p-2.5 hover:bg-[#F4F4F4] transition min-w-[44px] min-h-[44px] flex items-center justify-center">
                          <FaEdit className="text-[#4A4A4A]" />
                        </button>
                        <button onClick={() => handleDelete(slide._id)} title="Delete" className="p-2.5 hover:bg-red-50 transition min-w-[44px] min-h-[44px] flex items-center justify-center">
                          <FaTrash className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHeroSlides;
