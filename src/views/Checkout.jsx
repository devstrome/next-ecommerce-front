'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useContext, useEffect, useState } from "react";
import { CartContext } from "../context/CartContext";
import { UserContext } from "../context/UserContext";
import { ToastContainer, toast } from "react-toastify";
import { useRouter } from "next/navigation";
import "react-toastify/dist/ReactToastify.css";
import { 
  FaMoneyBillAlt, 
  FaMobileAlt, 
  FaTrash, 
  FaCreditCard, 
  FaPlus, 
  FaMapMarkerAlt, 
  FaTruck, 
  FaLock, 
  FaShieldAlt,
  FaCheckCircle,
  FaArrowLeft,
  FaUser,
  FaPhone,
  FaGlobe,
  FaHome,
  FaShoppingBag
} from "react-icons/fa";

function CheckoutPage() {
  const {
    cartItems = [],
    discount = 0,
    coupon = null,
    clearCart,
    removeItem,
  } = useContext(CartContext);

  const {
    user,
    address,
    paymentMethods,
    defaultPaymentMethod,
    isLoggedIn,
    updateAddress,
    addPaymentMethod,
  } = useContext(UserContext);

  const [shippingInfo, setShippingInfo] = useState({
    fullName: user?.fullName || "",
    address: address?.street || "",
    city: address?.city || "",
    postalCode: address?.zipCode || "",
    state: address?.state || "",
    country: address?.country || "",
    phone: user?.phoneNumber || "",
  });
  
  const [useSavedAddress, setUseSavedAddress] = useState(!!address);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(defaultPaymentMethod || null);
  const [addingNewPayment, setAddingNewPayment] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: "bkash",
    walletNumberMasked: "",
    msisdn: "",
    label: "",
    isDefault: false,
  });
  const [transactionNumber, setTransactionNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [ruleEval, setRuleEval] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (address && useSavedAddress) {
      setShippingInfo({
        fullName: user?.fullName || "",
        address: address.street || "",
        city: address.city || "",
        postalCode: address.zipCode || "",
        state: address.state || "",
        country: address.country || "",
        phone: user?.phoneNumber || "",
      });
    } else {
      setShippingInfo({
        fullName: "",
        address: "",
        city: "",
        postalCode: "",
        state: "",
        country: "",
        phone: "",
      });
    }
  }, [address, useSavedAddress, user]);

  useEffect(() => {
    if (defaultPaymentMethod) {
      setSelectedPaymentMethod(defaultPaymentMethod);
    }
  }, [defaultPaymentMethod]);

  useEffect(() => {
    const loadShipping = async () => {
      try {
        if (!cartItems || cartItems.length === 0) {
          setShippingOptions([]);
          setSelectedShipping(null);
          return;
        }

        const variantShippingMap = new Map();

        const productIds = [...new Set(cartItems.map(item => item.productId).filter(Boolean))];

        const productResults = await Promise.all(
          productIds.map(pid =>
            fetch(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${pid}`).then(r => r.json()).catch(() => null)
          )
        );

        for (const product of productResults) {
          if (!product?.variants) continue;
          for (const variant of product.variants) {
            if (variant.shippingOptions && variant.shippingOptions.length > 0) {
              for (const opt of variant.shippingOptions) {
                const key = `${opt.name}-${opt.charge}-${opt.estimatedDays}`;
                if (!variantShippingMap.has(key)) {
                  variantShippingMap.set(key, opt);
                }
              }
            }
          }
        }

        let uniqueOptions = Array.from(variantShippingMap.values());

        // Always make store-wide delivery options (Inside/Outside Dhaka) available,
        // even when product variants don't have shipping options attached
        try {
          const globalRes = await fetch(`${process.env.NEXT_PUBLIC_API_URI}/api/shipping`);
          if (globalRes.ok) {
            const globalOptions = await globalRes.json();
            if (Array.isArray(globalOptions)) {
              for (const g of globalOptions) {
                const exists = uniqueOptions.some(
                  o => (o.name || '').toLowerCase() === (g.name || '').toLowerCase()
                );
                if (!exists) uniqueOptions.push(g);
              }
            }
          }
        } catch { /* keep variant-only options */ }

        uniqueOptions.sort((a, b) => Number(a.charge || 0) - Number(b.charge || 0));

        setShippingOptions(uniqueOptions);
        setSelectedShipping(uniqueOptions[0] || null);
      } catch (e) {
        console.error('shipping load error', e);
        setShippingOptions([]);
        setSelectedShipping(null);
      }
    };
    loadShipping();
  }, [cartItems]);

  // Delivery contact number (shown under shipping methods)
  useEffect(() => {
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_API_URI}/api/delivery-setting`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d?.phone) setDeliveryPhone(d.phone); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewPaymentChange = (e) => {
    const { name, value } = e.target;
    setNewPaymentMethod((prev) => ({ ...prev, [name]: value }));
  };

  const validateShippingInfo = () => {
    const requiredFields = ["fullName", "address", "city", "postalCode", "country", "phone"];
    for (const field of requiredFields) {
      if (!shippingInfo[field]?.trim()) {
        toast.error(`Please enter a valid ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
        return false;
      }
    }
    return true;
  };

  const mainTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountPercentage = (discount / mainTotal) * 100;
  const shippingCharge = selectedShipping?.charge ? Number(selectedShipping.charge) : 0;
  const totalAfterDiscount = mainTotal - discount;
  const paymentMethodKey = !selectedPaymentMethod
    ? ''
    : selectedPaymentMethod.type === 'cash'
      ? 'Cash on Delivery'
      : selectedPaymentMethod.type;
  const effectiveShipping = ruleEval ? Number(ruleEval.deliveryCharge) : shippingCharge;
  const extraFeeTotal = ruleEval ? Number(ruleEval.extraFeeTotal || 0) : 0;
  const grandTotal = totalAfterDiscount + effectiveShipping + extraFeeTotal;
  const ruleBlockers = ruleEval?.blockers || [];
  const checkoutBlocked = ruleBlockers.length > 0;
  const deliveryRuleNotes = (ruleEval?.appliedRules || []).filter(r =>
    ['free_delivery_above', 'delivery_multiplier', 'extra_delivery_fee'].includes(r.type)
  );
  const cartSignature = cartItems
    .map(i => `${i._id || i.guestItemId || ''}-${i.productId}-${i.variantId}:${i.quantity}`)
    .join(',');

  // Evaluate admin checkout rules (delivery multipliers, fees, limits) on cart/shipping/payment changes
  useEffect(() => {
    if (!cartItems.length) {
      setRuleEval(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URI}/api/checkout-rules/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subtotal: mainTotal,
            discountAmount: discount,
            shippingCharge,
            paymentMethod: paymentMethodKey,
            items: cartItems.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity })),
          }),
        });
        if (!res.ok) throw new Error('evaluate failed');
        const data = await res.json();
        if (!cancelled) setRuleEval(data);
      } catch (e) {
        if (!cancelled) setRuleEval(null);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [mainTotal, discount, shippingCharge, paymentMethodKey, cartSignature]);

const handleCheckout = async () => {
  if (!validateShippingInfo()) return;

  if (checkoutBlocked) {
    toast.error(ruleBlockers[0].message);
    return;
  }

  const orderShippingAddress = useSavedAddress ? {
    fullName: user?.fullName || "",
    address: address?.street || "",
    city: address?.city || "",
    postalCode: address?.zipCode || "",
    state: address?.state || "",
    country: address?.country || "",
    phone: user?.phoneNumber || ""
  } : {
    fullName: shippingInfo.fullName,
    address: shippingInfo.address,
    city: shippingInfo.city,
    postalCode: shippingInfo.postalCode,
    state: shippingInfo.state,
    country: shippingInfo.country,
    phone: shippingInfo.phone
  };

  if (!selectedPaymentMethod) {
    toast.error("Please select a payment method.");
    return;
  }

  const isMobilePayment = ['bkash', 'nagad'].includes(selectedPaymentMethod.type.toLowerCase());
  if (isMobilePayment) {
    if (!transactionNumber.trim()) {
      toast.error("Please provide a valid transaction number.");
      return;
    }
    if (!/^[a-zA-Z0-9]{8,}$/.test(transactionNumber.trim())) {
      toast.error("Transaction number must be at least 8 alphanumeric characters");
      return;
    }
  }

  if (!cartItems.length) {
    toast.error("Your cart is empty.");
    return;
  }

  setLoading(true);

  try {
    const paymentMethodToSend = selectedPaymentMethod.type === 'cash' 
      ? 'Cash on Delivery' 
      : selectedPaymentMethod.type;

    const orderData = {
      userId: user._id,
      items: cartItems.map((item) => ({
        variantId: item.variantId,
        productId: item.productId,
        discountApplied: item.discountApplied || 0,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        mainImage: item.mainImage,
        size: item.size,
        color: item.color,
        measureType: item.measureType,
        unitName: item.unitName,
      })),
      totalAmount: mainTotal,
      shipping: selectedShipping ? {
        name: selectedShipping.name,
        charge: shippingCharge,
        estimatedDays: selectedShipping.estimatedDays || 0,
      } : null,
      shippingCost: effectiveShipping,
      grandTotal: grandTotal,
      discountAmount: discount,
      couponCode: coupon?.code || null,
      shippingAddress: orderShippingAddress,
      paymentMethod: paymentMethodToSend,
      selectedPaymentMethodId: selectedPaymentMethod._id || selectedPaymentMethod.methodId,
      paymentDetails: isMobilePayment ? { 
        trxId: transactionNumber.trim(),
        walletNumberMasked: selectedPaymentMethod.walletNumberMasked,
        paymentMethod: selectedPaymentMethod.type
      } : {},
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URI}/api/order`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getStorage('accessToken')}`
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to place order");
    }

    const result = await response.json();
    
    clearCart();
    toast.success("Order placed successfully!");
    
    router.push(`/profile/orders/order-confirmation/${result.orderId}`, {
      state: {
        order: result,
        paymentMethod: paymentMethodToSend,
        transactionNumber: isMobilePayment ? transactionNumber : null
      }
    });

  } catch (error) {
    console.error("Checkout error:", error);
    
    let errorMessage = "Failed to place order. Please try again later.";
    if (error.message.includes("network")) {
      errorMessage = "Network error. Please check your connection and try again.";
    } else if (error.message.includes("validation")) {
      errorMessage = "Invalid order data. Please check your information.";
    }
    
    toast.error(error.message || errorMessage);
    
    if (window.analytics) {
      window.analytics.track('Checkout Error', {
        error: error.message,
        userId: user?._id
      });
    }
  } finally {
    setLoading(false);
  }
};

  const renderPaymentIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'card':
        return <FaCreditCard className="mr-2 text-black" />;
      case 'bkash':
        return <FaMobileAlt className="mr-2 text-rose" />;
      case 'nagad':
        return <FaMobileAlt className="mr-2 text-maybelline-pink" />;
      case 'cash':
        return <FaMoneyBillAlt className="mr-2 text-dark-gray" />;
      default:
        return <FaMoneyBillAlt className="mr-2" />;
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethod.walletNumberMasked) {
      toast.error("Please enter a valid wallet number");
      return;
    }

    try {
      const paymentDetails = {
        type: newPaymentMethod.type,
        walletNumberMasked: newPaymentMethod.walletNumberMasked,
        msisdn: newPaymentMethod.msisdn,
        label: newPaymentMethod.label || `${newPaymentMethod.type} ${newPaymentMethod.walletNumberMasked}`,
        isDefault: newPaymentMethod.isDefault,
      };

      const addedMethod = await addPaymentMethod(paymentDetails);
      setSelectedPaymentMethod(addedMethod);
      setAddingNewPayment(false);
      toast.success("Payment method added successfully!");
    } catch (error) {
      toast.error("Failed to add payment method");
      console.error(error);
    }
  };

  const isMobilePaymentSelected = selectedPaymentMethod && 
    ['bkash', 'nagad'].includes(selectedPaymentMethod.type.toLowerCase());

  const getItemIdentifier = (item) => {
    return isLoggedIn ? item._id : item.guestItemId;
  };

  return (
    <div className="bg-pure-white min-h-screen">
      <ToastContainer />
      
      {/* Header Section */}
      <div className="bg-pure-white border-b border-cool-gray py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="font-heading text-display-sm md:text-display-md text-black mb-3">
              Checkout
            </h1>
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 mt-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-maybelline-pink flex items-center justify-center">
                  <span className="text-pure-white text-sm font-bold">1</span>
                </div>
                <span className="ml-2 text-sm font-sans text-black font-medium">Cart</span>
              </div>
              <div className="w-8 sm:w-12 h-0.5 bg-maybelline-pink" />
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-maybelline-pink flex items-center justify-center">
                  <span className="text-pure-white text-sm font-bold">2</span>
                </div>
                <span className="ml-2 text-sm font-sans text-black font-medium">Details</span>
              </div>
              <div className="w-8 sm:w-12 h-0.5 bg-cool-gray" />
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-cool-gray flex items-center justify-center">
                  <span className="text-dark-gray text-sm font-bold">3</span>
                </div>
                <span className="ml-2 text-sm font-sans text-dark-gray">Confirm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Shipping & Payment */}
          <div className="flex-1 space-y-6">
            {/* Shipping Information */}
            <div className="card overflow-hidden">
              <div className="bg-pure-white px-6 py-4 border-b border-cool-gray">
                <div className="flex items-center gap-3">
                  <FaMapMarkerAlt className="text-black text-xl" />
                  <h3 className="font-heading text-xl text-black">Shipping Information</h3>
                </div>
              </div>
              
              <div className="p-6">
                {address && (
                  <div className="mb-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSavedAddress}
                        onChange={(e) => {
                          setUseSavedAddress(e.target.checked);
                          if (e.target.checked) {
                            setShippingInfo({
                              fullName: user?.fullName || "",
                              address: address.street || "",
                              city: address.city || "",
                              postalCode: address.zipCode || "",
                              state: address.state || "",
                              country: address.country || "",
                              phone: user?.phoneNumber || "",
                            });
                          }
                        }}
                        className="w-5 h-5 text-maybelline-pink border-cool-gray rounded focus:ring-maybelline-pink"
                      />
                      <span className="font-medium text-dark-gray">Use my saved address</span>
                    </label>
                  </div>
                )}

                {useSavedAddress && address ? (
                  <div className="bg-cool-gray border border-cool-gray p-4">
                    <div className="flex items-start gap-3">
                      <FaCheckCircle className="text-black text-xl mt-1" />
                      <div className="space-y-2">
                        <p className="font-semibold text-black">{user?.fullName}</p>
                        <p className="text-dark-gray">{address.street}</p>
                        <p className="text-dark-gray">{address.city}, {address.state} {address.zipCode}</p>
                        <p className="text-dark-gray">{address.country}</p>
                        <p className="text-maybelline-pink font-medium">{user?.phoneNumber}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUseSavedAddress(false)}
                      className="mt-4 text-dark-gray hover:text-black font-medium transition-colors duration-200"
                    >
                      Use a different address
                    </button>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">
                          <FaUser className="inline mr-2 text-mid-gray" />
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={shippingInfo.fullName || ""}
                          onChange={handleAddressChange}
                          className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-all duration-200"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">
                          <FaPhone className="inline mr-2 text-mid-gray" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={shippingInfo.phone || ""}
                          onChange={handleAddressChange}
                          className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-all duration-200"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-dark-gray mb-2">
                        <FaHome className="inline mr-2 text-mid-gray" />
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={shippingInfo.address || ""}
                        onChange={handleAddressChange}
                        className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-all duration-200"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">City</label>
                        <input
                          type="text"
                          name="city"
                          value={shippingInfo.city || ""}
                          onChange={handleAddressChange}
                          className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-all duration-200"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">State</label>
                        <input
                          type="text"
                          name="state"
                          value={shippingInfo.state || ""}
                          onChange={handleAddressChange}
                          className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-all duration-200"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">Postal Code</label>
                        <input
                          type="text"
                          name="postalCode"
                          value={shippingInfo.postalCode || ""}
                          onChange={handleAddressChange}
                          className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-all duration-200"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-dark-gray mb-2">
                        <FaGlobe className="inline mr-2 text-mid-gray" />
                        Country
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={shippingInfo.country || ""}
                        onChange={handleAddressChange}
                        className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-all duration-200"
                        required
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        if (!validateShippingInfo()) return;
                        await updateAddress({
                          street: shippingInfo.address,
                          city: shippingInfo.city,
                          zipCode: shippingInfo.postalCode,
                          state: shippingInfo.state,
                          country: shippingInfo.country
                        });
                        setUseSavedAddress(true);
                        toast.success("Address saved successfully!");
                      }}
                      className="bg-maybelline-pink text-pure-white px-6 py-3 font-sans font-medium hover:opacity-90 transition-opacity duration-200"
                    >
                      Save Address
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Shipping Method */}
            <div className="card overflow-hidden">
              <div className="bg-pure-white px-6 py-4 border-b border-cool-gray">
                <div className="flex items-center gap-3">
                  <FaTruck className="text-black text-xl" />
                  <h3 className="font-heading text-xl text-black">Shipping Method</h3>
                </div>
              </div>
              
              <div className="p-6">
                {shippingOptions.length === 0 ? (
                  <div className="text-center py-8">
                    <FaTruck className="text-mid-gray text-4xl mx-auto mb-4" />
                    <p className="text-dark-gray">No shipping options available.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shippingOptions.map((opt, idx) => (
                      <label key={idx} className="flex items-center gap-4 p-4 border border-cool-gray hover:border-maybelline-pink/50 hover:bg-cool-gray transition-all duration-200 cursor-pointer">
                        <input
                          type="radio"
                          name="shippingOption"
                          checked={selectedShipping?.name === opt.name}
                          onChange={() => setSelectedShipping(opt)}
                          className="w-5 h-5 text-maybelline-pink border-cool-gray focus:ring-maybelline-pink"
                        />
                        <div className="flex justify-between items-center w-full">
                          <div>
                            <span className="font-semibold text-black">{opt.name}</span>
                            <p className="text-sm text-dark-gray">{opt.estimatedDays} days delivery</p>
                          </div>
                          <span className="font-bold text-maybelline-pink">BDT{Number(opt.charge).toFixed(2)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {deliveryPhone && (
                  <p className="mt-4 text-sm text-dark-gray">
                    Delivery inquiries: <a href={`tel:${deliveryPhone}`} className="font-semibold text-maybelline-pink hover:underline">{deliveryPhone}</a>
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="card overflow-hidden">
              <div className="bg-pure-white px-6 py-4 border-b border-cool-gray">
                <div className="flex items-center gap-3">
                  <FaCreditCard className="text-black text-xl" />
                  <h3 className="font-heading text-xl text-black">Payment Method</h3>
                </div>
              </div>

              <div className="p-6">
                {!addingNewPayment ? (
                  <div className="space-y-4">
                    <select
                      value={selectedPaymentMethod?._id || ""}
                      onChange={(e) => {
                        const methodId = e.target.value;
                        const method = paymentMethods.find(m => m._id === methodId) || 
                          { _id: "cash", type: "cash", label: "Cash on Delivery" };
                        setSelectedPaymentMethod(method);
                      }}
                      className="w-full p-4 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-all duration-200"
                    >
                      <option value="">Select a payment method</option>
                      {paymentMethods.map((method) => (
                        <option key={method._id} value={method._id}>
                          {method.label || `${method.type.toUpperCase()} ${method.walletNumberMasked || method.last4 || ''}`}
                        </option>
                      ))}
                      <option value="Cash On Delivery">Cash on Delivery</option>
                    </select>

                    {selectedPaymentMethod && (
                      <div className="flex items-center gap-3 p-4 bg-cool-gray border border-cool-gray">
                        {renderPaymentIcon(selectedPaymentMethod.type)}
                        <div className="flex flex-col">
                          <span className="font-semibold text-black">
                            {selectedPaymentMethod.label ||
                              (selectedPaymentMethod.type === 'cash'
                                ? 'Cash on Delivery'
                                : `${selectedPaymentMethod.type.toUpperCase()} ${selectedPaymentMethod.walletNumberMasked || selectedPaymentMethod.last4 || ''}`)}
                          </span>
                          {selectedPaymentMethod.type !== 'cash' && selectedPaymentMethod.walletNumberMasked && (
                            <span className="text-sm text-dark-gray">
                              Wallet: {selectedPaymentMethod.walletNumberMasked}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setAddingNewPayment(true)}
                      className="flex items-center text-dark-gray hover:text-black font-medium transition-colors duration-200"
                    >
                      <FaPlus className="mr-2" /> Add new payment method
                    </button>

                    {isMobilePaymentSelected && (
                      <div className="mt-6 p-4 bg-cool-gray border border-cool-gray space-y-4">
                        <h4 className="font-semibold text-black flex items-center gap-2">
                          <FaMobileAlt className="text-black" />
                          Payment Instructions
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-dark-gray mb-1">Your Mobile Number</label>
                            <input
                              type="text"
                              value={selectedPaymentMethod.msisdn || selectedPaymentMethod.walletNumberMasked}
                              className="w-full p-3 border border-cool-gray bg-pure-white font-sans text-black"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-dark-gray mb-1">Send Money To</label>
                            <input
                              type="text"
                              value={"+8801873886367"}
                              className="w-full p-3 border border-cool-gray bg-pure-white font-sans text-black"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-dark-gray mb-1">Transaction Number (TRX ID)*</label>
                            <input
                              type="text"
                              value={transactionNumber}
                              onChange={(e) => setTransactionNumber(e.target.value)}
                              className="w-full p-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none"
                              required
                              placeholder="Enter your bKash/Nagad transaction ID"
                            />
                            <p className="text-xs text-dark-gray mt-1">
                              Please complete the payment first and then enter the transaction ID here.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-black">Add New Payment Method</h4>
                      <button 
                        onClick={() => setAddingNewPayment(false)}
                        className="text-dark-gray hover:text-black transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {['bkash', 'nagad', 'card'].map(type => (
                        <button
                          key={type}
                          onClick={() => setNewPaymentMethod(prev => ({ ...prev, type }))}
                          className={`p-4 border-2 flex flex-col items-center transition-all duration-200 ${
                            newPaymentMethod.type === type 
                              ? 'border-maybelline-pink bg-cool-gray' 
                              : 'border-cool-gray hover:border-dark-gray'
                          }`}
                        >
                          {renderPaymentIcon(type)}
                          <span className="mt-2 text-sm font-medium">
                            {type === 'bkash' ? 'bKash' : 
                             type === 'nagad' ? 'Nagad' : 'Card'}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-gray mb-2">
                        {newPaymentMethod.type === 'card' ? 'Card Number' : 'Wallet Number'}
                      </label>
                      <input
                        type="text"
                        name="walletNumberMasked"
                        value={newPaymentMethod.walletNumberMasked}
                        onChange={handleNewPaymentChange}
                        className="w-full p-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none"
                        placeholder={
                          newPaymentMethod.type === 'card' 
                            ? '1234 5678 9012 3456' 
                            : '01XXXXXXXXX'
                        }
                      />
                    </div>

                    {newPaymentMethod.type !== 'card' && (
                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">
                          Phone Number (optional)
                        </label>
                        <input
                          type="text"
                          name="msisdn"
                          value={newPaymentMethod.msisdn}
                          onChange={handleNewPaymentChange}
                          className="w-full p-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none"
                          placeholder="01XXXXXXXXX"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-dark-gray mb-2">
                        Nickname (optional)
                      </label>
                      <input
                        type="text"
                        name="label"
                        value={newPaymentMethod.label}
                        onChange={handleNewPaymentChange}
                        className="w-full p-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none"
                        placeholder="e.g., My bKash, Personal Card"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="defaultPayment"
                        name="isDefault"
                        checked={newPaymentMethod.isDefault}
                        onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, isDefault: e.target.checked }))}
                        className="w-4 h-4 text-maybelline-pink border-cool-gray rounded focus:ring-maybelline-pink"
                      />
                      <label htmlFor="defaultPayment" className="ml-2 text-sm text-dark-gray">
                        Set as default payment method
                      </label>
                    </div>

                    <button
                      onClick={handleAddPaymentMethod}
                      className="bg-maybelline-pink text-pure-white w-full py-3 font-sans font-medium hover:opacity-90 transition-opacity duration-200"
                    >
                      Save Payment Method
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="w-full lg:w-96">
            <div className="card p-6 sticky top-24">
              <h3 className="font-heading text-2xl mb-6 text-black flex items-center gap-2">
                <FaShieldAlt className="text-black" />
                Order Summary
              </h3>
              
              {/* Cart Items */}
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 mb-6">
                {cartItems.length > 0 ? (
                  cartItems.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex items-start gap-4 pb-4 border-b border-cool-gray">
                      <div className="w-16 h-16 bg-pure-white overflow-hidden border border-cool-gray flex-shrink-0">
                        <img 
                          src={item.mainImage} 
                          alt={item.name} 
                          className="w-full h-full object-contain p-1" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-black line-clamp-2">{item.name}</p>
                        {item.size && <p className="text-sm text-dark-gray">Size: {item.size}</p>}
                        {item.color && <p className="text-sm text-dark-gray">Color: {item.color}</p>}
                        <p className="text-sm text-dark-gray">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-black">BDT{(item.price * item.quantity).toFixed(2)}</span>
                        <button 
                          onClick={() => removeItem(getItemIdentifier(item))}
                          className="text-maybelline-pink hover:text-rose mt-1 transition-colors duration-200"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-dark-gray py-8">
                    <FaShoppingBag className="text-4xl mx-auto mb-4 text-mid-gray" />
                    <p>Your cart is empty</p>
                  </div>
                )}
              </div>

              {/* Order Totals */}
              <div className="space-y-3 border-t border-cool-gray pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-dark-gray">Subtotal</span>
                  <span className="font-semibold text-black">BDT{mainTotal.toFixed(2)}</span>
                </div>
                
                {discount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-dark-gray">
                      <span>Discount</span>
                      <span className="font-semibold">- BDT{discount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-dark-gray">
                      <span>Discount Percentage</span>
                      <span className="font-semibold">{discountPercentage.toFixed(2)}%</span>
                    </div>
                  </>
                )}
                
                {coupon?.code && (
                  <div className="flex justify-between items-center text-dark-gray">
                    <span>Coupon Applied</span>
                    <span className="font-semibold">{coupon.code}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-dark-gray">Shipping</span>
                  <span className="font-semibold text-black text-right">
                    {ruleEval?.freeDelivery ? (
                      <>
                        <span className="line-through text-mid-gray mr-2">BDT{shippingCharge.toFixed(2)}</span>
                        <span className="text-green-600">Free</span>
                      </>
                    ) : effectiveShipping !== shippingCharge ? (
                      <>
                        <span className="line-through text-mid-gray mr-2">BDT{shippingCharge.toFixed(2)}</span>
                        <span>BDT{effectiveShipping.toFixed(2)}</span>
                      </>
                    ) : (
                      <>BDT{shippingCharge.toFixed(2)}</>
                    )}
                  </span>
                </div>

                {deliveryRuleNotes.length > 0 && (
                  <div className="text-xs text-dark-gray space-y-0.5">
                    {deliveryRuleNotes.map(r => (
                      <p key={r.ruleId || r.name}>• {r.name}</p>
                    ))}
                  </div>
                )}

                {(ruleEval?.extraFees || []).map(f => (
                  <div key={f.ruleId || f.label} className="flex justify-between items-center">
                    <span className="text-dark-gray">{f.label}</span>
                    <span className="font-semibold text-black">BDT{Number(f.amount).toFixed(2)}</span>
                  </div>
                ))}

                <div className="flex justify-between items-center text-xl font-bold pt-3 border-t border-cool-gray">
                  <span>Total</span>
                  <span className="text-maybelline-pink">BDT{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {(ruleEval?.notices || []).length > 0 && !checkoutBlocked && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
                  {ruleEval.notices.map((n, i) => (
                    <p key={i} className="text-sm text-green-700">{n}</p>
                  ))}
                </div>
              )}

              {checkoutBlocked && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-1">
                  {ruleBlockers.map((b, i) => (
                    <p key={i} className="text-sm text-red-600 font-medium">{b.message}</p>
                  ))}
                </div>
              )}

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-cool-gray border border-cool-gray">
                <div className="flex items-center gap-2 mb-2">
                  <FaLock className="text-dark-gray" />
                  <span className="font-semibold text-black">Secure Checkout</span>
                </div>
                <p className="text-sm text-dark-gray">
                  Your payment information is encrypted and secure. We never store your payment details.
                </p>
              </div>

              {/* Checkout Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleCheckout}
                  disabled={loading || cartItems.length === 0 || checkoutBlocked}
                  className={`bg-maybelline-pink text-pure-white w-full py-3 font-sans font-medium text-lg hover:opacity-90 transition-opacity duration-200 ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-pure-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Place Order"
                  )}
                </button>
                
                <button
                  onClick={() => router.push("/cart")}
                  disabled={loading}
                  className="w-full py-3 font-sans font-medium text-black border border-cool-gray hover:bg-cool-gray transition-colors duration-200"
                >
                  <FaArrowLeft className="inline mr-2" />
                  Back to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
