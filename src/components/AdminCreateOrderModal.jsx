'use client'
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getStorage } from '../lib/storage';
import {
  FaTimes, FaSearch, FaPlus, FaTrash, FaUser, FaBox,
  FaMapMarkerAlt, FaTruck, FaCreditCard, FaCheckCircle
} from 'react-icons/fa';

const API = process.env.NEXT_PUBLIC_API_URI;

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white text-gray-900';
const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1';
const sectionTitleCls = 'text-sm font-bold text-gray-800 flex items-center gap-2 mb-3 pb-2 border-b border-gray-200';

const pickPrice = (arr, sizeIdx) => {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return 0;
  if (sizeIdx >= 0 && sizeIdx < arr.length && Number(arr[sizeIdx]) > 0) return Number(arr[sizeIdx]);
  return Number(arr[0]) > 0 ? Number(arr[0]) : 0;
};

// Discounted price first (matches client behavior: price = discountPrice || price || mainPrice)
const resolvePrice = (product, variant, sizeIdx) => {
  if (variant) {
    const discounted = pickPrice(variant.discountPrices, sizeIdx);
    if (discounted > 0) return discounted;
    const regular = pickPrice(variant.prices, sizeIdx);
    if (regular > 0) return regular;
  }
  if (product?.discountPrice > 0) return Number(product.discountPrice);
  if (product?.mainPrice > 0) return Number(product.mainPrice);
  return 0;
};

// Original (non-discounted) price for strike-through display
const resolveListPrice = (product, variant, sizeIdx) => {
  const regular = variant ? pickPrice(variant.prices, sizeIdx) : 0;
  if (regular > 0) return regular;
  if (product?.mainPrice > 0) return Number(product.mainPrice);
  return 0;
};

const AdminCreateOrderModal = ({ isOpen, onClose, onCreated }) => {
  const adminHeaders = useMemo(() => {
    const token = getStorage('adminAccessToken') || getStorage('adminToken') || getStorage('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userMethods, setUserMethods] = useState([]);

  const [products, setProducts] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [pickedProduct, setPickedProduct] = useState(null);
  const [variantIdx, setVariantIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState([]);

  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);

  const [address, setAddress] = useState({
    fullName: '', address: '', city: '', postalCode: '', state: '', country: '', phone: '',
  });
  const [email, setEmail] = useState('');
  const [paymentChoice, setPaymentChoice] = useState('cod');
  const [trxId, setTrxId] = useState('');
  const [discount, setDiscount] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [orderStatus, setOrderStatus] = useState('pending');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [ruleEval, setRuleEval] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountNum = Number(discount) || 0;
  const finalShipping = ruleEval ? Number(ruleEval.deliveryCharge) : (selectedShipping ? Number(selectedShipping.charge) : 0);
  const feeTotal = ruleEval ? Number(ruleEval.extraFeeTotal || 0) : 0;
  const grandTotal = subtotal - discountNum + finalShipping + feeTotal;
  const warnings = ruleEval?.blockers || [];

  const currentVariant = pickedProduct?.variants?.[variantIdx];
  const currentSizes = currentVariant?.sizes || [];
  const currentStock = currentSizes.length
    ? (currentVariant?.stockBySize?.[sizeIdx] ?? currentVariant?.stock ?? null)
    : (currentVariant?.stock ?? null);
  const currentPrice = pickedProduct && currentVariant
    ? resolvePrice(pickedProduct, currentVariant, currentSizes.length ? sizeIdx : -1)
    : 0;
  const currentListPrice = pickedProduct && currentVariant
    ? resolveListPrice(pickedProduct, currentVariant, currentSizes.length ? sizeIdx : -1)
    : 0;

  const paymentMethodValue = (() => {
    if (paymentChoice === 'cod') return 'Cash on Delivery';
    const m = userMethods.find(x => x._id === paymentChoice);
    return m ? m.type : 'Cash on Delivery';
  })();

  // Load data when opened
  useEffect(() => {
    if (!isOpen) return;
    setUsers([]);
    setUserQuery('');
    setSelectedUser(null);
    setUserMethods([]);
    setProducts([]);
    setProductQuery('');
    setPickedProduct(null);
    setVariantIdx(0);
    setSizeIdx(0);
    setQty(1);
    setItems([]);
    setShippingOptions([]);
    setSelectedShipping(null);
    setAddress({ fullName: '', address: '', city: '', postalCode: '', state: '', country: '', phone: '' });
    setEmail('');
    setPaymentChoice('cod');
    setTrxId('');
    setDiscount('');
    setCouponCode('');
    setOrderStatus('pending');
    setPaymentStatus('pending');
    setRuleEval(null);
    setSubmitting(false);

    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        const [usersRes, productsRes, shippingRes] = await Promise.all([
          axios.get(`${API}/api/users`, { headers: adminHeaders }),
          axios.get(`${API}/api/products?limit=1000`),
          axios.get(`${API}/api/shipping`),
        ]);
        if (cancelled) return;
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        const shipList = Array.isArray(shippingRes.data) ? shippingRes.data : [];
        setShippingOptions(shipList);
        if (shipList.length > 0) setSelectedShipping(shipList[0]);
      } catch (e) {
        console.error('Create order data load failed:', e);
        if (!cancelled) toast.error('Failed to load create-order data');
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Evaluate checkout rules for live totals
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/checkout-rules/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subtotal,
            discountAmount: discountNum,
            shippingCharge: selectedShipping ? Number(selectedShipping.charge) : 0,
            paymentMethod: paymentMethodValue,
            items: items.map(i => ({ name: i.name, quantity: i.quantity })),
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setRuleEval(data);
      } catch {
        if (!cancelled) setRuleEval(null);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isOpen, subtotal, discountNum, selectedShipping?.name, paymentMethodValue, items]);

  const displayName = (u) =>
    u?.fullName || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.userName || u?.email || 'Customer';

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter(u =>
        displayName(u).toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phoneNumber || '').toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [users, userQuery]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(p => (p.name || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, productQuery]);

  const selectUser = async (u) => {
    setSelectedUser(u);
    setUserQuery('');
    setAddress({
      fullName: displayName(u),
      address: u.address?.street || '',
      city: u.address?.city || '',
      postalCode: u.address?.zipCode || '',
      state: u.address?.state || '',
      country: u.address?.country || '',
      phone: u.phoneNumber || u.phone || '',
    });
    setEmail(u.email || '');
    setPaymentChoice('cod');
    setTrxId('');
    try {
      const res = await axios.get(`${API}/api/users/${u._id}`, { headers: adminHeaders });
      setUserMethods(res.data?.paymentMethods || []);
    } catch {
      setUserMethods([]);
    }
  };

  const pickProduct = (p) => {
    setPickedProduct(p);
    setProductQuery('');
    setVariantIdx(0);
    setSizeIdx(0);
    setQty(1);
  };

  const addItem = () => {
    if (!pickedProduct) return;
    const v = pickedProduct.variants?.[variantIdx];
    if (!v) { toast.error('This product has no variants'); return; }
    const sizes = v.sizes || [];
    const sizeLabel = sizes.length ? sizes[sizeIdx] : '';
    const sizeForLookup = sizes.length ? sizeIdx : -1;
    const price = resolvePrice(pickedProduct, v, sizeForLookup);
    const listPrice = resolveListPrice(pickedProduct, v, sizeForLookup);
    if (!price || price <= 0) { toast.error('No price configured for this variant'); return; }
    const stockVal = currentStock;
    const key = `${pickedProduct._id}|${v._id}|${sizeLabel}`;

    setItems(prev => {
      const existing = prev.find(i => i.key === key);
      const targetQty = (existing?.quantity || 0) + Number(qty);
      if (typeof stockVal === 'number' && stockVal >= 0 && targetQty > stockVal) {
        toast.error(`Only ${stockVal} unit(s) in stock for this variant`);
        return prev;
      }
      if (existing) {
        return prev.map(i => (i.key === key ? { ...i, quantity: targetQty } : i));
      }
      return [...prev, {
        key,
        productId: pickedProduct._id,
        variantId: v._id,
        name: pickedProduct.name,
        color: v.colorName || '',
        size: sizeLabel,
        quantity: Number(qty),
        price,
        listPrice,
        mainImage: pickedProduct.mainImage || v.images?.[0] || '',
        measureType: v.measureType || 'pcs',
        unitName: v.unitName || 'unit',
        discountApplied: 0,
        stock: stockVal,
      }];
    });
    toast.success('Added to order');
  };

  const updateQty = (key, newQty) => {
    setItems(prev => prev.map(i => {
      if (i.key !== key) return i;
      let q = Math.max(1, Number(newQty) || 1);
      if (typeof i.stock === 'number' && i.stock >= 0 && q > i.stock) q = i.stock;
      return { ...i, quantity: q };
    }));
  };

  const removeItem = (key) => setItems(prev => prev.filter(i => i.key !== key));

  const validateAddress = () => {
    const required = ['fullName', 'address', 'city', 'postalCode', 'country', 'phone'];
    for (const f of required) {
      if (!String(address[f] || '').trim()) {
        toast.error(`Please enter ${f.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    const mail = email.trim();
    if (!mail) { toast.error('Please enter email address'); return false; }
    if (!/^\S+@\S+\.\S+$/.test(mail)) { toast.error('Please enter a valid email address'); return false; }
    return true;
  };

  const submit = async () => {
    if (!selectedUser) { toast.error('Select a customer'); return; }
    if (items.length === 0) { toast.error('Add at least one product'); return; }
    if (!validateAddress()) return;
    if (!selectedShipping) { toast.error('Select a delivery method'); return; }

    let paymentMethodValueFinal = 'Cash on Delivery';
    let selectedPaymentMethodId;
    const paymentDetails = {};
    if (paymentChoice !== 'cod') {
      const m = userMethods.find(x => x._id === paymentChoice);
      if (!m) { toast.error('Select a valid payment method'); return; }
      paymentMethodValueFinal = m.type;
      selectedPaymentMethodId = m._id;
      if (trxId.trim()) {
        paymentDetails.trxId = trxId.trim();
        paymentDetails.walletNumberMasked = m.walletNumberMasked || '';
        paymentDetails.paymentMethod = m.type;
      }
    }

    const payload = {
      userId: selectedUser._id,
      email: email.trim(),
      items: items.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        name: i.name,
        quantity: Number(i.quantity),
        price: i.price,
        mainImage: i.mainImage,
        size: i.size,
        color: i.color,
        measureType: i.measureType,
        unitName: i.unitName,
        discountApplied: 0,
      })),
      shippingAddress: {
        fullName: address.fullName.trim(),
        address: address.address.trim(),
        city: address.city.trim(),
        postalCode: address.postalCode.trim(),
        state: address.state?.trim() || address.city.trim() || '-',
        country: address.country.trim(),
        phone: address.phone.trim(),
      },
      shipping: {
        name: selectedShipping.name,
        charge: Number(selectedShipping.charge),
        estimatedDays: selectedShipping.estimatedDays || 0,
      },
      paymentMethod: paymentMethodValueFinal,
      selectedPaymentMethodId,
      paymentDetails,
      discountAmount: discountNum,
      couponCode: couponCode.trim() || null,
      orderStatus,
      paymentStatus,
    };

    try {
      setSubmitting(true);
      const res = await axios.post(`${API}/api/admin/orders`, payload, { headers: adminHeaders });
      const created = res.data?.order;
      if (res.data?.warnings?.length) {
        toast.warn(`Order created — ${res.data.warnings.length} checkout rule(s) overridden by admin`);
      }
      if (res.data?.emailSent) {
        toast.success(`Order ${created?.orderId || ''} created — confirmation email sent to ${payload.email}`);
      } else {
        toast.warn(`Order ${created?.orderId || ''} created — confirmation email could not be sent`);
      }
      onCreated?.();
      onClose();
    } catch (e) {
      console.error('Admin create order failed:', e);
      toast.error(e.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <FaPlus className="text-maybelline-pink" />
            Create Order
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <FaTimes size={18} />
          </button>
        </div>

        {loadingData ? (
          <div className="py-16 text-center text-gray-500">
            <div className="animate-spin h-8 w-8 border-b-2 border-maybelline-pink mx-auto mb-3"></div>
            Loading customers, products and delivery methods...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Customer */}
            <section>
              <h4 className={sectionTitleCls}><FaUser className="text-maybelline-pink" /> Customer</h4>
              {!selectedUser ? (
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    placeholder="Search by name, email or phone..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                  />
                  {filteredUsers.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {filteredUsers.map(u => (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => selectUser(u)}
                          className="w-full text-left px-3 py-2 hover:bg-maybelline-light/50 text-sm"
                        >
                          <span className="font-medium text-gray-900">{displayName(u)}</span>
                          <span className="text-gray-500 ml-2">{u.email}</span>
                          {u.phoneNumber && <span className="text-gray-500 ml-2">{u.phoneNumber}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {userQuery.trim() && filteredUsers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">No customers found.</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-maybelline-light/40 border border-maybelline-pink/30 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <FaCheckCircle className="text-green-600 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 truncate">{displayName(selectedUser)}</span>
                    <span className="text-gray-500 truncate">{selectedUser.email}</span>
                    {selectedUser.phoneNumber && <span className="text-gray-500">{selectedUser.phoneNumber}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setUserMethods([]); setPaymentChoice('cod'); }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0 ml-2"
                  >
                    Change
                  </button>
                </div>
              )}
              <div className="mt-3">
                <label className={labelCls}>Email Address *</label>
                <input
                  type="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Order confirmation email will be sent here"
                />
              </div>
            </section>

            {/* Products */}
            <section>
              <h4 className={sectionTitleCls}><FaBox className="text-maybelline-pink" /> Products</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    placeholder="Search products..."
                    value={productQuery}
                    onChange={(e) => { setProductQuery(e.target.value); setPickedProduct(null); }}
                  />
                  {filteredProducts.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                      {filteredProducts.map(p => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => pickProduct(p)}
                          className="w-full text-left px-3 py-2 hover:bg-maybelline-light/50 text-sm flex items-center gap-2"
                        >
                          {p.mainImage && <img src={p.mainImage} alt="" className="w-8 h-8 object-cover rounded" />}
                          <span className="font-medium text-gray-900">{p.name}</span>
                          <span className="text-gray-500 text-xs ml-auto">{p.variants?.length || 0} variant(s)</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {pickedProduct && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className={labelCls}>Color / Variant</label>
                      <select
                        className={inputCls}
                        value={variantIdx}
                        onChange={(e) => { setVariantIdx(Number(e.target.value)); setSizeIdx(0); setQty(1); }}
                      >
                        {(pickedProduct.variants || []).map((v, i) => (
                          <option key={v._id || i} value={i}>{v.colorName || `Variant ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className={labelCls}>Size</label>
                      <select
                        className={inputCls}
                        value={sizeIdx}
                        onChange={(e) => { setSizeIdx(Number(e.target.value)); setQty(1); }}
                        disabled={currentSizes.length === 0}
                      >
                        {currentSizes.length > 0
                          ? currentSizes.map((s, i) => <option key={i} value={i}>{s}</option>)
                          : <option value={0}>Default</option>}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className={labelCls}>Qty</label>
                      <input
                        type="number"
                        min="1"
                        className={inputCls}
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addItem}
                      className="px-4 py-2 bg-maybelline-pink hover:bg-maybelline-magenta text-white text-sm font-medium rounded-md transition min-h-[42px]"
                    >
                      <FaPlus className="inline mr-1" /> Add
                    </button>
                  </div>
                )}
              </div>

              {pickedProduct && currentVariant && (
                <p className="text-xs text-gray-500 mt-2">
                  Price:{' '}
                  {currentListPrice > currentPrice && (
                    <span className="line-through text-gray-400 mr-1">BDT {currentListPrice.toFixed(2)}</span>
                  )}
                  <span className="font-semibold text-gray-800">BDT {currentPrice.toFixed(2)}</span>
                  {typeof currentStock === 'number' && <span className="ml-3">Stock: <span className="font-semibold text-gray-800">{currentStock}</span></span>}
                  {currentVariant.measureType && <span className="ml-3">Unit: {currentVariant.measureType} / {currentVariant.unitName}</span>}
                </p>
              )}

              {items.length > 0 && (
                <div className="mt-3 overflow-x-auto border border-gray-200 rounded-md">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Variant</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Price</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map(i => (
                        <tr key={i.key}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {i.mainImage && <img src={i.mainImage} alt="" className="w-8 h-8 object-cover rounded" />}
                              <span className="font-medium text-gray-900">{i.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-600 text-xs">
                            {i.color || 'Default'}{i.size ? ` · ${i.size}` : ''}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {i.listPrice > i.price && (
                              <span className="line-through text-gray-400 mr-1 text-xs">{i.listPrice.toFixed(2)}</span>
                            )}
                            {i.price.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={i.quantity}
                              onChange={(e) => updateQty(i.key, e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-maybelline-pink"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                            {(i.price * i.quantity).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(i.key)}
                              className="text-red-500 hover:text-red-700"
                              aria-label="Remove item"
                            >
                              <FaTrash size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Shipping address */}
            <section>
              <h4 className={sectionTitleCls}><FaMapMarkerAlt className="text-maybelline-pink" /> Shipping Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input className={inputCls} value={address.fullName} onChange={(e) => setAddress(a => ({ ...a, fullName: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Phone *</label>
                  <input className={inputCls} value={address.phone} onChange={(e) => setAddress(a => ({ ...a, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Country *</label>
                  <input className={inputCls} value={address.country} onChange={(e) => setAddress(a => ({ ...a, country: e.target.value }))} />
                </div>
                <div className="md:col-span-3">
                  <label className={labelCls}>Street Address *</label>
                  <input className={inputCls} value={address.address} onChange={(e) => setAddress(a => ({ ...a, address: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>City *</label>
                  <input className={inputCls} value={address.city} onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>State / District</label>
                  <input className={inputCls} value={address.state} onChange={(e) => setAddress(a => ({ ...a, state: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Postal Code *</label>
                  <input className={inputCls} value={address.postalCode} onChange={(e) => setAddress(a => ({ ...a, postalCode: e.target.value }))} />
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Delivery method */}
              <section>
                <h4 className={sectionTitleCls}><FaTruck className="text-maybelline-pink" /> Delivery Method</h4>
                <div className="space-y-2">
                  {shippingOptions.length === 0 && (
                    <p className="text-sm text-gray-500">No active shipping methods.</p>
                  )}
                  {shippingOptions.map((opt, idx) => (
                    <label
                      key={opt._id || idx}
                      className={`flex items-center justify-between px-3 py-2 border rounded-md cursor-pointer transition ${
                        selectedShipping?.name === opt.name
                          ? 'border-maybelline-pink bg-maybelline-light/40'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="adminShipping"
                          checked={selectedShipping?.name === opt.name}
                          onChange={() => setSelectedShipping(opt)}
                        />
                        <span className="font-medium text-gray-900">{opt.name}</span>
                        <span className="text-gray-500 text-xs">· {opt.estimatedDays} days</span>
                      </span>
                      <span className="text-sm font-semibold text-gray-900">BDT {Number(opt.charge).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Payment */}
              <section>
                <h4 className={sectionTitleCls}><FaCreditCard className="text-maybelline-pink" /> Payment</h4>
                <div className="space-y-2">
                  <label className={`flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer text-sm ${
                    paymentChoice === 'cod' ? 'border-maybelline-pink bg-maybelline-light/40' : 'border-gray-300'
                  }`}>
                    <input type="radio" name="adminPayment" checked={paymentChoice === 'cod'} onChange={() => setPaymentChoice('cod')} />
                    <span className="font-medium text-gray-900">Cash on Delivery</span>
                  </label>
                  {userMethods.map(m => (
                    <label key={m._id} className={`flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer text-sm ${
                      paymentChoice === m._id ? 'border-maybelline-pink bg-maybelline-light/40' : 'border-gray-300'
                    }`}>
                      <input type="radio" name="adminPayment" checked={paymentChoice === m._id} onChange={() => setPaymentChoice(m._id)} />
                      <span className="font-medium text-gray-900">
                        {m.label || `${(m.type || '').toUpperCase()} ${m.walletNumberMasked || m.last4 || ''}`}
                      </span>
                    </label>
                  ))}
                  {selectedUser && userMethods.length === 0 && (
                    <p className="text-xs text-gray-500">This customer has no saved wallet methods — COD available.</p>
                  )}
                  {paymentChoice !== 'cod' && ['bkash', 'nagad'].includes(paymentMethodValue) && (
                    <div>
                      <label className={labelCls}>Transaction ID (TRX, optional)</label>
                      <input
                        className={inputCls}
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        placeholder="e.g. 8JT2R5X9QP"
                      />
                    </div>
                  )}
                </div>

                {/* Statuses + discount */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className={labelCls}>Order Status</label>
                    <select className={inputCls} value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Payment Status</label>
                    <select className={inputCls} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Discount (BDT)</label>
                    <input type="number" min="0" className={inputCls} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className={labelCls}>Coupon Code</label>
                    <input className={inputCls} value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              </section>
            </div>

            {/* Totals */}
            <section className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({items.length} line item(s))</span>
                    <span className="font-medium text-gray-900">BDT {subtotal.toFixed(2)}</span>
                  </div>
                  {discountNum > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-medium text-red-600">- BDT {discountNum.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-medium text-gray-900">
                      {ruleEval?.freeDelivery ? (
                        <>
                          <span className="line-through text-gray-400 mr-1">
                            BDT {(selectedShipping ? Number(selectedShipping.charge) : 0).toFixed(2)}
                          </span>
                          <span className="text-green-600">Free</span>
                        </>
                      ) : ruleEval && finalShipping !== (selectedShipping ? Number(selectedShipping.charge) : 0) ? (
                        <>
                          <span className="line-through text-gray-400 mr-1">
                            BDT {(selectedShipping ? Number(selectedShipping.charge) : 0).toFixed(2)}
                          </span>
                          <span>BDT {finalShipping.toFixed(2)}</span>
                        </>
                      ) : (
                        `BDT ${finalShipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  {(ruleEval?.extraFees || []).map((f, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-600">{f.label}</span>
                      <span className="font-medium text-gray-900">BDT {Number(f.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="md:text-right space-y-2">
                  <div className="text-2xl font-bold text-maybelline-pink">
                    BDT {grandTotal.toFixed(2)}
                  </div>
                  {(ruleEval?.notices || []).map((n, i) => (
                    <p key={i} className="text-xs text-green-700">{n}</p>
                  ))}
                  {warnings.length > 0 && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 md:text-left">
                      <span className="font-semibold">Admin override — checkout rules bypassed:</span>
                      <ul className="list-disc pl-4 mt-1">
                        {warnings.map((w, i) => <li key={i}>{w.message}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !selectedUser || items.length === 0 || !selectedShipping}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-maybelline-pink hover:bg-maybelline-magenta focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maybelline-pink disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCreateOrderModal;
