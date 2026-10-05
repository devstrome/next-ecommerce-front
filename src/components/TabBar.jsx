'use client'
import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaBoxOpen, FaPhone, FaUserAlt, FaShoppingCart, FaClipboardList, FaChevronUp, FaSignOutAlt } from "react-icons/fa";
import { CartContext } from "../context/CartContext";
import { UserContext } from "../context/UserContext";

const MobileTabBar = () => {
  const { cartItems } = useContext(CartContext);
  const { isLoggedIn, logout } = useContext(UserContext);
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  const itemClass = "flex flex-col items-center text-slate-700 hover:text-maybelline-pink px-2 py-1 transition";

  const handleLogout = async () => {
    setExpanded(false);
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  // Secondary items live behind the expand arrow ("more to show")
  const secondaryItems = [
    { href: "/contactus", icon: <FaPhone size={18} />, label: "Contact" },
    { href: isLoggedIn ? "/profile" : "/login", icon: <FaUserAlt size={18} />, label: isLoggedIn ? "Account" : "Login" },
    ...(isLoggedIn ? [{ icon: <FaSignOutAlt size={18} />, label: "Logout", onClick: handleLogout }] : []),
  ];
  const hasMore = secondaryItems.length > 0;

  return (
    <div className="fixed bottom-2 left-3 right-3 rounded-2xl bg-white/80 backdrop-blur-xl border border-maybelline-light shadow-2xl md:hidden z-50 overflow-hidden">
      {/* Collapsible secondary row - single evenly-spaced row */}
      <div
        className={`transition-all duration-300 ease-out bg-white/70 ${
          expanded
            ? "max-h-24 pt-2 pb-2 opacity-100 border-t border-maybelline-light"
            : "max-h-0 pt-0 pb-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-around px-2">
          {secondaryItems.map((item) => {
            const cls = `flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg transition ${
              item.onClick
                ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                : "text-slate-700 hover:text-maybelline-pink hover:bg-maybelline-light/40"
            }`;
            const content = (
              <>
                {item.icon}
                <span className="text-[11px] font-semibold truncate">{item.label}</span>
              </>
            );
            return item.onClick ? (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={cls}
                style={{ minHeight: 44 }}
              >
                {content}
              </button>
            ) : (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={cls}
                style={{ minHeight: 44 }}
                onClick={() => setExpanded(false)}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-stretch">
        <div className="flex-1 flex justify-around py-2 px-1">
          <Link href="/home"
            className={itemClass}
            style={{ minWidth: 50 }}
          >
            <FaHome size={20} />
            <span className="text-xs font-semibold">Home</span>
          </Link>
          <Link href="/products"
            className={itemClass}
            style={{ minWidth: 50 }}
          >
            <FaBoxOpen size={20} />
            <span className="text-xs font-semibold">Products</span>
          </Link>
          {isLoggedIn && (
            <Link href="/profile/orders"
              className={itemClass}
              style={{ minWidth: 50 }}
            >
              <FaClipboardList size={20} />
              <span className="text-xs font-semibold">Orders</span>
            </Link>
          )}
          <Link href="/cart"
            className={itemClass}
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

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse menu" : "Expand menu"}
            className="flex flex-col items-center justify-center gap-0.5 px-3 border-l border-maybelline-light text-slate-700 hover:text-maybelline-pink active:bg-maybelline-light/40 transition"
          >
            <FaChevronUp
              size={14}
              className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            />
            <span className="text-[10px] font-semibold">{expanded ? "Less" : "More"}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileTabBar;
