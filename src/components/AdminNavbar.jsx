'use client'
import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useRouter } from "next/navigation";
import { FiMenu, FiUser, FiSettings, FiShield, FiLogOut } from 'react-icons/fi';

const Navbar = ({ toggleSidebar }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { admin, logout } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('#user-menu-button')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    router.push('/admin');
  };

  return (
    <nav className="fixed top-0 z-50 w-full bg-pure-white border-b border-cool-gray">
      <div className="px-3 py-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start">
            <button
              onClick={toggleSidebar}
              type="button"
              className="inline-flex items-center p-2 text-sm text-dark-gray rounded-lg sm:hidden hover:bg-pure-white focus:outline-none focus:ring-2 focus:ring-charcoal/10"
              aria-controls="logo-sidebar"
              aria-expanded="false"
            >
              <span className="sr-only">Open sidebar</span>
              <FiMenu className="w-6 h-6" />
            </button>
            <a href="#" className="flex ms-2 md:me-24">
              <span className="self-center text-xl font-heading tracking-widest uppercase sm:text-2xl whitespace-nowrap text-black">
                Belorella
              </span>
            </a>
          </div>

          {admin && (
            <div className="flex items-center">
              <div className="flex items-center ms-3">
                <div className="relative">
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
                          <a
                            href="#"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-gray hover:bg-pure-white transition-colors"
                            role="menuitem"
                            onClick={() => router.push('/admin/dashboard/profile')}
                          >
                            <FiUser className="w-4 h-4 text-mid-gray" />
                            Profile
                          </a>
                        </li>
                        <li>
                          <a
                            href="#"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-gray hover:bg-pure-white transition-colors"
                            role="menuitem"
                            onClick={() => router.push('/admin/dashboard/settings')}
                          >
                            <FiSettings className="w-4 h-4 text-mid-gray" />
                            Settings
                          </a>
                        </li>
                        {admin.superAdmin && (
                          <li>
                            <a
                              href="#"
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-gray hover:bg-pure-white transition-colors"
                              role="menuitem"
                              onClick={() => router.push('/admin/dashboard/admins')}
                            >
                              <FiShield className="w-4 h-4 text-mid-gray" />
                              Admin Management
                            </a>
                          </li>
                        )}
                        <li className="border-t border-cool-gray mt-1 pt-1">
                          <a
                            href="#"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-maybelline-pink hover:bg-pure-white transition-colors"
                            role="menuitem"
                            onClick={handleLogout}
                          >
                            <FiLogOut className="w-4 h-4" />
                            Sign out
                          </a>
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
