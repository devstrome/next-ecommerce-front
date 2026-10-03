'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useRef, useState, useEffect, useContext } from 'react';
import Link from "next/link"
import { useParams } from "next/navigation";
import axios from 'axios';
import io from 'socket.io-client';
import Badge from '../components/Badge';
import SEOHead from '../components/SEOHead';
import { CartContext } from '../context/CartContext';
import { UserContext } from '../context/UserContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaHeart, FaRegHeart, FaStar, FaMinus, FaPlus } from 'react-icons/fa';
import { FiTruck, FiShield, FiRotateCcw, FiShare2, FiShoppingCart, FiX } from 'react-icons/fi';

const ProductView = () => {
  const cartCtx = useContext(CartContext);
  const addToCart = cartCtx?.addToCart || (() => {});
  const userCtx = useContext(UserContext);
  const isLoggedIn = userCtx?.isLoggedIn || false;
  const toggleWish = userCtx?.toggleWishlist || (() => {});
  const wishlist = userCtx?.wishlist || [];
  const fetchWishlist = userCtx?.fetchWishlist || (() => {});
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedDiscountPrice, setSelectedDiscountPrice] = useState(null);
  const [mainImage, setMainImage] = useState('');
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [viewers, setViewers] = useState(0);
  const socketRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [showCartModal, setShowCartModal] = useState(false);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${id}`);
      setProduct(response.data);
      setLikesCount(response.data.likesCount || 0);
      const currentUserId = userCtx?.user?._id;
      if (currentUserId && Array.isArray(response.data.likedBy)) {
        setIsLiked(response.data.likedBy.some(uid => uid === currentUserId || uid?._id === currentUserId));
      }
      console.log("Fetched product:", response.data);

      if (response.data.variants && response.data.variants.length > 0) {
        const defaultVariant = response.data.variants[0];
        setSelectedVariant(defaultVariant);

        if (
          defaultVariant.sizes &&
          defaultVariant.prices &&
          defaultVariant.discountPrices &&
          defaultVariant.sizes.length > 0 &&
          defaultVariant.prices.length > 0 &&
          defaultVariant.discountPrices.length > 0
        ) {
          setSelectedSize(defaultVariant.sizes[0]);
          setSelectedPrice(defaultVariant.prices[0]);
          setSelectedDiscountPrice(defaultVariant.discountPrices[0]);
          setSelectedColor(defaultVariant.colorName);
        }

        setMainImage(defaultVariant.images[0]);
      } else {
        console.warn("No variants available for this product.");
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${id}/reviews`);
      if (res.status === 200) {
        setReviews(res.data.reviews || []);
      }
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    }
  };

  const fetchRelatedProducts = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/relatedproductfront/${id}`, {
        params: { excludeId: id }
      });
      if (response.status === 200) {
        const relatedProductArray = response.data[0]?.relatedProducts || [];
        setRelatedProducts(relatedProductArray);
        console.log('Related Products:', relatedProductArray);
      } else {
        console.error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchReviews();

    const API_URI = process.env.NEXT_PUBLIC_API_URI;
    if (!API_URI) return;

    socketRef.current = io(API_URI, {
      transports: ['polling', 'websocket'],
      auth: { token: getStorage('accessToken') || '' },
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('joinProduct', id);
      socketRef.current.emit('trackViewer', { productId: id, userId: getStorage('accessToken') ? 'logged_in' : 'guest' });
    });

    socketRef.current.on('connect_error', () => {
      if (socketRef.current) socketRef.current.disconnect();
    });

    socketRef.current.on('viewerCountUpdate', (count) => {
      setViewers(count);
    });

    socketRef.current.on('productUpdate', (updateData) => {
      setRealTimeUpdates(prev => [
        {
          id: Date.now(),
          type: updateData.updateType,
          message: getUpdateMessage(updateData),
          timestamp: new Date(),
          data: updateData
        },
        ...prev.slice(0, 4)
      ]);

      switch (updateData.updateType) {
        case 'product_updated':
          fetchProduct();
          toast.info('Product information has been updated!', {
            position: 'top-center',
            autoClose: 3000,
            hideProgressBar: true,
          });
          break;
        case 'stock_updated':
          fetchProduct();
          toast.info(`Stock updated for size ${updateData.size}: ${updateData.newStock} available`, {
            position: 'top-center',
            autoClose: 3000,
            hideProgressBar: true,
          });
          break;
        case 'like':
          setLikesCount(updateData.likesCount);
          break;
        case 'product_deleted':
          toast.warning('This product has been removed from the store.', {
            position: 'top-center',
            autoClose: 5000,
            hideProgressBar: false,
          });
          break;
        default:
          break;
      }
    });

    socketRef.current.on('inventoryAssignment', (assignmentData) => {
      setRealTimeUpdates(prev => [
        {
          id: Date.now(),
          type: 'inventory_assignment',
          message: getInventoryMessage(assignmentData),
          timestamp: new Date(),
          data: assignmentData
        },
        ...prev.slice(0, 4)
      ]);

      fetchProduct();

      toast.info(getInventoryMessage(assignmentData), {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: true,
      });
    });

    return () => {
      if (socketRef.current) {
        try { socketRef.current.emit('untrackViewer', { productId: id }); } catch {}
        try { socketRef.current.emit('leaveProduct', id); } catch {}
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  const unwrapCategories = (cats) => {
    if (!Array.isArray(cats)) return [];
    return cats.map(c => {
      let val = c;
      while (typeof val === 'string') {
        try { val = JSON.parse(val); } catch { break; }
      }
      return Array.isArray(val) ? val : [val];
    }).flat();
  };

  useEffect(() => {
    if (product && product.categories && product.categories.length > 0) {
      fetchRelatedProducts(unwrapCategories(product.categories));
    }
  }, [product]);

  useEffect(() => {
    if (wishlist.length > 0 && id) {
      setIsWishlisted(wishlist.some(p => (p._id || p) === id));
    }
  }, [wishlist, id]);

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    setQuantity(1);

    if (variant.sizes && variant.prices && variant.discountPrices && variant.discountPrices.length > 0 && variant.sizes.length > 0 && variant.prices.length > 0) {
      setSelectedSize(variant.sizes[0]);
      setSelectedPrice(variant.prices[0]);
      setSelectedDiscountPrice(variant.discountPrices[0]);
      setSelectedColor(variant.colorName);
    } else {
      setSelectedSize(null);
      setSelectedPrice(null);
      setSelectedDiscountPrice(null);
      setSelectedColor(null);
    }
    setMainImage(variant.images[0]);
  };

  const handleSizeChange = (size) => {
    const sizeIndex = selectedVariant.sizes.indexOf(size);
    if (sizeIndex !== -1 && selectedVariant.prices[sizeIndex] !== undefined) {
      setSelectedSize(size);
      setSelectedPrice(selectedVariant.prices[sizeIndex]);
      setSelectedDiscountPrice(selectedVariant.discountPrices[sizeIndex]);
    }
  };

  const getVariantShipping = () => {
    if (selectedVariant?.shippingOptions && selectedVariant.shippingOptions.length > 0) {
      return selectedVariant.shippingOptions;
    }
    return [];
  };

  const getVariantBadges = () => {
    if (selectedVariant && selectedVariant.badgeNames && selectedVariant.badgeColors) {
      const length = Math.min(selectedVariant.badgeNames.length, selectedVariant.badgeColors.length);
      const badges = [];
      for (let i = 0; i < length; i++) {
        badges.push({
          name: selectedVariant.badgeNames[i],
          color: selectedVariant.badgeColors[i],
        });
      }
      return badges;
    }
    return [];
  };

  const handleLike = async () => {
    if (!isLoggedIn) {
      toast.error('Please login to like this product');
      return;
    }
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URI}/api/products/${id}/like`,
        {},
        { headers: { Authorization: `Bearer ${getStorage('accessToken')}` } }
      );
      setLikesCount(res.data.likesCount);
      setIsLiked(res.data.liked);
    } catch {
      toast.error('Failed to update like');
    }
  };

  const handleAddToCart = () => {
    const productToAdd = {
      variantId: selectedVariant._id,
      productId: id,
      name: product.name,
      mainImage,
      price: selectedDiscountPrice ? selectedDiscountPrice : product.discountPrice,
      size: selectedSize,
      measureType: selectedVariant.measureType,
      unitName: selectedVariant.unitName,
      color: selectedColor,
      quantity
    };
    addToCart(productToAdd);
    toast.success('Added to cart successfully!', {
      position: 'top-center',
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  const getUpdateMessage = (updateData) => {
    switch (updateData.updateType) {
      case 'product_updated':
        return 'Product information has been updated';
      case 'stock_updated':
        return `Stock updated for size ${updateData.size}: ${updateData.newStock} available`;
      case 'product_deleted':
        return 'Product has been removed from the store';
      default:
        return 'Product has been updated';
    }
  };

  const getInventoryMessage = (assignmentData) => {
    switch (assignmentData.action) {
      case 'inventory_assigned':
        return `Inventory item assigned to order - stock may have decreased`;
      case 'inventory_removed':
        return `Inventory item removed from order - stock may have increased`;
      default:
        return 'Inventory status changed';
    }
  };

  const submitReview = async () => {
    if (!rating) {
      toast.error('Please select a rating', { position: 'top-center', autoClose: 2000, hideProgressBar: true });
      return;
    }
    try {
      setSubmitting(true);
      const token = getStorage('accessToken');
      if (!token) {
        toast.error('Please login to review', { position: 'top-center', autoClose: 2000, hideProgressBar: true });
        setSubmitting(false);
        return;
      }
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URI}/api/products/${id}/reviews`,
        { rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRating(0);
      setComment('');
      fetchReviews();
      toast.success('Review submitted successfully!', { position: 'top-center', autoClose: 2000, hideProgressBar: true });
    } catch (err) {
      console.error('Submit review failed', err);
      toast.error(err.response?.data?.message || 'Failed to submit review', { position: 'top-center', autoClose: 2500, hideProgressBar: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead product={product} url={`/products/${id}`} />
      <div className="min-h-screen bg-pure-white">
      <ToastContainer />
      {product && selectedVariant ? (
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column - Image Gallery */}
            <div>
              <div className="sticky top-24">
                <div className="relative bg-pure-white border border-cool-gray overflow-hidden">
                  <div className="aspect-square bg-pure-white flex items-center justify-center">
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                    />
                    {getVariantBadges().map((badge, index) => (
                      <Badge
                        key={index}
                        name={badge.name}
                        color={badge.color}
                        position={index % 2 === 0 ? "topRight" : "bottomLeft"}
                      />
                    ))}
                  </div>
                </div>

                {/* Thumbnail Images */}
                {selectedVariant.images.length > 1 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    {selectedVariant.images.map((image, index) => (
                      <button
                        key={index}
                        className={`flex-shrink-0 w-16 h-16 overflow-hidden border transition-all duration-200 ${
                          mainImage === image
                            ? 'border-maybelline-pink'
                            : 'border-cool-gray hover:border-mid-gray'
                        }`}
                        onClick={() => setMainImage(image)}
                      >
                        <img
                          src={image}
                          alt={`${product.name} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Product Info */}
            <div>
              {/* Viewer Count */}
              <div className="flex items-center gap-2 text-sm text-dark-gray mb-4">
                <div className="w-2 h-2 bg-maybelline-pink rounded-full animate-pulse"></div>
                {viewers} {viewers === 1 ? 'person is' : 'people are'} viewing this product
              </div>

              {/* Real-time Updates */}
              {realTimeUpdates.length > 0 && (
                <div className="mb-4 p-4 border border-cool-gray bg-pure-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-maybelline-pink rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-maybelline-pink font-sans">Live Updates</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {realTimeUpdates.map((update) => (
                      <div key={update.id} className="text-xs text-dark-gray bg-pure-white p-2 border border-cool-gray">
                        <div className="flex items-center justify-between">
                          <span>{update.message}</span>
                          <span className="text-dark-gray">
                            {update.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Title */}
              <h1 className="font-heading text-display-sm text-black mb-3">{product.name}</h1>

              {/* Product Meta */}
              <div className="flex flex-wrap gap-3 mb-4">
                {product.categories && product.categories.length > 0 && (
                  unwrapCategories(product.categories).map((cat, i) => (
                    <span key={i} className="text-xs font-sans text-dark-gray bg-cool-gray px-3 py-1 rounded-full">{cat}</span>
                  ))
                )}
                {product.brand && (
                  <span className="text-xs font-sans text-dark-gray bg-cool-gray px-3 py-1 rounded-full">{product.brand}</span>
                )}
                {product.gender && (
                  <span className="text-xs font-sans text-dark-gray bg-cool-gray px-3 py-1 rounded-full">{product.gender}</span>
                )}
                {product.measureType && (
                  <span className="text-xs font-sans text-dark-gray bg-cool-gray px-3 py-1 rounded-full">{product.measureType}</span>
                )}
                {product.isPreOrder && (
                  <span className="text-xs font-sans text-pure-white bg-maybelline-pink px-3 py-1 rounded-full">Pre-Order{product.preOrderEstimatedDate ? ` — Est. ${new Date(product.preOrderEstimatedDate).toLocaleDateString()}` : ''}</span>
                )}
                {product.comingSoon && (
                  <span className="text-xs font-sans text-pure-white bg-black px-3 py-1 rounded-full">Coming Soon</span>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center gap-3 mb-6">
                {selectedDiscountPrice ? (
                  <>
                    <span className="text-lg text-dark-gray line-through font-sans">BDT{selectedPrice}</span>
                    <span className="text-2xl text-maybelline-pink font-heading font-bold">BDT{selectedDiscountPrice}</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg text-dark-gray line-through font-sans">BDT{product.mainPrice}</span>
                    <span className="text-2xl text-maybelline-pink font-heading font-bold">BDT{product.discountPrice}</span>
                  </>
                )}
                {(() => {
                  const original = selectedDiscountPrice ? selectedPrice : product.mainPrice;
                  const discount = selectedDiscountPrice ? selectedDiscountPrice : product.discountPrice;
                  if (original && discount && original > discount) {
                    const pct = Math.round(((original - discount) / original) * 100);
                    return pct > 0 ? (
                      <span className="text-xs text-maybelline-pink bg-maybelline-pink bg-opacity-10 px-2 py-0.5 font-sans font-medium">{pct}% OFF</span>
                    ) : null;
                  }
                  return null;
                })()}
                {product.mainBadgeName && product.mainBadgeColor && (
                  <Badge name={product.mainBadgeName} color={product.mainBadgeColor} position="topRight" />
                )}
              </div>

              {/* Color Selector */}
              {product.variants.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-sans font-semibold mb-3 text-black uppercase tracking-wider">Color: <span className="font-normal normal-case text-dark-gray">{selectedColor}</span></p>
                  <div className="flex gap-3">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.hexCode}
                        style={{ backgroundColor: variant.hexCode }}
                        onClick={() => handleVariantChange(variant)}
                        className={`w-9 h-9 rounded-full transition-all duration-200 ${
                          selectedVariant.hexCode === variant.hexCode
                            ? 'ring-2 ring-maybelline-pink ring-offset-2 scale-110'
                            : 'ring-1 ring-mid-gray hover:ring-dark-gray'
                        }`}
                        aria-label={`Select color ${variant.colorName}`}
                      >
                        <span className="sr-only">{variant.colorName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {selectedVariant.sizes && selectedVariant.sizes.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-sans font-semibold mb-3 text-black uppercase tracking-wider">
                    {selectedVariant.measureType ? selectedVariant.measureType : "Size"}:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {selectedVariant.sizes.map((size, index) => {
                      const stockBySize = selectedVariant.stockBySize || [];
                      const stock = stockBySize[index] || selectedVariant.stock || 0;
                      const isOutOfStock = stock <= 0;
                      const isSelected = size === selectedSize;

                      return (
                        <button
                          key={size}
                          onClick={() => !isOutOfStock && handleSizeChange(size)}
                          disabled={isOutOfStock}
                          className={`px-5 py-2.5 border font-sans text-sm transition-all duration-200 ${
                            isOutOfStock
                              ? 'bg-cool-gray text-mid-gray border-cool-gray cursor-not-allowed'
                              : isSelected
                                ? 'bg-black text-pure-white border-black'
                                : 'bg-pure-white text-black border-mid-gray hover:border-black'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span className={isSelected ? 'text-pure-white' : isOutOfStock ? 'text-mid-gray' : 'text-black'}>
                              {size}
                            </span>
                            {selectedVariant.unitName && (
                              <span className={`text-xs ${isSelected ? 'text-pure-white' : isOutOfStock ? 'text-mid-gray' : 'text-dark-gray'}`}>
                                {selectedVariant.unitName}
                              </span>
                            )}
                            <span className={`text-xs mt-1 ${isOutOfStock ? 'text-rose' : stock < 5 ? 'text-maybelline-pink' : 'text-dark-gray'}`}>
                              {isOutOfStock ? 'Out of Stock' : `${stock} in stock`}
                              {realTimeUpdates.some(update =>
                                update.data?.size === size &&
                                (update.type === 'stock_updated' || update.type === 'inventory_assignment')
                              ) && (
                                <span className="ml-1 text-maybelline-pink animate-pulse">●</span>
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-6">
                <p className="text-sm font-sans font-semibold mb-3 text-black uppercase tracking-wider">Quantity:</p>
                <div className="flex items-center border border-mid-gray w-fit">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-4 py-2.5 text-black hover:bg-cool-gray transition-colors"
                    disabled={quantity <= 1}
                  >
                    <FaMinus size={12} />
                  </button>
                  <span className="px-6 py-2.5 text-black font-sans text-sm font-medium border-x border-mid-gray min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="px-4 py-2.5 text-black hover:bg-cool-gray transition-colors"
                  >
                    <FaPlus size={12} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mb-6">
                {product.comingSoon ? (
                  <button
                    disabled
                    className="w-full py-3.5 bg-mid-gray text-pure-white font-sans font-semibold text-sm uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <FiShoppingCart size={18} />
                    Coming Soon — Notify Me
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="w-full py-3.5 bg-maybelline-pink text-pure-white font-sans font-semibold text-sm uppercase tracking-wider hover:bg-maybelline-magenta transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <FiShoppingCart size={18} />
                    Add to Cart
                  </button>
                )}
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-3 border border-black text-black font-sans font-medium text-sm uppercase tracking-wider bg-pure-white hover:bg-black hover:text-pure-white transition-all duration-200"
                    disabled
                  >
                    Buy Now
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handleLike}
                      className={`px-4 py-3 border ${isLiked ? 'border-maybelline-pink bg-maybelline-light text-maybelline-pink' : 'border-cool-gray bg-pure-white text-dark-gray hover:border-mid-gray'} transition-all duration-200 flex items-center gap-2`}
                      title={isLiked ? 'Unlike this product' : 'Like this product'}
                    >
                      {isLiked ? <FaHeart size={16} className="text-maybelline-pink" /> : <FaRegHeart size={16} className="hover:text-maybelline-pink transition" />}
                      <span className="text-sm font-sans font-medium">{likesCount}</span>
                    </button>
                    {isLoggedIn && (
                      <button
                        onClick={async () => {
                          const res = await toggleWish(id);
                          setIsWishlisted(res);
                        }}
                        className={`px-4 py-3 border transition-all duration-200 ${
                          isWishlisted
                            ? 'bg-maybelline-pink text-pure-white border-maybelline-pink'
                            : 'bg-pure-white text-dark-gray border-cool-gray hover:border-maybelline-pink hover:text-maybelline-pink'
                        }`}
                        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        {isWishlisted ? <FaHeart size={16} /> : <FaRegHeart size={16} />}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const url = typeof window !== 'undefined' ? window.location.href : '';
                        if (navigator.share) {
                          try {
                            await navigator.share({ title: product.name, url });
                          } catch {}
                        } else {
                          try {
                            await navigator.clipboard.writeText(url);
                            toast.success('Link copied to clipboard!', { position: 'top-center', autoClose: 2000, hideProgressBar: true });
                          } catch {
                            toast.error('Failed to copy link');
                          }
                        }
                      }}
                      className="px-4 py-3 border border-cool-gray bg-pure-white text-maybelline-pink hover:text-maybelline-magenta hover:border-mid-gray transition-all duration-200"
                      title="Share this product"
                    >
                      <FiShare2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 py-4 border-t border-cool-gray">
                <div className="flex flex-col items-center gap-1.5">
                  <FiTruck className="text-black" size={20} />
                  <span className="text-xs font-sans text-dark-gray">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <FiShield className="text-black" size={20} />
                  <span className="text-xs font-sans text-dark-gray">Secure Payment</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <FiRotateCcw className="text-black" size={20} />
                  <span className="text-xs font-sans text-dark-gray">Easy Returns</span>
                </div>
              </div>

              {/* Shipping Info */}
              <div className="mt-4 p-4 bg-cool-gray bg-opacity-50">
                <div className="flex items-center gap-2 mb-2">
                  <FiTruck className="text-black" size={16} />
                  <p className="text-sm font-sans font-semibold text-black uppercase tracking-wider">Shipping:</p>
                </div>
                {(() => {
                  const variantShipping = getVariantShipping();
                  if (variantShipping.length > 0) {
                    return (
                      <ul className="text-sm text-dark-gray space-y-1">
                        {variantShipping.map((opt, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-maybelline-pink rounded-full"></span>
                            {opt.name} — BDT{Number(opt.charge).toFixed(2)} • {opt.estimatedDays} days
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <div className="text-sm text-mid-gray">
                      No shipping options available for this variant
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Tabs: Description / Details */}
          <div className="mt-12">
            <div className="border-b border-cool-gray">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`pb-3 text-sm font-sans font-semibold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'description'
                      ? 'text-maybelline-pink border-b-2 border-maybelline-pink'
                      : 'text-dark-gray hover:text-black'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-3 text-sm font-sans font-semibold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'details'
                      ? 'text-maybelline-pink border-b-2 border-maybelline-pink'
                      : 'text-dark-gray hover:text-black'
                  }`}
                >
                  Details
                </button>
              </div>
            </div>

            <div className="py-6">
              {activeTab === 'description' && (
                selectedVariant?.description ? (
                  <div className="font-sans text-dark-gray leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedVariant.description }} />
                ) : (
                  <p className="font-sans text-mid-gray">No description available.</p>
                )
              )}
              {activeTab === 'details' && (
                selectedVariant?.specifications && selectedVariant.specifications.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedVariant.specifications.map((spec, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-cool-gray">
                        <span className="font-sans font-medium text-dark-gray">{spec.name}:</span>
                        <span className="font-sans text-black">{spec.value} {spec.unit}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-sans text-mid-gray">No specifications available.</p>
                )
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-12 border-t border-cool-gray pt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-display-sm text-black">Customer Reviews</h2>
              <div className="flex items-center gap-2 text-sm font-sans text-dark-gray">
                <FaStar className="text-yellow-500" size={16} />
                <span>{product.totalReviews || 0} reviews • {product.averageRating || 0} rating</span>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
              {reviews.length === 0 ? (
                <p className="text-center text-mid-gray py-8 font-sans">No reviews yet. Be the first to review this product!</p>
              ) : (
                reviews.map((r) => (
                  <div key={r._id} className="border border-cool-gray p-5 card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-sans font-semibold text-black">
                        {r.user?.firstName ? `${r.user.firstName} ${r.user?.lastName || ''}` : r.user?.email || 'User'}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} size={14} className={i < r.rating ? 'text-yellow-500' : 'text-mid-gray'} />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-sm font-sans text-dark-gray mb-2 whitespace-pre-wrap break-words">{r.comment}</p>
                    )}
                    <div className="text-xs font-sans text-mid-gray">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </div>

                    {(() => {
                      const token = getStorage('accessToken');
                      let canEdit = false;
                      try {
                        const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
                        canEdit = payload && (payload.userId === (r.user?._id || r.user));
                      } catch {}
                      return canEdit ? (
                        <div className="flex gap-2 mt-3">
                          <button
                            className="px-3 py-1 text-xs font-sans border border-black text-black hover:bg-black hover:text-pure-white transition-colors"
                            onClick={() => {
                              setRating(r.rating);
                              setComment(r.comment || '');
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="px-3 py-1 text-xs font-sans border border-rose text-rose hover:bg-rose hover:text-pure-white transition-colors"
                            onClick={async () => {
                              try {
                                const t = getStorage('accessToken');
                                if (!t) { toast.error('Login required'); return; }
                                await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${id}/reviews/${r._id}`, {
                                  headers: { Authorization: `Bearer ${t}` }
                                });
                                fetchReviews();
                                toast.success('Review deleted successfully!', { position: 'top-center', autoClose: 1500, hideProgressBar: true });
                              } catch (err) {
                                toast.error(err.response?.data?.message || 'Delete failed', { position: 'top-center', autoClose: 2000, hideProgressBar: true });
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-cool-gray pt-6">
              <h3 className="font-heading text-lg text-black mb-4">Write a Review</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-sans font-medium text-dark-gray">Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setRating(s)}
                        className={`text-2xl transition-colors ${rating >= s ? 'text-yellow-500' : 'text-mid-gray hover:text-yellow-500'}`}
                      >
                        <FaStar />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  className="w-full border border-cool-gray p-3 font-sans text-sm text-black focus:outline-none focus:ring-1 focus:ring-black resize-none"
                  rows={4}
                />
                <div className="flex gap-3">
                  <button
                    onClick={submitReview}
                    disabled={submitting}
                    className={`px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wider transition-all duration-200 ${
                      submitting
                        ? 'bg-cool-gray text-mid-gray cursor-not-allowed'
                        : 'bg-maybelline-pink text-pure-white hover:bg-opacity-90'
                    }`}
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  {rating > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          const t = getStorage('accessToken');
                          if (!t) { toast.error('Login required'); return; }
                          const payload = JSON.parse(atob(t.split('.')[1]));
                          const myRev = reviews.find(rv => (rv.user?._id || rv.user) === payload.userId);
                          if (!myRev) { toast.error('No existing review to update'); return; }
                          await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${id}/reviews/${myRev._id}`, { rating, comment }, {
                            headers: { Authorization: `Bearer ${t}` }
                          });
                          setRating(0);
                          setComment('');
                          fetchReviews();
                          toast.success('Review updated successfully!', { position: 'top-center', autoClose: 1500, hideProgressBar: true });
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Update failed', { position: 'top-center', autoClose: 2000, hideProgressBar: true });
                        }
                      }}
                      className="px-6 py-3 border border-black text-black font-sans text-sm font-semibold uppercase tracking-wider bg-pure-white hover:bg-black hover:text-pure-white transition-all duration-200"
                    >
                      Update Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-12 border-t border-cool-gray pt-8">
              <h2 className="font-heading text-display-sm mb-6 text-black">You May Also Like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedProducts
                  .filter((relatedProduct) => relatedProduct.productId !== product._id)
                  .slice(0, 8)
                  .map((relatedProduct) => (
                    <Link href={`/products/${relatedProduct.productId}`}
                      key={relatedProduct.productId}
                      className="group border border-cool-gray hover:border-mid-gray transition-all duration-200 p-4"
                    >
                      <div className="aspect-square bg-pure-white flex items-center justify-center mb-3 overflow-hidden">
                        <img
                          src={relatedProduct.mainImage}
                          alt={relatedProduct.name}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      {relatedProduct.mainBadgeName && relatedProduct.mainBadgeColor && (
                        <div className="mb-2">
                          <Badge
                            name={relatedProduct.mainBadgeName}
                            color={relatedProduct.mainBadgeColor}
                            position="topRight"
                          />
                        </div>
                      )}
                      <h3 className="text-sm font-sans font-semibold text-black line-clamp-2 group-hover:text-maybelline-pink transition-colors mb-1">
                        {relatedProduct.name}
                      </h3>
                      <p className="text-sm text-maybelline-pink font-sans font-bold">BDT{relatedProduct.mainPrice}</p>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-lg font-sans text-dark-gray">Loading product details...</p>
          </div>
        </div>
      )}
      </div>

      {/* Variant Selection Cart Modal */}
      {showCartModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCartModal(false); }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity" />
          <div className="relative bg-pure-white w-full sm:max-w-lg sm:mx-4 mx-0 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cool-gray">
              <div className="flex items-center gap-2">
                <FiShoppingCart className="text-maybelline-pink" size={20} />
                <h3 className="font-heading text-lg text-black">Select Options</h3>
              </div>
              <button
                onClick={() => setShowCartModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full text-dark-gray hover:bg-cool-gray transition-colors min-h-[44px] min-w-[44px]"
                aria-label="Close"
              >
                <FiX size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              {/* Product Summary */}
              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 flex-shrink-0 border border-cool-gray overflow-hidden bg-pure-white">
                  <img src={mainImage} alt={product.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-sans font-semibold text-black text-sm line-clamp-2">{product.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedDiscountPrice ? (
                      <>
                        <span className="text-xs text-dark-gray line-through font-sans">BDT{selectedPrice}</span>
                        <span className="text-base text-maybelline-pink font-heading font-bold">BDT{selectedDiscountPrice}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-dark-gray line-through font-sans">BDT{product.mainPrice}</span>
                        <span className="text-base text-maybelline-pink font-heading font-bold">BDT{product.discountPrice}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Color Selector in Modal */}
              {product.variants.length > 0 && (
                <div>
                  <p className="text-xs font-sans font-semibold mb-2.5 text-black uppercase tracking-wider">
                    Color: <span className="font-normal normal-case text-dark-gray">{selectedColor}</span>
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.hexCode}
                        style={{ backgroundColor: variant.hexCode }}
                        onClick={() => handleVariantChange(variant)}
                        className={`w-10 h-10 min-h-[44px] min-w-[44px] rounded-full transition-all duration-200 ${
                          selectedVariant.hexCode === variant.hexCode
                            ? 'ring-2 ring-maybelline-pink ring-offset-2 scale-110'
                            : 'ring-1 ring-mid-gray hover:ring-dark-gray'
                        }`}
                        aria-label={`Select color ${variant.colorName}`}
                      >
                        <span className="sr-only">{variant.colorName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector in Modal */}
              {selectedVariant.sizes && selectedVariant.sizes.length > 0 && (
                <div>
                  <p className="text-xs font-sans font-semibold mb-2.5 text-black uppercase tracking-wider">
                    {selectedVariant.measureType ? selectedVariant.measureType : "Size"}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVariant.sizes.map((size, index) => {
                      const stockBySize = selectedVariant.stockBySize || [];
                      const stock = stockBySize[index] || selectedVariant.stock || 0;
                      const isOutOfStock = stock <= 0;
                      const isSelected = size === selectedSize;

                      return (
                        <button
                          key={size}
                          onClick={() => !isOutOfStock && handleSizeChange(size)}
                          disabled={isOutOfStock}
                          className={`px-4 py-2.5 min-h-[44px] border font-sans text-sm transition-all duration-200 ${
                            isOutOfStock
                              ? 'bg-cool-gray text-mid-gray border-cool-gray cursor-not-allowed'
                              : isSelected
                                ? 'bg-maybelline-pink text-pure-white border-maybelline-pink'
                                : 'bg-pure-white text-black border-mid-gray hover:border-maybelline-pink'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{size}</span>
                            {selectedVariant.unitName && (
                              <span className={`text-xs ${isSelected ? 'text-pure-white' : isOutOfStock ? 'text-mid-gray' : 'text-dark-gray'}`}>
                                {selectedVariant.unitName}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector in Modal */}
              <div>
                <p className="text-xs font-sans font-semibold mb-2.5 text-black uppercase tracking-wider">Quantity:</p>
                <div className="flex items-center border border-mid-gray w-fit">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-black hover:bg-cool-gray transition-colors"
                    disabled={quantity <= 1}
                  >
                    <FaMinus size={12} />
                  </button>
                  <span className="px-5 h-11 min-h-[44px] flex items-center justify-center text-black font-sans text-sm font-medium border-x border-mid-gray min-w-[3rem]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-black hover:bg-cool-gray transition-colors"
                  >
                    <FaPlus size={12} />
                  </button>
                </div>
              </div>

              {/* Price Summary in Modal */}
              <div className="bg-cool-gray bg-opacity-50 p-4 space-y-2">
                <div className="flex justify-between items-center text-sm font-sans">
                  <span className="text-dark-gray">Price per unit</span>
                  <span className="text-black font-medium">BDT{selectedDiscountPrice || product.discountPrice}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-sans">
                  <span className="text-dark-gray">Quantity</span>
                  <span className="text-black font-medium">x{quantity}</span>
                </div>
                <div className="border-t border-cool-gray pt-2 flex justify-between items-center">
                  <span className="text-sm font-sans font-semibold text-black uppercase tracking-wider">Total</span>
                  <span className="text-xl font-heading font-bold text-maybelline-pink">
                    BDT{((selectedDiscountPrice || product.discountPrice) * quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-cool-gray bg-pure-white">
              <button
                onClick={() => {
                  handleAddToCart();
                  setShowCartModal(false);
                }}
                className="w-full py-3.5 bg-maybelline-pink text-pure-white font-sans font-semibold text-sm uppercase tracking-wider hover:bg-maybelline-magenta transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px]"
              >
                <FiShoppingCart size={18} />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductView;
