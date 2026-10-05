'use client'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { getStorage } from '../../../../src/lib/storage'
import {
  FiSearch, FiRefreshCw, FiZap, FiCheck, FiAlertCircle,
  FiDatabase, FiChevronDown, FiChevronUp, FiFileText, FiLayers, FiTrash2
} from 'react-icons/fi'

function SeoEditFields({ editSeo, setEditSeo }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Meta Title</label>
        <input value={editSeo.metaTitle || ''} onChange={e => setEditSeo({ ...editSeo, metaTitle: e.target.value })}
          className="w-full text-sm text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC143C] transition" />
        <span className={`text-xs mt-1 ${editSeo.metaTitle?.length > 60 ? 'text-red-500' : 'text-[#9CA3AF]'}`}>{editSeo.metaTitle?.length || 0}/60</span>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Meta Description</label>
        <textarea value={editSeo.metaDescription || ''} onChange={e => setEditSeo({ ...editSeo, metaDescription: e.target.value })} rows={3}
          className="w-full text-sm text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC143C] transition resize-none" />
        <span className={`text-xs mt-1 ${editSeo.metaDescription?.length > 160 ? 'text-red-500' : 'text-[#9CA3AF]'}`}>{editSeo.metaDescription?.length || 0}/160</span>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Keywords</label>
        <input value={editSeo.metaKeywords || ''} onChange={e => setEditSeo({ ...editSeo, metaKeywords: e.target.value })}
          className="w-full text-sm text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC143C] transition" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">OG Image URL</label>
        <input value={editSeo.ogImage || ''} onChange={e => setEditSeo({ ...editSeo, ogImage: e.target.value })}
          className="w-full text-sm text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC143C] transition" />
      </div>
    </div>
  )
}

function SeoViewFields({ seo }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Meta Title</label>
        <p className="text-sm text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2">{seo?.metaTitle || 'Not generated'}</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Meta Description</label>
        <p className="text-sm text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2">{seo?.metaDescription || 'Not generated'}</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Keywords</label>
        <p className="text-sm text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2">{seo?.metaKeywords || '—'}</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">OG Image</label>
        <p className="text-sm text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 truncate">{seo?.ogImage || '—'}</p>
      </div>
    </div>
  )
}

export default function PageClient() {
  const [stats, setStats] = useState({ total: 0, withSEO: 0, pending: 0, blogTotal: 0, blogWithSEO: 0, blogPending: 0, staticTotal: 0, staticWithSEO: 0, staticPending: 0 })
  const [products, setProducts] = useState([])
  const [blogs, setBlogs] = useState([])
  const [staticPages, setStaticPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [forceGenerating, setForceGenerating] = useState(false)
  const [expandedItem, setExpandedItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('products')
  const [editingItem, setEditingItem] = useState(null)
  const [editSeo, setEditSeo] = useState({})
  const [saving, setSaving] = useState(false)

  const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` }
  })

  const extractArray = (response) => {
    if (!response) return []
    const d = response.data
    if (Array.isArray(d)) return d
    if (Array.isArray(d?.blogs)) return d.blogs
    if (Array.isArray(d?.data)) return d.data
    if (Array.isArray(d?.pages)) return d.pages
    if (Array.isArray(d?.staticPages)) return d.staticPages
    if (Array.isArray(d?.items)) return d.items
    if (Array.isArray(d?.results)) return d.results
    return []
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, productsRes, blogsRes, staticRes] = await Promise.allSettled([
        axios.get(`${API_URI}/api/seo/stats`, getAuthHeader()),
        axios.get(`${API_URI}/api/products`, getAuthHeader()),
        axios.get(`${API_URI}/api/admin/blogs?limit=1000`, getAuthHeader()),
        axios.get(`${API_URI}/api/seo/static-pages`, getAuthHeader()),
      ])
      setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : { total: 0, withSEO: 0, pending: 0, blogTotal: 0, blogWithSEO: 0, blogPending: 0, staticTotal: 0, staticWithSEO: 0, staticPending: 0 })
      setProducts(extractArray(productsRes.status === 'fulfilled' ? productsRes.value : null))
      setBlogs(extractArray(blogsRes.status === 'fulfilled' ? blogsRes.value : null))
      setStaticPages(extractArray(staticRes.status === 'fulfilled' ? staticRes.value : null))
    } catch (err) {
      console.error('Failed to fetch SEO data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleGeneratePending = async () => {
    try {
      setGenerating(true)
      await axios.post(`${API_URI}/api/seo/generate`, {}, getAuthHeader())
      await fetchData()
    } catch (err) {
      console.error('Failed to generate pending SEO:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleForceRegenerate = async () => {
    try {
      setForceGenerating(true)
      await axios.post(`${API_URI}/api/seo/force`, {}, getAuthHeader())
      await fetchData()
    } catch (err) {
      console.error('Failed to force regenerate:', err)
    } finally {
      setForceGenerating(false)
    }
  }

  const handleRegenerateSingle = async (id, type) => {
    try {
      const endpoint = type === 'blog' ? `/api/seo/blog/${id}` : `/api/seo/product/${id}`
      await axios.post(`${API_URI}${endpoint}`, {}, getAuthHeader())
      await fetchData()
    } catch (err) {
      console.error('Failed to regenerate SEO:', err)
    }
  }

  const handleRegenerateStaticPage = async (slug) => {
    try {
      const page = staticPages.find(p => p.slug === slug)
      if (!page) return
      const updatedSeo = {
        metaTitle: `${page.title} | Belorella`,
        metaDescription: `Visit the ${page.title} page at Belorella. Premium Fashion & Lifestyle.`,
        metaKeywords: `${page.title}, Belorella, Bangladesh`,
        ogImage: '/logo.png',
        autoGenerated: true,
        lastGenerated: new Date(),
      }
      await axios.put(`${API_URI}/api/seo/static-page/${slug}`, { seo: updatedSeo }, getAuthHeader())
      await fetchData()
    } catch (err) {
      console.error('Failed to regenerate static page SEO:', err)
    }
  }

  const handleUpdateStaticPageSEO = async (slug, seo) => {
    try {
      await axios.put(`${API_URI}/api/seo/static-page/${slug}`, { seo }, getAuthHeader())
      await fetchData()
    } catch (err) {
      console.error('Failed to update static page SEO:', err)
    }
  }

  const startEditing = (itemKey, seo) => {
    setEditingItem(itemKey)
    setEditSeo({ metaTitle: seo?.metaTitle || '', metaDescription: seo?.metaDescription || '', metaKeywords: seo?.metaKeywords || '', ogImage: seo?.ogImage || '' })
  }

  const cancelEditing = () => {
    setEditingItem(null)
    setEditSeo({})
  }

  const handleSaveSeo = async (type, id, variantId) => {
    try {
      setSaving(true)
      if (type === 'product') {
        await axios.put(`${API_URI}/api/seo/product/${id}`, { seo: editSeo }, getAuthHeader())
      } else if (type === 'blog') {
        await axios.put(`${API_URI}/api/seo/blog/${id}`, { seo: editSeo }, getAuthHeader())
      } else if (type === 'static') {
        await axios.put(`${API_URI}/api/seo/static-page/${id}`, { seo: editSeo }, getAuthHeader())
      } else if (type === 'variant') {
        await axios.put(`${API_URI}/api/seo/product/${id}/variant/${variantId}`, { seo: editSeo }, getAuthHeader())
      }
      setEditingItem(null)
      setEditSeo({})
      await fetchData()
    } catch (err) {
      console.error('Failed to save SEO:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateVariant = async (productId, variantId) => {
    try {
      await axios.post(`${API_URI}/api/seo/product/${productId}/variant/${variantId}`, {}, getAuthHeader())
      await fetchData()
    } catch (err) {
      console.error('Failed to regenerate variant SEO:', err)
    }
  }

  const handleClearVariant = async (productId, variantId) => {
    if (!window.confirm("Clear this variant's custom SEO? The page will inherit the product SEO.")) return
    try {
      await axios.delete(`${API_URI}/api/seo/product/${productId}/variant/${variantId}`, getAuthHeader())
      if (editingItem === `v-${productId}:${variantId}`) cancelEditing()
      await fetchData()
    } catch (err) {
      console.error('Failed to clear variant SEO:', err)
    }
  }

  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  const filteredBlogs = blogs.filter(b => b.title?.toLowerCase().includes(searchTerm.toLowerCase()))
  const filteredPages = staticPages.filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || p.slug?.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FiSearch size={28} className="text-[#DC143C]" />
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">SEO Optimizer</h1>
          </div>
          <p className="text-[#6B7280] text-sm sm:text-base">
            Monitor and optimize SEO data for all products and blog posts
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
                <FiDatabase size={18} className="text-[#6B7280]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#6B7280]">Products</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">{stats.total}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs text-[#059669]">{stats.withSEO} opt</span>
              <span className="text-xs text-[#D97706]">{stats.pending} pend</span>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] flex items-center justify-center">
                <FiFileText size={18} className="text-[#DC143C]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#6B7280]">Blog Posts</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">{stats.blogTotal || 0}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs text-[#059669]">{stats.blogWithSEO || 0} opt</span>
              <span className="text-xs text-[#D97706]">{stats.blogPending || 0} pend</span>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                <FiFileText size={18} className="text-[#2563EB]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#6B7280]">Static Pages</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">{stats.staticTotal || 0}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs text-[#059669]">{stats.staticWithSEO || 0} opt</span>
              <span className="text-xs text-[#D97706]">{stats.staticPending || 0} pend</span>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                <FiZap size={18} className="text-[#D97706]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#6B7280]">Total Coverage</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
              {(() => {
                const total = (stats.total || 0) + (stats.blogTotal || 0) + (stats.staticTotal || 0);
                const done = (stats.withSEO || 0) + (stats.blogWithSEO || 0) + (stats.staticWithSEO || 0);
                return total > 0 ? Math.round((done / total) * 100) : 0;
              })()}%
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            onClick={handleGeneratePending}
            disabled={generating}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-200
              ${generating
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60'
                : 'bg-[#1A1A1A] text-white hover:bg-[#DC143C]'
              }`}
          >
            {generating ? <span className="animate-spin"><FiRefreshCw size={16} /></span> : <FiZap size={16} />}
            {generating ? 'Generating...' : 'Generate Pending SEO'}
          </button>

          <button
            onClick={handleForceRegenerate}
            disabled={forceGenerating}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-200
              ${forceGenerating
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60'
                : 'bg-[#1A1A1A] text-white hover:bg-[#DC143C]'
              }`}
          >
            {forceGenerating ? <span className="animate-spin"><FiRefreshCw size={16} /></span> : <FiRefreshCw size={16} />}
            {forceGenerating ? 'Regenerating...' : 'Force Regenerate All'}
          </button>
        </div>

        {/* Tab Toggle + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex border border-[#E5E7EB] rounded-lg overflow-hidden">
            <button onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'products' ? 'bg-[#DC143C] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F9FAFB]'}`}>
              <FiDatabase size={14} /> Products ({stats.total})
            </button>
            <button onClick={() => setActiveTab('blogs')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'blogs' ? 'bg-[#DC143C] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F9FAFB]'}`}>
              <FiFileText size={14} /> Blogs ({stats.blogTotal || 0})
            </button>
            <button onClick={() => setActiveTab('static')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'static' ? 'bg-[#DC143C] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F9FAFB]'}`}>
              <FiFileText size={14} /> Pages ({stats.staticTotal || 0})
            </button>
          </div>
          <div className="relative flex-1 max-w-md">
            <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#DC143C]/30 focus:border-[#DC143C]"
            />
          </div>
        </div>

        {/* Products List */}
        {activeTab === 'products' && (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="animate-spin text-[#DC143C]"><FiRefreshCw size={28} /></span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <FiSearch size={40} className="mx-auto text-[#D1D5DB] mb-4" />
              <p className="text-[#6B7280] text-sm">No products found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => {
                const hasSEO = !!product.seo?.metaTitle
                const isExpanded = expandedItem === `p-${product._id}`
                return (
                  <div key={product._id} className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedItem(isExpanded ? null : `p-${product._id}`)}
                      className="w-full text-left bg-white hover:bg-[#F9FAFB] transition-colors duration-150">
                      <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-4 items-center">
                        <div className="col-span-4">
                          <p className="font-semibold text-sm text-[#1A1A1A] truncate">{product.name}</p>
                        </div>
                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${hasSEO ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                            {hasSEO ? <FiCheck size={12} /> : <FiAlertCircle size={12} />}
                            {hasSEO ? 'Optimized' : 'Pending'}
                          </span>
                        </div>
                        <div className="col-span-4">
                          <p className="text-sm text-[#6B7280] truncate">{product.seo?.metaTitle || '—'}</p>
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                          {isExpanded ? <FiChevronUp size={16} className="text-[#9CA3AF]" /> : <FiChevronDown size={16} className="text-[#9CA3AF]" />}
                        </div>
                      </div>
                      <div className="lg:hidden px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-[#1A1A1A] truncate mb-1">{product.name}</p>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${hasSEO ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                              {hasSEO ? <FiCheck size={12} /> : <FiAlertCircle size={12} />}
                              {hasSEO ? 'Optimized' : 'Pending'}
                            </span>
                          </div>
                          {isExpanded ? <FiChevronUp size={18} className="text-[#9CA3AF] shrink-0 mt-1" /> : <FiChevronDown size={18} className="text-[#9CA3AF] shrink-0 mt-1" />}
                        </div>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#F3F4F6] bg-[#FAFAFA]">
                        {editingItem === `p-${product._id}` ? (
                          <>
                            <SeoEditFields editSeo={editSeo} setEditSeo={setEditSeo} />
                            <div className="flex justify-end gap-2">
                              <button onClick={cancelEditing} className="px-4 py-2 border border-[#E5E7EB] text-[#6B7280] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition">Cancel</button>
                              <button onClick={() => handleSaveSeo('product', product._id)} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-[#DC143C] text-white text-sm font-semibold rounded-lg hover:bg-[#B91C1C] transition disabled:opacity-50">
                                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiCheck size={14} />} Save
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <SeoViewFields seo={product.seo} />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => startEditing(`p-${product._id}`, product.seo)}
                                className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] text-[#1A1A1A] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition">
                                <FiSearch size={14} /> Edit SEO
                              </button>
                              <button onClick={() => handleRegenerateSingle(product._id, 'product')}
                                className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#DC143C] transition-all duration-200">
                                <FiRefreshCw size={14} /> Regenerate
                              </button>
                            </div>
                          </>
                        )}

                        {/* Variant SEO */}
                        {Array.isArray(product.variants) && product.variants.length > 0 && (
                          <div className="mt-5 pt-4 border-t border-[#E5E7EB]">
                            <div className="flex items-center gap-2 mb-3">
                              <FiLayers size={14} className="text-[#6B7280]" />
                              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Variant SEO ({product.variants.length})</p>
                            </div>
                            <div className="space-y-3">
                              {product.variants.map((variant) => {
                                const vSeo = variant.seo
                                const hasCustom = !!vSeo?.metaTitle
                                const vKey = `v-${product._id}:${variant._id}`
                                const vEditing = editingItem === vKey
                                const prices = (variant.prices || []).filter(p => typeof p === 'number')
                                const priceLabel = prices.length === 0 ? ''
                                  : prices.length === 1 ? `BDT ${prices[0]}`
                                  : `BDT ${Math.min(...prices)}–${Math.max(...prices)}`
                                const vLabel = [variant.colorName, ...(variant.sizes || [])].filter(Boolean).join(' · ') || 'Variant'
                                return (
                                  <div key={variant._id} className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <p className="text-sm font-semibold text-[#1A1A1A] truncate">{vLabel}</p>
                                        {priceLabel && <span className="text-xs text-[#6B7280] shrink-0">{priceLabel}</span>}
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${hasCustom ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                                          {hasCustom ? <FiCheck size={11} /> : <FiAlertCircle size={11} />}
                                          {hasCustom ? 'Custom SEO' : 'Inherits product'}
                                        </span>
                                      </div>
                                      {!vEditing && (
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => startEditing(vKey, vSeo)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] text-[#1A1A1A] text-xs font-semibold rounded-lg hover:bg-[#F9FAFB] transition">
                                            <FiSearch size={13} /> {hasCustom ? 'Edit SEO' : 'Add SEO'}
                                          </button>
                                          <button onClick={() => handleRegenerateVariant(product._id, variant._id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#DC143C] transition-all duration-200">
                                            <FiRefreshCw size={13} /> Regenerate
                                          </button>
                                          {hasCustom && (
                                            <button onClick={() => handleClearVariant(product._id, variant._id)}
                                              title="Clear variant SEO (inherit product SEO)"
                                              className="flex items-center justify-center w-8 h-8 border border-[#E5E7EB] text-[#DC143C] rounded-lg hover:bg-[#FEF2F2] transition">
                                              <FiTrash2 size={14} />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {vEditing && (
                                      <div className="mt-3 pt-3 border-t border-[#F3F4F6]">
                                        <SeoEditFields editSeo={editSeo} setEditSeo={setEditSeo} />
                                        <div className="flex justify-end gap-2">
                                          <button onClick={cancelEditing} className="px-4 py-2 border border-[#E5E7EB] text-[#6B7280] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition">Cancel</button>
                                          <button onClick={() => handleSaveSeo('variant', product._id, variant._id)} disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#DC143C] text-white text-sm font-semibold rounded-lg hover:bg-[#B91C1C] transition disabled:opacity-50">
                                            {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiCheck size={14} />} Save
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* Blogs List */}
        {activeTab === 'blogs' && (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="animate-spin text-[#DC143C]"><FiRefreshCw size={28} /></span>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-20">
              <FiFileText size={40} className="mx-auto text-[#D1D5DB] mb-4" />
              <p className="text-[#6B7280] text-sm">No blogs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBlogs.map((blog) => {
                const hasSEO = !!blog.seo?.metaTitle
                const isExpanded = expandedItem === `b-${blog._id}`
                return (
                  <div key={blog._id} className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedItem(isExpanded ? null : `b-${blog._id}`)}
                      className="w-full text-left bg-white hover:bg-[#F9FAFB] transition-colors duration-150">
                      <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-4 items-center">
                        <div className="col-span-4">
                          <p className="font-semibold text-sm text-[#1A1A1A] truncate">{blog.title}</p>
                          <p className="text-xs text-[#9CA3AF]">{blog.category}</p>
                        </div>
                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${hasSEO ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                            {hasSEO ? <FiCheck size={12} /> : <FiAlertCircle size={12} />}
                            {hasSEO ? 'Optimized' : 'Pending'}
                          </span>
                        </div>
                        <div className="col-span-4">
                          <p className="text-sm text-[#6B7280] truncate">{blog.seo?.metaTitle || '—'}</p>
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                          {isExpanded ? <FiChevronUp size={16} className="text-[#9CA3AF]" /> : <FiChevronDown size={16} className="text-[#9CA3AF]" />}
                        </div>
                      </div>
                      <div className="lg:hidden px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-[#1A1A1A] truncate mb-1">{blog.title}</p>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${hasSEO ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                              {hasSEO ? <FiCheck size={12} /> : <FiAlertCircle size={12} />}
                              {hasSEO ? 'Optimized' : 'Pending'}
                            </span>
                          </div>
                          {isExpanded ? <FiChevronUp size={18} className="text-[#9CA3AF] shrink-0 mt-1" /> : <FiChevronDown size={18} className="text-[#9CA3AF] shrink-0 mt-1" />}
                        </div>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#F3F4F6] bg-[#FAFAFA]">
                        {editingItem === `b-${blog._id}` ? (
                          <>
                            <SeoEditFields editSeo={editSeo} setEditSeo={setEditSeo} />
                            <div className="flex justify-end gap-2">
                              <button onClick={cancelEditing} className="px-4 py-2 border border-[#E5E7EB] text-[#6B7280] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition">Cancel</button>
                              <button onClick={() => handleSaveSeo('blog', blog._id)} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-[#DC143C] text-white text-sm font-semibold rounded-lg hover:bg-[#B91C1C] transition disabled:opacity-50">
                                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiCheck size={14} />} Save
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <SeoViewFields seo={blog.seo} />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => startEditing(`b-${blog._id}`, blog.seo)}
                                className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] text-[#1A1A1A] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition">
                                <FiSearch size={14} /> Edit SEO
                              </button>
                              <button onClick={() => handleRegenerateSingle(blog._id, 'blog')}
                                className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#DC143C] transition-all duration-200">
                                <FiRefreshCw size={14} /> Regenerate
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* Static Pages Tab */}
        {activeTab === 'static' && (
          <div className="space-y-4">
            {filteredPages.length === 0 ? (
              <div className="text-center py-12 bg-white border border-[#E5E7EB] rounded-xl">
                <FiFileText size={40} className="mx-auto mb-3 text-[#D1D5DB]" />
                <p className="text-[#6B7280]">No static pages found</p>
              </div>
            ) : (
              filteredPages.map((page) => {
                const isExpanded = expandedItem === `static-${page.slug}`
                const hasSEO = page.seo?.metaTitle
                return (
                  <div key={page.slug} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedItem(isExpanded ? null : `static-${page.slug}`)}
                      className="w-full p-4 text-left hover:bg-[#F9FAFB] transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                            <FiFileText size={16} className="text-[#2563EB]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-[#1A1A1A] text-sm sm:text-base">{page.title}</h4>
                            <p className="text-xs text-[#9CA3AF]">/{page.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${hasSEO ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                            {hasSEO ? 'Optimized' : 'Pending'}
                          </span>
                          {isExpanded ? <FiChevronUp size={18} className="text-[#9CA3AF] shrink-0 mt-1" /> : <FiChevronDown size={18} className="text-[#9CA3AF] shrink-0 mt-1" />}
                        </div>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#F3F4F6] bg-[#FAFAFA]">
                        {editingItem === `static-${page.slug}` ? (
                          <>
                            <SeoEditFields editSeo={editSeo} setEditSeo={setEditSeo} />
                            <div className="flex justify-end gap-2">
                              <button onClick={cancelEditing} className="px-4 py-2 border border-[#E5E7EB] text-[#6B7280] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition">Cancel</button>
                              <button onClick={() => handleSaveSeo('static', page.slug)} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-[#DC143C] text-white text-sm font-semibold rounded-lg hover:bg-[#B91C1C] transition disabled:opacity-50">
                                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiCheck size={14} />} Save
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <SeoViewFields seo={page.seo} />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => startEditing(`static-${page.slug}`, page.seo)}
                                className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] text-[#1A1A1A] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition">
                                <FiSearch size={14} /> Edit SEO
                              </button>
                              <button onClick={() => handleRegenerateStaticPage(page.slug)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#DC143C] transition-all duration-200">
                                <FiRefreshCw size={14} /> Regenerate
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
