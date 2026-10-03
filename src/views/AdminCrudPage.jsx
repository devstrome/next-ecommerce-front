'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FaUsers, FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, 
  FaUserShield, FaUserCog, FaRedo, FaSearch 
} from 'react-icons/fa';
import axios from 'axios';
import { useAdmin } from '../context/AdminContext';
import AdminList from '../components/AdminList';
import AdminForm from '../components/AdminForm';

const AdminCrudPage = () => {
  const { admin, isAuthenticated, loading: authLoading } = useAdmin();
  const [admins, setAdmins] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const API_URI = process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000";

  const isSuperAdmin = admin?.superAdmin || false;

  const getAdminToken = () => {
    return getStorage("adminAccessToken") || 
           getStorage("adminToken") || 
           getStorage("adminRefreshToken") || 
           getStorage("accessToken");
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchAdmins = async () => {
    try {
      const token = getAdminToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await axios.get(`${API_URI}/api/admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAdmins(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching admins:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied. Super admin privileges required.');
      } else {
        toast.error('Failed to load admins');
      }
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async (adminData) => {
    try {
      const token = getAdminToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const formData = new FormData();
      formData.append('firstName', adminData.firstName);
      formData.append('lastName', adminData.lastName);
      formData.append('email', adminData.email);
      formData.append('userName', adminData.userName);
      formData.append('password', adminData.password);
      formData.append('superAdmin', adminData.superAdmin || false);
      
      if (adminData.image) {
        formData.append('image', adminData.image);
      }

      const response = await axios.post(`${API_URI}/api/create-admin`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Admin created successfully');
      setAdmins([...admins, response.data.admin]);
      setShowForm(false);
      setCurrentAdmin(null);
    } catch (error) {
      console.error('Error creating admin:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create admin';
      toast.error(errorMessage);
    }
  };

  const updateAdmin = async (updatedAdmin) => {
    try {
      const token = getAdminToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const formData = new FormData();
      formData.append('firstName', updatedAdmin.firstName);
      formData.append('lastName', updatedAdmin.lastName);
      formData.append('email', updatedAdmin.email);
      formData.append('userName', updatedAdmin.userName);
      if (updatedAdmin.password) {
        formData.append('password', updatedAdmin.password);
      }
      formData.append('superAdmin', updatedAdmin.superAdmin || false);
      
      if (updatedAdmin.image) {
        formData.append('image', updatedAdmin.image);
      }

      const response = await axios.put(`${API_URI}/api/update-admin/${updatedAdmin._id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Admin updated successfully');
      setAdmins(admins.map(admin => 
        admin._id === updatedAdmin._id ? response.data.admin : admin
      ));
      setShowForm(false);
      setCurrentAdmin(null);
    } catch (error) {
      console.error('Error updating admin:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update admin';
      toast.error(errorMessage);
    }
  };

  const deleteAdmin = async (adminId) => {
    if (adminId === admin._id) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this admin?')) {
      return;
    }

    try {
      const token = getAdminToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      await axios.delete(`${API_URI}/api/delete-admin`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { deleteAdminId: adminId }
      });

      toast.success('Admin deleted successfully');
      setAdmins(admins.filter(admin => admin._id !== adminId));
    } catch (error) {
      console.error('Error deleting admin:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete admin';
      toast.error(errorMessage);
    }
  };

  const editAdmin = (admin) => {
    setCurrentAdmin(admin);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setCurrentAdmin(null);
    setShowForm(false);
  };

  const filteredAdmins = admins.filter(admin => 
    admin.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin]);

  if (authLoading) {
    return (
      <div className="p-4 bg-[#FAF8F6] min-h-screen">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-32 w-32 border-b-2 border-[#B1123B]"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-[#FAF8F6] min-h-screen">
        <div className="text-center text-[#4A4A4A]">
          <p>Please log in to access this page</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-4 bg-[#FAF8F6] min-h-screen">
        <div className="text-center text-[#4A4A4A]">
          <FaUserShield className="mx-auto text-6xl text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-[#1B1B1B] mb-2">Access Denied</h2>
          <p>Only super admins can manage admin accounts</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-[#FAF8F6] min-h-screen">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-32 w-32 border-b-2 border-[#B1123B]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#FAF8F6] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>Admin Management</h1>
            <p className="text-[#4A4A4A] text-sm">Manage admin accounts and permissions</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => {
                fetchAdmins();
                toast.success('Admin list refreshed');
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-[#1B1B1B] text-white hover:bg-[#4A4A4A] transition-colors min-h-[44px]"
            >
              <FaRedo className="text-sm" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#B1123B] text-white hover:bg-[#8F0E2F] transition-colors min-h-[44px]"
            >
              <FaPlus className="text-sm" />
              <span>Add Admin</span>
            </button>
          </div>
        </div>
        <p className="text-sm text-[#4A4A4A] mt-2">
          Last updated: {formatTime(lastUpdate)}
        </p>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        <div className="bg-white p-6 border-l-4 border-[#B1123B]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4A4A4A]">Total Admins</p>
              <p className="text-2xl font-bold text-[#1B1B1B]">
                {admins.length}
              </p>
              <p className="text-sm text-[#4A4A4A]">
                {admins.filter(admin => admin.superAdmin).length} super admins
              </p>
            </div>
            <div className="p-3 bg-[#F4F4F4]">
              <FaUsers className="text-[#1B1B1B] text-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:space-x-4">
        {/* Admin List */}
        <div className="flex-1 mb-4 lg:mb-0">
          <div className="bg-white p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-[#1B1B1B]">Admin List</h2>
              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search admins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] focus:border-transparent bg-white w-full min-h-[44px]"
                />
                <FaSearch className="absolute left-3 top-3 text-[#4A4A4A]" />
              </div>
            </div>
            <AdminList 
              admins={filteredAdmins} 
              onEdit={editAdmin} 
              onDelete={deleteAdmin} 
              currentAdminId={admin._id}
            />
          </div>
        </div>

        {/* Admin Form */}
        {showForm && (
          <div className="w-full max-w-md">
            <AdminForm
              onSubmit={currentAdmin ? updateAdmin : addAdmin}
              currentAdmin={currentAdmin}
              onCancel={cancelEdit}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCrudPage;
