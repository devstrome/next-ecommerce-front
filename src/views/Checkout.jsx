'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { CartContext } from "../context/CartContext";
import { UserContext } from "../context/UserContext";
import { ToastContainer, toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { formatMeasureLine } from "../lib/measure";
import { formatBDT } from "../config/brand";
import "react-toastify/dist/ReactToastify.css";
import { cartActions } from '../store/slices/cartSlice';
import { validateCheckout } from '../store/slices/checkoutSlice';
import { placeOrder } from '../store/slices/orderSlice';
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
    removeItem,
    fetchCart,
  } = useContext(CartContext);

  const {
    user,
    address,
    paymentMethods,
    defaultPaymentMethod,
    isLoggedIn,
    authRequest,
    updateAddress,
    addPaymentMethod,
  } = useContext(UserContext);
  const digitalOnlyCart = cartItems.length > 0 && cartItems.every((item) => Boolean(item.isDigitalProduct));
  const requiresWalletPayment = cartItems.some((item) => Boolean(item.isDigitalProduct));
  const availablePaymentMethods = requiresWalletPayment
    ? paymentMethods.filter((method) => ['bkash', 'nagad'].includes(String(method.type || '').toLowerCase()))
    : paymentMethods;

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
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [loyaltyRequested, setLoyaltyRequested] = useState('');
  const [loyaltyMaxRedeemPercent, setLoyaltyMaxRedeemPercent] = useState(100);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [rulesTick, setRulesTick] = useState(0);
  const dispatch = useDispatch();
  const checkoutState = useSelector((state) => state.checkout);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn || !user?._id) {
      setLoyaltyBalance(0);
      setLoyaltyRequested('');
      setLoyaltyEnabled(false);
      return () => { cancelled = true; };
    }
    authRequest(`${process.env.NEXT_PUBLIC_API_URI}/api/loyalty/me`, { method: 'GET' })
      .then((data) => {
        if (cancelled) return;
        setLoyaltyBalance(Math.max(0, Number(data.balanceBDT) || 0));
        setLoyaltyMaxRedeemPercent(Math.min(100, Math.max(0, Number(data.maxRedeemPercent ?? 100) || 0)));
        setLoyaltyEnabled(Boolean(data.enabled));
      })
      .catch(() => {
        if (!cancelled) {
          setLoyaltyBalance(0);
          setLoyaltyEnabled(false);
        }
      });
    return () => { cancelled = true; };
    // authRequest is provided by UserContext and changes identity during renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?._id]);

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
    if (!requiresWalletPayment) return;
    const currentType = String(selectedPaymentMethod?.type || '').toLowerCase();
    if (['bkash', 'nagad'].includes(currentType)) return;
    setSelectedPaymentMethod(availablePaymentMethods[0] || null);
  }, [requiresWalletPayment, selectedPaymentMethod, availablePaymentMethods]);

  useEffect(() => {
    let cancelled = false;
    const loadShipping = async () => {
      try {
        if (!cartItems || cartItems.length === 0) {
          if (!cancelled) {
            setShippingOptions([]);
            setSelectedShipping(null);
          }
          return;
        }

        if (cartItems.every((item) => Boolean(item.isDigitalProduct))) {
          const digitalDeliveryOption = {
            name: 'Digital Products — Free Delivery',
            charge: 0,
            estimatedDays: 0,
            isDigitalDelivery: true,
          };
          if (!cancelled) {
            setShippingOptions([digitalDeliveryOption]);
            setSelectedShipping(digitalDeliveryOption);
          }
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

        // A threshold-based free-delivery rule applies automatically to a paid
        // delivery method. Don't expose a separate zero-cost option that would
        // bypass the configured threshold.
        try {
          const rulesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URI}/api/checkout-rules`);
          const activeRules = rulesRes.ok ? await rulesRes.json() : [];
          const hasFreeDeliveryRule = Array.isArray(activeRules) && activeRules.some(
            rule => rule.type === 'free_delivery_above'
          );
          if (hasFreeDeliveryRule) {
            uniqueOptions = uniqueOptions.filter(
              option => !/\bfree\s*(?:shipping|delivery)\b/i.test(String(option.name || ''))
            );
          }
        } catch { /* keep available shipping options if rules cannot be loaded */ }

        uniqueOptions.sort((a, b) => Number(a.charge || 0) - Number(b.charge || 0));

        if (cancelled) return;
        setShippingOptions(uniqueOptions);
        setSelectedShipping((previous) =>
          uniqueOptions.find(option =>
            option.name === previous?.name && Number(option.charge || 0) === Number(previous?.charge || 0)
          ) || uniqueOptions[0] || null
        );
      } catch (e) {
        if (cancelled) return;
        console.error('shipping load error', e);
        setShippingOptions([]);
        setSelectedShipping(null);
      }
    };
    loadShipping();
    return () => { cancelled = true; };
  }, [cartItems, discount, rulesTick]);

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
  const couponRegions = [...new Set(
    (coupon?.applicableProducts || []).flatMap((productRule) => productRule.variants || [])
      .map((variant) => variant.regionName || variant.regionId?.name)
      .filter(Boolean)
  )];
  const shippingCharge = selectedShipping?.charge ? Number(selectedShipping.charge) : 0;
  const paymentMethodKey = !selectedPaymentMethod
    ? ''
    : selectedPaymentMethod.type === 'cash'
      ? 'Cash on Delivery'
      : selectedPaymentMethod.type;
  const cartSignature = cartItems
    .map(i => `${i._id || i.guestItemId || ''}-${i.productId?._id || i.productId}-${i.regionId || ''}-${i.variantId}:${i.size}:${i.measureType}:${i.unitName}:${i.quantity}`)
    .join(',');
  const checkoutRequestKey = JSON.stringify([cartSignature, selectedShipping?.name || '', shippingCharge, paymentMethodKey, mainTotal, discount]);
  const ruleEval = checkoutState.validation?.requestKey === checkoutRequestKey ? checkoutState.validation : null;
  const displaySubtotal = ruleEval ? Number(ruleEval.subtotal || 0) : mainTotal;
  const displayDiscount = ruleEval ? Number(ruleEval.discountAmount || 0) : discount;
  const displayShippingCharge = ruleEval ? Number(ruleEval.baseDelivery || 0) : shippingCharge;
  const discountPercentage = displaySubtotal > 0 ? (displayDiscount / displaySubtotal) * 100 : 0;
  const totalAfterDiscount = ruleEval ? Number(ruleEval.orderAmount || 0) : mainTotal - discount;
  const effectiveShipping = ruleEval ? Number(ruleEval.deliveryCharge || 0) : shippingCharge;
  const extraFeeTotal = ruleEval ? Number(ruleEval.extraFeeTotal || 0) : 0;
  const grandTotal = totalAfterDiscount + effectiveShipping + extraFeeTotal;
  const loyaltyCap = loyaltyEnabled ? grandTotal * loyaltyMaxRedeemPercent / 100 : 0;
  const loyaltyApplied = isLoggedIn
    ? Math.round(Math.min(Math.max(0, Number(loyaltyRequested) || 0), loyaltyBalance, loyaltyCap, grandTotal) * 100) / 100
    : 0;
  const amountDue = Math.max(0, Math.round((grandTotal - loyaltyApplied) * 100) / 100);
  const ruleBlockers = ruleEval?.blockers || (checkoutState.status === 'failed' && checkoutState.error ? [{ message: checkoutState.error }] : []);
  const checkoutBlocked = !ruleEval || !ruleEval.ok || ruleBlockers.length > 0;
  const deliveryRuleNotes = (ruleEval?.appliedRules || []).filter(r =>
    ['free_delivery_above', 'digital_free_delivery', 'delivery_multiplier', 'extra_delivery_fee'].includes(r.type)
  );

  // Evaluate admin checkout rules (delivery multipliers, fees, limits) on cart/shipping/payment changes
  // Re-evaluate when admin coupons/rules/shipping/prices change over socket
  useEffect(() => {
    const onStoreChanged = () => setRulesTick((t) => t + 1);
    window.addEventListener('storeChanged', onStoreChanged);
    return () => window.removeEventListener('storeChanged', onStoreChanged);
  }, []);

  useEffect(() => {
    if (!cartItems.length) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      try {
        dispatch(validateCheckout({
          shippingName: selectedShipping?.name || '',
          paymentMethod: paymentMethodKey,
          requestKey: checkoutRequestKey,
        })).unwrap().then((data) => {
          if (!cancelled && data.cart) dispatch(cartActions.cartServerSnapshot({ cart: data.cart }));
        }).catch((error) => {
          if (!cancelled) console.error('Checkout validation failed:', error);
        });
      } catch (error) {
        if (!cancelled) console.error('Checkout validation failed:', error);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [dispatch, mainTotal, discount, shippingCharge, selectedShipping?.name, paymentMethodKey, cartSignature, checkoutRequestKey, rulesTick, cartItems.length]);

const handleCheckout = async () => {
  if (!validateShippingInfo()) return;

  if (amountDue > 0 && requiresWalletPayment && !['bkash', 'nagad'].includes(String(selectedPaymentMethod?.type || '').toLowerCase())) {
    toast.error('Digital products require bKash or Nagad payment. Add or select a wallet payment method to continue.');
    return;
  }

  if (!ruleEval) {
    toast.info(checkoutState.status === 'loading' ? 'Checking current prices and stock…' : 'Checkout details are still being validated.');
    return;
  }
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

  if (amountDue > 0 && !selectedPaymentMethod) {
    toast.error("Please select a payment method.");
    return;
  }

  const isMobilePayment = amountDue > 0 && ['bkash', 'nagad'].includes(String(selectedPaymentMethod?.type || '').toLowerCase());
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
    const paymentMethodToSend = amountDue <= 0
      ? 'Loyalty Balance'
      : selectedPaymentMethod.type === 'cash'
        ? 'Cash on Delivery'
        : selectedPaymentMethod.type;

    const orderData = {
      shipping: selectedShipping ? { name: selectedShipping.name } : null,
      shippingAddress: orderShippingAddress,
      paymentMethod: paymentMethodToSend,
      selectedPaymentMethodId: amountDue <= 0 ? 'loyalty' : selectedPaymentMethod._id || selectedPaymentMethod.methodId,
      loyaltyAmountBDT: loyaltyApplied,
      paymentDetails: isMobilePayment ? { 
        trxId: transactionNumber.trim(),
        walletNumberMasked: selectedPaymentMethod.walletNumberMasked,
        paymentMethod: selectedPaymentMethod.type
      } : {},
    };

    const result = await dispatch(placeOrder(orderData)).unwrap();
    dispatch(cartActions.cartServerSnapshot({ cart: { items: [], couponId: null, totalAmount: 0, discountAmount: 0 } }));
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
    const message = typeof error === 'string' ? error : error.message || '';
    if (message.toLowerCase().includes("network")) {
      errorMessage = "Network error. Please check your connection and try again.";
    } else if (message.toLowerCase().includes("validation")) {
      errorMessage = "Invalid order data. Please check your information.";
    }
    
    toast.error(message || errorMessage);
    if (message) await fetchCart();
    
    if (window.analytics) {
      window.analytics.track('Checkout Error', {
        error: message,
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
                      <label key={idx} className={`flex items-center gap-4 p-4 border border-cool-gray ${opt.isDigitalDelivery ? 'bg-green-50 cursor-default' : 'hover:border-maybelline-pink/50 hover:bg-cool-gray cursor-pointer'} transition-all duration-200`}>
                        <input
                          type="radio"
                          name="shippingOption"
                          checked={selectedShipping?.name === opt.name}
                          onChange={() => { if (!opt.isDigitalDelivery) setSelectedShipping(opt); }}
                          disabled={Boolean(opt.isDigitalDelivery)}
                          className="w-5 h-5 text-maybelline-pink border-cool-gray focus:ring-maybelline-pink"
                        />
                        <div className="flex justify-between items-center w-full">
                          <div>
                            <span className="font-semibold text-black">{opt.isDigitalDelivery ? 'Free Delivery' : opt.name}</span>
                            <p className="text-sm text-dark-gray">{opt.isDigitalDelivery ? 'Digital code will be sent by email after payment confirmation.' : `${opt.estimatedDays} days delivery`}</p>
                          </div>
                          <span className={`font-bold ${opt.isDigitalDelivery ? 'text-green-600' : 'text-maybelline-pink'}`}>{opt.isDigitalDelivery ? 'Free' : formatBDT(Number(opt.charge).toFixed(2))}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {!digitalOnlyCart && deliveryPhone && (
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
                {requiresWalletPayment && (
                  <div className="mb-4 rounded-lg border border-maybelline-pink/20 bg-maybelline-pink/5 p-3 text-sm text-dark-gray">
                    This cart contains a digital product. Choose bKash or Nagad and enter the payment transaction ID.
                  </div>
                )}
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
                      {availablePaymentMethods.map((method) => (
                        <option key={method._id} value={method._id}>
                          {method.label || `${method.type.toUpperCase()} ${method.walletNumberMasked || method.last4 || ''}`}
                        </option>
                      ))}
                      {!requiresWalletPayment && <option value="Cash On Delivery">Cash on Delivery</option>}
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
                              value={String(selectedPaymentMethod.type || '').toLowerCase() === 'bkash' ? '01601886367' : '01873886367'}
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

                    <div className={`grid gap-3 mb-4 ${requiresWalletPayment ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {(requiresWalletPayment ? ['bkash', 'nagad'] : ['bkash', 'nagad', 'card']).map(type => (
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
                        {item.isPreOrder && (
                          <p className="text-xs font-semibold text-maybelline-pink">
                            Pre-order{item.preOrderEstimatedDate ? ` · Est. ${new Date(item.preOrderEstimatedDate).toLocaleDateString()}` : ''}
                          </p>
                        )}
                        {item.isDigitalProduct && (
                          <p className="text-xs font-semibold text-maybelline-pink">Digital product · online payment required</p>
                        )}
                        {formatMeasureLine(item) && <p className="text-sm text-dark-gray">{formatMeasureLine(item)}</p>}
                        {item.color && <p className="text-sm text-dark-gray">Color: {item.color}</p>}
                        {(item.regionName || item.regionId?.name) && <p className="text-sm text-dark-gray">Region: {item.regionName || item.regionId.name}</p>}
                        <p className="text-sm text-dark-gray">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-black">{formatBDT((item.price * item.quantity).toFixed(2))}</span>
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
                  <span className="font-semibold text-black">{formatBDT(displaySubtotal.toFixed(2))}</span>
                </div>
                
                {displayDiscount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-dark-gray">
                      <span>Discount</span>
                      <span className="font-semibold">- {formatBDT(displayDiscount.toFixed(2))}</span>
                    </div>
                    <div className="flex justify-between items-center text-dark-gray">
                      <span>Discount Percentage</span>
                      <span className="font-semibold">{discountPercentage.toFixed(2)}%</span>
                    </div>
                  </>
                )}
                
                {coupon?.code && (
                  <div className="flex justify-between items-start gap-3 text-dark-gray">
                    <span>Coupon Applied</span>
                    <span className="text-right font-semibold">
                      <span className="block">{coupon.code}</span>
                      {Number(coupon.maxDiscountAmount) > 0 && (
                        <span className="block text-xs font-normal">Maximum saving {formatBDT(coupon.maxDiscountAmount)}</span>
                      )}
                      {couponRegions.length > 0 && (
                        <span className="block text-xs font-normal">Regions: {couponRegions.join(', ')}</span>
                      )}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-dark-gray">Shipping</span>
                  <span className="font-semibold text-black text-right">
                    {ruleEval?.freeDelivery ? (
                      <>
                        {displayShippingCharge > 0 && (
                          <span className="line-through text-mid-gray mr-2">{formatBDT(displayShippingCharge.toFixed(2))}</span>
                        )}
                        <span className="text-green-600">Free</span>
                      </>
                    ) : effectiveShipping !== displayShippingCharge ? (
                      <>
                        <span className="line-through text-mid-gray mr-2">{formatBDT(displayShippingCharge.toFixed(2))}</span>
                        <span>{formatBDT(effectiveShipping.toFixed(2))}</span>
                      </>
                    ) : (
                      <>{formatBDT(displayShippingCharge.toFixed(2))}</>
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
                    <span className="font-semibold text-black">{formatBDT(Number(f.amount).toFixed(2))}</span>
                  </div>
                ))}

                {isLoggedIn && loyaltyEnabled && (
                  <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="checkout-loyalty" className="font-medium text-black">Use loyalty balance</label>
                      <span className="text-xs text-dark-gray">Available {formatBDT(loyaltyBalance.toFixed(2))}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="checkout-loyalty"
                        type="number"
                        min="0"
                        max={Math.min(loyaltyBalance, loyaltyCap)}
                        step="0.01"
                        value={loyaltyRequested}
                        onChange={(event) => setLoyaltyRequested(event.target.value)}
                        placeholder="BDT amount"
                        className="min-w-0 flex-1 rounded border border-cool-gray px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setLoyaltyRequested(String(Math.round(Math.min(loyaltyBalance, loyaltyCap) * 100) / 100))}
                        className="rounded border border-cool-gray px-3 text-sm font-medium hover:bg-white"
                        disabled={loyaltyBalance <= 0 || loyaltyCap <= 0}
                      >Use max</button>
                      <button
                        type="button"
                        onClick={() => setLoyaltyRequested('')}
                        className="rounded border border-cool-gray px-3 text-sm hover:bg-white"
                      >Clear</button>
                    </div>
                    {loyaltyMaxRedeemPercent < 100 && (
                      <p className="text-xs text-dark-gray">Up to {loyaltyMaxRedeemPercent}% of this order can be paid with loyalty balance.</p>
                    )}
                  </div>
                )}

                {loyaltyApplied > 0 && (
                  <div className="flex justify-between items-center text-green-700">
                    <span>Loyalty balance applied</span>
                    <span className="font-semibold">- {formatBDT(loyaltyApplied.toFixed(2))}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xl font-bold pt-3 border-t border-cool-gray">
                  <span>Total</span>
                  <span className="text-maybelline-pink">{formatBDT(grandTotal.toFixed(2))}</span>
                </div>
                {loyaltyApplied > 0 && (
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Pay now</span>
                    <span className="text-maybelline-pink">{formatBDT(amountDue.toFixed(2))}</span>
                  </div>
                )}
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
