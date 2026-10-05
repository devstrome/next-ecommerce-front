'use client'
import React, { useState, useEffect } from 'react';
import { FaTimes, FaArrowRight } from 'react-icons/fa';
import axios from 'axios';

const PopupAd = () => {
  const [ad, setAd] = useState(null);

  useEffect(() => {
    if (sessionStorage.getItem('popupAdShown')) return;
    let timer;
    let cancelled = false;
    axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/popup-ads/active`)
      .then((res) => {
        const active = res.data;
        if (!cancelled && Array.isArray(active) && active.length > 0) {
          const pick = active[Math.floor(Math.random() * active.length)];
          timer = setTimeout(() => setAd(pick), 2000);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const handleClose = () => {
    setAd(null);
    sessionStorage.setItem('popupAdShown', '1');
  };

  useEffect(() => {
    if (!ad) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [ad]);

  if (!ad) return null;

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

  const hasContent = Boolean(ad.title) || Boolean(ad.linkUrl);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in px-4 py-8"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={ad.title || 'Promotion'}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(159,18,57,0.5)] animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient top accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-maybelline-pink via-maybelline-rose to-maybelline-magenta" />

        {/* Close */}
        <button
          onClick={handleClose}
          aria-label="Close promotion"
          className="absolute top-5 right-5 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 backdrop-blur text-gray-500 shadow-md ring-1 ring-black/5 hover:text-maybelline-pink hover:rotate-90 transition-all duration-300"
        >
          <FaTimes size={14} />
        </button>

        {/* Image */}
        {ad.imageUrl && (
          <div className="relative bg-gradient-to-b from-maybelline-light via-white to-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(220,20,60,0.14),transparent_60%)]" />
            <button
              onClick={handleClick}
              className="group relative block w-full px-6 pt-6 pb-2 cursor-pointer"
            >
              <img
                src={ad.imageUrl}
                alt={ad.title || 'Promotion'}
                className="mx-auto max-h-[48vh] w-auto object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-[1.04]"
              />
              {ad.linkUrl && (
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-900/80 backdrop-blur text-white text-xs font-semibold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  Shop now <FaArrowRight size={10} />
                </span>
              )}
            </button>
          </div>
        )}

        {/* Content */}
        {hasContent && (
          <div className="relative px-6 pb-6 pt-3 text-center bg-gradient-to-b from-white via-white to-maybelline-light/60">
            {ad.title && (
              <>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wide bg-gradient-to-r from-maybelline-pink to-maybelline-magenta bg-clip-text text-transparent">
                  {ad.title}
                </h3>
                <div className="mx-auto my-3 flex items-center justify-center gap-2">
                  <span className="h-px w-16 bg-gradient-to-r from-transparent to-maybelline-pink/60" />
                  <span className="w-2 h-2 rotate-45 bg-maybelline-pink" />
                  <span className="h-px w-16 bg-gradient-to-l from-transparent to-maybelline-pink/60" />
                </div>
              </>
            )}

            {ad.linkUrl && (
              <button
                onClick={handleClick}
                className="group inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-maybelline-pink to-maybelline-magenta bg-[length:200%_200%] animate-shine text-white font-semibold shadow-lg shadow-maybelline-pink/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all min-h-[44px]"
              >
                Learn More
                <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" size={13} />
              </button>
            )}

            <div>
              <button
                onClick={handleClose}
                className="mt-3 text-xs text-gray-400 hover:text-maybelline-pink transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PopupAd;
