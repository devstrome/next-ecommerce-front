'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../context/AdminContext';
import Link from 'next/link';
import { FiMenu, FiUser, FiSettings, FiShield, FiLogOut } from 'react-icons/fi';
import { useAdminChat } from '../context/AdminChatContext';
import NotificationBell from './NotificationBell';

const Navbar = ({ toggleSidebar, sidebarOpen = false }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef(null);
  const { admin, logout } = useAdmin();
  const { activityNotifications, markActivityNotificationRead, markAllActivityNotificationsRead, clearActivityNotifications } = useAdminChat();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !menuRef.current?.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  return (
    <nav className="fixed top-0 z-50 w-full bg-pure-white border-b border-cool-gray">
      <div className="px-3 py-2.5 sm:py-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start">
            <button
              onClick={toggleSidebar}
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-sm text-dark-gray hover:bg-pure-white focus:outline-none focus:ring-2 focus:ring-charcoal/10 lg:hidden"
              aria-controls="logo-sidebar"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? 'Close admin navigation' : 'Open admin navigation'}
            >
              <span className="sr-only">Open sidebar</span>
              <FiMenu className="w-6 h-6" />
            </button>
            <Link href="/admin/dashboard" className="flex min-w-0 ms-2 lg:me-24">
              <span className="self-center text-xl font-heading tracking-widest uppercase sm:text-2xl whitespace-nowrap text-black">
                BELORELLA
              </span>
            </Link>
          </div>

          {admin && (
            <div className="flex items-center">
              <NotificationBell
                notifications={activityNotifications}
                onRead={markActivityNotificationRead}
                onReadAll={markAllActivityNotificationsRead}
                onClear={clearActivityNotifications}
                className="mr-2"
              />
              <div className="flex items-center ms-3">
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    className="flex text-sm bg-pure-white rounded-full focus:ring-4 focus:ring-light-gray"
                    id="user-menu-button"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <span className="sr-only">Open user menu</span>
                    <img
                      className="w-8 h-8 rounded-full"
                      src={admin.imageUrl || "https://flowbite.com/docs/images/people/profile-picture-5.jpg"}
                      alt="user profile"
                    />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute right-0 z-50 mt-2 w-56 bg-pure-white border border-cool-gray shadow-lg animate-fade-down"
                      id="dropdown-user"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <div className="px-4 py-3 border-b border-cool-gray" role="none">
                        <p className="text-sm font-medium text-black" role="none">
                          {admin.firstName} {admin.lastName}
                        </p>
                        <p className="text-xs text-dark-gray mt-0.5 truncate" role="none">
                          {admin.email}
                        </p>
                      </div>
                      <ul className="py-1" role="none">
                        <li>
                          <Link
                            href="/admin/dashboard/profile"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-gray hover:bg-pure-white transition-colors"
                            role="menuitem"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <FiUser className="w-4 h-4 text-mid-gray" />
                            Profile
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/admin/dashboard/settings"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-gray hover:bg-pure-white transition-colors"
                            role="menuitem"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <FiSettings className="w-4 h-4 text-mid-gray" />
                            Settings
                          </Link>
                        </li>
                        {admin.superAdmin && (
                          <li>
                            <Link
                              href="/admin/dashboard/admins"
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-gray hover:bg-pure-white transition-colors"
                              role="menuitem"
                              onClick={() => setDropdownOpen(false)}
                            >
                              <FiShield className="w-4 h-4 text-mid-gray" />
                              Admin Management
                            </Link>
                          </li>
                        )}
                        <li className="border-t border-cool-gray mt-1 pt-1">
                          <button
                            type="button"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-maybelline-pink hover:bg-pure-white transition-colors"
                            role="menuitem"
                            onClick={handleLogout}
                          >
                            <FiLogOut className="w-4 h-4" />
                            Sign out
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
