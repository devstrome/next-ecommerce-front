'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaEye, FaSearch } from 'react-icons/fa';
import { getStorage } from "../lib/storage";
import SEOEditor from '../components/SEOEditor';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

const BlogAdmin = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);

  const [form, setForm] = useState({
    title: '', content: '', excerpt: '', coverImage: '',
    author: 'Belorella', tags: '', category: 'General', status: 'draft',
    seo: { metaTitle: '', metaDescription: '', metaKeywords: '', ogImage: '' },
  });

  const categories = ['General', 'Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Tips & Tricks', 'News', 'Trends'];

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      const res = await axios.get(`${API_URI}/api/admin/blogs?${params}`, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` },
      });
      setBlogs(res.data);
    } catch (err) {
      console.error('Error fetching blogs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlogs(); }, [searchQuery, statusFilter]);

  const handleSave = async () => {
    try {
      const payload = { ...form };
      const token = getStorage('adminAccessToken');
      if (editingBlog) {
        await axios.put(`${API_URI}/api/admin/blogs/${editingBlog._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_URI}/api/admin/blogs`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowForm(false);
      setEditingBlog(null);
      resetForm();
      fetchBlogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save blog');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this blog post?')) return;
    try {
      await axios.delete(`${API_URI}/api/admin/blogs/${id}`, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` },
      });
      fetchBlogs();
    } catch (err) {
      alert('Failed to delete blog');
    }
  };

  const handleEdit = (blog) => {
    setForm({
      title: blog.title, content: blog.content, excerpt: blog.excerpt || '',
      coverImage: blog.coverImage || '', author: blog.author || 'Belorella',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : blog.tags || '',
      category: blog.category || 'General', status: blog.status || 'draft',
      seo: { metaTitle: blog.seo?.metaTitle || '', metaDescription: blog.seo?.metaDescription || '', metaKeywords: blog.seo?.metaKeywords || '', ogImage: blog.seo?.ogImage || '' },
    });
    setEditingBlog(blog);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      title: '', content: '', excerpt: '', coverImage: '',
      author: 'Belorella', tags: '', category: 'General', status: 'draft',
      seo: { metaTitle: '', metaDescription: '', metaKeywords: '', ogImage: '' },
    });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-black">Blog Management</h1>
        <button
          onClick={() => { resetForm(); setEditingBlog(null); setShowForm(true); }}
          className="flex items-center bg-maybelline-pink text-white px-4 py-2 hover:bg-maybelline-magenta transition min-h-[44px]"
        >
          <FaPlus className="mr-2" /> New Blog
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-3 text-mid-gray" />
          <input
            type="text" placeholder="Search blogs..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
          />
        </div>
        <select
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Blog Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-black mb-4">{editingBlog ? 'Edit Blog' : 'New Blog'}</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Title" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal" />
              <input type="text" placeholder="Cover Image URL" value={form.coverImage}
                onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal" />
              <input type="text" placeholder="Excerpt" value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal" />
              <textarea placeholder="Content (HTML supported)" value={form.content} rows={10}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal font-mono text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-1">Category</label>
                  <select value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-1">Status</label>
                  <select value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <input type="text" placeholder="Tags (comma-separated)" value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal" />
              <input type="text" placeholder="Author" value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal" />

              <div className="border-t border-cool-gray pt-4">
                <SEOEditor
                  seo={form.seo}
                  onChange={(newSeo) => setForm({ ...form, seo: newSeo })}
                  type="blog"
                  itemId={editingBlog?._id}
                  itemName={form.title || 'blog-post'}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditingBlog(null); }}
                className="px-4 py-2 border border-cool-gray text-dark-gray hover:bg-cool-gray transition">Cancel</button>
              <button onClick={handleSave}
                className="px-4 py-2 bg-maybelline-pink text-white hover:bg-maybelline-magenta transition">
                {editingBlog ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blog List */}
      <div className="bg-white border border-cool-gray">
        {loading ? (
          <div className="p-8 text-center text-dark-gray">Loading...</div>
        ) : blogs.length === 0 ? (
          <div className="p-8 text-center text-dark-gray">No blogs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-cool-gray bg-pure-white">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase">Title</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase">Category</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase">Views</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blogs.map((blog) => (
                  <tr key={blog._id} className="border-b border-cool-gray hover:bg-pure-white transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-black">{blog.title}</div>
                      <div className="text-xs text-mid-gray truncate max-w-xs">{blog.excerpt || 'No excerpt'}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-gray">{blog.category}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 ${
                        blog.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {blog.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-gray">{blog.views || 0}</td>
                    <td className="py-3 px-4 text-sm text-dark-gray">
                      {new Date(blog.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(blog)}
                          className="p-2 text-mid-gray hover:text-maybelline-pink transition" title="Edit">
                          <FaEdit size={14} />
                        </button>
                        <a href={`/blog/${blog.slug}`} target="_blank" rel="noopener noreferrer"
                          className="p-2 text-mid-gray hover:text-maybelline-pink transition" title="View">
                          <FaEye size={14} />
                        </a>
                        <button onClick={() => handleDelete(blog._id)}
                          className="p-2 text-mid-gray hover:text-red-500 transition" title="Delete">
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogAdmin;
