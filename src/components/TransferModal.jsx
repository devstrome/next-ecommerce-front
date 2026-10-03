'use client'
import React, { useState, useEffect, useRef } from "react";
import { BiSearch, BiX, BiUser } from "react-icons/bi";
import { getStorage } from "../lib/storage";

const API_URI = process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000";

const TransferModal = ({ isOpen, onClose, onTransfer }) => {
  const [search, setSearch] = useState("");
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (isOpen) {
      setSearch("");
      setAdmins([]);
      setSelectedAdmin(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!search.trim()) {
      setAdmins([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchAdmins(search.trim());
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchAdmins = async (query) => {
    try {
      setLoading(true);
      const token = getStorage("adminAccessToken") || getStorage("adminToken") || getStorage("accessToken");
      if (!token) return;

      const res = await fetch(`${API_URI}/api/admins/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch (err) {
      console.error("Error searching admins:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (admin) => {
    setSelectedAdmin(admin);
  };

  const handleConfirm = () => {
    if (selectedAdmin) {
      onTransfer(selectedAdmin._id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#BDBDBD] bg-[#F4F4F4]">
          <h3 className="font-semibold text-[#1B1B1B]">Transfer Chat</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 transition-colors">
            <BiX className="w-5 h-5 text-[#4A4A4A]" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#BDBDBD]">
          <div className="relative">
            <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4A4A4A]" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or last 4 digits of phone..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-b-2 border-[#B1123B]"></div>
            </div>
          )}

          {!loading && search && admins.length === 0 && (
            <div className="py-8 text-center text-sm text-[#4A4A4A]">
              No admins found
            </div>
          )}

          {!loading && admins.map((admin) => (
            <div
              key={admin._id}
              onClick={() => handleSelect(admin)}
              className={`flex items-center p-3 cursor-pointer border-b border-gray-100 transition-colors ${
                selectedAdmin?._id === admin._id
                  ? "bg-[#B1123B] bg-opacity-10 border-l-4 border-l-[#B1123B]"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="w-10 h-10 bg-[#F4F4F4] flex items-center justify-center flex-shrink-0">
                {admin.imageUrl ? (
                  <img src={admin.imageUrl} alt="" className="w-10 h-10 object-cover" />
                ) : (
                  <BiUser className="w-5 h-5 text-[#4A4A4A]" />
                )}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1B1B1B] truncate">
                  {admin.firstName} {admin.lastName}
                </p>
                <p className="text-xs text-[#4A4A4A] truncate">{admin.email}</p>
              </div>
              {selectedAdmin?._id === admin._id && (
                <div className="w-4 h-4 bg-[#B1123B] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#BDBDBD] bg-[#F4F4F4]">
          <button
            onClick={handleConfirm}
            disabled={!selectedAdmin}
            className={`w-full py-2.5 text-sm font-medium transition-colors ${
              selectedAdmin
                ? "bg-[#1B1B1B] text-white hover:bg-[#4A4A4A]"
                : "bg-[#E5E5E5] text-[#4A4A4A] cursor-not-allowed"
            }`}
          >
            Transfer to {selectedAdmin ? `${selectedAdmin.firstName} ${selectedAdmin.lastName}` : '...'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferModal;
