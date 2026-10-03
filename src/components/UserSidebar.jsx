'use client'
import React, { useState, useContext } from "react";
import {
  FaBox,
  FaTrash,
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes
} from "react-icons/fa";
import Link from "next/link"
import { usePathname } from "next/navigation";
import { UserContext } from "../context/UserContext";

const UserSidebar = () => {
  const { logout, user } = useContext(UserContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      console.log('Delete account clicked');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
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
    }
  ];

  const isActive = (path) => pathname === path;

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
            className="w-full flex items-center space-x-3 px-4 py-3 text-maybelline-pink hover:bg-pure-white rounded-xl transition-all duration-200 group"
          >
            <FaTrash className="text-maybelline-pink" />
            <span className="font-medium">Delete Account</span>
          </button>
        </div>
      </div>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 card rounded-none border-b px-4 py-3">
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
            className="p-2 rounded-lg bg-cool-gray hover:bg-mid-gray/20 transition-colors duration-200"
          >
            {isMobileMenuOpen ? <FaTimes className="text-dark-gray" /> : <FaBars className="text-dark-gray" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className={`lg:hidden fixed top-0 left-0 z-50 h-full w-80 card rounded-none border-r transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
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
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg bg-cool-gray hover:bg-mid-gray/20 transition-colors duration-200"
          >
            <FaTimes className="text-dark-gray" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
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
            className="w-full flex items-center space-x-3 px-4 py-3 text-maybelline-pink hover:bg-pure-white rounded-xl transition-all duration-200 group"
          >
            <FaTrash className="text-maybelline-pink" />
            <span className="font-medium">Delete Account</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default UserSidebar;
