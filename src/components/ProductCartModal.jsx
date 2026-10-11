'use client'
import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FiShoppingCart, FiX, FiMinus, FiPlus, FiArrowRight } from 'react-icons/fi';
import { CartContext } from '../context/CartContext';
import { formatBDT } from '../config/brand';
import { formatMeasure } from '../lib/measure';

const idOf = (value) => String(value?._id || value || '');

const getVariantOptions = (product, variant) => {
  if (!variant) {
    return product ? [{
      size: product.defaultSize || '',
      measureType: product.measureType || '',
      unitName: product.unitName || '',
      price: product.mainPrice,
      discountPrice: product.discountPrice,
      stock: product.stock,
    }] : [];
  }
  if (Array.isArray(variant.options) && variant.options.length) return variant.options;
  const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
  const prices = Array.isArray(variant.prices) ? variant.prices : [];
  const discounts = Array.isArray(variant.discountPrices) ? variant.discountPrices : [];
  const stocks = Array.isArray(variant.stockBySize) ? variant.stockBySize : [];
  const count = Math.max(sizes.length, prices.length, discounts.length, stocks.length, 0);
  if (!count) return [];
  return Array.from({ length: count }, (_, index) => ({
    size: sizes[index] || '',
    measureType: variant.measureType || product?.measureType || '',
    unitName: variant.unitName || product?.unitName || '',
    price: prices[index],
    discountPrice: discounts[index],
    stock: stocks[index] ?? variant.stock,
  }));
};

const ProductCartModal = ({ productId, isOpen, onClose }) => {
  const router = useRouter();
  const cartCtx = useContext(CartContext);
  const addToCart = cartCtx?.addToCart;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isOpen || !productId) return;
    setLoading(true);
    setQuantity(1);
    setSelectedVariant(null);
    setSelectedRegionId('');
    setSelectedOptionIndex(0);
    setSelectedColor('');
    setSubmitting(false);
    setSubmitError('');
    setProduct(null);

    axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${productId}`)
      .then(({ data }) => {
        setProduct(data);
        const regionId = idOf(data.regionId) || idOf(data.regions?.[0]) || idOf(data.variants?.find((variant) => variant.regionId)?.regionId);
        setSelectedRegionId(regionId);
        const regionVariants = (data.variants || []).filter((variant) =>
          !regionId || !variant.regionId || idOf(variant.regionId) === regionId
        );
        if (regionVariants.length > 0) {
          const v = regionVariants[0];
          setSelectedVariant(v);
          setSelectedColor(v.colorName || '');
          setSelectedOptionIndex(0);
        } else if (!data.variants?.length) {
          setSelectedVariant(null);
          setSelectedOptionIndex(0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, productId]);

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    setSelectedColor(variant.colorName || '');
    setQuantity(1);
    setSelectedOptionIndex(0);
  };

  const regionOptions = [...new Map([
    ...(Array.isArray(product?.regions) ? product.regions : []),
    product?.regionId,
    ...(product?.variants || []).map((variant) => variant.regionId),
  ].filter(Boolean).map((region) => [idOf(region), { id: idOf(region), name: region.name || region.slug || '' }])).values()];
  const regionVariants = (product?.variants || []).filter((variant) =>
    !selectedRegionId || !variant.regionId || idOf(variant.regionId) === selectedRegionId
  );
  const configurationOptions = getVariantOptions(product, selectedVariant);
  const selectedOption = configurationOptions[selectedOptionIndex] || null;
  const selectedSize = selectedOption?.size || '';
  const selectedPrice = Number(selectedOption?.price) || Number(product?.mainPrice) || 0;
  const rawDiscountPrice = Number(selectedOption?.discountPrice);
  const selectedDiscountPrice = Number.isFinite(rawDiscountPrice) && rawDiscountPrice > 0 && rawDiscountPrice < selectedPrice
    ? rawDiscountPrice
    : null;
  const stockValue = Number(selectedOption?.stock);
  const selectedStock = Number.isFinite(stockValue) && stockValue >= 0 ? stockValue : null;

  const handleRegionChange = (regionId) => {
    setSelectedRegionId(regionId);
    const nextVariant = (product?.variants || []).find((variant) =>
      !variant.regionId || idOf(variant.regionId) === regionId
    ) || null;
    setSelectedVariant(nextVariant);
    setSelectedColor(nextVariant?.colorName || '');
    setSelectedOptionIndex(0);
    setQuantity(1);
  };

  const handleAddToCart = async ({ goToCheckout = false } = {}) => {
    if (!product || !selectedOption || (product.variants?.length && !selectedVariant)) return;
    if (!product.isPreOrder && selectedStock !== null && quantity > selectedStock) {
      setSubmitError(`Only ${selectedStock} item(s) are available.`);
      return;
    }
    if (!addToCart || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const price = selectedDiscountPrice || selectedPrice || product.mainPrice;
    try {
      const result = await addToCart({
        productId: product._id,
        name: product.name,
        mainImage: selectedVariant?.images?.[0] || product.mainImage,
        regionId: selectedRegionId || selectedVariant?.regionId?._id || selectedVariant?.regionId || product.regionId?._id || product.regionId || null,
        regionName: regionOptions.find((region) => region.id === selectedRegionId)?.name || selectedVariant?.regionId?.name || '',
        variantId: selectedVariant?._id || null,
        color: selectedVariant?.colorName || selectedColor,
        hexCode: selectedVariant?.hexCode || '',
        size: selectedSize,
        measureType: selectedOption.measureType || selectedVariant?.measureType || product.measureType || '',
        unitName: selectedOption.unitName || selectedVariant?.unitName || product.unitName || '',
        price,
        quantity,
        stock: selectedStock,
        isPreOrder: Boolean(product.isPreOrder),
        preOrderEstimatedDate: product.preOrderEstimatedDate || null,
      });
      if (result == null) {
        setSubmitError('Could not add this item to your cart. Please try again.');
        return;
      }
      onClose();
      if (goToCheckout) router.push('/checkout');
    } catch (error) {
      setSubmitError(error?.message || 'Could not add this item to your cart. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !productId) return null;

  const displayPrice = selectedDiscountPrice || selectedPrice || product?.mainPrice || 0;
  const originalPrice = selectedPrice || product?.mainPrice || 0;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      onClick={onClose}
      style={{ isolation: 'isolate' }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white w-full sm:max-w-lg sm:mx-4 mx-0 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FiShoppingCart className="text-[#DC143C]" size={20} />
            <h3 className="text-lg font-semibold text-black">Select Options</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <FiX size={22} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC143C]" />
            </div>
          ) : !product ? (
            <p className="text-center text-gray-400 py-8">Failed to load product</p>
          ) : (
            <>
              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 flex-shrink-0 border border-gray-200 overflow-hidden bg-white rounded">
                  <img src={product.mainImage} alt={product.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-black text-sm line-clamp-2">{product.name}</h4>
                  {product.isPreOrder && (
                    <p className="text-xs font-semibold text-[#DC143C] mt-1">
                      Pre-order{product.preOrderEstimatedDate ? ` · Est. ${new Date(product.preOrderEstimatedDate).toLocaleDateString()}` : ''}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {selectedDiscountPrice ? (
                      <>
                        <span className="text-xs text-gray-400 line-through">{formatBDT(originalPrice)}</span>
                        <span className="text-base font-bold text-[#DC143C]">{formatBDT(displayPrice)}</span>
                      </>
                    ) : (
                      <span className="text-base font-bold text-[#DC143C]">{formatBDT(displayPrice)}</span>
                    )}
                  </div>
                </div>
              </div>

              {regionOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-2.5 text-black uppercase tracking-wider" htmlFor="cart-modal-region">Region</label>
                  <select id="cart-modal-region" value={selectedRegionId} onChange={(event) => handleRegionChange(event.target.value)} disabled={regionOptions.length === 1} className="w-full border border-gray-300 px-3 py-2.5 text-sm disabled:bg-gray-50 disabled:text-gray-700">
                    {regionOptions.map((region) => <option key={region.id} value={region.id}>{region.name || 'Region'}</option>)}
                  </select>
                </div>
              )}

              {regionVariants.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2.5 text-black uppercase tracking-wider">
                    Color: <span className="font-normal normal-case text-gray-500">{selectedColor}</span>
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {regionVariants.map((variant) => (
                      <button
                        key={variant._id || `${variant.colorName}-${variant.regionId}`}
                        type="button"
                        style={{ backgroundColor: variant.hexCode || '#eee' }}
                        onClick={() => handleVariantChange(variant)}
                        className={`w-10 h-10 rounded-full transition-all duration-200 ${selectedVariant?._id === variant._id ? 'ring-2 ring-[#DC143C] ring-offset-2 scale-110' : 'ring-1 ring-gray-300 hover:ring-gray-500'}`}
                        aria-label={`Select color ${variant.colorName}`}
                      >
                        <span className="sr-only">{variant.colorName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {configurationOptions.length > 0 && (selectedVariant || !product.variants?.length) && (
                <div>
                  <p className="text-xs font-semibold mb-2.5 text-black uppercase tracking-wider">
                    {selectedOption?.measureType || selectedVariant?.measureType || product.measureType || 'Option'}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {configurationOptions.map((option, index) => {
                      const stock = Number(option.stock);
                      const hasStockValue = Number.isFinite(stock) && stock >= 0;
                      const isOutOfStock = !product.isPreOrder && hasStockValue && stock <= 0;
                      const isSelected = index === selectedOptionIndex;
                      const label = formatMeasure(option) || [option.measureType, option.unitName].filter(Boolean).join(' ');
                      return (
                        <button
                          key={option._id || `${label}-${index}`}
                          type="button"
                          onClick={() => !isOutOfStock && setSelectedOptionIndex(index)}
                          disabled={isOutOfStock}
                          className={`px-4 py-2.5 border text-sm transition-all duration-200 ${
                            isOutOfStock
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : isSelected
                                ? 'bg-[#DC143C] text-white border-[#DC143C]'
                                : 'bg-white text-black border-gray-300 hover:border-[#DC143C]'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{label || 'Default'}</span>
                            <span className={`text-[10px] mt-0.5 ${isOutOfStock ? 'text-red-400' : 'text-gray-500'}`}>
                              {isOutOfStock ? 'Out of Stock' : product.isPreOrder ? 'Available to pre-order' : hasStockValue ? `${stock} in stock` : 'Available'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold mb-2.5 text-black uppercase tracking-wider">Quantity:</p>
                <div className="flex items-center border border-gray-300 w-fit">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-4 py-2.5 hover:bg-gray-100 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <FiMinus size={12} />
                  </button>
                  <span className="px-6 py-2.5 text-black text-sm font-medium border-x border-gray-300 min-w-[3rem] text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.min(product.isPreOrder ? Infinity : selectedStock ?? Infinity, q + 1))}
                    disabled={!product.isPreOrder && selectedStock !== null && quantity >= selectedStock}
                    className="px-4 py-2.5 hover:bg-gray-100 transition-colors"
                  >
                    <FiPlus size={12} />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Price per unit</span>
                  <span className="text-black font-medium">{formatBDT(displayPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quantity</span>
                  <span className="text-black font-medium">x{quantity}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2">
                  <span className="text-black">TOTAL</span>
                  <span className="text-[#DC143C]">{formatBDT((displayPrice * quantity).toFixed(2))}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200">
          {submitError && <p role="alert" className="mb-3 text-sm text-red-700">{submitError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleAddToCart()}
              disabled={loading || submitting || !selectedOption || product?.comingSoon || (product?.variants?.length > 0 && !selectedVariant) || (!product?.isPreOrder && selectedStock !== null && selectedStock <= 0)}
              className="w-full py-3.5 bg-gray-900 text-white font-semibold text-sm uppercase tracking-wider hover:bg-black transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiShoppingCart size={18} />
              {submitting ? 'Please wait…' : product?.isPreOrder ? 'Pre-order' : 'Add to Cart'}
            </button>
            <button
              type="button"
              onClick={() => handleAddToCart({ goToCheckout: true })}
              disabled={loading || submitting || !selectedOption || product?.comingSoon || (product?.variants?.length > 0 && !selectedVariant) || (!product?.isPreOrder && selectedStock !== null && selectedStock <= 0)}
              className="w-full py-3.5 bg-[#DC143C] text-white font-semibold text-sm uppercase tracking-wider hover:bg-[#B91C1C] transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buy Now <FiArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default ProductCartModal;
