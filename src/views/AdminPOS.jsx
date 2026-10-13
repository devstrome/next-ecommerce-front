'use client'
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { 
  FaBarcode, 
  FaSearch, 
  FaTrash, 
  FaCreditCard, 
  FaMoneyBillWave,
  FaMobileAlt,
  FaUniversity,
  FaCalculator,
  FaBox,
  FaUser,
  FaReceipt,
  FaCheck,
  FaArrowLeft,
  FaShoppingCart,
  FaCashRegister
} from 'react-icons/fa';
import { useRouter } from "next/navigation";
import { usePOS } from '../context/POSContext';
import { formatBDT } from '../config/brand';
import { formatMeasureLine } from '../lib/measure';
import { getStorage, setStorage } from '../lib/storage';

const AdminPOS = () => {
  const router = useRouter();
  const {
    cart,
    customer,
    loyaltyCustomer,
    loyaltyRequested,
    posGiftCode,
    posGiftCodeDetails,
    posGiftCodeLoading,
    scannedBarcode,
    searchResults,
    loading,
    stats,
    paymentMethod,
    paymentTrxId,
    taxRate,
    discount,
    notes,
    outlet,
    barcodeInputRef,
    
    setCustomer,
    setLoyaltyRequested,
    setPOSGiftCode,
    clearPOSGiftCode,
    setScannedBarcode,
    setPaymentMethod,
    setPaymentTrxId,
    setTaxRate,
    setDiscount,
    setNotes,
    setOutlet,
    
    searchProducts,
    scanBarcode,
    addToCart,
    removeFromCart,
    clearCart,
    calculateTotals,
    processOrder,
    lookupLoyaltyCustomer,
    validatePOSGiftCode,
    clearLoyaltyCustomer
  } = usePOS();

  const { subtotal, taxAmount, discountAmount, total } = calculateTotals();
  const [loyaltySearch, setLoyaltySearch] = useState('');
  const [loyaltySearchLoading, setLoyaltySearchLoading] = useState(false);
  const [loyaltyLookupMessage, setLoyaltyLookupMessage] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const productSearchInputRef = useRef(null);
  const loyaltyIsFrozen = Boolean(loyaltyCustomer?.redemptionFrozen);
  const loyaltyCap = loyaltyCustomer?.enabled && !loyaltyIsFrozen ? total * Math.min(100, Math.max(0, Number(loyaltyCustomer.maxRedeemPercent) || 0)) / 100 : 0;
  const loyaltyApplied = loyaltyCustomer && !loyaltyIsFrozen
    ? Math.round(Math.min(Math.max(0, Number(loyaltyRequested) || 0), Number(loyaltyCustomer.balanceBDT) || 0, loyaltyCap, total) * 100) / 100
    : 0;
  const giftCodeApplied = posGiftCodeDetails
    ? Math.round(Math.min(Number(posGiftCodeDetails.amountBDT) || 0, Math.max(0, total - loyaltyApplied)) * 100) / 100
    : 0;
  const amountDue = Math.max(0, Math.round((total - loyaltyApplied - giftCodeApplied) * 100) / 100);

  const handleApplyGiftCode = async () => {
    try {
      const gift = await validatePOSGiftCode();
      toast.success(`Gift code validated · ${formatBDT(Number(gift.amountBDT) || 0)} available`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Gift code could not be validated');
    }
  };

  const handleLoyaltyLookup = async () => {
    const searchValue = loyaltySearch || customer.email || customer.phone;
    setLoyaltyLookupMessage('');
    setLoyaltySearchLoading(true);
    try {
      const linked = await lookupLoyaltyCustomer(searchValue);
      setLoyaltySearch(linked.email || linked.phone || '');
    } catch (error) {
      // A failed lookup must never leave a previously selected member attached to
      // this sale. Clearing loyalty-only values lets the cashier proceed as a
      // regular walk-in/customer sale without rewards or redemption.
      if (loyaltyCustomer) {
        const isEmail = String(searchValue || '').includes('@');
        setCustomer((current) => ({
          ...current,
          name: '',
          email: isEmail ? searchValue : '',
          phone: isEmail ? '' : searchValue,
        }));
      }
      clearLoyaltyCustomer();
      const notFound = error.response?.status === 404;
      const message = notFound
        ? 'No loyalty account found. You can continue this sale normally without loyalty.'
        : 'Loyalty lookup failed. You can continue this sale normally or try the lookup again.';
      setLoyaltyLookupMessage(message);
      if (notFound) toast.info(message);
      else toast.error(error.response?.data?.message || error.message || message);
    } finally {
      setLoyaltySearchLoading(false);
    }
  };

  const productSearchTimerRef = useRef(null);
  useEffect(() => () => window.clearTimeout(productSearchTimerRef.current), []);
  useEffect(() => {
    productSearchInputRef.current?.focus({ preventScroll: true });
  }, []);

  const scheduleProductSearch = (query) => {
    window.clearTimeout(productSearchTimerRef.current);
    productSearchTimerRef.current = window.setTimeout(() => {
      productSearchTimerRef.current = null;
      searchProducts(query);
    }, 300);
  };

  const submitProductSearch = (query = productQuery) => {
    window.clearTimeout(productSearchTimerRef.current);
    productSearchTimerRef.current = null;
    searchProducts(query);
    productSearchInputRef.current?.focus({ preventScroll: true });
  };

  const resultMeasure = (item) => formatMeasureLine({
    ...item,
    measureType: item.measureType || item.variantId?.measureType,
    unitName: item.unitName || item.variantId?.unitName,
  });

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#FAF8F6] p-4 sm:p-6">
      {/* Header */}
      <div className="w-full max-w-7xl mb-4 sm:mb-8 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center text-[#4A4A4A] hover:text-[#1B1B1B] transition min-w-[44px] min-h-[44px] justify-center"
            aria-label="Go Back"
          >
            <FaArrowLeft className="text-2xl" />
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>POS</h1>
        </div>
        <div className="hidden sm:flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-[#4A4A4A]">Cashier</p>
            <p className="font-medium text-[#1B1B1B]">Admin</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#4A4A4A]">Outlet</p>
            <p className="font-medium text-[#1B1B1B]">{outlet}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="w-full max-w-7xl mb-4 sm:mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white border border-[#BDBDBD] p-3 sm:p-6 hover:bg-[#F4F4F4] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[#4A4A4A]">Sales</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">{formatBDT(stats.todaySales || 0)}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 flex items-center justify-center">
                <FaMoneyBillWave className="text-green-600 text-sm sm:text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#BDBDBD] p-3 sm:p-6 hover:bg-[#F4F4F4] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[#4A4A4A]">Orders</p>
                <p className="text-lg sm:text-2xl font-bold text-[#1B1B1B]">{stats.todayOrders || 0}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-[#F4F4F4] flex items-center justify-center">
                <FaReceipt className="text-[#1B1B1B] text-sm sm:text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#BDBDBD] p-3 sm:p-6 hover:bg-[#F4F4F4] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[#4A4A4A]">Completed</p>
                <p className="text-lg sm:text-2xl font-bold text-[#1B1B1B]">{stats.completedOrders || 0}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-[#F4F4F4] flex items-center justify-center">
                <FaCheck className="text-[#1B1B1B] text-sm sm:text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#BDBDBD] p-3 sm:p-6 hover:bg-[#F4F4F4] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-[#4A4A4A]">Cart</p>
                <p className="text-lg sm:text-2xl font-bold text-[#1B1B1B]">{cart.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-[#F4F4F4] flex items-center justify-center">
                <FaShoppingCart className="text-[#1B1B1B] text-sm sm:text-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main POS Interface */}
      <div className="w-full max-w-7xl">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Panel - Product Search and Cart */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
            {/* Search and Barcode Section */}
            <div className="bg-white border border-[#BDBDBD] p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center text-[#1B1B1B]">
                <FaSearch className="mr-2 text-[#B1123B]" />
                <span className="hidden sm:inline">Product Search & Barcode Scanner</span>
                <span className="sm:hidden">Search & Scan</span>
              </h2>
              {/* Mobile: Full-width search, stacked */}
              <div className="flex flex-col gap-3">
                {/* Product Search - Prominent on mobile */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Product Search</label>
                  <div className="flex space-x-2">
                    <input
                      ref={productSearchInputRef}
                      type="text"
                      placeholder="Search products..."
                      value={productQuery}
                      onChange={(e) => {
                        setProductQuery(e.target.value);
                        scheduleProductSearch(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          submitProductSearch();
                        }
                      }}
                      className="flex-1 px-4 py-3 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B] text-base min-h-[48px]"
                    />
                    <button
                      onClick={() => submitProductSearch()}
                      disabled={loading}
                      className="px-4 py-3 bg-[#4A4A4A] text-white hover:bg-[#1B1B1B] disabled:opacity-50 min-h-[48px] min-w-[48px] flex items-center justify-center"
                    >
                      <FaSearch size={20} />
                    </button>
                  </div>
                </div>

                {/* Barcode Scanner (physical HID scanner input) */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-2">
                    Barcode Scanner
                    <span className="ml-2 text-xs font-normal text-[#777]">Scan or type a code, then press Enter</span>
                  </label>
                  <div className="flex space-x-2">
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Scan barcode..."
                      value={scannedBarcode}
                      onChange={(e) => setScannedBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          scanBarcode(scannedBarcode);
                        }
                      }}
                      autoComplete="off"
                      className="flex-1 px-4 py-3 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B] text-base min-h-[48px]"
                    />
                    <button
                      onClick={() => scanBarcode(scannedBarcode)}
                      disabled={loading}
                      aria-label="Look up barcode"
                      className="px-4 py-3 bg-[#1B1B1B] text-white hover:bg-[#4A4A4A] disabled:opacity-50 min-h-[48px] min-w-[48px] flex items-center justify-center"
                    >
                      <FaBarcode size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto border border-[#BDBDBD]">
                  {searchResults.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => {
                        addToCart(item);
                        window.requestAnimationFrame(() => productSearchInputRef.current?.focus({ preventScroll: true }));
                      }}
                      className="p-3 border-b border-[#F4F4F4] hover:bg-[#F4F4F4] cursor-pointer min-h-[56px] active:bg-[#E9E9E9]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1B1B1B] truncate">{item.productId.name}</p>
                          <p className="text-sm text-[#4A4A4A]">
                            {[resultMeasure(item), item.color?.name, item.regionName && `Region: ${item.regionName}`].filter(Boolean).join(' • ')} • {formatBDT(item.price)}
                          </p>
                          <p className="text-xs text-[#6B7280] font-mono break-all">
                            My barcode: {item.barcode || '—'}{item.realBarcode ? ` · Product barcode: ${item.realBarcode}` : ''}
                          </p>
                          <p className="text-xs text-[#4A4A4A]">Available: {item.availableQuantity}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-sm font-medium text-[#1B1B1B]">{formatBDT(item.discountPrice || item.price)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="bg-white border border-[#BDBDBD]">
              <div className="p-4 sm:p-6 border-b border-[#BDBDBD]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold flex items-center text-[#1B1B1B]">
                    <FaShoppingCart className="mr-2 text-[#B1123B]" />
                    Cart ({cart.length} items)
                  </h2>
                  <button
                    onClick={clearCart}
                    className="px-3 py-2 text-red-600 hover:text-red-800 flex items-center min-h-[44px]"
                  >
                    <FaTrash size={16} className="mr-1" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {cart.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-[#4A4A4A]">
                    <div className="text-center">
                      <FaBox size={48} className="mx-auto mb-4 text-[#BDBDBD]" />
                      <p>Cart is empty</p>
                      <p className="text-sm">Search or scan products to add</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.inventoryId} className="bg-[#FAF8F6] border border-[#BDBDBD] p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1B1B1B] truncate">{item.productName}</p>
                          <p className="text-sm text-[#4A4A4A]">
                            {[formatMeasureLine(item.variantInfo), item.variantInfo.color, item.variantInfo.regionName && `Region: ${item.variantInfo.regionName}`].filter(Boolean).join(' • ')}
                          </p>
                          <p className="text-[11px] text-[#6B7280] font-mono mt-1 break-all">
                            My barcode: {item.variantInfo.barcode || '—'}
                            {item.variantInfo.realBarcode ? ` · Product barcode: ${item.variantInfo.realBarcode}` : ''}
                          </p>
                          <p className="text-xs text-[#4A4A4A] font-medium mt-1">{formatBDT(item.totalPrice)}</p>
                        </div>
                          <button
                            onClick={() => removeFromCart(item.inventoryId)}
                            className="p-2 text-red-600 hover:text-red-800 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                          >
                            <FaTrash size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Customer Info and Payment */}
          <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
            {/* Customer Information */}
            <div className="bg-white border border-[#BDBDBD] p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-[#1B1B1B]">
                <FaUser className="mr-2 text-[#B1123B]" />
                Customer Information (Optional)
              </h3>
              <p className="mb-3 text-sm text-[#6B7280]">Leave these fields blank for a walk-in sale. A customer account is not required.</p>
              <div className="space-y-3">
                <div className="rounded border border-[#E8C4CE] bg-[#FFF8FA] p-3">
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Find loyalty account by phone or email</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Phone number or email"
                      value={loyaltySearch}
                      onChange={(event) => setLoyaltySearch(event.target.value)}
                      className="min-w-0 flex-1 px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] min-h-[44px]"
                    />
                    <button type="button" onClick={handleLoyaltyLookup} disabled={loyaltySearchLoading} className="px-3 bg-[#B1123B] text-white disabled:opacity-60">
                      {loyaltySearchLoading ? 'Finding…' : 'Find'}
                    </button>
                  </div>
                  {loyaltyLookupMessage && !loyaltyCustomer && (
                    <p className="mt-2 text-xs text-[#6B7280]" role="status">{loyaltyLookupMessage}</p>
                  )}
                  {loyaltyCustomer && (
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className={loyaltyIsFrozen ? 'text-amber-700' : 'text-green-700'}>{loyaltyCustomer.name} · Balance {formatBDT(Number(loyaltyCustomer.balanceBDT || 0))}{loyaltyCustomer.tierName ? ` · ${loyaltyCustomer.tierName} (${Number(loyaltyCustomer.earnRatePercent || 0)}% back)` : ''}{loyaltyIsFrozen ? ' · Redemption frozen' : ''}</span>
                      <button type="button" onClick={() => { clearLoyaltyCustomer(); setLoyaltyLookupMessage('Loyalty unlinked. You can continue this sale normally.'); }} className="text-[#B1123B] underline">Unlink</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Name (optional)</label>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customer.name}
                    disabled={Boolean(loyaltyCustomer)}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B] min-h-[44px] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={customer.phone}
                    disabled={Boolean(loyaltyCustomer)}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B] min-h-[44px] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={customer.email}
                    disabled={Boolean(loyaltyCustomer)}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B] min-h-[44px] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Address</label>
                  <textarea
                    placeholder="Address"
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white border border-[#BDBDBD] p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-[#1B1B1B]">
                <FaCreditCard className="mr-2 text-[#B1123B]" />
                Payment Method
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cash', label: 'Cash', icon: FaMoneyBillWave },
                  { value: 'card', label: 'Card', icon: FaCreditCard },
                  { value: 'mobile_payment', label: 'Mobile', icon: FaMobileAlt },
                  { value: 'bank_transfer', label: 'Bank', icon: FaUniversity }
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => {
                      setPaymentMethod(method.value);
                      if (method.value !== 'mobile_payment') setPaymentTrxId('');
                    }}
                    className={`p-3 border flex flex-col items-center space-y-1 min-h-[60px] ${
                      paymentMethod === method.value
                        ? 'border-[#B1123B] bg-[#F7D5DF] text-[#B1123B]'
                        : 'border-[#BDBDBD] hover:border-[#4A4A4A] text-[#4A4A4A]'
                    }`}
                  >
                    <method.icon size={20} />
                    <span className="text-sm">{method.label}</span>
                  </button>
                ))}
              </div>
              {paymentMethod === 'mobile_payment' && (
                <div className="mt-4">
                  <label htmlFor="pos-payment-trx-id" className="mb-1 block text-sm font-medium text-[#4A4A4A]">
                    Mobile payment transaction ID <span className="text-[#B1123B]">*</span>
                  </label>
                  <input
                    id="pos-payment-trx-id"
                    type="text"
                    autoComplete="off"
                    maxLength={100}
                    value={paymentTrxId}
                    onChange={(event) => setPaymentTrxId(event.target.value)}
                    placeholder="Enter bKash/Nagad transaction ID"
                    className="w-full min-h-[44px] border border-[#BDBDBD] bg-white px-3 py-2 text-[#1B1B1B] focus:outline-none focus:ring-2 focus:ring-[#B1123B]"
                  />
                  <p className="mt-1 text-xs text-[#6B7280]">The transaction ID will be saved with this POS order.</p>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white border border-[#BDBDBD] p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-[#1B1B1B]">
                <FaCalculator className="mr-2 text-[#B1123B]" />
                Order Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-[#1B1B1B]">
                  <span>Subtotal:</span>
                  <span>{formatBDT(subtotal)}</span>
                </div>
                <div className="flex items-center space-x-2 text-[#4A4A4A]">
                  <span>Tax (%):</span>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border border-[#BDBDBD] text-sm bg-white text-[#1B1B1B] min-h-[36px]"
                  />
                  <span>{formatBDT(taxAmount)}</span>
                </div>
                <div className="flex items-center space-x-2 text-[#4A4A4A]">
                  <span>Discount (%):</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border border-[#BDBDBD] text-sm bg-white text-[#1B1B1B] min-h-[36px]"
                  />
                  <span>{formatBDT(discountAmount)}</span>
                </div>
                <div className="border-t border-[#BDBDBD] pt-2">
                  {loyaltyCustomer && (
                    <div className="mb-3 rounded border border-[#E8C4CE] bg-[#FFF8FA] p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <label htmlFor="pos-loyalty-amount" className="text-sm font-medium text-[#1B1B1B]">Apply loyalty BDT</label>
                        <span className="text-xs text-[#4A4A4A]">Max {formatBDT(Math.min(Number(loyaltyCustomer.balanceBDT || 0), loyaltyCap))}</span>
                      </div>
                      {loyaltyIsFrozen && <p className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800" role="status">Redemption is frozen for this loyalty account. Continue this POS sale without spending the balance.</p>}
                      <div className="flex gap-2">
                        <input
                          id="pos-loyalty-amount"
                          type="number"
                          min="0"
                          max={Math.min(Number(loyaltyCustomer.balanceBDT || 0), loyaltyCap)}
                          step="0.01"
                          value={loyaltyRequested}
                          onChange={(event) => setLoyaltyRequested(event.target.value)}
                          disabled={loyaltyIsFrozen}
                          className="min-w-0 flex-1 px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] disabled:bg-gray-100 disabled:text-gray-400"
                        />
                        <button type="button" disabled={loyaltyIsFrozen} onClick={() => setLoyaltyRequested(String(Math.round(Math.min(Number(loyaltyCustomer.balanceBDT || 0), loyaltyCap) * 100) / 100))} className="px-3 border border-[#BDBDBD] disabled:cursor-not-allowed disabled:opacity-50">Use max</button>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 rounded border border-[#E8C4CE] bg-white p-3">
                    <label htmlFor="pos-gift-code" className="mb-2 block text-sm font-medium text-[#1B1B1B]">Redeem a gift code</label>
                    <div className="flex gap-2">
                      <input
                        id="pos-gift-code"
                        type="text"
                        autoComplete="off"
                        placeholder="Enter redeem code"
                        value={posGiftCode}
                        onChange={(event) => setPOSGiftCode(event.target.value)}
                        className="min-w-0 flex-1 border border-[#BDBDBD] bg-white px-3 py-2 text-[#1B1B1B]"
                      />
                      {posGiftCodeDetails ? (
                        <button type="button" onClick={clearPOSGiftCode} className="border border-[#BDBDBD] px-3">Clear</button>
                      ) : (
                        <button type="button" onClick={handleApplyGiftCode} disabled={!posGiftCode.trim() || posGiftCodeLoading} className="bg-[#1B1B1B] px-3 text-white disabled:opacity-50">
                          {posGiftCodeLoading ? 'Checking…' : 'Apply'}
                        </button>
                      )}
                    </div>
                    {posGiftCodeDetails && (
                      <p className="mt-2 text-xs text-green-700">
                        Applied code ••••-{posGiftCodeDetails.codeSuffix} · {formatBDT(giftCodeApplied)} used
                        {Number(posGiftCodeDetails.amountBDT) > giftCodeApplied ? (loyaltyCustomer
                          ? ` · ${formatBDT(Number(posGiftCodeDetails.amountBDT) - giftCodeApplied)} unused value will be credited to this customer`
                          : ` · Add items to use the full code value, or select a loyalty customer to keep the remainder`) : ''}
                      </p>
                    )}
                    {!loyaltyCustomer && <p className="mt-2 text-xs text-[#6B7280]">Gift codes work for walk-in sales. Select a loyalty customer only if unused code value should be credited to their balance.</p>}
                  </div>
                  {loyaltyApplied > 0 && (
                    <div className="flex justify-between text-sm text-green-700 mb-2">
                      <span>Loyalty applied</span><span>- {formatBDT(loyaltyApplied)}</span>
                    </div>
                  )}
                  {giftCodeApplied > 0 && (
                    <div className="mb-2 flex justify-between text-sm text-green-700">
                      <span>Gift code ••••-{posGiftCodeDetails.codeSuffix}</span><span>- {formatBDT(giftCodeApplied)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg text-[#1B1B1B]">
                    <span>{loyaltyApplied > 0 || giftCodeApplied > 0 ? 'Amount due:' : 'Total:'}</span>
                    <span>{formatBDT(amountDue)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-[#4A4A4A]">Receipt Paper</label>
                <select
                  value={Number(getStorage('posPaperWidth')) || 80}
                  onChange={(e) => setStorage('posPaperWidth', e.target.value)}
                  className="px-3 py-2 border border-[#BDBDBD] text-sm bg-white text-[#1B1B1B] min-h-[40px]"
                >
                  <option value={80}>80mm</option>
                  <option value={58}>58mm</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Order Notes</label>
                <textarea
                  placeholder="Order Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white border border-[#BDBDBD] p-4 sm:p-6">
              <button
                onClick={processOrder}
                disabled={loading || cart.length === 0}
                className="w-full py-4 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center text-base sm:text-lg min-h-[56px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <FaCashRegister className="mr-2" />
                    Complete Sale - {formatBDT(amountDue)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPOS;
