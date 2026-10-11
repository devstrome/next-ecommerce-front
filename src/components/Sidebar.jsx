'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAdmin } from '../context/AdminContext';
import { useAdminChat } from '../context/AdminChatContext';
import NotificationPopup from './NotificationPopup';
import {
  FiHome, FiMail, FiShield, FiUsers, FiPackage,
  FiShoppingBag, FiMessageSquare, FiGrid, FiMonitor,
  FiFileText, FiHeart, FiLogOut, FiInbox,
  FiSearch, FiTruck, FiDollarSign, FiMapPin, FiFilter, FiGift
} from 'react-icons/fi';

const sections = [
  { title: 'Main Menu', items: [
    { key: 'dashboard', href: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
    { key: 'inbox', href: '/admin/dashboard/inbox', label: 'Inbox', icon: FiInbox, badge: 'messages' },
  ] },
  { title: 'Management', items: [
    { key: 'admins', href: '/admin/dashboard/admins', label: 'Admins', icon: FiShield, superAdminOnly: true },
    { key: 'users', href: '/admin/dashboard/users', label: 'Users', icon: FiUsers },
    { key: 'products', href: '/admin/dashboard/products', label: 'Products', icon: FiPackage },
    { key: 'orders', href: '/admin/dashboard/orders', label: 'Orders', icon: FiShoppingBag, badge: 'orders' },
    { key: 'courier', href: '/admin/dashboard/courier', label: 'Courier Shipments', icon: FiTruck },
    { key: 'checkoutRules', href: '/admin/dashboard/products/checkout-rules', label: 'Checkout Rules', icon: FiFilter },
    { key: 'contacts', href: '/admin/dashboard/contacts', label: 'Contact Messages', icon: FiMessageSquare, badge: 'contacts' },
    { key: 'blogs', href: '/admin/dashboard/blogs', label: 'Blog Posts', icon: FiFileText },
    { key: 'inventory', href: '/admin/dashboard/inventory', label: 'Inventory Management', icon: FiGrid },
    { key: 'finance', href: '/admin/dashboard/finance', label: 'Finance', icon: FiDollarSign },
    { key: 'partnership', href: '/admin/dashboard/partnership', label: 'Partnership', icon: FiUsers },
    { key: 'viewers', href: '/admin/dashboard/viewers', label: 'Live Viewers', icon: FiMonitor },
  ] },
  { title: 'System', items: [
    { key: 'pos', href: '/admin/dashboard/pos', label: 'Point of Sale', icon: FiMonitor },
    { key: 'posOrders', href: '/admin/dashboard/pos-orders', label: 'POS Orders', icon: FiFileText },
    { key: 'wishlists', href: '/admin/dashboard/wishlists', label: 'Wishlists', icon: FiHeart },
    { key: 'loyalty', href: '/admin/dashboard/loyalty', label: 'Loyalty & Codes', icon: FiGift },
  ] },
  { title: 'Marketing', items: [
    { key: 'seo', href: '/admin/dashboard/seo', label: 'SEO Optimizer', icon: FiSearch },
    { key: 'heroSlides', href: '/admin/dashboard/products/hero-slides', label: 'Hero Slides', icon: FiMonitor },
    { key: 'announcements', href: '/admin/dashboard/announcements', label: 'Announcements', icon: FiFileText },
    { key: 'help', href: '/admin/dashboard/help', label: 'Help Pages', icon: FiFileText },
    { key: 'newsletters', href: '/admin/dashboard/notifications', label: 'Newsletters', icon: FiMail },
    { key: 'contactSettings', href: '/admin/dashboard/contact-settings', label: 'Contact Settings', icon: FiMapPin },
  ] },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, isAuthenticated, admin, hasPermission } = useAdmin();
  const { unreadCount, newMessageNotifications, showNotification, clearNotifications } = useAdminChat();
  const router = useRouter();
  const pathname = usePathname();
  const [notifCounts, setNotifCounts] = useState({ orders: 0, contacts: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem('adminAccessToken');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/admin/notifications/count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) setNotifCounts(data.counts);
      } catch { /* Keep the sidebar usable when badges are unavailable. */ }
    };
    fetchCounts();
    window.addEventListener('admin-orders-unread-change', fetchCounts);
    const interval = setInterval(fetchCounts, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('admin-orders-unread-change', fetchCounts);
    };
  }, []);

  const handleSignOut = async (event) => {
    event.preventDefault();
    try { await logout(); } catch (error) { console.error('Logout failed:', error); }
  };

  if (!isAuthenticated) return null;

  const linkClass = (href) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-r-2 ${
      pathname === href || pathname.startsWith(`${href}/`)
        ? 'bg-pure-white text-maybelline-pink border-r-2 border-maybelline-pink'
        : 'text-dark-gray border-transparent hover:bg-pure-white hover:text-black'
    }`;
  const visibleSections = sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.superAdminOnly ? admin?.superAdmin : hasPermission(item.key)),
  })).filter((section) => section.items.length);
  const badgeCount = (badge) => badge === 'messages' ? unreadCount : (notifCounts[badge] || 0);

  return (
    <>
      <NotificationPopup
        notifications={newMessageNotifications}
        showNotification={showNotification}
        onClear={clearNotifications}
        onNotificationClick={() => { router.push('/admin/dashboard/inbox'); clearNotifications(); }}
      />
      <aside
        id="logo-sidebar"
        className={`fixed top-0 left-0 z-40 h-[100dvh] w-64 overflow-hidden border-r border-cool-gray bg-pure-white pt-16 transition-transform lg:pt-20 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        aria-label="Sidebar"
      >
        <div className="h-full overscroll-contain px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-4 overflow-y-auto bg-pure-white">
          <ul className="space-y-1">
            {visibleSections.map((section) => (
              <React.Fragment key={section.title}>
                <li className="pt-4 pb-1"><span className="px-4 text-xs tracking-wider uppercase text-mid-gray font-medium">{section.title}</span></li>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const count = badgeCount(item.badge);
                  return (
                    <li key={item.key}>
                      <Link href={item.href} onClick={() => { if (isOpen) toggleSidebar?.(); }} className={linkClass(item.href)}>
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {count > 0 && <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold text-pure-white bg-maybelline-pink rounded-full">{count > 99 ? '99+' : count}</span>}
                      </Link>
                    </li>
                  );
                })}
              </React.Fragment>
            ))}
            <li className="pt-4 mt-2 border-t border-cool-gray">
              <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-dark-gray hover:bg-pure-white hover:text-maybelline-pink transition-all duration-200">
                <FiLogOut className="w-5 h-5 flex-shrink-0" />Sign Out
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
