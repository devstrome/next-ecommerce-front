'use client'
import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { FiShoppingCart, FiX, FiMinus, FiPlus } from 'react-icons/fi';
import { CartContext } from '../context/CartContext';

const ProductCartModal = ({ productId, isOpen, onClose }) => {
  const cartCtx = useContext(CartContext);
  const addToCart = cartCtx?.addToCart || (() => {});

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedDiscountPrice, setSelectedDiscountPrice] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!isOpen || !productId) return;
    setLoading(true);
    setQuantity(1);
    setSelectedVariant(null);
    setSelectedSize(null);
    setSelectedPrice(null);
    setSelectedDiscountPrice(null);
    setSelectedColor('');

    axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${productId}`)
      .then(({ data }) => {
        setProduct(data);
        if (data.variants && data.variants.length > 0) {
          const v = data.variants[0];
          setSelectedVariant(v);
          setSelectedColor(v.colorName || '');
          if (v.sizes?.length > 0 && v.prices?.length > 0) {
            setSelectedSize(v.sizes[0]);
            setSelectedPrice(v.prices[0]);
            setSelectedDiscountPrice(v.discountPrices?.[0] || null);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, productId]);

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    setSelectedColor(variant.colorName || '');
    setQuantity(1);
    if (variant.sizes?.length > 0 && variant.prices?.length > 0) {
      setSelectedSize(variant.sizes[0]);
      setSelectedPrice(variant.prices[0]);
      setSelectedDiscountPrice(variant.discountPrices?.[0] || null);
    } else {
      setSelectedSize(null);
      setSelectedPrice(null);
      setSelectedDiscountPrice(null);
    }
  };

  const handleSizeChange = (size) => {
    const idx = selectedVariant.sizes.indexOf(size);
    if (idx !== -1) {
      setSelectedSize(size);
      setSelectedPrice(selectedVariant.prices[idx]);
      setSelectedDiscountPrice(selectedVariant.discountPrices?.[idx] || null);
    }
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant || !selectedSize) return;
    const sizeIndex = selectedVariant.sizes.indexOf(selectedSize);
    const price = selectedDiscountPrice || selectedPrice || product.mainPrice;
    const stockBySize = selectedVariant.stockBySize || [];
    const stock = stockBySize[sizeIndex] || selectedVariant.stock || 0;

    addToCart({
      productId: product._id,
      name: product.name,
      mainImage: product.mainImage,
      variantId: selectedVariant._id,
      color: selectedColor,
      hexCode: selectedVariant.hexCode,
      size: selectedSize,
      price,
      quantity,
      stock,
      measureType: selectedVariant.measureType,
      unitName: selectedVariant.unitName,
    });
    onClose();
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
                  <div className="flex items-center gap-2 mt-1">
                    {selectedDiscountPrice ? (
                      <>
                        <span className="text-xs text-gray-400 line-through">BDT{originalPrice}</span>
                        <span className="text-base font-bold text-[#DC143C]">BDT{displayPrice}</span>
                      </>
                    ) : (
                      <span className="text-base font-bold text-[#DC143C]">BDT{displayPrice}</span>
                    )}
                  </div>
                </div>
              </div>

              {product.variants?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2.5 text-black uppercase tracking-wider">
                    Color: <span className="font-normal normal-case text-gray-500">{selectedColor}</span>
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.hexCode}
                        type="button"
                        style={{ backgroundColor: variant.hexCode }}
                        onClick={() => handleVariantChange(variant)}
                        className={`w-10 h-10 rounded-full transition-all duration-200 ${
                          selectedVariant?.hexCode === variant.hexCode
                            ? 'ring-2 ring-[#DC143C] ring-offset-2 scale-110'
                            : 'ring-1 ring-gray-300 hover:ring-gray-500'
                        }`}
                        aria-label={`Select color ${variant.colorName}`}
                      >
                        <span className="sr-only">{variant.colorName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedVariant?.sizes?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2.5 text-black uppercase tracking-wider">
                    {selectedVariant.measureType || 'Size'}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVariant.sizes.map((size, index) => {
                      const stock = selectedVariant.stockBySize?.[index] || selectedVariant.stock || 0;
                      const isOutOfStock = stock <= 0;
                      const isSelected = size === selectedSize;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => !isOutOfStock && handleSizeChange(size)}
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
                            <span>{size}</span>
                            {selectedVariant.unitName && <span className="text-[10px]">{selectedVariant.unitName}</span>}
                            <span className={`text-[10px] mt-0.5 ${isOutOfStock ? 'text-red-400' : 'text-gray-500'}`}>
                              {isOutOfStock ? 'Out of Stock' : `${stock} in stock`}
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
                    onClick={() => setQuantity(q => q + 1)}
                    className="px-4 py-2.5 hover:bg-gray-100 transition-colors"
                  >
                    <FiPlus size={12} />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Price per unit</span>
                  <span className="text-black font-medium">BDT{displayPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quantity</span>
                  <span className="text-black font-medium">x{quantity}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2">
                  <span className="text-black">TOTAL</span>
                  <span className="text-[#DC143C]">BDT{(displayPrice * quantity).toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={handleAddToCart}
            disabled={loading || !selectedSize || !product}
            className="w-full py-3.5 bg-[#DC143C] text-white font-semibold text-sm uppercase tracking-wider hover:bg-[#B91C1C] transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiShoppingCart size={18} />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default ProductCartModal;
