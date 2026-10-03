'use client'
import React from 'react';
import { FaTimes, FaCircle, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCreditCard, FaShoppingCart, FaCalendar, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';

const UserDetailsModal = ({ user, onClose, isOnline }) => {
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodIcon = (type) => {
    switch (type) {
      case 'card':
        return <FaCreditCard className="text-maybelline-pink" />;
      case 'bkash':
        return <span className="text-green-500 font-bold">bKash</span>;
      case 'nagad':
        return <span className="text-purple-500 font-bold">Nagad</span>;
      default:
        return <FaCreditCard className="text-gray-500" />;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method.type) {
      case 'card':
        return `${method.brand || 'Card'} •••• ${method.last4 || '****'}`;
      case 'bkash':
        return `bKash •••• ${method.walletNumberMasked || '****'}`;
      case 'nagad':
        return `Nagad •••• ${method.walletNumberMasked || '****'}`;
      default:
        return method.label || 'Payment Method';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={user.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&background=random&size=48`}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&background=random&size=48`;
                }}
              />
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}>
                {isOnline && <FaCircle className="w-2 h-2 text-white mx-auto mt-0.5" />}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-sm text-gray-500">
                @{user.userName} • {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaUser className="mr-2" />
                Basic Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <FaEnvelope className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FaPhone className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{user.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FaCalendar className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Joined</p>
                    <p className="text-gray-900">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FaEnvelope className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email Status</p>
                    <p className={`text-sm ${user.isEmailVerified ? 'text-green-600' : 'text-red-600'}`}>
                      {user.isEmailVerified ? 'Verified' : 'Not Verified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaMapMarkerAlt className="mr-2" />
                Address Information
              </h3>
              {user.address ? (
                <div className="space-y-3">
                  {user.address.street && (
                    <div>
                      <p className="text-sm text-gray-500">Street</p>
                      <p className="text-gray-900">{user.address.street}</p>
                    </div>
                  )}
                  {user.address.city && (
                    <div>
                      <p className="text-sm text-gray-500">City</p>
                      <p className="text-gray-900">{user.address.city}</p>
                    </div>
                  )}
                  {user.address.state && (
                    <div>
                      <p className="text-sm text-gray-500">State</p>
                      <p className="text-gray-900">{user.address.state}</p>
                    </div>
                  )}
                  {user.address.zipCode && (
                    <div>
                      <p className="text-sm text-gray-500">ZIP Code</p>
                      <p className="text-gray-900">{user.address.zipCode}</p>
                    </div>
                  )}
                  {user.address.country && (
                    <div>
                      <p className="text-sm text-gray-500">Country</p>
                      <p className="text-gray-900">{user.address.country}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No address information available</p>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaCreditCard className="mr-2" />
              Payment Methods ({user.paymentMethods?.length || 0})
            </h3>
            {user.paymentMethods && user.paymentMethods.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.paymentMethods.map((method, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(method.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getPaymentMethodLabel(method)}
                          </p>
                          {method.isDefault && (
                            <span className="text-xs bg-maybelline-light text-maybelline-magenta px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No payment methods added</p>
            )}
          </div>

          {/* Shopping Cart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <FaShoppingCart className="text-maybelline-pink mr-2" />
              Shopping Cart
            </h3>
            {user.cart && user.cart.items && user.cart.items.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Items:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {user.cart.items.length} items
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total Amount:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'BDT',
                      minimumFractionDigits: 2
                    }).format(user.cart.totalAmount || 0)}
                  </span>
                </div>
                {user.cart.discountAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Discount:</span>
                    <span className="text-sm font-semibold text-red-600">
                      -{new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'BDT',
                        minimumFractionDigits: 2
                      }).format(user.cart.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Cart Items:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {user.cart.items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded border">
                        <img
                          src={item.mainImage || (item.productId && item.productId.imageUrl) || 'https://via.placeholder.com/40'}
                          alt={item.name || (item.productId && item.productId.name) || 'Product'}
                          className="w-8 h-8 rounded object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/40';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {item.name || (item.productId && item.productId.name) || 'Product'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {item.quantity} • {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'BDT',
                              minimumFractionDigits: 2
                            }).format(item.price || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <FaShoppingCart className="text-gray-300 text-2xl mx-auto mb-2" />
                <p className="text-sm text-gray-500">No items in cart</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
