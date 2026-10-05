'use client'
import React, { useContext, useEffect, useState } from 'react';
import Link from "next/link";
import { FaHeart, FaArrowLeft } from 'react-icons/fa';
import { UserContext } from '../context/UserContext';
import { formatBDT } from '../config/brand';

const WishlistPage = () => {
  const { wishlist, fetchWishlist, toggleWishlist } = useContext(UserContext);
  const [items, setItems] = useState([]);

  useEffect(() => { fetchWishlist(); }, []);

  useEffect(() => {
    setItems(Array.isArray(wishlist) ? wishlist : []);
  }, [wishlist]);

  return (
    <div className="min-h-screen bg-pure-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-2 rounded-lg hover:bg-pure-white transition"><FaArrowLeft className="text-black" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-black font-heading">My Wishlist ({items.length})</h1>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              if (!item || !item._id) return null;
              return (
                <div key={item._id} className="card rounded-xl p-4">
                  <Link href={`/products/${item._id}`} className="block">
                    <div className="aspect-square rounded-lg overflow-hidden bg-pure-white mb-4">
                      <img src={item.mainImage || '/placeholder.png'} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <h3 className="font-semibold text-black truncate font-heading">{item.name}</h3>
                    <p className="text-sm text-dark-gray mt-1 font-sans">{formatBDT(item.discountPrice || item.mainPrice)}</p>
                  </Link>
                  <button
                    onClick={async () => await toggleWishlist(item._id)}
                    className="mt-3 w-full px-4 py-2 rounded-lg border border-cool-gray text-maybelline-pink hover:bg-pure-white hover:border-maybelline-pink transition flex items-center justify-center gap-2 font-sans"
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
