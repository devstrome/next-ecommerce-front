'use client'
import React, { useEffect, useRef } from 'react';
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
import { formatMeasureLine, formatMeasure } from '../lib/measure';
import { getStorage, setStorage } from '../lib/storage';

const AdminPOS = () => {
  const router = useRouter();
  const {
    cart,
    customer,
    searchQuery,
    scannedBarcode,
    searchResults,
    loading,
    stats,
    paymentMethod,
    taxRate,
    discount,
    notes,
    outlet,
    searchInputRef,
    barcodeInputRef,
    
    setCustomer,
    setSearchQuery,
    setScannedBarcode,
    setPaymentMethod,
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
    processOrder
  } = usePOS();

  const { subtotal, taxAmount, discountAmount, total } = calculateTotals();

  // Mirror of the barcode field for the global (non-input) key handler
  const barcodeValueRef = useRef(scannedBarcode);
  useEffect(() => { barcodeValueRef.current = scannedBarcode; }, [scannedBarcode]);

  // Physical (HID) scanner support:
  // 1. Barcode field is focused on mount and after every scan (context refocuses).
  // 2. Keystrokes typed while focus is NOT in an editable element are captured
  //    and redirected into the barcode field — so scanning works no matter
  //    where the cashier last clicked. Enter submits (scanner suffix).
  useEffect(() => {
    barcodeInputRef.current?.focus();

    const isEditable = (el) =>
      !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditable(document.activeElement)) return;
      const el = barcodeInputRef.current;
      if (!el) return;

      if (e.key === 'Enter') {
        if (barcodeValueRef.current.trim()) {
          e.preventDefault();
          scanBarcode(barcodeValueRef.current);
        }
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        el.focus();
        const next = barcodeValueRef.current + e.key;
        barcodeValueRef.current = next;
        setScannedBarcode(next);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanBarcode]);

  const resultMeasure = (item) =>
    formatMeasure({ measureType: item.variantId?.measureType, unitName: item.variantId?.unitName, size: item.size });

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
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchProducts(e.target.value);
                      }}
                      className="flex-1 px-4 py-3 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B] text-base min-h-[48px]"
                    />
                    <button
                      onClick={() => searchProducts(searchQuery)}
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
                      onClick={() => addToCart(item)}
                      className="p-3 border-b border-[#F4F4F4] hover:bg-[#F4F4F4] cursor-pointer min-h-[56px] active:bg-[#E9E9E9]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1B1B1B] truncate">{item.productId.name}</p>
                          <p className="text-sm text-[#4A4A4A]">
                            {[resultMeasure(item), item.color?.name].filter(Boolean).join(' • ')} • {formatBDT(item.price)}
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
                            {[formatMeasureLine(item.variantInfo), item.variantInfo.color].filter(Boolean).join(' • ')}
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
                Customer Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Name *</label>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] bg-white text-[#1B1B1B] min-h-[44px]"
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
                    onClick={() => setPaymentMethod(method.value)}
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
                  <div className="flex justify-between font-semibold text-lg text-[#1B1B1B]">
                    <span>Total:</span>
                    <span>{formatBDT(total)}</span>
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
                    Complete Sale - {formatBDT(total)}
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
