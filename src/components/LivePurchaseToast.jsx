'use client'
import React, { useEffect, useState, useRef } from 'react';
import { FaShoppingBag } from 'react-icons/fa';
import io from 'socket.io-client';

const LivePurchaseToast = () => {
  const [purchase, setPurchase] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const API_URI = process.env.NEXT_PUBLIC_API_URI;
    if (!API_URI) return;

    socketRef.current = io(API_URI, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      timeout: 10000,
    });

    socketRef.current.on('connect_error', () => {
      if (socketRef.current) socketRef.current.disconnect();
    });

    socketRef.current.on('livePurchase', (data) => {
      setPurchase(data);
      setTimeout(() => setPurchase(null), 5000);
    });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  if (!purchase) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-slide-up">
      <div className="bg-white border border-[#BDBDBD] p-4 flex items-center gap-3 max-w-xs">
        <div className="w-10 h-10 bg-[#F7D5DF] flex items-center justify-center flex-shrink-0">
          <FaShoppingBag className="text-[#B1123B]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1B1B1B] truncate">{purchase.productName}</p>
          <p className="text-xs text-[#4A4A4A]">Someone just purchased{purchase.quantity > 1 ? ` ×${purchase.quantity}` : ''}</p>
        </div>
      </div>
    </div>
  );
};

export default LivePurchaseToast;
