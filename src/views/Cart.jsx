'use client'
import React, { useEffect, useContext, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CartContext } from '../context/CartContext';
import { UserContext } from '../context/UserContext';
import { useRouter } from "next/navigation";
import { formatMeasureLine } from '../lib/measure';
import { formatBDT } from '../config/brand';
import { FaTrash, FaMinus, FaPlus, FaArrowLeft, FaShoppingBag, FaTag, FaCreditCard } from 'react-icons/fa';

function CartPage() {
  const router = useRouter();
  const { isLoggedIn } = useContext(UserContext);
  const {
    cartItems = [],
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    coupon,
    discount,
    totalPrice,
    isLoading,
    updateQuantity
  } = useContext(CartContext);

  const [localQuantities, setLocalQuantities] = useState({});
  const [couponCode, setCouponCode] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);

  useEffect(() => {
  }, [discount, coupon]);

  useEffect(() => {
    const quantities = {};
    cartItems.forEach(item => {
      const identifier = isLoggedIn ? item._id : item.guestItemId;
      quantities[identifier] = item.quantity.toString();
    });
    setLocalQuantities(quantities);
  }, [cartItems, isLoggedIn]);

  const handleQuantityChange = (itemIdentifier, value) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '');
    const numericValue = Math.max(1, parseInt(sanitizedValue, 10) || 1);
    setLocalQuantities(prev => ({
      ...prev,
      [itemIdentifier]: sanitizedValue
    }));
    updateQuantity(itemIdentifier, numericValue);
  };

  const toastConfig = {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cartItems]);

  const total = subtotal - (discount || 0);
  const formattedSubtotal = subtotal.toFixed(2);
  const formattedTotal = total.toFixed(2);

  const getItemIdentifier = (item) => {
    return isLoggedIn ? item._id : item.guestItemId;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setLocalLoading(true);
    setCouponError(null);

    const result = await applyCoupon(couponCode);

    if (result.success) {
      toast.success(result.message, toastConfig);
      setCouponCode("");
    } else {
      setCouponError(result.message);
      if (result.details) {
      }
    }

    setLocalLoading(false);
  };

  const handleRemoveCoupon = async () => {
    setLocalLoading(true);
    try {
      await removeCoupon();
      toast.info("Coupon removed!", toastConfig);
    } catch (error) {
      toast.error("Error removing coupon", toastConfig);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="bg-pure-white min-h-screen">
      <ToastContainer />
      
      {/* Header Section */}
      <div className="bg-pure-white border-b border-cool-gray py-8 sm:py-12">
        <div className="max-w-7xl mx-auto container-padding-mobile">
          <div className="text-center">
            <h1 className="font-heading text-display-sm md:text-display-md lg:text-display-lg text-black mb-3 sm:mb-4">
              Shopping Cart
            </h1>
            <p className="font-sans text-base sm:text-lg md:text-xl text-dark-gray max-w-2xl mx-auto">
              Review your items and proceed to checkout
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto container-padding-mobile py-6 sm:py-8">
        {cartItems.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="card p-6 sm:p-8 md:p-12 max-w-md mx-auto">
              <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 text-mid-gray">
                <FaShoppingBag className="inline" />
              </div>
              <h3 className="font-heading text-display-sm text-black mb-3 sm:mb-4">Your cart is empty</h3>
              <p className="font-sans text-sm sm:text-base text-dark-gray mb-6 sm:mb-8">
                Looks like you haven't added any items to your cart yet.
              </p>
              <button
                onClick={() => router.push('/products')}
                className="btn-primary w-full text-xs sm:text-sm"
              >
                <FaShoppingBag className="inline mr-2" />
                Start Shopping
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
            {/* Cart Items */}
            <div className="flex-1">
              <div className="card overflow-hidden">
                <div className="bg-pure-white px-4 sm:px-6 py-3 sm:py-4 border-b border-cool-gray">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-lg sm:text-xl text-black">
                      Cart Items ({cartItems.length})
                    </h2>
                    <button
                      onClick={clearCart}
                      className="text-maybelline-pink hover:text-rose text-xs sm:text-sm font-medium flex items-center gap-1 transition-colors duration-200 touch-target"
                      disabled={isLoading || localLoading}
                    >
                      <FaTrash size={12} className="sm:w-3.5 sm:h-3.5" />
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div className="p-4 sm:p-6">
                  <div className="space-y-4 sm:space-y-6">
                    {cartItems.map((item) => {
                      const originalPrice = item.price * item.quantity;
                      const discountPercentage = item.discountApplied > 0
                        ? Math.round((item.discountApplied / originalPrice) * 100)
                        : 0;
                      const itemIdentifier = getItemIdentifier(item);

                      return (
                        <div
                          key={itemIdentifier}
                          className="card overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-6">
                            {/* Product Image */}
                            <div className="flex-shrink-0">
                              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-pure-white border border-cool-gray overflow-hidden">
                                <img
                                  src={item.mainImage}
                                  alt={item.name}
                                  className="w-full h-full object-contain p-2"
                                  onError={(e) => { e.target.src = '/placeholder-product.jpg'; }}
                                />
                              </div>
                            </div>

                            {/* Product Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                                <div className="flex-1">
                                  <h3 className="font-heading text-base sm:text-lg text-black mb-2 line-clamp-2">
                                    {item.name}
                                  </h3>
                                  
                                  {/* Product Variants */}
                                  <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
                                    {item.size && (
                                      <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium bg-cool-gray text-dark-gray">
                                        {formatMeasureLine(item)}
                                      </span>
                                    )}
                                    {item.color && (
                                      <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium bg-cool-gray text-dark-gray">
                                        Color: {item.color}
                                      </span>
                                    )}
                                  </div>

                                  {/* Price Display */}
                                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    <span className="text-lg sm:text-xl md:text-2xl font-bold text-maybelline-pink">
                                      {formatBDT(item.price.toFixed(2))}
                                    </span>
                                    {item.discountApplied > 0 && (
                                      <span className="text-xs sm:text-sm text-dark-gray bg-cool-gray px-1.5 sm:px-2 py-0.5 sm:py-1 font-medium">
                                        -{formatBDT(item.discountApplied.toFixed(2))} ({discountPercentage}% off)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex flex-col items-end gap-3 sm:gap-4">
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <button
                                      onClick={() => decreaseQuantity(itemIdentifier)}
                                      className="w-7 h-7 sm:w-8 sm:h-8 bg-pure-white border border-cool-gray hover:bg-cool-gray flex items-center justify-center transition-all duration-200 disabled:opacity-50 touch-target"
                                      disabled={isLoading || localLoading}
                                    >
                                      <FaMinus size={10} className="sm:w-3 sm:h-3 text-black" />
                                    </button>
                                    <input
                                      type="text"
                                      value={localQuantities[itemIdentifier] || ''}
                                      onChange={(e) => handleQuantityChange(itemIdentifier, e.target.value)}
                                      className="w-12 sm:w-16 h-7 sm:h-8 text-center border border-cool-gray text-black font-sans text-sm focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none"
                                      disabled={isLoading || localLoading}
                                    />
                                    <button
                                      onClick={() => increaseQuantity(itemIdentifier)}
                                      className="w-7 h-7 sm:w-8 sm:h-8 bg-pure-white border border-cool-gray hover:bg-cool-gray flex items-center justify-center transition-all duration-200 disabled:opacity-50 touch-target"
                                      disabled={isLoading || localLoading}
                                    >
                                      <FaPlus size={10} className="sm:w-3 sm:h-3 text-black" />
                                    </button>
                                  </div>

                                  {/* Remove Button */}
                                  <button
                                    onClick={() => removeItem(itemIdentifier)}
                                    className="text-maybelline-pink hover:text-rose text-xs sm:text-sm font-medium flex items-center gap-1 transition-colors duration-200 touch-target"
                                    disabled={isLoading || localLoading}
                                  >
                                    <FaTrash size={10} className="sm:w-3.5 sm:h-3.5" />
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="w-full lg:w-1/3">
              <div className="card p-4 sm:p-6 sticky top-24">
                <h3 className="font-heading text-xl sm:text-2xl mb-4 sm:mb-6 text-black flex items-center gap-2">
                  <FaCreditCard className="text-black" />
                  Order Summary
                </h3>

                {/* Coupon Section */}
                <div className="mb-6">
                  {coupon ? (
                    <div className="bg-cool-gray border border-cool-gray p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FaTag className="text-maybelline-pink" />
                          <div>
                            <p className="text-black font-semibold">{coupon.code}</p>
                            <p className="text-sm text-dark-gray">
                              {coupon.discount > 0 && `-${formatBDT(coupon.discount)} discount applied`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-maybelline-pink hover:text-rose text-sm font-medium transition-colors duration-200"
                          disabled={isLoading || localLoading}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-0">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value);
                            setCouponError(null);
                          }}
                          placeholder="Enter coupon code"
                          className={`flex-1 px-4 py-3 border font-sans text-black focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none ${
                            couponError ? 'border-maybelline-pink' : 'border-cool-gray'
                          }`}
                          disabled={isLoading || localLoading}
                        />
                        <button
                          onClick={handleApplyCoupon}
                          className="bg-maybelline-pink text-pure-white px-6 py-3 font-sans text-sm font-medium hover:opacity-90 transition-opacity duration-200 disabled:opacity-50"
                          disabled={isLoading || localLoading || !couponCode.trim()}
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-maybelline-pink text-sm">{couponError}</p>
                      )}
                      <p className="text-xs text-dark-gray">
                        Have a coupon code? Enter it above to apply your discount.
                      </p>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-dark-gray font-sans">Subtotal:</span>
                    <span className="font-semibold text-black">{formatBDT(formattedSubtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center py-2 text-dark-gray">
                      <span>Discount:</span>
                      <span className="font-semibold">-{formatBDT(discount.toFixed(2))}</span>
                    </div>
                  )}
                  <div className="border-t border-cool-gray pt-4 flex justify-between items-center">
                    <span className="text-lg font-bold text-black">Total:</span>
                    <span className="text-2xl font-bold text-maybelline-pink">{formatBDT(formattedTotal)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => router.push("../checkout")}
                    className="bg-maybelline-pink text-pure-white w-full py-3 font-sans font-medium hover:opacity-90 transition-opacity duration-200 disabled:opacity-50"
                    disabled={isLoading || localLoading}
                  >
                    <FaCreditCard className="inline mr-2" />
                    Proceed to Checkout
                  </button>
                  <button
                    onClick={() => router.push("/products")}
                    className="w-full py-3 font-sans font-medium text-black border border-cool-gray hover:bg-cool-gray transition-colors duration-200"
                  >
                    <FaArrowLeft className="inline mr-2" />
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartPage;
