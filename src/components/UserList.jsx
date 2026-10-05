'use client'
import React from 'react';
import { FaEdit, FaTrash, FaEye, FaCircle, FaShoppingCart, FaEnvelope, FaPhone, FaUser, FaBan } from 'react-icons/fa';

const UserList = ({ users, onEdit, onDelete, onViewDetails, onBan, onUnban, onlineUsers }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

    return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3">
              User
            </th>
            <th scope="col" className="px-6 py-3">
              Contact
            </th>
            <th scope="col" className="px-6 py-3">
              Status
            </th>
            <th scope="col" className="px-6 py-3">
              Cart
            </th>
            <th scope="col" className="px-6 py-3">
              Joined
            </th>
            <th scope="col" className="px-6 py-3">
              Actions
            </th>
            </tr>
          </thead>
          <tbody>
          {users.length > 0 ? (
            users.map((user) => {
              const isOnline = onlineUsers.has(user._id);
              const hasCart = user.hasCart || (user.cart && user.cart.items && user.cart.items.length > 0);
              const cartTotal = hasCart ? (user.cartTotal || user.cart?.totalAmount || 0) : 0;
              const cartItems = hasCart ? (user.cartItemsCount || user.cart?.items?.length || 0) : 0;

              return (
                <tr
                  key={user._id}
                  className="bg-white border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={user.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&background=random&size=40`}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&background=random&size=40`;
                          }}
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`}>
                          {isOnline && <FaCircle className="w-2 h-2 text-white mx-auto mt-0.5" />}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{user.userName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <FaEnvelope className="text-gray-400 text-xs" />
                        <a 
                          href={`mailto:${user.email}`}
                          className="text-maybelline-pink hover:text-maybelline-magenta hover:underline text-sm"
                        >
                          {user.email}
                        </a>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaPhone className="text-gray-400 text-xs" />
                        <span className="text-sm text-gray-600">
                          {user.phoneNumber}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className={`text-sm font-medium ${
                        isOnline ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {user.isEmailVerified && (
                      <div className="flex items-center space-x-1 mt-1">
                        <FaEnvelope className="text-green-500 text-xs" />
                        <span className="text-xs text-green-600">Verified</span>
                      </div>
                    )}
                    {user.banned && (
                      <div className="mt-1">
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Banned</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {hasCart ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <FaShoppingCart className="text-maybelline-pink text-sm" />
                          <span className="text-sm font-medium text-gray-900">
                            {cartItems} items
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(cartTotal)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-gray-400">
                        <FaShoppingCart className="text-sm" />
                        <span className="text-sm">Empty</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewDetails(user)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-maybelline-pink bg-maybelline-light rounded-lg hover:bg-maybelline-light transition-colors"
                        title="View Details"
                      >
                        <FaEye className="text-xs" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => onEdit(user)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                        title="Edit User"
                      >
                        <FaEdit className="text-xs" />
                        <span>Edit</span>
                      </button>
                      {user.banned ? (
                        <button
                          onClick={() => onUnban?.(user)}
                          disabled={!onUnban}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                          title="Lift this user's ban"
                        >
                          <FaBan className="text-xs" />
                          <span>Unban</span>
                        </button>
                      ) : onBan && (
                        <button
                          onClick={() => onBan(user)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                          title="Ban this user's device/IP"
                        >
                          <FaBan className="text-xs" />
                          <span>Ban</span>
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(user._id)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        title="Delete User"
                      >
                        <FaTrash className="text-xs" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr className="bg-white border-b">
              <td
                colSpan="6"
                className="px-6 py-8 text-center text-gray-500"
              >
                <div className="flex flex-col items-center space-y-2">
                  <FaUser className="text-4xl text-gray-300" />
                  <p className="text-lg font-medium">No users found</p>
                  <p className="text-sm">Start by adding your first user account</p>
                </div>
                </td>
              </tr>
          )}
          </tbody>
        </table>
      </div>
    );
  };
  
  export default UserList;
  
