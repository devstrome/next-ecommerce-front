'use client'
import React, { useContext } from "react";
import Link from "next/link";
import { FaHome, FaBoxOpen, FaPhone, FaUserAlt, FaShoppingCart, FaClipboardList } from "react-icons/fa";
import { CartContext } from "../context/CartContext";
import { UserContext } from "../context/UserContext";

const MobileTabBar = () => {
  const { cartItems } = useContext(CartContext);
  const { isLoggedIn } = useContext(UserContext);

  return (
    <div className="fixed bottom-2 left-3 right-3 rounded-2xl bg-white/80 backdrop-blur-xl border border-maybelline-light shadow-2xl md:hidden flex justify-around z-50 py-2 px-1">
      <Link href="/home"
        className="flex flex-col items-center text-slate-700 hover:text-maybelline-pink px-2 py-1 transition"
        style={{ minWidth: 50 }}
      >
        <FaHome size={20} />
        <span className="text-xs font-semibold">Home</span>
      </Link>
      <Link href="/products"
        className="flex flex-col items-center text-slate-700 hover:text-maybelline-pink px-2 py-1 transition"
        style={{ minWidth: 50 }}
      >
        <FaBoxOpen size={20} />
        <span className="text-xs font-semibold">Products</span>
      </Link>
      {isLoggedIn && (
        <Link href="/profile/orders"
          className="flex flex-col items-center text-slate-700 hover:text-maybelline-pink px-2 py-1 transition"
          style={{ minWidth: 50 }}
        >
          <FaClipboardList size={20} />
          <span className="text-xs font-semibold">Orders</span>
        </Link>
      )}
      <Link href="/contactus"
        className="flex flex-col items-center text-slate-700 hover:text-maybelline-pink px-2 py-1 transition"
        style={{ minWidth: 50 }}
      >
        <FaPhone size={20} />
        <span className="text-xs font-semibold">Contact</span>
      </Link>
      <Link href={isLoggedIn ? "/profile" : "/login"}
        className="flex flex-col items-center text-slate-700 hover:text-maybelline-pink px-2 py-1 transition"
        style={{ minWidth: 50 }}
      >
        <FaUserAlt size={20} />
        <span className="text-xs font-semibold">{isLoggedIn ? "Account" : "Login"}</span>
      </Link>
      <Link href="/cart"
        className="flex flex-col items-center text-slate-700 hover:text-maybelline-pink px-2 py-1 transition relative"
        style={{ minWidth: 50 }}
      >
        <div className="relative">
          <FaShoppingCart size={20} />
          {cartItems.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full h-4 w-4 flex items-center justify-center text-xs font-bold shadow">
              {cartItems.length}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold">Cart</span>
      </Link>
    </div>
  );
};

export default MobileTabBar;
