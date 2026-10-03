'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch, FaBuilding } from 'react-icons/fa';
import { useRouter } from "next/navigation";

const BrandManagement = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingBrand, setEditingBrand] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/brands`);
      setBrands(response.data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
    setLoading(false);
  };

  const handleAddBrand = async () => {
    try {
      const newBrand = { name, description };
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/brands`, newBrand);
      setBrands([...brands, response.data]);
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Error adding brand:', error);
    }
  };

  const handleUpdateBrand = async () => {
    try {
      const updatedBrand = { name, description };
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/brands/${editingBrand._id}`, updatedBrand);
      setBrands(brands.map(brand => (brand._id === editingBrand._id ? response.data : brand)));
      setName('');
      setDescription('');
      setEditingBrand(null);
    } catch (error) {
      console.error('Error updating brand:', error);
    }
  };

  const handleDeleteBrand = async (id) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      try {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/brands/${id}`);
        setBrands(brands.filter(brand => brand._id !== id));
      } catch (error) {
        console.error('Error deleting brand:', error);
      }
    }
  };

  const startEditing = (brand) => {
    setName(brand.name);
    setDescription(brand.description || '');
    setEditingBrand(brand);
  };

  const filteredBrands = brands.filter((brand) => {
    const query = searchQuery.toLowerCase();
    return (
      brand.name.toLowerCase().includes(query) || (brand.description && brand.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="bg-pure-white min-h-screen p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-dark-gray hover:text-black transition"
              aria-label="Go Back"
            >
              <FaArrowLeft className="text-2xl" />
            </button>
            <h1 className="font-heading text-3xl sm:text-4xl text-black" style={{ fontFamily: "'Inter', serif" }}>Brand Management</h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center bg-white border border-cool-gray flex-1 sm:flex-initial">
              <FaSearch className="text-mid-gray ml-3" />
              <input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 w-full sm:w-64 bg-transparent focus:outline-none focus:ring-2 focus:ring-maybelline-pink text-black"
              />
            </div>
            <button
              onClick={() => {
                if (editingBrand) handleUpdateBrand();
                else handleAddBrand();
              }}
              className="flex items-center bg-maybelline-pink text-white px-4 py-2 hover:bg-maybelline-magenta transition"
            >
              <FaPlus className="mr-2" /> {editingBrand ? 'Update Brand' : 'Add Brand'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-cool-gray">
          <div className="p-4 border-b border-cool-gray bg-pure-white">
            <h2 className="font-heading text-lg text-black flex items-center" style={{ fontFamily: "'Inter', serif" }}>
              <FaBuilding className="mr-2 text-maybelline-pink" />
              {editingBrand ? 'Edit Brand' : 'Add New Brand'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-dark-gray mb-1">Brand Name</label>
                <input
                  type="text"
                  placeholder="Enter brand name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-dark-gray mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Enter brand description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="border-b border-cool-gray bg-pure-white">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Description</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-dark-gray">
                      Loading brands...
                    </td>
                  </tr>
                ) : filteredBrands.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-dark-gray">
                      {searchQuery ? 'No brands found matching your search.' : 'No brands found.'}
                    </td>
                  </tr>
                ) : (
                  filteredBrands.map((brand) => (
                    <tr key={brand._id} className="border-b border-cool-gray hover:bg-pure-white transition">
                      <td className="py-3 px-4 font-medium text-black">{brand.name}</td>
                      <td className="py-3 px-4 text-dark-gray">{brand.description || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            className="flex items-center bg-maybelline-pink text-white px-3 py-1 text-sm hover:bg-maybelline-magenta transition"
                            onClick={() => startEditing(brand)}
                          >
                            <FaEdit className="mr-1" /> Edit
                          </button>
                          <button
                            className="flex items-center bg-red-500 text-white px-3 py-1 text-sm hover:bg-red-600 transition"
                            onClick={() => handleDeleteBrand(brand._id)}
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
        </div>
      </div>
    </div>
  );
};

export default BrandManagement;
