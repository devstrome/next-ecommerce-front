'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { 
  FaUsers, FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, 
  FaUserShield, FaUserCog, FaRedo, FaSearch, FaShoppingCart,
  FaCircle, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCreditCard
} from 'react-icons/fa';
import axios from 'axios';
import { useAdmin } from '../context/AdminContext';
import { io } from 'socket.io-client';
import UserList from '../components/UserList';
import UserForm from '../components/UserForm';
import UserDetailsModal from '../components/UserDetailsModal';

const UserCrudPage = () => {
  const { admin, isAuthenticated, loading: authLoading } = useAdmin();
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const API_URI = process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000";

  // Helper function to get admin token
  const getAdminToken = () => {
    return getStorage("adminAccessToken") || 
           getStorage("adminToken") || 
           getStorage("adminRefreshToken") || 
           getStorage("accessToken");
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      console.log('No admin token found for Socket.IO connection');
      return;
    }

    console.log('🔌 Initializing Socket.IO connection...');
    const newSocket = io(API_URI, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully');
      newSocket.emit('joinAdminRoom');
      
      // Request current online users
      newSocket.emit('getOnlineUsers');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
    });

    newSocket.on('userOnlineStatus', (data) => {
      console.log('👤 User online status update:', data);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.isOnline) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    });

    newSocket.on('onlineUsersList', (data) => {
      console.log('👥 Received online users list:', data);
      if (data && data.onlineUsers) {
        setOnlineUsers(new Set(data.onlineUsers));
      }
    });

    newSocket.on('userActivity', (data) => {
      console.log('👤 User activity update:', data);
      // Update user's last activity
      setUsers(prev => prev.map(user => 
        user._id === data.userId 
          ? { ...user, lastActivity: data.timestamp }
          : user
      ));
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Cleaning up Socket.IO connection...');
      newSocket.disconnect();
    };
  }, [API_URI]);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      console.log('👥 Fetching users...');
      const token = getAdminToken();
      if (!token) {
        console.error('❌ No admin token found');
        toast.error('Authentication required');
        return;
      }

      console.log('👥 Making API request to:', `${API_URI}/api/users`);
      const headers = { Authorization: `Bearer ${token}` };
      const [response, bansResponse] = await Promise.all([
        axios.get(`${API_URI}/api/users`, { headers }),
        axios.get(`${API_URI}/api/bans`, { headers }),
      ]);

      console.log('👥 Users fetched successfully:', response.data.length, 'users');
      const activeBanByUserId = new Map();
      for (const ban of bansResponse.data) {
        if (ban.active && ban.targetType === 'user' && ban.targetId) {
          const userId = String(ban.targetId);
          if (!activeBanByUserId.has(userId)) activeBanByUserId.set(userId, ban._id);
        }
      }
      setUsers(response.data.map((user) => ({
        ...user,
        activeBanId: activeBanByUserId.get(String(user._id)) || null,
      })));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Admin privileges required.');
      } else if (error.response?.status === 404) {
        toast.error('API endpoint not found.');
      } else {
        toast.error(`Failed to load users: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Add new user
  const addUser = async (userData) => {
    try {
      const token = getAdminToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const formData = new FormData();
      formData.append('firstName', userData.firstName);
      formData.append('lastName', userData.lastName);
      formData.append('email', userData.email);
      formData.append('userName', userData.userName);
      formData.append('password', userData.password);
      formData.append('phoneNumber', userData.phoneNumber);
      
      if (userData.image) {
        formData.append('image', userData.image);
      }

      const response = await axios.post(`${API_URI}/api/users`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('User created successfully');
      setUsers([...users, response.data.user]);
      setShowForm(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create user';
      toast.error(errorMessage);
    }
  };

  // Update existing user
  const updateUser = async (updatedUser) => {
    try {
      const token = getAdminToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Send multipart (for image) with only the fields that are set, so the
      // admin can change one field or everything at once.
      const formData = new FormData();
      ['firstName', 'lastName', 'email', 'userName', 'phoneNumber'].forEach((k) => {
        if (updatedUser[k] !== undefined && updatedUser[k] !== null && String(updatedUser[k]).trim() !== '') {
          formData.append(k, updatedUser[k]);
        }
      });
      if (updatedUser.password) formData.append('password', updatedUser.password);
      if (updatedUser.image) formData.append('image', updatedUser.image);

      const response = await axios.put(`${API_URI}/api/users/${updatedUser._id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('User updated successfully');
      setUsers(users.map(user => 
        user._id === updatedUser._id ? response.data.user : user
      ));
      setShowForm(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update user';
      toast.error(errorMessage);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getAdminToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      await axios.delete(`${API_URI}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('User deleted successfully');
      setUsers(users.filter(user => user._id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete user';
      toast.error(errorMessage);
    }
  };

  // Ban a user by their stored device/IP
  const banUser = async (user) => {
    if (!window.confirm(`Ban ${user.firstName} ${user.lastName}? Their device/IP/network will be blocked from creating new accounts.`)) {
      return;
    }
    try {
      const token = getAdminToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      const reason = window.prompt('Reason for ban (optional):', '') || '';
      const { data } = await axios.post(`${API_URI}/api/bans/user`, { userId: user._id, reason }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('User banned');
      // Remove their active session / refresh token server-side and reflect it
      setUsers((prev) => prev.map((u) => (u._id === user._id
        ? { ...u, banned: true, activeBanId: data.ban?._id || null }
        : u)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to ban user');
    }
  };

  const unbanUser = async (user) => {
    if (!user.activeBanId) {
      toast.error('Could not find this user’s active ban. Refresh and try again.');
      return;
    }
    if (!window.confirm(`Lift the ban for ${user.firstName} ${user.lastName}?`)) return;
    try {
      const token = getAdminToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      await axios.delete(`${API_URI}/api/bans/${user.activeBanId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.map((u) => (u._id === user._id
        ? { ...u, banned: false, activeBanId: null }
        : u)));
      toast.success('User ban lifted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lift user ban');
    }
  };

  // Handle edit action
  const editUser = (user) => {
    setCurrentUser(user);
    setShowForm(true);
  };

  // Handle view details action
  const viewUserDetails = async (user) => {
    try {
      console.log('👤 Viewing details for user:', user._id);
      
      // Cart information is already included in the user data from getAllUsers
      setSelectedUser(user);
      setShowDetailsModal(true);
      
      console.log('👤 User details ready:', user);
    } catch (error) {
      console.error('❌ Error viewing user details:', error);
      toast.error('Failed to load user details');
    }
  };

  // Handle cancel edit
  const cancelEdit = () => {
    setCurrentUser(null);
    setShowForm(false);
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber?.includes(searchTerm)
  );

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated]);

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-maybelline-pink"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500">
          <p>Please log in to access this page</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-maybelline-pink"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 text-sm">Manage user accounts and monitor activity</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => {
                fetchUsers();
                toast.success('User list refreshed');
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-maybelline-pink text-white rounded-lg hover:bg-maybelline-pink transition-colors min-h-[44px]"
            >
              <FaRedo className="text-sm" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors min-h-[44px]"
            >
              <FaPlus className="text-sm" />
              <span>Add User</span>
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Last updated: {formatTime(lastUpdate)}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-maybelline-pink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.length}
              </p>
              <p className="text-sm text-gray-500">
                {onlineUsers.size} online now
              </p>
            </div>
            <div className="p-3 bg-maybelline-light rounded-full">
              <FaUsers className="text-maybelline-pink text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {onlineUsers.size}
              </p>
              <p className="text-sm text-gray-500">
                Currently online
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaCircle className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verified Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(user => user.isEmailVerified).length}
              </p>
              <p className="text-sm text-gray-500">
                Email verified
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FaEnvelope className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-maybelline-pink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Users with Cart</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(user => user.hasCart || (user.cart && user.cart.items && user.cart.items.length > 0)).length}
              </p>
              <p className="text-sm text-gray-500">
                Active carts
              </p>
            </div>
            <div className="p-3 bg-maybelline-light rounded-full">
              <FaShoppingCart className="text-maybelline-pink text-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:space-x-4">
        {/* User List */}
        <div className="flex-1 mb-4 lg:mb-0">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">User List</h2>
              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white w-full min-h-[44px]"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
            <UserList 
              users={filteredUsers} 
              onEdit={editUser} 
              onDelete={deleteUser}
              onViewDetails={viewUserDetails}
              onBan={banUser}
              onUnban={unbanUser}
              onlineUsers={onlineUsers}
            />
          </div>
        </div>

        {/* User Form */}
        {showForm && (
          <div className="w-full max-w-md">
            <UserForm
              onSubmit={currentUser ? updateUser : addUser}
              currentUser={currentUser}
              onCancel={cancelEdit}
            />
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
          isOnline={onlineUsers.has(selectedUser._id)}
        />
      )}
    </div>
  );
};

export default UserCrudPage;
