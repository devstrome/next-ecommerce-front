'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { useRouter } from "next/navigation";

const GenderManagement = () => {
  const [genders, setGenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [type, setType] = useState('');
  const [editingGender, setEditingGender] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchGenders();
  }, []);

  const fetchGenders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/genders`);
      setGenders(response.data);
    } catch (error) {
      console.error('Error fetching genders:', error);
    }
    setLoading(false);
  };

  const handleAddGender = async () => {
    try {
      const newGender = { type };
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/genders`, newGender);
      setGenders([...genders, response.data]);
      setType('');
    } catch (error) {
      console.error('Error adding gender:', error);
    }
  };

  const handleUpdateGender = async () => {
    try {
      const updatedGender = { type };
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/genders/${editingGender._id}`, updatedGender);
      setGenders(genders.map(gender => (gender._id === editingGender._id ? response.data : gender)));
      setType('');
      setEditingGender(null);
    } catch (error) {
      console.error('Error updating gender:', error);
    }
  };

  const handleDeleteGender = async (id) => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/genders/${id}`);
      setGenders(genders.filter(gender => gender._id !== id));
    } catch (error) {
      console.error('Error deleting gender:', error);
    }
  };

  const startEditing = (gender) => {
    setType(gender.type);
    setEditingGender(gender);
  };

  const filteredGenders = genders.filter((gender) => {
    const query = searchQuery.toLowerCase();
    return gender.type.toLowerCase().includes(query);
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
            <h1 className="font-heading text-3xl sm:text-4xl text-black" style={{ fontFamily: "'Inter', serif" }}>Gender Management</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center bg-white border border-cool-gray flex-1 sm:flex-initial">
              <FaSearch className="text-mid-gray ml-3" />
              <input
                type="text"
                placeholder="Search genders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 w-full sm:w-64 bg-transparent focus:outline-none focus:ring-2 focus:ring-charcoal text-black"
              />
            </div>
            <button
              onClick={() => {
                if (editingGender) handleUpdateGender();
                else handleAddGender();
              }}
              className="flex items-center justify-center bg-black text-white px-4 py-2 hover:bg-maybelline-pink transition min-h-[44px]"
            >
              <FaPlus className="mr-2" /> {editingGender ? 'Update Gender' : 'Add Gender'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-cool-gray">
          <div className="p-4 border-b border-cool-gray bg-pure-white">
            <h2 className="font-heading text-lg text-black" style={{ fontFamily: "'Inter', serif" }}>{editingGender ? 'Edit Gender' : 'Add New Gender'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <input
                type="text"
                placeholder="Gender Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
                required
              />
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="border-b border-cool-gray bg-pure-white">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="2" className="text-center py-8 text-dark-gray">
                      Loading genders...
                    </td>
                  </tr>
                ) : filteredGenders.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center py-8 text-dark-gray">
                      No genders found.
                    </td>
                  </tr>
                ) : (
                  filteredGenders.map((gender) => (
                    <tr key={gender._id} className="border-b border-cool-gray hover:bg-pure-white transition">
                      <td className="py-3 px-4 text-black">{gender.type}</td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            className="flex items-center bg-maybelline-pink text-white px-3 py-1 text-sm hover:bg-rose transition min-h-[44px]"
                            onClick={() => startEditing(gender)}
                          >
                            <FaEdit className="mr-1" /> Edit
                          </button>
                          <button
                            className="flex items-center bg-red-500 text-white px-3 py-1 text-sm hover:bg-red-600 transition min-h-[44px]"
                            onClick={() => handleDeleteGender(gender._id)}
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
              <div className="text-center py-8 text-dark-gray">Loading genders...</div>
            ) : filteredGenders.length === 0 ? (
              <div className="text-center py-8 text-dark-gray">No genders found.</div>
            ) : (
              filteredGenders.map((gender) => (
                <div key={gender._id} className="bg-white border border-cool-gray p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-black">{gender.type}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      className="flex items-center bg-maybelline-pink text-white px-3 py-2 text-sm hover:bg-rose transition min-h-[44px] min-w-[44px]"
                      onClick={() => startEditing(gender)}
                    >
                      <FaEdit className="mr-1" /> Edit
                    </button>
                    <button
                      className="flex items-center bg-red-500 text-white px-3 py-2 text-sm hover:bg-red-600 transition min-h-[44px] min-w-[44px]"
                      onClick={() => handleDeleteGender(gender._id)}
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

export default GenderManagement;
