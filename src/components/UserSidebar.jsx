'use client'
import React, { useState, useContext } from "react";
import { toast } from 'react-toastify';
import {
  FaBox,
  FaTrash,
  FaUser,
  FaHeart,
  FaGift,
  FaSignOutAlt,
  FaBars,
  FaTimes
} from "react-icons/fa";
import Link from "next/link"
import { usePathname } from "next/navigation";
import { UserContext } from "../context/UserContext";
import { formatBDTShort } from '../config/brand';

const UserSidebar = () => {
  const { logout, deleteAccount, user, loyaltyBalance } = useContext(UserContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const pathname = usePathname();

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;

    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      toast.success('Your account has been deleted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete your account. Please try again.');
      setIsDeletingAccount(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      setIsMobileMenuOpen(false);
      logout();
    }
  };

  const menuItems = [
    {
      path: "/profile",
      icon: <FaUser className="text-xl" />,
      label: "Profile",
      description: "Manage your account"
    },
    {
      path: "/profile/orders",
      icon: <FaBox className="text-xl" />,
      label: "Orders",
      description: "View your orders"
    },
    {
      path: "/profile/loyalty",
      icon: <FaGift className="text-xl" />,
      label: "Loyalty balance",
      description: loyaltyBalance === null ? "BDT rewards and gift codes" : `Available ${formatBDTShort(loyaltyBalance)}`
    },
    {
      path: "/wishlist",
      icon: <FaHeart className="text-xl" />,
      label: "Wishlist",
      description: "Your saved products"
    }
  ];

  const isActive = (path) => pathname === path || (path !== '/profile' && pathname.startsWith(`${path}/`));

  return (
    <>
        <div className="hidden lg:flex lg:flex-col lg:w-80 lg:sticky lg:top-20 lg:z-40 lg:h-[calc(100vh-5rem)] card rounded-none border-r">
        <div className="flex items-center justify-between p-6 border-b border-cool-gray">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-maybelline-pink rounded-full flex items-center justify-center">
              <FaUser className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-black font-heading">My Account</h2>
              <p className="text-sm text-dark-gray font-sans">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
               href={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive(item.path)
                  ? "bg-pure-white border-l-2 border-maybelline-pink text-maybelline-pink"
                  : "text-dark-gray hover:bg-pure-white hover:text-maybelline-pink"
              }`}
            >
              <div className={`transition-colors duration-200 ${
                isActive(item.path) ? "text-maybelline-pink" : "text-mid-gray group-hover:text-maybelline-pink"
              }`}>
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-dark-gray">{item.description}</div>
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-cool-gray space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-dark-gray hover:bg-pure-white hover:text-maybelline-pink rounded-xl transition-all duration-200 group"
          >
            <FaSignOutAlt className="text-mid-gray group-hover:text-maybelline-pink transition-colors duration-200" />
            <span className="font-medium">Logout</span>
          </button>

          <button
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="w-full flex items-center space-x-3 px-4 py-3 text-maybelline-pink hover:bg-pure-white rounded-xl transition-all duration-200 group disabled:cursor-wait disabled:opacity-60"
          >
            <FaTrash className="text-maybelline-pink" />
            <span className="font-medium">{isDeletingAccount ? 'Deleting account…' : 'Delete Account'}</span>
          </button>
        </div>
      </div>

      <div className="lg:hidden sticky top-0 z-[60] w-full card rounded-none border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-maybelline-pink rounded-full flex items-center justify-center">
              <FaUser className="text-white text-sm" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-black font-heading">My Account</h2>
              <p className="text-xs text-dark-gray font-sans">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Close account menu' : 'Open account menu'}
            className="p-2 rounded-lg bg-cool-gray hover:bg-mid-gray/20 transition-colors duration-200"
          >
            {isMobileMenuOpen ? <FaTimes className="text-dark-gray" /> : <FaBars className="text-dark-gray" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(20rem,88vw)] flex-col overflow-hidden card rounded-none border-r pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex shrink-0 items-center justify-between p-4 sm:p-6 border-b border-cool-gray">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-maybelline-pink rounded-full flex items-center justify-center">
              <FaUser className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-black font-heading">My Account</h2>
              <p className="text-sm text-dark-gray font-sans">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg bg-cool-gray hover:bg-mid-gray/20 transition-colors duration-200"
          >
            <FaTimes className="text-dark-gray" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:py-6 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
               href={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive(item.path)
                  ? "bg-pure-white border-l-2 border-maybelline-pink text-maybelline-pink"
                  : "text-dark-gray hover:bg-pure-white hover:text-maybelline-pink"
              }`}
            >
              <div className={`transition-colors duration-200 ${
                isActive(item.path) ? "text-maybelline-pink" : "text-mid-gray group-hover:text-maybelline-pink"
              }`}>
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-dark-gray">{item.description}</div>
              </div>
            </Link>
          ))}
        </nav>

        <div className="shrink-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-cool-gray space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-dark-gray hover:bg-pure-white hover:text-maybelline-pink rounded-xl transition-all duration-200 group"
          >
            <FaSignOutAlt className="text-mid-gray group-hover:text-maybelline-pink transition-colors duration-200" />
            <span className="font-medium">Logout</span>
          </button>

          <button
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="w-full flex items-center space-x-3 px-4 py-3 text-maybelline-pink hover:bg-pure-white rounded-xl transition-all duration-200 group disabled:cursor-wait disabled:opacity-60"
          >
            <FaTrash className="text-maybelline-pink" />
            <span className="font-medium">{isDeletingAccount ? 'Deleting account…' : 'Delete Account'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default UserSidebar;
