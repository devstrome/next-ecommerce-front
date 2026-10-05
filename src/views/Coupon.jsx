'use client'
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch, FaTicketAlt } from "react-icons/fa";
import { useRouter } from "next/navigation";

const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
  }, []);

  // Refresh when another admin changes a coupon (live via socket)
  useEffect(() => {
    const onStore = () => fetchCoupons();
    window.addEventListener('storeChanged', onStore);
    return () => window.removeEventListener('storeChanged', onStore);
  }, []);

  useEffect(() => {
    if (editingCoupon) {
      setCode(editingCoupon.code);
      setDiscount(editingCoupon.discount);
      setExpirationDate(editingCoupon.expirationDate.split('T')[0]);
      setIsActive(editingCoupon.isActive);
      setMinAmount(editingCoupon.minAmount || "");
      setMaxAmount(editingCoupon.maxAmount || "");
      
      const productIds = editingCoupon.applicableProducts?.map(ap => ap.product) || [];
      setSelectedProducts(productIds);
      
      const variantsMap = {};
      editingCoupon.applicableProducts?.forEach(ap => {
        variantsMap[ap.product] = ap.variants?.map(v => ({
          variantId: v.variantId,
          color: v.color,
          size: v.size
        })) || [];
      });
      setSelectedVariants(variantsMap);
    }
  }, [editingCoupon]);

  const fetchCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/coupons`);
      console.log("Fetched Coupons:", response.data);
      setCoupons(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      setError("Failed to load coupons. Please try again.");
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products`);
      setProducts(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  const handleAddOrUpdateCoupon = async () => {
    try {
      const applicableProducts = selectedProducts.map(productId => {
        const variants = selectedVariants[productId] || [];
        
        const variantGroups = variants.reduce((acc, { variantId, color, size }) => {
          if (!acc[variantId]) {
            acc[variantId] = { variantId, color, sizes: [] };
          }
          acc[variantId].sizes.push(size);
          return acc;
        }, {});

        return {
          product: productId,
          variants: Object.values(variantGroups).map(v => ({
            variantId: v.variantId,
            color: v.color,
            sizes: v.sizes
          }))
        };
      });

      const newCoupon = {
        code,
        discount: Number(discount),
        minAmount: Number(minAmount) || 0,
        maxAmount: Number(maxAmount) || 0,
        expirationDate,
        isActive,
        applicableProducts
      };

      if (editingCoupon) {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/coupons/${editingCoupon._id}`, newCoupon);
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/coupons`, newCoupon);
      }
      
      fetchCoupons();
      resetForm();
    } catch (error) {
      console.error("Error saving coupon:", error);
      alert(error.response?.data?.message || "Error saving coupon");
    }
  };

  const resetForm = () => {
    setCode("");
    setDiscount("");
    setExpirationDate("");
    setIsActive(true);
    setMinAmount("");
    setMaxAmount("");
    setSelectedProducts([]);
    setSelectedVariants({});
    setEditingCoupon(null);
  };

  const handleProductSelection = (e) => {
    const selectedOptions = [...e.target.selectedOptions].map(option => option.value);
    setSelectedProducts(selectedOptions);
    
    setSelectedVariants(prev => {
      const newVariants = {...prev};
      Object.keys(newVariants).forEach(key => {
        if (!selectedOptions.includes(key)) {
          delete newVariants[key];
        }
      });
      return newVariants;
    });
  };

  const handleVariantSelection = (productId, variantId, color, size) => {
    setSelectedVariants(prev => {
      const productVariants = prev[productId] || [];
      const existingIndex = productVariants.findIndex(v => 
        v.variantId === variantId && v.size === size
      );
      
      if (existingIndex >= 0) {
        const updated = [...productVariants];
        updated.splice(existingIndex, 1);
        return {
          ...prev,
          [productId]: updated.length ? updated : []
        };
      } else {
        return {
          ...prev,
          [productId]: [
            ...productVariants,
            { variantId, color, size }
          ]
        };
      }
    });
  };

  const isVariantSelected = (productId, variantId, size) => {
    return selectedVariants[productId]?.some(
      v => v.variantId === variantId && v.size === size
    );
  };

  const getProductById = (productId) => {
    return products.find(product => product._id === productId);
  };

  const renderCouponDetails = (coupon) => {
    if (!coupon) return null;
    
    return (
      <div key={coupon._id} className="bg-white border border-cool-gray p-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-heading text-lg text-black" style={{ fontFamily: "'Inter', serif" }}>
              {coupon.code} - {coupon.discount}% off
              {coupon.isActive === false && <span className="ml-2 text-red-500 text-sm">(Inactive)</span>}
            </h3>
            <p className="text-dark-gray">
              Expires on: {new Date(coupon.expirationDate).toLocaleDateString()}
            </p>
            {(coupon.minAmount > 0 || coupon.maxAmount > 0) && (
              <p className="text-sm text-dark-gray mt-1">
                {coupon.minAmount > 0 && <span>Min: BDT {coupon.minAmount.toLocaleString()}</span>}
                {coupon.minAmount > 0 && coupon.maxAmount > 0 && <span> · </span>}
                {coupon.maxAmount > 0 && <span>Max: BDT {coupon.maxAmount.toLocaleString()}</span>}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditingCoupon(coupon)}
              className="bg-maybelline-pink text-white px-3 py-2 text-sm hover:bg-rose transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <FaEdit /> Edit
            </button>
            <button
              onClick={() => handleDeleteCoupon(coupon._id)}
              className="bg-red-500 text-white px-3 py-2 text-sm hover:bg-red-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <FaTrash /> Delete
            </button>
          </div>
        </div>
        
        {coupon.applicableProducts?.length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium text-black">Applicable Products:</h4>
            {coupon.applicableProducts.map((item, index) => {
              const product = getProductById(item.product);
              return (
                <div key={index} className="mt-2 ml-2 p-2 bg-pure-white">
                  <h5 className="font-medium text-black">{product?.name || 'Product not found'}</h5>
                  {item.variants?.length > 0 ? (
                    <div className="ml-2 mt-1">
                      {item.variants.map((variant, idx) => (
                        <div key={idx} className="text-sm text-dark-gray">
                          • {variant.color} - Size: {variant.sizes?.join(', ') || 'N/A'}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-mid-gray">All variants</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleDeleteCoupon = async (couponId) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      try {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/coupons/${couponId}`);
        fetchCoupons();
      } catch (error) {
        console.error("Error deleting coupon:", error);
        alert("Error deleting coupon");
      }
    }
  };

  const filteredCoupons = Array.isArray(coupons) 
    ? coupons.filter(coupon => 
        coupon?.code?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="bg-pure-white min-h-screen p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-dark-gray hover:text-black transition min-h-[44px]"
              aria-label="Go Back"
            >
              <FaArrowLeft className="text-2xl" />
            </button>
            <h1 className="font-heading text-3xl sm:text-4xl text-black" style={{ fontFamily: "'Inter', serif" }}>Coupon Management</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center bg-white border border-cool-gray flex-1 sm:flex-initial">
              <FaSearch className="text-mid-gray ml-3" />
              <input
                type="text"
                placeholder="Search coupons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 w-full sm:w-64 bg-transparent focus:outline-none focus:ring-2 focus:ring-charcoal text-black"
              />
            </div>
            <button
              onClick={handleAddOrUpdateCoupon}
              className="flex items-center justify-center bg-black text-white px-4 py-2 hover:bg-maybelline-pink transition min-h-[44px]"
              disabled={!code || !discount || !expirationDate}
            >
              <FaPlus className="mr-2" /> {editingCoupon ? 'Update Coupon' : 'Add Coupon'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-cool-gray p-4 mb-8">
          <h2 className="font-heading text-lg text-black flex items-center mb-4" style={{ fontFamily: "'Inter', serif" }}>
            <FaTicketAlt className="mr-2 text-maybelline-pink" />
            {editingCoupon ? "Edit Coupon" : "Add New Coupon"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-dark-gray mb-1">Coupon Code</label>
              <input
                type="text"
                placeholder="e.g. SAVE20"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-gray mb-1">Discount (%)</label>
              <input
                type="number"
                placeholder="e.g. 20"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-dark-gray mb-1">Min Amount (BDT)</label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                min="0"
                className="w-full px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
              />
            </div>

            <div>
              <label className="block text-sm text-dark-gray mb-1">Max Amount (BDT)</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                min="0"
                className="w-full px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-gray mb-1">Expiration Date</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
                required
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-crimson"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-dark-gray">
                Active Coupon
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-dark-gray mb-1">Applicable Products</label>
            <select 
              multiple 
              onChange={handleProductSelection} 
              className="w-full px-4 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal h-auto min-h-[100px]"
              value={selectedProducts}
              size="5"
            >
              <option value="" disabled>Select Products</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-mid-gray mt-1">Hold Ctrl/Cmd to select multiple products</p>
          </div>

          {selectedProducts.map((productId) => {
            const product = products.find(p => p._id === productId);
            if (!product) return null;
            
            return (
              <div key={productId} className="mb-4 p-3 border border-cool-gray bg-pure-white">
                <h3 className="font-medium text-black mb-2">{product.name}</h3>
                
                {product.variants?.length > 0 ? (
                  product.variants.map((variant) => (
                    <div key={variant._id} className="mb-3 ml-2 p-2 border border-cool-gray bg-white">
                      <h4 className="font-medium text-black mb-1">{variant.colorName}</h4>
                      <div className="flex flex-wrap gap-2">
                        {variant.sizes?.map((size) => (
                          <button
                            key={`${variant._id}-${size}`}
                            type="button"
                            onClick={() => handleVariantSelection(
                              productId, 
                              variant._id, 
                              variant.colorName, 
                              size
                            )}
                            className={`px-3 py-1 border text-sm ${
                              isVariantSelected(productId, variant._id, size)
                                ? "bg-black text-white border-black"
                                : "bg-white text-dark-gray border-cool-gray hover:bg-pure-white"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-mid-gray">No variants available for this product</div>
                )}
              </div>
            );
          })}

          <div className="flex justify-end gap-3 mt-4">
            {editingCoupon && (
              <button
                onClick={resetForm}
                className="bg-cool-gray text-dark-gray px-4 py-2 hover:bg-blush transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="w-full max-w-5xl">
          <h2 className="font-heading text-xl mb-4 text-black" style={{ fontFamily: "'Inter', serif" }}>Existing Coupons</h2>
          
          {error ? (
            <div className="text-center py-8 bg-pure-white border border-cool-gray">
              <p className="text-red-500">{error}</p>
              <button 
                onClick={fetchCoupons}
                className="mt-2 bg-black text-white px-4 py-2 hover:bg-maybelline-pink"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-dark-gray">
              Loading coupons...
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="text-center py-8 bg-white border border-cool-gray">
              <p className="text-mid-gray">
                {searchQuery ? 'No coupons found matching your search.' : 'No coupons found.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCoupons.map(renderCouponDetails)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CouponManagement;
