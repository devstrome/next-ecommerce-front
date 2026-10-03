'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch, FaTag } from 'react-icons/fa';
import { useRouter } from "next/navigation";

const BadgeManagement = () => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [editingBadge, setEditingBadge] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/badges`);
      setBadges(response.data);
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
    setLoading(false);
  };

  const handleAddBadge = async () => {
    try {
      const newBadge = { name, color };
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/badges`, newBadge);
      setBadges([...badges, response.data]);
      setName('');
      setColor('');
    } catch (error) {
      console.error('Error adding badge:', error);
    }
  };

  const handleUpdateBadge = async () => {
    try {
      const updatedBadge = { name, color };
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/badges/${editingBadge._id}`, updatedBadge);
      setBadges(badges.map(badge => (badge._id === editingBadge._id ? response.data : badge)));
      setName('');
      setColor('');
      setEditingBadge(null);
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  };

  const handleDeleteBadge = async (id) => {
    if (window.confirm('Are you sure you want to delete this badge?')) {
      try {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/badges/${id}`);
        setBadges(badges.filter(badge => badge._id !== id));
      } catch (error) {
        console.error('Error deleting badge:', error);
      }
    }
  };

  const startEditing = (badge) => {
    setName(badge.name);
    setColor(badge.color);
    setEditingBadge(badge);
  };

  const filteredBadges = badges.filter((badge) => {
    const query = searchQuery.toLowerCase();
    return (
      badge.name.toLowerCase().includes(query) || badge.color.toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-pure-white min-h-screen p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-dark-gray hover:text-black transition min-h-[44px]"
              aria-label="Go Back"
            >
              <FaArrowLeft className="text-2xl" />
            </button>
            <h1 className="font-heading text-3xl sm:text-4xl text-black" style={{ fontFamily: "'Inter', serif" }}>Badge Management</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center bg-white border border-cool-gray flex-1 sm:flex-initial">
              <FaSearch className="text-mid-gray ml-3" />
              <input
                type="text"
                placeholder="Search badges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 w-full sm:w-64 bg-transparent focus:outline-none focus:ring-2 focus:ring-charcoal text-black"
              />
            </div>
            <button
              onClick={() => {
                if (editingBadge) handleUpdateBadge();
                else handleAddBadge();
              }}
              className="flex items-center justify-center bg-black text-white px-4 py-2 hover:bg-maybelline-pink transition min-h-[44px]"
            >
              <FaPlus className="mr-2" /> {editingBadge ? 'Update Badge' : 'Add Badge'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-cool-gray">
          <div className="p-4 border-b border-cool-gray bg-pure-white">
            <h2 className="font-heading text-lg text-black flex items-center" style={{ fontFamily: "'Inter', serif" }}>
              <FaTag className="mr-2 text-maybelline-pink" />
              {editingBadge ? 'Edit Badge' : 'Add New Badge'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-dark-gray mb-1">Badge Name</label>
                <input
                  type="text"
                  placeholder="Enter badge name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-dark-gray mb-1">Badge Color (Hex)</label>
                <input
                  type="text"
                  placeholder="#FF0000"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
                  required
                />
              </div>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="border-b border-cool-gray bg-pure-white">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Color</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-dark-gray">
                      Loading badges...
                    </td>
                  </tr>
                ) : filteredBadges.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-dark-gray">
                      {searchQuery ? 'No badges found matching your search.' : 'No badges found.'}
                    </td>
                  </tr>
                ) : (
                  filteredBadges.map((badge) => (
                    <tr key={badge._id} className="border-b border-cool-gray hover:bg-pure-white transition">
                      <td className="py-3 px-4 font-medium text-black">{badge.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-6 h-6 border border-mid-gray"
                            style={{ backgroundColor: badge.color }}
                          />
                          <span className="text-dark-gray">{badge.color}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            className="flex items-center bg-maybelline-pink text-white px-3 py-1 text-sm hover:bg-rose transition min-h-[44px]"
                            onClick={() => startEditing(badge)}
                          >
                            <FaEdit className="mr-1" /> Edit
                          </button>
                          <button
                            className="flex items-center bg-red-500 text-white px-3 py-1 text-sm hover:bg-red-600 transition min-h-[44px]"
                            onClick={() => handleDeleteBadge(badge._id)}
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
              <div className="text-center py-8 text-dark-gray">Loading badges...</div>
            ) : filteredBadges.length === 0 ? (
              <div className="text-center py-8 text-dark-gray">
                {searchQuery ? 'No badges found matching your search.' : 'No badges found.'}
              </div>
            ) : (
              filteredBadges.map((badge) => (
                <div key={badge._id} className="bg-white border border-cool-gray p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-black">{badge.name}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border border-mid-gray" style={{ backgroundColor: badge.color }} />
                      <span className="text-sm text-dark-gray">{badge.color}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <button
                      className="flex items-center bg-maybelline-pink text-white px-3 py-2 text-sm hover:bg-rose transition min-h-[44px] min-w-[44px]"
                      onClick={() => startEditing(badge)}
                    >
                      <FaEdit className="mr-1" /> Edit
                    </button>
                    <button
                      className="flex items-center bg-red-500 text-white px-3 py-2 text-sm hover:bg-red-600 transition min-h-[44px] min-w-[44px]"
                      onClick={() => handleDeleteBadge(badge._id)}
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
    </div>
  );
};

export default BadgeManagement;
