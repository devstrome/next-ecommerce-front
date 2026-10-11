'use client'
import React, { useContext, useEffect } from 'react';
import Link from 'next/link';
import { FiX, FiMinus, FiPlus, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { CartContext } from '../context/CartContext';
import { UserContext } from '../context/UserContext';
import { formatMeasureLine } from '../lib/measure';
import { formatBDT } from '../config/brand';
import { publishFloatingPanelVisibility } from '../hooks/useFloatingPanelVisibility';

const MiniCart = ({ open, onClose }) => {
  const { cartItems = [], increaseQuantity, decreaseQuantity, removeItem, discount = 0 } =
    useContext(CartContext);
  const { isLoggedIn } = useContext(UserContext);

  useEffect(() => {
    publishFloatingPanelVisibility('cart', open);
    return () => publishFloatingPanelVisibility('cart', false);
  }, [open]);

  if (!open) return null;

  const getIdentifier = (item) => (isLoggedIn ? item._id || item.guestItemId : item.guestItemId);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal - (discount || 0);
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <div className="fixed inset-0 z-[10000] bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-2 right-2 z-[10001] flex max-h-[calc(100dvh-6rem-env(safe-area-inset-bottom))] min-h-0 flex-col overflow-hidden rounded-2xl bg-pure-white shadow-2xl animate-slide-up md:bottom-0 md:left-0 md:right-0 md:max-h-[85vh] md:rounded-t-2xl"
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-cool-gray px-4 py-2.5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-black">
            Your Cart ({itemCount})
          </h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mid-gray transition-colors hover:bg-gray-100 hover:text-black"
            aria-label="Close cart"
          >
            <FiX size={20} />
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-12 text-center">
            <FiShoppingBag size={36} className="mx-auto text-mid-gray/50 mb-3" />
            <p className="text-sm text-dark-gray mb-4">Your cart is empty</p>
            <Link
              href="/products"
              onClick={onClose}
              className="inline-block btn-primary text-xs py-2.5 px-6"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 touch-pan-y space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
              {cartItems.map((item) => {
                const identifier = getIdentifier(item);
                const measureLine = formatMeasureLine(item);
                const reachedStockLimit = !item.isPreOrder && item.stockAvailable != null && Number(item.quantity) >= Number(item.stockAvailable);
                return (
                  <div key={identifier} className="flex gap-3">
                    <Link href={`/products/${item.productId}`} onClick={onClose} className="shrink-0">
                      <img
                        src={item.mainImage}
                        alt={item.name}
                        className="w-16 h-20 object-cover border border-cool-gray bg-[#F7F5F3]"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-black line-clamp-2">{item.name}</p>
                      {item.isPreOrder && (
                        <p className="text-[10px] font-semibold text-maybelline-pink mt-0.5">
                          Pre-order{item.preOrderEstimatedDate ? ` · Est. ${new Date(item.preOrderEstimatedDate).toLocaleDateString()}` : ''}
                        </p>
                      )}
                      {measureLine && (
                        <p className="text-[10px] text-mid-gray mt-0.5">{measureLine}</p>
                      )}
                      {(item.regionName || item.regionId?.name) && (
                        <p className="text-[10px] text-mid-gray">Region: {item.regionName || item.regionId.name}</p>
                      )}
                      <p className="text-xs font-semibold text-maybelline-pink mt-1">
                        {formatBDT(item.price.toFixed(2))}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => decreaseQuantity(identifier)}
                          className="w-6 h-6 border border-cool-gray flex items-center justify-center text-black hover:border-black transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <FiMinus size={11} />
                        </button>
                        <span className="text-xs font-medium text-black w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => increaseQuantity(identifier)}
                          className="w-6 h-6 border border-cool-gray flex items-center justify-center text-black hover:border-black transition-colors"
                          aria-label="Increase quantity"
                          disabled={reachedStockLimit}
                          title={reachedStockLimit ? `Only ${item.stockAvailable} item(s) are available` : 'Increase quantity'}
                        >
                          <FiPlus size={11} />
                        </button>
                        <button
                          onClick={() => removeItem(identifier)}
                          className="ml-auto text-mid-gray hover:text-red-500 transition-colors"
                          aria-label="Remove item"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 space-y-3 border-t border-cool-gray px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-gray">Subtotal</span>
                <span className="font-semibold text-black">{formatBDT(total.toFixed(2))}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-gray">Discount</span>
                  <span className="font-medium text-maybelline-pink">
                    -{formatBDT(discount.toFixed(2))}
                  </span>
                </div>
              )}
              <p className="text-[11px] text-mid-gray">Shipping calculated at checkout</p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="text-center text-xs font-semibold tracking-wider uppercase border border-black text-black py-3 hover:bg-black hover:text-pure-white transition-colors"
                >
                  View Cart
                </Link>
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="btn-primary text-xs py-3 text-center"
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default MiniCart;
