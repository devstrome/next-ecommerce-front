'use client'
import React, { useState, useEffect } from 'react';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function ScrollToTop() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    if (scrollY > 200) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const isNearTop = scrollY <= 200;

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-4 z-50 w-10 h-10 rounded-full bg-maybelline-pink text-pure-white shadow-lg hover:bg-maybelline-magenta transition-all duration-200 flex items-center justify-center"
      aria-label={isNearTop ? 'Scroll to bottom' : 'Scroll to top'}
    >
      {isNearTop ? <FiChevronDown size={22} /> : <FiChevronUp size={22} />}
    </button>
  );
}
