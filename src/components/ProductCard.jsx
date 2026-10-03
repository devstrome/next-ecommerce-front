import React, { useContext } from "react";
import PropTypes from 'prop-types';
import Link from "next/link";
import { FiHeart, FiShoppingBag, FiEye, FiShare2 } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { UserContext } from "../context/UserContext";

const ProductCard = ({ Data, viewMode = "grid", onAddToCart }) => {
  const {
    _id,
    mainBadgeName,
    mainBadgeColor,
    mainImage,
    name,
    mainPrice,
    discountPrice,
    averageRating,
    totalReviews,
    variants,
    comingSoon,
  } = Data;

  const userCtx = useContext(UserContext);
  const toggleWishlist = userCtx?.toggleWishlist || (() => {});
  const wishlist = userCtx?.wishlist || [];
  const isWishlisted = wishlist.some(p => (p._id || p) === _id);

  const hasDiscount = discountPrice && discountPrice < mainPrice;
  const discountPercent = hasDiscount ? Math.round(((mainPrice - discountPrice) / mainPrice) * 100) : 0;

  const variantColors = Array.isArray(variants)
    ? variants.filter(v => v.hexCode).map(v => v.hexCode)
    : [];

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/products/${_id}`;
    if (navigator.share) {
      try { await navigator.share({ title: name, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); alert('Link copied!'); } catch {}
    }
  };

  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-6 w-full group bg-pure-white border-b border-cool-gray py-5 px-4 transition-all duration-300 hover:bg-pure-white">
        <Link href={`/products/${_id}`} className="relative flex-shrink-0 w-24 h-24 bg-pure-white flex items-center justify-center overflow-hidden">
          <img src={mainImage} alt={name} className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110" loading="lazy" />
          {mainBadgeName && (
            <span className="absolute top-1 left-1 text-[10px] font-medium text-pure-white px-1.5 py-0.5" style={{ backgroundColor: mainBadgeColor || '#B1123B' }}>
              {mainBadgeName}
            </span>
          )}
          {comingSoon && (
            <span className="absolute top-1 right-1 text-[10px] font-medium text-pure-white px-1.5 py-0.5 bg-maybelline-pink">
              Coming Soon
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <h3 className="font-sans text-sm font-medium text-black mb-1 line-clamp-1">
            <Link href={`/products/${_id}`} className="hover:text-maybelline-pink transition-colors">{name}</Link>
          </h3>
          <div className="flex items-center gap-2">
            {hasDiscount ? (
              <>
                <span className="font-sans text-base font-semibold text-maybelline-pink">BDT {discountPrice}</span>
                <span className="font-sans text-xs text-mid-gray line-through">BDT {mainPrice}</span>
                <span className="font-sans text-[10px] font-medium text-rose bg-blush px-1.5 py-0.5">-{discountPercent}%</span>
              </>
            ) : (
              <span className="font-sans text-base font-semibold text-black">BDT {mainPrice}</span>
            )}
          </div>
          {averageRating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-maybelline-pink text-xs">★</span>
              <span className="font-sans text-xs text-dark-gray">{averageRating.toFixed(1)}</span>
              <span className="font-sans text-xs text-mid-gray">({totalReviews || 0})</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => toggleWishlist(_id)} className="p-2 hover:text-maybelline-pink transition-colors" title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}>
            {isWishlisted ? <FaHeart className="text-maybelline-pink" size={16} /> : <FiHeart size={16} />}
          </button>
          <button onClick={handleShare} className="p-2 hover:text-maybelline-pink transition-colors" title="Share">
            <FiShare2 size={16} />
          </button>
          <Link href={`/products/${_id}`} className="p-2 hover:text-maybelline-pink transition-colors" title="View product">
            <FiEye size={16} />
          </Link>
          <button
            onClick={(e) => { e.preventDefault(); onAddToCart?.(_id); }}
            disabled={comingSoon}
            className={`h-9 px-4 text-[11px] font-medium tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
              comingSoon
                ? 'bg-mid-gray text-pure-white cursor-not-allowed'
                : 'bg-black text-pure-white hover:bg-maybelline-pink'
            }`}
          >
            <FiShoppingBag size={13} /> {comingSoon ? 'Notify Me' : 'Add'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-pure-white flex flex-col transition-all duration-500 hover:shadow-lg">
      {/* Image Container - separate link */}
      <Link href={`/products/${_id}`} className="relative bg-pure-white overflow-hidden aspect-[3/4] flex items-center justify-center block">
        <img
          src={mainImage}
          alt={name}
          className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {comingSoon && (
            <span className="font-sans text-[10px] font-medium tracking-wider uppercase text-pure-white px-2.5 py-1 bg-maybelline-pink">
              Coming Soon
            </span>
          )}
          {mainBadgeName && (
            <span
              className="font-sans text-[10px] font-medium tracking-wider uppercase text-pure-white px-2.5 py-1"
              style={{ backgroundColor: mainBadgeColor || '#B1123B' }}
            >
              {mainBadgeName}
            </span>
          )}
          {hasDiscount && (
            <span className="font-sans text-[10px] font-medium tracking-wider uppercase text-pure-white px-2.5 py-1 bg-black">
              -{discountPercent}%
            </span>
          )}
        </div>
      </Link>

      {/* Quick actions - outside the image link */}
      <div className="px-3 -mt-5 relative z-10 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(_id); }}
          className={`w-9 h-9 bg-pure-white/90 backdrop-blur-sm flex items-center justify-center transition-colors ${isWishlisted ? 'text-maybelline-pink' : 'text-black hover:text-maybelline-pink'}`}
          aria-label="Add to wishlist"
          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isWishlisted ? <FaHeart size={15} /> : <FiHeart size={15} />}
        </button>
        <button
          onClick={handleShare}
          className="w-9 h-9 bg-pure-white/90 backdrop-blur-sm flex items-center justify-center text-black hover:text-maybelline-pink transition-colors"
          aria-label="Share product"
          title="Share"
        >
          <FiShare2 size={15} />
        </button>
        <Link
          href={`/products/${_id}`}
          className="w-9 h-9 bg-pure-white/90 backdrop-blur-sm flex items-center justify-center text-black hover:text-maybelline-pink transition-colors"
          aria-label="View product"
        >
          <FiEye size={15} />
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart?.(_id); }}
          disabled={comingSoon}
          className={`h-9 px-4 text-[11px] font-medium tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
            comingSoon
              ? 'bg-mid-gray text-pure-white cursor-not-allowed'
              : 'bg-black text-pure-white hover:bg-maybelline-pink'
          }`}
        >
          <FiShoppingBag size={13} /> {comingSoon ? 'Notify Me' : 'Add'}
        </button>
      </div>

      {/* Product Info */}
      <div className="p-4 flex flex-col flex-1 gap-1.5">
        <h3 className="font-sans text-sm font-medium text-black line-clamp-2 leading-snug group-hover:text-maybelline-pink transition-colors duration-300">
          <Link href={`/products/${_id}`}>{name}</Link>
        </h3>

        {/* Color swatches */}
        {variantColors.length > 0 && (
          <div className="flex items-center gap-1">
            {variantColors.slice(0, 5).map((hex, i) => (
              <span key={i} className="w-3 h-3 rounded-full border border-cool-gray" style={{ backgroundColor: hex }} />
            ))}
            {variantColors.length > 5 && (
              <span className="font-sans text-[10px] text-mid-gray ml-0.5">+{variantColors.length - 5}</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          {hasDiscount ? (
            <>
              <span className="font-sans text-sm font-semibold text-maybelline-pink">BDT {discountPrice}</span>
              <span className="font-sans text-xs text-mid-gray line-through">BDT {mainPrice}</span>
            </>
          ) : (
            <span className="font-sans text-sm font-semibold text-black">BDT {mainPrice}</span>
          )}
        </div>

        {/* Rating */}
        {averageRating > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-maybelline-pink text-xs">★</span>
            <span className="font-sans text-xs text-dark-gray">{averageRating.toFixed(1)}</span>
            <span className="font-sans text-xs text-mid-gray">({totalReviews || 0})</span>
          </div>
        )}
      </div>
    </div>
  );
};

ProductCard.propTypes = {
  Data: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    mainBadgeName: PropTypes.string,
    mainBadgeColor: PropTypes.string,
    mainImage: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    mainPrice: PropTypes.number.isRequired,
    discountPrice: PropTypes.number,
    averageRating: PropTypes.number,
    totalReviews: PropTypes.number,
    variants: PropTypes.array,
    comingSoon: PropTypes.bool,
  }).isRequired,
  viewMode: PropTypes.oneOf(["grid", "list"]),
  onAddToCart: PropTypes.func,
};

export default ProductCard;
