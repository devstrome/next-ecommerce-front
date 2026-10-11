'use client'
import React, { useContext, useEffect, useRef, useState } from 'react';
import Link from "next/link";
import { FaHeart, FaArrowLeft } from 'react-icons/fa';
import { UserContext } from '../context/UserContext';
import { formatBDT } from '../config/brand';

const WishlistPage = () => {
  const { wishlist, fetchWishlist, toggleWishlist } = useContext(UserContext);
  const [items, setItems] = useState([]);
  const fetchWishlistRef = useRef(fetchWishlist);
  fetchWishlistRef.current = fetchWishlist;

  useEffect(() => { fetchWishlistRef.current?.(); }, []);

  useEffect(() => {
    setItems(Array.isArray(wishlist) ? wishlist : []);
  }, [wishlist]);

  return (
    <div className="min-h-screen bg-pure-white py-10 sm:py-14">
      <div className="w-full max-w-6xl px-4 sm:px-2">
        <div className="mb-8 flex items-center gap-3 border-b border-cool-gray pb-5 sm:mb-10">
          <Link href="/products" className="p-2 rounded-full hover:bg-gray-100 transition" aria-label="Back to products">
            <FaArrowLeft className="text-black" />
          </Link>
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-black font-heading">My Wishlist ({items.length})</h1>
            <p className="section-tag mt-1">Saved Items</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 card">
            <FaHeart className="text-mid-gray text-5xl mx-auto mb-4" />
            <p className="text-dark-gray text-lg font-sans">Your wishlist is empty</p>
            <Link href="/products" className="btn-primary mt-6 inline-flex">Browse Products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              if (!item || !item._id) return null;
              return (
                <div key={item._id} className="card w-full rounded-xl p-4 flex flex-col">
                  <Link href={`/products/${item._id}`} className="block">
                    <div className="aspect-square rounded-lg overflow-hidden bg-white mb-4 p-2">
                      <img src={item.mainImage || '/placeholder.png'} alt={item.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                    </div>
                    <h3 className="font-semibold text-black line-clamp-2 min-h-12 font-heading">{item.name}</h3>
                    <p className="text-sm text-dark-gray mt-1 font-sans">{formatBDT(item.discountPrice || item.mainPrice)}</p>
                  </Link>
                  <button
                    onClick={async () => await toggleWishlist(item._id)}
                    className="mt-4 w-full px-4 py-2.5 rounded-lg border border-cool-gray text-maybelline-pink hover:bg-pure-white hover:border-maybelline-pink transition flex items-center justify-center gap-2 font-sans"
                    title="Remove from wishlist"
                  >
                    <FaHeart className="fill-current" />
                    <span>Remove</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
