'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { useRouter } from "next/navigation";

const MeasureTypeManagement = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [measureType, setMeasureType] = useState('');
  const [unitName, setUnitName] = useState('');
  const [editingUnit, setEditingUnit] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/units`);
      setUnits(response.data);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
    setLoading(false);
  };

  const handleAddUnit = async () => {
    if (!measureType.trim() || !unitName.trim()) {
      alert('Please fill in both measure type and unit name.');
      return;
    }
    try {
      const newUnit = { measureType, unitName };
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/units`, newUnit);
      setUnits([...units, response.data]);
      setMeasureType('');
      setUnitName('');
    } catch (error) {
      console.error('Error adding unit:', error);
    }
  };

  const handleUpdateUnit = async () => {
    if (!measureType.trim() || !unitName.trim()) {
      alert('Please fill in both measure type and unit name.');
      return;
    }
    try {
      const updatedUnit = { measureType, unitName };
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/units/${editingUnit._id}`, updatedUnit);
      setUnits(units.map(unit => (unit._id === editingUnit._id ? response.data : unit)));
      setMeasureType('');
      setUnitName('');
      setEditingUnit(null);
    } catch (error) {
      console.error('Error updating unit:', error);
    }
  };

  const handleDeleteUnit = async (id) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/units/${id}`);
      setUnits(units.filter(unit => unit._id !== id));
    } catch (error) {
      console.error('Error deleting unit:', error);
    }
  };

  const startEditing = (unit) => {
    setMeasureType(unit.measureType);
    setUnitName(unit.unitName);
    setEditingUnit(unit);
  };

  const filteredUnits = units.filter((unit) => {
    const query = searchQuery.toLowerCase();
    return (
      unit.measureType.toLowerCase().includes(query) ||
      unit.unitName.toLowerCase().includes(query)
    );
  });

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
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>Measure Type Management</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-white border border-[#BDBDBD]">
            <FaSearch className="text-[#4A4A4A] ml-2" />
            <input
              type="text"
              placeholder="Search measure types or units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 w-full sm:w-64 focus:outline-none bg-white focus:ring-2 focus:ring-[#B1123B]"
            />
          </div>
          <button
            onClick={() => {
              if (editingUnit) handleUpdateUnit();
              else handleAddUnit();
            }}
            className="flex items-center justify-center bg-[#1B1B1B] text-white px-4 py-2 hover:bg-[#4A4A4A] transition min-h-[44px]"
          >
            <FaPlus className="mr-2" /> {editingUnit ? 'Update Unit' : 'Add Unit'}
          </button>
        </div>
      </div>

      <div className="p-4 border border-[#BDBDBD] w-full max-w-5xl bg-white">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-[#1B1B1B]">{editingUnit ? 'Edit Unit' : 'Add New Unit'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Measure Type"
              value={measureType}
              onChange={(e) => setMeasureType(e.target.value)}
              className="px-4 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B]"
              required
            />
            <input
              type="text"
              placeholder="Unit Name"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="px-4 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B]"
              required
            />
          </div>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border border-[#BDBDBD]">
            <thead>
              <tr className="bg-[#F4F4F4]">
                <th className="py-2 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Measure Type</th>
                <th className="py-2 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Unit Name</th>
                <th className="py-2 px-4 border-b border-[#BDBDBD] text-center font-semibold text-[#1B1B1B]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="text-center py-4 text-[#4A4A4A]">
                    Loading units...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-4 text-[#4A4A4A]">
                    No units found.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr key={unit._id} className="hover:bg-[#F4F4F4] border-b border-[#BDBDBD]">
                    <td className="py-2 px-4 text-[#1B1B1B]">{unit.measureType}</td>
                    <td className="py-2 px-4 text-[#4A4A4A]">{unit.unitName}</td>
                    <td className="py-2 px-4">
                      <div className="flex justify-center space-x-2">
                        <button
                          className="flex items-center bg-[#1B1B1B] text-white px-2 py-1 text-sm hover:bg-[#4A4A4A] transition min-h-[44px]"
                          onClick={() => startEditing(unit)}
                        >
                          <FaEdit className="mr-1" /> Edit
                        </button>
                        <button
                          className="flex items-center bg-red-500 text-white px-2 py-1 text-sm hover:bg-red-600 transition min-h-[44px]"
                          onClick={() => handleDeleteUnit(unit._id)}
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
            <div className="text-center py-4 text-[#4A4A4A]">Loading units...</div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-center py-4 text-[#4A4A4A]">No units found.</div>
          ) : (
            filteredUnits.map((unit) => (
              <div key={unit._id} className="bg-white border border-[#BDBDBD] p-4">
                <div className="mb-3">
                  <div className="font-medium text-[#1B1B1B]">{unit.measureType}</div>
                  <div className="text-sm text-[#4A4A4A]">{unit.unitName}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="flex items-center bg-[#1B1B1B] text-white px-3 py-2 text-sm hover:bg-[#4A4A4A] transition min-h-[44px] min-w-[44px]"
                    onClick={() => startEditing(unit)}
                  >
                    <FaEdit className="mr-1" /> Edit
                  </button>
                  <button
                    className="flex items-center bg-red-500 text-white px-3 py-2 text-sm hover:bg-red-600 transition min-h-[44px] min-w-[44px]"
                    onClick={() => handleDeleteUnit(unit._id)}
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

export default MeasureTypeManagement;
