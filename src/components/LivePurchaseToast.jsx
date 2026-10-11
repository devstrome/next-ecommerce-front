'use client'
import React, { useEffect, useState, useRef } from 'react';
import { FaShoppingBag } from 'react-icons/fa';
import io from 'socket.io-client';
import Link from 'next/link';

const LivePurchaseToast = () => {
  const [purchase, setPurchase] = useState(null);
  const socketRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

    socketRef.current = io(API_URI, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 5000,
      timeout: 10000,
    });

    const showToast = (data, kind) => {
      setPurchase({ ...data, kind });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setPurchase(null), 5000);
    };
    socketRef.current.on('livePurchase', (data) => showToast(data, 'purchase'));
    socketRef.current.on('liveProduct', (data) => showToast(data, 'product'));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  if (!purchase) return null;

  const content = (
    <div className="bg-white border border-[#BDBDBD] p-4 flex items-center gap-3 max-w-xs shadow-lg">
      <div className="w-10 h-10 bg-[#F7D5DF] flex items-center justify-center flex-shrink-0">
        <FaShoppingBag className="text-[#B1123B]" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1B1B1B] truncate">{purchase.productName}</p>
        <p className="text-xs text-[#4A4A4A]">
          {purchase.kind === 'product'
            ? 'Just added to the store'
            : `Someone just purchased${purchase.quantity > 1 ? ` ×${purchase.quantity}` : ''}`}
        </p>
      </div>
    </div>
  );

  return purchase.kind === 'product' && purchase.productId ? (
    <Link href={`/products/${purchase.productId}`} className="fixed bottom-4 left-4 z-50 animate-slide-up" aria-label={`View new product ${purchase.productName}`}>
      {content}
    </Link>
  ) : (
    <div className="fixed bottom-4 left-4 z-50 animate-slide-up">{content}</div>
  );
};

export default LivePurchaseToast;
