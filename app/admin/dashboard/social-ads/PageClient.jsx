'use client'
import { getStorage } from '../../../../src/lib/storage'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  FiShare2, FiSend, FiCalendar, FiDollarSign, FiPlus, FiTrash2,
  FiEdit, FiEye, FiTarget, FiBarChart2, FiTrendingUp, FiImage,
  FiX, FiCheckCircle, FiHash
} from 'react-icons/fi'
import { FaFacebookF, FaInstagram, FaYoutube, FaTwitter } from 'react-icons/fa'

const PLATFORM_COLORS = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  twitter: '#1DA1F2'
}

const PLATFORM_ICONS = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  youtube: FaYoutube,
  twitter: FaTwitter
}

const emptyForm = {
  platform: 'facebook',
  title: '',
  description: '',
  imageUrl: '',
  linkUrl: '',
  status: 'draft',
  scheduledDate: '',
  budget: '',
  targetAudience: '',
  hashtags: '',
  notes: ''
}

export default function PageClient() {
  const [ads, setAds] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAd, setEditingAd] = useState(null)
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [form, setForm] = useState(emptyForm)

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
  })

  const fetchAds = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/admin/social-ads`, authHeaders())
      setAds(res.data.ads || res.data || [])
    } catch (err) {
      toast.error('Failed to fetch ads')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/admin/social-ads/stats`, authHeaders())
      setStats(res.data.stats || res.data || {})
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchAds()
    fetchStats()
  }, [])

  const filteredAds = filterPlatform === 'all'
    ? ads
    : ads.filter(ad => ad.platform === filterPlatform)

  const platformCounts = ads.reduce((acc, ad) => {
    acc[ad.platform] = (acc[ad.platform] || 0) + 1
    return acc
  }, {})

  const openCreate = () => {
    setEditingAd(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (ad) => {
    setEditingAd(ad)
    setForm({
      platform: ad.platform || 'facebook',
      title: ad.title || '',
      description: ad.description || '',
      imageUrl: ad.imageUrl || '',
      linkUrl: ad.linkUrl || '',
      status: ad.status || 'draft',
      scheduledDate: ad.scheduledDate ? ad.scheduledDate.slice(0, 16) : '',
      budget: ad.budget || '',
      targetAudience: ad.targetAudience || '',
      hashtags: Array.isArray(ad.hashtags) ? ad.hashtags.join(', ') : (ad.hashtags || ''),
      notes: ad.notes || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        budget: form.budget ? Number(form.budget) : undefined,
        hashtags: form.hashtags ? form.hashtags.split(',').map(h => h.trim()).filter(Boolean) : []
      }

      if (editingAd) {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/admin/social-ads/${editingAd._id || editingAd.id}`, payload, authHeaders())
        toast.success('Ad updated successfully')
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/admin/social-ads`, payload, authHeaders())
        toast.success('Ad created successfully')
      }

      setShowModal(false)
      setEditingAd(null)
      setForm(emptyForm)
      fetchAds()
      fetchStats()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save ad')
      console.error(err)
    }
  }

  const handleDelete = async (ad) => {
    if (!window.confirm(`Delete ad "${ad.title}"?`)) return
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/admin/social-ads/${ad._id || ad.id}`, authHeaders())
      toast.success('Ad deleted')
      fetchAds()
      fetchStats()
    } catch (err) {
      toast.error('Failed to delete ad')
      console.error(err)
    }
  }

  const statusColor = (status) => {
    const colors = { draft: '#6B7280', scheduled: '#3B82F6', posted: '#10B981', failed: '#EF4444' }
    return colors[status] || '#6B7280'
  }

  const PlatformIcon = ({ platform, size = 16 }) => {
    const Icon = PLATFORM_ICONS[platform] || FiHash
    return <Icon size={size} style={{ color: PLATFORM_COLORS[platform] || '#666' }} />
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const hashtagsArray = form.hashtags ? form.hashtags.split(',').map(h => h.trim()).filter(Boolean) : []

  const removeHashtag = (tag) => {
    setForm({ ...form, hashtags: hashtagsArray.filter(h => h !== tag).join(', ') })
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#1A1A1A', minHeight: '100vh', background: '#F9FAFB' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <FiShare2 size={28} color="#E6007E" />
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Social Media Ads</h1>
        </div>

        {/* Stats Cards */}
        <div className="social-ads-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Ads', value: stats.totalAds ?? ads.length, icon: <FiSend size={20} />, color: '#E6007E' },
            { label: 'Posted', value: stats.posted ?? ads.filter(a => a.status === 'posted').length, icon: <FiCheckCircle size={20} />, color: '#10B981' },
            { label: 'Scheduled', value: stats.scheduled ?? ads.filter(a => a.status === 'scheduled').length, icon: <FiCalendar size={20} />, color: '#3B82F6' },
            { label: 'Total Budget', value: `$${(stats.totalBudget ?? ads.reduce((s, a) => s + (a.budget || 0), 0)).toLocaleString()}`, icon: <FiDollarSign size={20} />, color: '#E6007E' }
          ].map((card, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, flexShrink: 0 }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{card.value}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
          {[
            { key: 'all', label: 'All', icon: null },
            { key: 'facebook', label: 'Facebook', icon: FaFacebookF },
            { key: 'instagram', label: 'Instagram', icon: FaInstagram },
            { key: 'youtube', label: 'YouTube', icon: FaYoutube },
            { key: 'twitter', label: 'X / Twitter', icon: FaTwitter }
          ].map(tab => {
            const isActive = filterPlatform === tab.key
            const count = tab.key === 'all' ? ads.length : (platformCounts[tab.key] || 0)
            return (
              <button
                key={tab.key}
                onClick={() => setFilterPlatform(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, border: '1px solid',
                  borderColor: isActive ? '#E6007E' : '#D1D5DB',
                  background: isActive ? '#E6007E' : '#fff',
                  color: isActive ? '#fff' : '#374151',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 500,
                  transition: 'all 0.15s'
                }}
              >
                {tab.icon && <tab.icon size={14} />}
                {tab.label}
                <span style={{ fontSize: 12, opacity: 0.8 }}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Create Ad Button */}
        <button
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '12px 0', marginBottom: 24,
            background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#E6007E'}
          onMouseLeave={e => e.currentTarget.style.background = '#1A1A1A'}
        >
          <FiPlus size={18} /> Create Ad
        </button>

        {/* Ads Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#E6007E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : filteredAds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#9CA3AF' }}>
            <FiShare2 size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>No ads yet. Create your first social media ad!</p>
          </div>
        ) : (
          <div className="social-ads-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 16 }}>
            {filteredAds.map(ad => (
              <div key={ad._id || ad.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, transition: 'box-shadow 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${PLATFORM_COLORS[ad.platform]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PlatformIcon platform={ad.platform} size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{ad.title}</div>
                      <span style={{
                        display: 'inline-block', marginTop: 4, padding: '2px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                        background: `${statusColor(ad.status)}15`, color: statusColor(ad.status)
                      }}>
                        {ad.status}
                      </span>
                    </div>
                  </div>
                </div>

                {ad.description && (
                  <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 12px', lineHeight: 1.5 }}>
                    {ad.description.length > 80 ? ad.description.slice(0, 80) + '...' : ad.description}
                  </p>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, fontSize: 13, color: '#6B7280' }}>
                  {ad.budget > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiDollarSign size={14} /> ${ad.budget.toLocaleString()}
                    </span>
                  )}
                  {ad.scheduledDate && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiCalendar size={14} /> {formatDate(ad.scheduledDate)}
                    </span>
                  )}
                  {ad.targetAudience && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiTarget size={14} /> {ad.targetAudience}
                    </span>
                  )}
                </div>

                {ad.status === 'posted' && ad.engagement && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16, padding: 12, background: '#F9FAFB', borderRadius: 8 }}>
                    {[
                      { label: 'Likes', val: ad.engagement.likes },
                      { label: 'Shares', val: ad.engagement.shares },
                      { label: 'Comments', val: ad.engagement.comments },
                      { label: 'Clicks', val: ad.engagement.clicks },
                      { label: 'Impressions', val: ad.engagement.impressions }
                    ].filter(e => e.val != null).map((e, i) => (
                      <div key={i} style={{ fontSize: 12 }}>
                        <span style={{ color: '#9CA3AF' }}>{e.label}: </span>
                        <span style={{ fontWeight: 600 }}>{e.val?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openEdit(ad)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 0', border: '1px solid #E5E7EB', borderRadius: 8,
                      background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    <FiEdit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ad)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 0', border: '1px solid #FEE2E2', borderRadius: 8,
                      background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    <FiTrash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', padding: 16
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{editingAd ? 'Edit Ad' : 'Create Ad'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}>
                <FiX size={20} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Platform Selector */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Platform</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {Object.entries(PLATFORM_COLORS).map(([key, color]) => {
                    const Icon = PLATFORM_ICONS[key]
                    return (
                      <button
                        key={key}
                        onClick={() => setForm({ ...form, platform: key })}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '12px 4px', borderRadius: 10, border: '2px solid',
                          borderColor: form.platform === key ? color : '#E5E7EB',
                          background: form.platform === key ? `${color}10` : '#fff',
                          cursor: 'pointer', transition: 'all 0.15s', fontSize: 12, fontWeight: 500, textTransform: 'capitalize'
                        }}
                      >
                        <Icon size={20} style={{ color }} />
                        {key}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Title</label>
                <input
                  type="text" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ad title"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Ad description..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Image URL */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <FiImage size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Image URL
                </label>
                <input
                  type="url" value={form.imageUrl}
                  onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Link URL */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Link URL</label>
                <input
                  type="url" value={form.linkUrl}
                  onChange={e => setForm({ ...form, linkUrl: e.target.value })}
                  placeholder="https://example.com"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['draft', 'scheduled', 'posted'].map(s => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, status: s })}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid',
                        borderColor: form.status === s ? statusColor(s) : '#D1D5DB',
                        background: form.status === s ? `${statusColor(s)}15` : '#fff',
                        color: form.status === s ? statusColor(s) : '#6B7280',
                        cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduled Date */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Scheduled Date</label>
                <input
                  type="datetime-local" value={form.scheduledDate}
                  onChange={e => setForm({ ...form, scheduledDate: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Budget */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Budget ($)</label>
                <input
                  type="number" value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })}
                  placeholder="0.00" min="0"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Target Audience */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Target Audience</label>
                <input
                  type="text" value={form.targetAudience}
                  onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                  placeholder="e.g. Women 18-34, beauty enthusiasts"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Hashtags */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hashtags (comma-separated)</label>
                <input
                  type="text" value={form.hashtags}
                  onChange={e => setForm({ ...form, hashtags: e.target.value })}
                  placeholder="beauty, makeup, skincare"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
                {hashtagsArray.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {hashtagsArray.map(tag => (
                      <span key={tag} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                        background: '#F3F4F6', color: '#374151'
                      }}>
                        <FiHash size={10} />{tag}
                        <button onClick={() => removeHashtag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex' }}>
                          <FiX size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Internal notes..."
                  rows={2}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', gap: 12, padding: '0 24px 24px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #D1D5DB',
                  background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                  background: '#E6007E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                {editingAd ? 'Update Ad' : 'Create Ad'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .social-ads-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 1024px) {
          .social-ads-stats { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
