'use client'
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAdmin } from '../context/AdminContext';
import { useAdminChat } from '../context/AdminChatContext';
import NotificationPopup from './NotificationPopup';
import {
  FiHome, FiMail, FiShield, FiUsers, FiPackage,
  FiShoppingBag, FiMessageSquare, FiGrid, FiMonitor,
  FiFileText, FiHeart, FiLogOut, FiInbox,
  FiSearch, FiTruck, FiDollarSign, FiMapPin, FiFilter
} from 'react-icons/fi';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, isAuthenticated } = useAdmin();
  const { unreadCount, newMessageNotifications, showNotification, clearNotifications, setActiveRoomAndJoin } = useAdminChat();
  const router = useRouter();

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
      } catch (e) { /* ignore */ }
    };
    fetchCounts();
    const interval = setInterval(() => {
      fetch(`${process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000'}/api/admin/notifications/count`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminAccessToken')}` }
      })
        .then(res => { if (!res.ok) return null; return res.json(); })
        .then(data => {
          if (data?.success) {
            setNotifCounts(prev => {
              if (prev.orders === data.counts.orders && prev.contacts === data.counts.contacts) return prev;
              return data.counts;
            });
          }
        })
        .catch(() => {});
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (notification) => {
    router.push(`/admin/dashboard/inbox`);
    clearNotifications();
  };

  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!isAuthenticated) return null;

  const pathname = usePathname();

  const linkClass = (href) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-r-2 ${
      pathname === href || pathname.startsWith(href + '/')
        ? 'bg-pure-white text-maybelline-pink border-r-2 border-maybelline-pink'
        : 'text-dark-gray border-transparent hover:bg-pure-white hover:text-black'
    }`;

  return (
    <>
      <NotificationPopup
        notifications={newMessageNotifications}
        showNotification={showNotification}
        onClear={clearNotifications}
        onNotificationClick={handleNotificationClick}
      />

      <aside
        id="logo-sidebar"
        className={`fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform bg-pure-white border-r border-cool-gray ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } sm:translate-x-0`}
        aria-label="Sidebar"
      >
        <div className="h-full px-4 pb-4 overflow-y-auto bg-pure-white">
          <ul className="space-y-1">
            <li className="pt-4 pb-1">
              <span className="px-4 text-xs tracking-wider uppercase text-mid-gray font-medium">Main Menu</span>
            </li>
            <li>
              <Link href="/admin/dashboard" className={linkClass('/admin/dashboard')}>
                <FiHome className="w-5 h-5 flex-shrink-0" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/inbox" className={linkClass('/admin/dashboard/inbox')}>
                <FiInbox className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">Inbox</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold text-pure-white bg-maybelline-pink rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </li>

            <li className="pt-4 pb-1">
              <span className="px-4 text-xs tracking-wider uppercase text-mid-gray font-medium">Management</span>
            </li>
            <li>
              <Link href="/admin/dashboard/admins" className={linkClass('/admin/dashboard/admins')}>
                <FiShield className="w-5 h-5 flex-shrink-0" />
                Admins
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/users" className={linkClass('/admin/dashboard/users')}>
                <FiUsers className="w-5 h-5 flex-shrink-0" />
                Users
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/products" className={linkClass('/admin/dashboard/products')}>
                <FiPackage className="w-5 h-5 flex-shrink-0" />
                Products
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/orders" className={linkClass('/admin/dashboard/orders')}>
                <FiShoppingBag className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">Orders</span>
                {notifCounts.orders > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold text-pure-white bg-maybelline-pink rounded-full">
                    {notifCounts.orders > 99 ? '99+' : notifCounts.orders}
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/courier" className={linkClass('/admin/dashboard/courier')}>
                <FiTruck className="w-5 h-5 flex-shrink-0" />
                Courier Shipments
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/products/checkout-rules" className={linkClass('/admin/dashboard/products/checkout-rules')}>
                <FiFilter className="w-5 h-5 flex-shrink-0" />
                Checkout Rules
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/contacts" className={linkClass('/admin/dashboard/contacts')}>
                <FiMessageSquare className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">Contact Messages</span>
                {notifCounts.contacts > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold text-pure-white bg-maybelline-pink rounded-full">
                    {notifCounts.contacts > 99 ? '99+' : notifCounts.contacts}
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/blogs" className={linkClass('/admin/dashboard/blogs')}>
                <FiFileText className="w-5 h-5 flex-shrink-0" />
                Blog Posts
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/inventory" className={linkClass('/admin/dashboard/inventory')}>
                <FiGrid className="w-5 h-5 flex-shrink-0" />
                Inventory Management
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/finance" className={linkClass('/admin/dashboard/finance')}>
                <FiDollarSign className="w-5 h-5 flex-shrink-0" />
                Finance
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/viewers" className={linkClass('/admin/dashboard/viewers')}>
                <FiMonitor className="w-5 h-5 flex-shrink-0" />
                Live Viewers
              </Link>
            </li>

            <li className="pt-4 pb-1">
              <span className="px-4 text-xs tracking-wider uppercase text-mid-gray font-medium">System</span>
            </li>
            <li>
              <Link href="/admin/dashboard/pos" className={linkClass('/admin/dashboard/pos')}>
                <FiMonitor className="w-5 h-5 flex-shrink-0" />
                Point of Sale
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/pos-orders" className={linkClass('/admin/dashboard/pos-orders')}>
                <FiFileText className="w-5 h-5 flex-shrink-0" />
                POS Orders
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/wishlists" className={linkClass('/admin/dashboard/wishlists')}>
                <FiHeart className="w-5 h-5 flex-shrink-0" />
                Wishlists
              </Link>
            </li>

            <li className="pt-4 pb-1">
              <span className="px-4 text-xs tracking-wider uppercase text-mid-gray font-medium">Marketing</span>
            </li>
            <li>
              <Link href="/admin/dashboard/seo-ai" className={linkClass('/admin/dashboard/seo-ai')}>
                <FiSearch className="w-5 h-5 flex-shrink-0" />
                SEO Optimizer
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/products/hero-slides" className={linkClass('/admin/dashboard/products/hero-slides')}>
                <FiMonitor className="w-5 h-5 flex-shrink-0" />
                Hero Slides
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/announcements" className={linkClass('/admin/dashboard/announcements')}>
                <FiFileText className="w-5 h-5 flex-shrink-0" />
                Announcements
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/help" className={linkClass('/admin/dashboard/help')}>
                <FiFileText className="w-5 h-5 flex-shrink-0" />
                Help Pages
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/notifications" className={linkClass('/admin/dashboard/notifications')}>
                <FiMail className="w-5 h-5 flex-shrink-0" />
                Newsletters
              </Link>
            </li>
            <li>
              <Link href="/admin/dashboard/contact-settings" className={linkClass('/admin/dashboard/contact-settings')}>
                <FiMapPin className="w-5 h-5 flex-shrink-0" />
                Contact Settings
              </Link>
            </li>

            <li className="pt-4 mt-2 border-t border-cool-gray">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-dark-gray hover:bg-pure-white hover:text-maybelline-pink transition-all duration-200"
              >
                <FiLogOut className="w-5 h-5 flex-shrink-0" />
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
