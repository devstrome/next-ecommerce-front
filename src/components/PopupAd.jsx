'use client'
import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import axios from 'axios';

const PopupAd = () => {
  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem('popupAdShown')) return;
    axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/popup-ads/active`)
      .then((res) => {
        const active = res.data;
        if (active.length > 0) {
          const pick = active[Math.floor(Math.random() * active.length)];
          const timer = setTimeout(() => setAd(pick), 2000);
          return () => clearTimeout(timer);
        }
      })
      .catch(() => {});
  }, []);

  if (!ad || !dismissed) return null;

  const handleClose = () => {
    setAd(null);
    setDismissed(true);
    sessionStorage.setItem('popupAdShown', '1');
  };

  const handleClick = () => {
    if (ad.linkUrl) {
      const isInternal = ad.linkUrl.startsWith('/');
      if (isInternal) {
        window.location.href = ad.linkUrl;
      } else {
        window.open(ad.linkUrl, '_blank', 'noopener');
      }
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4" onClick={handleClose}>
      <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 shadow transition">
          <FaTimes size={16} />
        </button>
        {ad.imageUrl && (
          <button onClick={handleClick} className="block w-full">
            <img src={ad.imageUrl} alt={ad.title || 'Promotion'} className="w-full h-auto max-h-[70vh] object-contain" />
          </button>
        )}
        {ad.title && (
          <div className="p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900">{ad.title}</h3>
            {ad.linkUrl && (
              <button onClick={handleClick} className="mt-2 px-6 py-2 bg-maybelline-pink text-white rounded-lg hover:bg-maybelline-magenta transition text-sm font-medium">
                Learn More
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PopupAd;
