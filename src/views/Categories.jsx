'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch, FaTimes, FaSitemap } from 'react-icons/fa';
import { useRouter } from "next/navigation";
import { getStorage } from "../lib/storage";

const CategoryManagement = () => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', parent: '' });
  const [editing, setEditing] = useState(null);
  const [inlineBrandInputs, setInlineBrandInputs] = useState({});
  const router = useRouter();

  const API = `${process.env.NEXT_PUBLIC_API_URI}`;
  const headers = { Authorization: `Bearer ${getStorage('adminAccessToken')}` };

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/categories/tree`, { headers });
      setTree(res.data);
    } catch (err) {
      console.error('Error fetching tree:', err);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    try {
      await axios.post(`${API}/api/categories`, { name: form.name.trim(), parent: form.parent || null }, { headers });
      resetForm();
      fetchTree();
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const handleEdit = async () => {
    if (!form.name.trim() || !editing) return;
    try {
      await axios.put(`${API}/api/categories/${editing._id}`, { name: form.name.trim() }, { headers });
      resetForm();
      fetchTree();
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category and all its subcategories?')) return;
    try {
      await axios.delete(`${API}/api/categories/${id}`, { headers });
      fetchTree();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const handleAddBrand = async (categoryId) => {
    const brand = (inlineBrandInputs[categoryId] || '').trim();
    if (!brand) return;
    try {
      await axios.post(`${API}/api/categories/${categoryId}/brands`, { brand }, { headers });
      setInlineBrandInputs(prev => ({ ...prev, [categoryId]: '' }));
      fetchTree();
    } catch (err) {
      console.error('Error adding brand:', err);
    }
  };

  const handleRemoveBrand = async (categoryId, brand) => {
    try {
      await axios.delete(`${API}/api/categories/${categoryId}/brands`, { data: { brand }, headers });
      fetchTree();
    } catch (err) {
      console.error('Error removing brand:', err);
    }
  };

  const resetForm = () => {
    setForm({ name: '', parent: '' });
    setEditing(null);
    setFormOpen(false);
  };

  const startEdit = (cat) => {
    setForm({ name: cat.name, parent: cat.parent || '' });
    setEditing(cat);
    setFormOpen(true);
  };

  const startAddSub = (parentId) => {
    setForm({ name: '', parent: parentId });
    setEditing(null);
    setFormOpen(true);
  };

  const filterTree = (nodes) => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.reduce((acc, node) => {
      const childMatches = filterTree(node.children || []);
      const nameMatch = node.name.toLowerCase().includes(q);
      if (nameMatch || childMatches.length > 0) {
        acc.push({ ...node, children: nameMatch ? (node.children || []) : childMatches });
      }
      return acc;
    }, []);
  };

  const filteredTree = filterTree(tree);
  const totalCategories = tree.reduce((sum, c) => sum + 1 + (c.children?.length || 0), 0);

  const renderSubcategory = (sub) => (
    <div key={sub._id} className="flex flex-col md:flex-row md:items-center gap-3 py-3 px-4 md:px-6 bg-pure-white border-b border-cool-gray last:border-b-0">
      <div className="flex-1 min-w-0">
        <span className="font-medium text-black block">{sub.name}</span>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(sub.brands || []).length === 0 ? (
            <span className="text-mid-gray text-xs italic">No brands</span>
          ) : (
            sub.brands.map((brand) => (
              <span key={brand} className="inline-flex items-center bg-[#DC143C] text-white text-xs px-2.5 py-1 rounded-sm">
                {brand}
                <button onClick={() => handleRemoveBrand(sub._id, brand)} className="ml-1.5 text-white hover:text-black transition">
                  <FaTimes className="text-[10px]" />
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            placeholder="Add brand..."
            value={inlineBrandInputs[sub._id] || ''}
            onChange={(e) => setInlineBrandInputs(prev => ({ ...prev, [sub._id]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBrand(sub._id); } }}
            className="flex-1 max-w-[200px] px-3 py-1.5 border border-cool-gray text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
          />
          <button onClick={() => handleAddBrand(sub._id)} className="bg-black text-white px-3 py-1.5 text-xs hover:bg-[#DC143C] transition">
            <FaPlus />
          </button>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => startEdit(sub)} className="flex items-center bg-[#DC143C] text-white px-3 py-2 text-xs hover:bg-[#B91C1C] transition min-h-[36px]">
          <FaEdit className="mr-1" /> Edit
        </button>
        <button onClick={() => handleDelete(sub._id)} className="flex items-center bg-red-500 text-white px-3 py-2 text-xs hover:bg-red-600 transition min-h-[36px]">
          <FaTrash className="mr-1" /> Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-pure-white min-h-screen p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="text-dark-gray hover:text-black transition" aria-label="Go Back">
              <FaArrowLeft className="text-2xl" />
            </button>
            <div>
              <h1 className="text-3xl sm:text-4xl text-black font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>Category Management</h1>
              <p className="text-sm text-dark-gray mt-1">{totalCategories} categories total</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center bg-white border border-cool-gray flex-1 sm:flex-initial">
              <FaSearch className="text-mid-gray ml-3" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 w-full sm:w-56 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#DC143C] text-black text-sm"
              />
            </div>
            <button
              onClick={() => { resetForm(); setFormOpen(true); }}
              className="flex items-center justify-center bg-[#1A1A1A] text-white px-5 py-2.5 hover:bg-[#DC143C] transition min-h-[44px] text-sm font-medium"
            >
              <FaPlus className="mr-2" /> Add Category
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {formOpen && (
          <div className="bg-white border border-cool-gray mb-6">
            <div className="p-4 border-b border-cool-gray flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black" style={{ fontFamily: "'Inter', sans-serif" }}>
                {editing ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button onClick={resetForm} className="text-dark-gray hover:text-black transition">
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-dark-gray uppercase tracking-wider mb-1.5">Name</label>
                  <input
                    type="text"
                    placeholder="Category name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-cool-gray bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-gray uppercase tracking-wider mb-1.5">Parent Category</label>
                  <select
                    value={form.parent}
                    onChange={(e) => setForm(prev => ({ ...prev, parent: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-cool-gray bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                    disabled={!!editing}
                  >
                    <option value="">None (Top-level)</option>
                    {tree.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={editing ? handleEdit : handleAdd}
                  disabled={!form.name.trim()}
                  className="bg-[#1A1A1A] text-white px-6 py-2.5 text-sm font-medium hover:bg-[#DC143C] transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {editing ? 'Save Changes' : 'Create Category'}
                </button>
                <button onClick={resetForm} className="border border-cool-gray text-dark-gray px-6 py-2.5 text-sm hover:bg-pure-white transition min-h-[44px]">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block bg-white border border-cool-gray">
          <div className="px-4 py-3 border-b border-cool-gray bg-pure-white">
            <h3 className="text-sm font-semibold text-dark-gray uppercase tracking-wider">Categories</h3>
          </div>
          {loading ? (
            <div className="text-center py-12 text-dark-gray">Loading categories...</div>
          ) : filteredTree.length === 0 ? (
            <div className="text-center py-12">
              <FaSitemap className="text-4xl text-cool-gray mx-auto mb-3" />
              <p className="text-dark-gray">No categories found.</p>
            </div>
          ) : (
            filteredTree.map((cat) => (
              <div key={cat._id} className="border-b border-cool-gray last:border-b-0">
                {/* Top-level row */}
                <div className="flex items-center gap-4 px-6 py-4 bg-pure-white hover:bg-white transition">
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-black text-base">{cat.name}</span>
                    <span className="ml-2 inline-flex items-center justify-center bg-[#1A1A1A] text-white text-xs px-2 py-0.5 rounded-full min-w-[24px]">
                      {cat.children?.length || 0}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startAddSub(cat._id)} className="flex items-center bg-black text-white px-3 py-2 text-xs hover:bg-[#DC143C] transition min-h-[36px]">
                      <FaPlus className="mr-1" /> Sub
                    </button>
                    <button onClick={() => startEdit(cat)} className="flex items-center bg-[#DC143C] text-white px-3 py-2 text-xs hover:bg-[#B91C1C] transition min-h-[36px]">
                      <FaEdit className="mr-1" /> Edit
                    </button>
                    <button onClick={() => handleDelete(cat._id)} className="flex items-center bg-red-500 text-white px-3 py-2 text-xs hover:bg-red-600 transition min-h-[36px]">
                      <FaTrash className="mr-1" /> Delete
                    </button>
                  </div>
                </div>
                {/* Subcategories */}
                {(cat.children || []).length > 0 ? (
                  <div className="ml-6 border-l-2 border-cool-gray">
                    {cat.children.map(renderSubcategory)}
                  </div>
                ) : (
                  <div className="ml-6 border-l-2 border-cool-gray px-6 py-3 text-sm text-mid-gray italic">
                    No subcategories yet
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="text-center py-12 text-dark-gray">Loading categories...</div>
          ) : filteredTree.length === 0 ? (
            <div className="text-center py-12 bg-white border border-cool-gray">
              <FaSitemap className="text-4xl text-cool-gray mx-auto mb-3" />
              <p className="text-dark-gray">No categories found.</p>
            </div>
          ) : (
            filteredTree.map((cat) => (
              <div key={cat._id} className="bg-white border border-cool-gray overflow-hidden">
                {/* Top-level card */}
                <div className="p-4 bg-pure-white border-b border-cool-gray">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-black">{cat.name}</span>
                      <span className="inline-flex items-center justify-center bg-[#1A1A1A] text-white text-xs px-2 py-0.5 rounded-full">
                        {cat.children?.length || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startAddSub(cat._id)} className="flex-1 flex items-center justify-center bg-black text-white px-3 py-2.5 text-xs font-medium hover:bg-[#DC143C] transition min-h-[44px]">
                      <FaPlus className="mr-1" /> Add Sub
                    </button>
                    <button onClick={() => startEdit(cat)} className="flex-1 flex items-center justify-center bg-[#DC143C] text-white px-3 py-2.5 text-xs font-medium hover:bg-[#B91C1C] transition min-h-[44px]">
                      <FaEdit className="mr-1" /> Edit
                    </button>
                    <button onClick={() => handleDelete(cat._id)} className="flex-1 flex items-center justify-center bg-red-500 text-white px-3 py-2.5 text-xs font-medium hover:bg-red-600 transition min-h-[44px]">
                      <FaTrash className="mr-1" /> Delete
                    </button>
                  </div>
                </div>
                {/* Subcategory cards */}
                {(cat.children || []).length > 0 ? (
                  cat.children.map((sub) => (
                    <div key={sub._id} className="p-4 border-b border-cool-gray last:border-b-0">
                      <div className="font-medium text-black mb-2">{sub.name}</div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(sub.brands || []).length === 0 ? (
                          <span className="text-mid-gray text-xs italic">No brands</span>
                        ) : (
                          sub.brands.map((brand) => (
                            <span key={brand} className="inline-flex items-center bg-[#DC143C] text-white text-xs px-2.5 py-1 rounded-sm">
                              {brand}
                              <button onClick={() => handleRemoveBrand(sub._id, brand)} className="ml-1.5 text-white hover:text-black transition min-h-[32px] min-w-[32px] flex items-center justify-center">
                                <FaTimes className="text-[10px]" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          placeholder="Add brand..."
                          value={inlineBrandInputs[sub._id] || ''}
                          onChange={(e) => setInlineBrandInputs(prev => ({ ...prev, [sub._id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBrand(sub._id); } }}
                          className="flex-1 px-3 py-2 border border-cool-gray text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                        />
                        <button onClick={() => handleAddBrand(sub._id)} className="bg-black text-white px-4 py-2 text-xs hover:bg-[#DC143C] transition min-h-[44px]">
                          Add
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(sub)} className="flex-1 flex items-center justify-center bg-[#DC143C] text-white px-3 py-2.5 text-xs font-medium hover:bg-[#B91C1C] transition min-h-[44px]">
                          <FaEdit className="mr-1" /> Edit
                        </button>
                        <button onClick={() => handleDelete(sub._id)} className="flex-1 flex items-center justify-center bg-red-500 text-white px-3 py-2.5 text-xs font-medium hover:bg-red-600 transition min-h-[44px]">
                          <FaTrash className="mr-1" /> Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm text-mid-gray italic">No subcategories yet</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;
