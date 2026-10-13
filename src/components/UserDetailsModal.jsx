'use client'
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FaTimes, FaCircle, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCreditCard, FaShoppingCart, FaCalendar, FaUser, FaEye, FaEyeSlash, FaGift, FaLock, FaUnlock, FaHistory } from 'react-icons/fa';
import { getStorage } from '../lib/storage';

const UserDetailsModal = ({ user, onClose, isOnline }) => {
  const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
  const [loyalty, setLoyalty] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(true);
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState('');
  const [loyaltyNotice, setLoyaltyNotice] = useState('');
  const [adjustment, setAdjustment] = useState({ direction: 'credit', amountBDT: '', note: '' });

  const adminHeaders = useCallback(() => {
    const token = getStorage('adminAccessToken') || getStorage('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, []);

  const loadLoyalty = useCallback(async () => {
    const headers = adminHeaders();
    if (!headers || !user?._id) {
      setLoyaltyError('Admin session is unavailable. Sign in again to manage loyalty.');
      setLoyaltyLoading(false);
      return;
    }
    setLoyaltyLoading(true);
    setLoyaltyError('');
    try {
      const response = await axios.get(`${API_URI}/api/admin/loyalty/customers/${user._id}`, { headers });
      setLoyalty(response.data);
    } catch (error) {
      setLoyaltyError(error.response?.data?.message || 'Unable to load this customer’s loyalty account.');
    } finally {
      setLoyaltyLoading(false);
    }
  }, [API_URI, adminHeaders, user?._id]);

  useEffect(() => { loadLoyalty(); }, [loadLoyalty]);

  const adjustLoyaltyBalance = async (event) => {
    event.preventDefault();
    const headers = adminHeaders();
    const amountBDT = Number(adjustment.amountBDT);
    if (!headers || !Number.isFinite(amountBDT) || amountBDT <= 0) {
      setLoyaltyError('Enter a valid adjustment amount greater than BDT 0.');
      return;
    }
    setLoyaltySaving(true);
    setLoyaltyError('');
    setLoyaltyNotice('');
    try {
      await axios.post(`${API_URI}/api/admin/loyalty/adjust`, {
        userId: user._id,
        direction: adjustment.direction,
        amountBDT,
        note: adjustment.note,
      }, { headers });
      setAdjustment((current) => ({ ...current, amountBDT: '', note: '' }));
      setLoyaltyNotice(`Balance ${adjustment.direction === 'credit' ? 'credited' : 'debited'} successfully.`);
      await loadLoyalty();
    } catch (error) {
      setLoyaltyError(error.response?.data?.message || 'Unable to adjust the loyalty balance.');
    } finally {
      setLoyaltySaving(false);
    }
  };

  const toggleLoyaltyFreeze = async () => {
    const headers = adminHeaders();
    if (!headers || !loyalty?.customer) return;
    const frozen = !loyalty.customer.redemptionFrozen;
    setLoyaltySaving(true);
    setLoyaltyError('');
    setLoyaltyNotice('');
    try {
      await axios.patch(`${API_URI}/api/admin/loyalty/customers/${user._id}/freeze`, { frozen }, { headers });
      setLoyaltyNotice(frozen ? 'Loyalty redemption frozen. Checkout and POS can no longer spend this balance.' : 'Loyalty redemption unfrozen.');
      await loadLoyalty();
    } catch (error) {
      setLoyaltyError(error.response?.data?.message || 'Unable to update loyalty redemption status.');
    } finally {
      setLoyaltySaving(false);
    }
  };

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

          {/* Loyalty balance and redemption controls */}
          <section className="rounded-lg border border-rose-100 bg-rose-50/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="mb-1 flex items-center text-lg font-semibold text-gray-900">
                  <FaGift className="mr-2 text-rose-600" /> Loyalty balance
                </h3>
                {loyaltyLoading ? (
                  <p className="text-sm text-gray-500">Loading loyalty account…</p>
                ) : loyalty?.customer ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(loyalty.customer.balanceBDT)}</p>
                    <p className="text-sm text-gray-600">
                      {loyalty.customer.tierName || 'Standard customer'} · {Number(loyalty.customer.earnRatePercent || 0)}% earning rate
                    </p>
                    <p className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${loyalty.customer.redemptionFrozen ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {loyalty.customer.redemptionFrozen ? <><FaLock className="mr-1" /> Redemption frozen</> : <><FaUnlock className="mr-1" /> Redemption active</>}
                    </p>
                  </>
                ) : !loyaltyError ? <p className="text-sm text-gray-500">No loyalty account details available.</p> : null}
              </div>
              <button
                type="button"
                onClick={toggleLoyaltyFreeze}
                disabled={loyaltySaving || loyaltyLoading || !loyalty?.customer}
                className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${loyalty?.customer?.redemptionFrozen ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {loyaltySaving ? 'Saving…' : loyalty?.customer?.redemptionFrozen ? 'Unfreeze redemption' : 'Freeze redemption'}
              </button>
            </div>

            <form onSubmit={adjustLoyaltyBalance} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[140px_140px_minmax(0,1fr)_auto]">
              <select
                value={adjustment.direction}
                onChange={(event) => setAdjustment((current) => ({ ...current, direction: event.target.value }))}
                className="min-h-10 rounded border border-gray-300 bg-white px-3 text-sm"
                aria-label="Balance adjustment type"
              >
                <option value="credit">Add BDT</option>
                <option value="debit">Deduct BDT</option>
              </select>
              <input
                type="number" min="0.01" step="0.01" required placeholder="Amount"
                value={adjustment.amountBDT}
                onChange={(event) => setAdjustment((current) => ({ ...current, amountBDT: event.target.value }))}
                className="min-h-10 rounded border border-gray-300 bg-white px-3 text-sm"
              />
              <input
                type="text" maxLength={300} placeholder="Reason (optional)"
                value={adjustment.note}
                onChange={(event) => setAdjustment((current) => ({ ...current, note: event.target.value }))}
                className="min-h-10 rounded border border-gray-300 bg-white px-3 text-sm"
              />
              <button type="submit" disabled={loyaltySaving || loyaltyLoading || !loyalty?.customer} className="min-h-10 rounded bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
                {loyaltySaving ? 'Saving…' : 'Update balance'}
              </button>
            </form>

            {loyaltyError && <p role="alert" className="mt-3 text-sm text-red-700">{loyaltyError}</p>}
            {loyaltyNotice && <p role="status" className="mt-3 text-sm text-emerald-700">{loyaltyNotice}</p>}

            {!loyaltyLoading && loyalty?.transactions?.length > 0 && (
              <div className="mt-5 border-t border-rose-100 pt-4">
                <h4 className="mb-2 flex items-center text-sm font-semibold text-gray-800"><FaHistory className="mr-2" /> Recent points history</h4>
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {loyalty.transactions.map((transaction) => (
                    <div key={transaction._id} className="flex items-start justify-between gap-3 rounded bg-white px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{transaction.note || String(transaction.source || 'Loyalty transaction').replaceAll('_', ' ')}</p>
                        <p className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`shrink-0 font-semibold ${transaction.direction === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {transaction.direction === 'credit' ? '+' : '−'}{formatCurrency(transaction.amountBDT)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

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
