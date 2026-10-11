'use client'
import React, { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaBoxOpen, FaPhone, FaUserAlt, FaClipboardList, FaChevronUp, FaChevronDown, FaSignOutAlt, FaGift, FaTags, FaFolderOpen } from "react-icons/fa";
import { UserContext } from "../context/UserContext";
import { useUserChat } from "../context/UserChatContext";
import NotificationBell from './NotificationBell';
import { publishFloatingPanelVisibility } from '../hooks/useFloatingPanelVisibility';

const API_URI = process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000";

const MobileTabBar = () => {
  const { isLoggedIn, logout, loyaltyBalance } = useContext(UserContext);
  const { activityNotifications, markActivityNotificationRead, markAllActivityNotificationsRead, clearActivityNotifications } = useUserChat();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [openCategory, setOpenCategory] = useState(null);
  const [brandsExpanded, setBrandsExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URI}/api/categories/tree`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Categories request failed (${response.status})`);
        return response.json();
      })
      .then((data) => setCategories(Array.isArray(data) ? data : Array.isArray(data?.categories) ? data.categories : []))
      .catch((error) => {
        if (error.name !== 'AbortError') console.error('Failed to load mobile navigation categories:', error);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setExpanded(false);
    setAlertsOpen(false);
  }, [pathname]);

  useEffect(() => {
    publishFloatingPanelVisibility('more-menu', expanded);
    return () => publishFloatingPanelVisibility('more-menu', false);
  }, [expanded]);

  const isActive = (href) => href === '/home'
    ? pathname === '/' || pathname === '/home'
    : pathname.startsWith(href);
  const itemClass = "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-slate-600 transition-colors duration-200 hover:bg-rose-50 hover:text-[#bd1238] active:scale-[0.97]";
  const activeItemClass = "relative -mt-3 flex min-w-0 flex-1 flex-col items-center justify-end gap-1 self-start rounded-2xl border border-rose-200 bg-gradient-to-b from-[#fff1f4] to-white px-1 pb-2 pt-2 text-[#a40d32] shadow-[0_5px_14px_rgba(164,13,50,0.16)] transition active:scale-[0.97]";
  const iconTile = (active, icon) => (
    <span className={`flex h-8 w-9 items-center justify-center rounded-xl ${active ? 'bg-gradient-to-br from-[#97112c] to-[#e31845] text-white shadow-sm' : 'text-slate-600'}`}>
      {icon}
    </span>
  );

  const handleLogout = async () => {
    setExpanded(false);
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const secondaryItems = [
    { href: "/contactus", icon: <FaPhone size={17} />, label: "Contact" },
    { href: isLoggedIn ? "/profile" : "/login", icon: <FaUserAlt size={17} />, label: isLoggedIn ? "Account" : "Sign in" },
    ...(isLoggedIn ? [{ icon: <FaSignOutAlt size={17} />, label: "Sign out", onClick: handleLogout }] : []),
  ];
  const loyaltyBalanceLabel = loyaltyBalance === null || loyaltyBalance === undefined
    ? 'BDT —'
    : `BDT ${new Intl.NumberFormat('en-BD', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(loyaltyBalance) || 0)}`;
  const rewardsActive = isActive('/profile/loyalty');
  const hasUnread = activityNotifications.some((notification) => !notification.read);
  const allBrands = useMemo(() => [...new Set(
    categories.flatMap((category) => (category?.children || []).flatMap((subcategory) => subcategory?.brands || []))
      .filter((brand) => typeof brand === 'string' && brand.trim())
  )].sort((a, b) => a.localeCompare(b)), [categories]);

  const closeMore = () => {
    setExpanded(false);
    setOpenCategory(null);
    setBrandsExpanded(false);
  };

  const moreLinkClass = "flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[13px] font-medium text-slate-700 transition hover:bg-rose-50 hover:text-[#bd1238] active:bg-rose-100";

  return (
    <>
      {expanded && (
        <button
          type="button"
          className="fixed inset-0 z-[48] cursor-default md:hidden"
          aria-label="Close menu"
          onClick={() => setExpanded(false)}
        />
      )}
      <div className="fixed bottom-[calc(0.45rem+env(safe-area-inset-bottom))] left-2 right-2 z-50 overflow-visible rounded-[1.35rem] border border-rose-100/90 bg-white/95 shadow-[0_12px_36px_rgba(83,12,30,0.18)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:left-3 sm:right-3 md:hidden">
        {expanded && (
          <div className="absolute bottom-full right-0 z-[51] mb-2 max-h-[min(72dvh,34rem)] w-[min(22rem,calc(100vw-1rem))] origin-bottom-right overflow-y-auto overscroll-contain rounded-2xl border border-rose-100 bg-white p-2 shadow-[0_16px_40px_rgba(83,12,30,0.2)]">
            <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Shop by category</div>
            {categories.length ? categories.map((category) => {
              const categoryKey = category?._id || category?.slug || category?.name;
              const isOpen = openCategory === categoryKey;
              const subcategories = Array.isArray(category?.children) ? category.children : [];
              return (
                <section key={categoryKey} className="border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/products?category=${encodeURIComponent(category?.slug || category?.name || '')}`}
                      onClick={closeMore}
                      className={`${moreLinkClass} flex-1`}
                    >
                      <FaFolderOpen className="shrink-0 text-[#bd1238]" size={14} />
                      <span className="min-w-0 flex-1 truncate">{category?.name || 'Category'}</span>
                    </Link>
                    {subcategories.length > 0 && (
                      <button
                        type="button"
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${category?.name || 'category'} subcategories`}
                        aria-expanded={isOpen}
                        onClick={() => setOpenCategory(isOpen ? null : categoryKey)}
                        className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-[#bd1238]"
                      >
                        <FaChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  {isOpen && subcategories.length > 0 && (
                    <div className="mb-2 ml-5 space-y-0.5 border-l border-rose-100 pl-2">
                      {subcategories.map((subcategory) => (
                        <Link
                          key={subcategory?._id || subcategory?.slug || subcategory?.name}
                          href={`/products?category=${encodeURIComponent(subcategory?.slug || subcategory?.name || '')}`}
                          onClick={closeMore}
                          className="flex min-h-9 items-center rounded-lg px-2.5 text-[12px] text-slate-600 transition hover:bg-rose-50 hover:text-[#bd1238]"
                        >
                          {subcategory?.name || 'Subcategory'}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              );
            }) : (
              <p className="px-3 py-2 text-xs text-slate-500">Categories will appear here when available.</p>
            )}

            <section className="border-b border-slate-100 py-1">
              <button
                type="button"
                aria-expanded={brandsExpanded}
                onClick={() => setBrandsExpanded((value) => !value)}
                className={`${moreLinkClass} justify-between`}
              >
                <span className="flex items-center gap-2.5"><FaTags className="text-[#bd1238]" size={14} />Brands</span>
                <FaChevronDown size={12} className={`text-slate-400 transition-transform ${brandsExpanded ? 'rotate-180' : ''}`} />
              </button>
              {brandsExpanded && (
                <div className="mb-2 ml-5 max-h-40 space-y-0.5 overflow-y-auto border-l border-rose-100 pl-2">
                  {allBrands.length ? allBrands.map((brand) => (
                    <Link
                      key={brand}
                      href={`/products?brand=${encodeURIComponent(brand)}`}
                      onClick={closeMore}
                      className="flex min-h-9 items-center rounded-lg px-2.5 text-[12px] text-slate-600 transition hover:bg-rose-50 hover:text-[#bd1238]"
                    >
                      {brand}
                    </Link>
                  )) : <p className="px-2.5 py-2 text-xs text-slate-500">No brands available yet.</p>}
                </div>
              )}
            </section>

            <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Your account</div>
            {secondaryItems.map((item) => {
              const cls = `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition ${
                item.onClick
                  ? "text-[#bd1238] hover:bg-rose-50"
                  : "text-slate-700 hover:bg-rose-50 hover:text-[#bd1238]"
              }`;
              const content = <>{item.icon}<span>{item.label}</span></>;
              return item.onClick ? (
                <button key={item.label} type="button" onClick={item.onClick} className={cls}>{content}</button>
              ) : (
                <Link key={item.href + item.label} href={item.href} onClick={() => setExpanded(false)} className={cls}>{content}</Link>
              );
            })}
          </div>
        )}

        <nav aria-label="Mobile navigation" className="flex min-h-[64px] items-stretch justify-around gap-0.5 px-1 py-1.5">
          <Link href="/home" className={isActive('/home') ? activeItemClass : itemClass} aria-current={isActive('/home') ? 'page' : undefined}>
            {iconTile(isActive('/home'), <FaHome size={17} />)}
            <span className="text-[9px] font-semibold leading-3">Home</span>
          </Link>
          <Link href="/products" className={isActive('/products') ? activeItemClass : itemClass} aria-current={isActive('/products') ? 'page' : undefined}>
            {iconTile(isActive('/products'), <FaBoxOpen size={17} />)}
            <span className="text-[9px] font-semibold leading-3">Products</span>
          </Link>

          <NotificationBell
            notifications={activityNotifications}
            onRead={markActivityNotificationRead}
            onReadAll={markAllActivityNotificationsRead}
            onClear={clearActivityNotifications}
            onOpenChange={setAlertsOpen}
            placement="top"
            mobileViewport
            label="Alerts"
            showLabel
            iconContainerClassName={alertsOpen ? 'bg-gradient-to-br from-[#97112c] to-[#e31845] text-white shadow-sm' : 'text-slate-600'}
            className="min-w-0 flex flex-1"
            buttonClassName={`h-full w-full !min-h-0 !min-w-0 !rounded-2xl px-0.5 py-1.5 ${alertsOpen ? activeItemClass : itemClass}`}
          />

          {isLoggedIn && (
            <Link href="/profile/orders" className={isActive('/profile/orders') ? activeItemClass : itemClass} aria-current={isActive('/profile/orders') ? 'page' : undefined}>
              {iconTile(isActive('/profile/orders'), <FaClipboardList size={17} />)}
              <span className="text-[9px] font-semibold leading-3">Orders</span>
            </Link>
          )}

          {isLoggedIn && (
          <Link
              href="/profile/loyalty"
              className={rewardsActive ? activeItemClass : "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-slate-600 transition-colors duration-200 hover:bg-rose-50 hover:text-[#bd1238] active:scale-[0.97]"}
              aria-current={rewardsActive ? 'page' : undefined}
              aria-label={`Rewards, loyalty balance ${loyaltyBalanceLabel}`}
              title={`Loyalty balance: ${loyaltyBalanceLabel}`}
            >
              <span className={`flex ${rewardsActive ? 'h-8 w-9 rounded-xl bg-gradient-to-br from-[#97112c] to-[#e31845] text-white shadow-sm ring-2 ring-rose-200' : 'h-6 w-8 rounded-lg text-slate-600'} items-center justify-center`}>
                <FaGift size={16} />
              </span>
              <span className={`text-[9px] font-bold leading-3 ${rewardsActive ? '' : 'text-[8px]'}`}>Rewards</span>
              <span className={`max-w-full whitespace-nowrap rounded-full px-1.5 py-[3px] font-extrabold leading-none tracking-tight ${rewardsActive ? 'bg-[#fff0f3] text-[8px] text-[#9c0c31]' : 'bg-slate-100 text-[7px] text-slate-600'}`}>
                {loyaltyBalanceLabel}
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-haspopup="menu"
            aria-label={expanded ? "Close menu" : "Open more options"}
            className={`${expanded ? `${activeItemClass} max-w-[48px]` : `${itemClass} max-w-[48px] border-l border-rose-100/80 pl-1`} relative`}
          >
            <FaChevronUp size={14} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            <span className="text-[9px] font-semibold leading-3">{expanded ? "Less" : "More"}</span>
            {hasUnread && <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-[#d70b3d] ring-2 ring-white" aria-label="Unread notifications" />}
          </button>
        </nav>
      </div>
    </>
  );
};

export default MobileTabBar;
