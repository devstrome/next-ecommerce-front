'use client'
import React from 'react';
import Link from "next/link";
import { FiArrowLeft, FiPackage, FiTag, FiGrid, FiTruck, FiPercent, FiImage, FiStar, FiLink2, FiBox, FiMonitor, FiLayers } from 'react-icons/fi';
import { LuBadgeCheck } from "react-icons/lu";
import { FaTransgenderAlt } from "react-icons/fa";
import { TbGeometry } from "react-icons/tb";
import { SiExcalidraw } from "react-icons/si";
const ProductAdminPage = () => {
  const menuItems = [
    { name: 'Products', icon: <FiBox />, path: '/admin/dashboard/products/products' },
    { name: 'Categories', icon: <FiTag />, path: '/admin/dashboard/products/categories' },
    { name: 'Colors', icon: <SiExcalidraw />, path: '/admin/dashboard/products/colors' },
    { name: 'Sizes', icon: <FiGrid />, path: '/admin/dashboard/products/sizes' },
    { name: 'Gender', icon: <FaTransgenderAlt />, path: '/admin/dashboard/products/gender' },
    { name: 'Badges', icon: <LuBadgeCheck />, path: '/admin/dashboard/products/badges' },
    { name: 'Coupons', icon: <FiPercent />, path: '/admin/dashboard/products/coupons' },
    { name: 'Slides', icon: <FiImage />, path: '/admin/dashboard/products/slides' },
    { name: 'Top Rated', icon: <FiStar />, path: '/admin/dashboard/products/top-rated' },
    { name: 'Related', icon: <FiLink2 />, path: '/admin/dashboard/products/related' },
    { name: 'Shipping', icon: <FiTruck />, path: '/admin/dashboard/products/shipping' },
    { name: 'Measure Type', icon: <TbGeometry />, path: '/admin/dashboard/products/measure-type' },
    { name: 'Popup Ads', icon: <FiMonitor />, path: '/admin/dashboard/products/popup-ads' },
    { name: 'Hero Slides', icon: <FiLayers />, path: '/admin/dashboard/products/hero-slides' },
  ];

  return (
    <div className="min-h-screen bg-pure-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/dashboard" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-black">Product Management</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-maybelline-pink hover:text-maybelline-pink cursor-pointer transition-all duration-200 group"
            >
              <span className="text-3xl sm:text-4xl mb-2 text-mid-gray group-hover:text-maybelline-pink transition-colors">
                {item.icon}
              </span>
              <span className="text-sm sm:text-lg text-center font-medium text-dark-gray group-hover:text-maybelline-pink transition-colors">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductAdminPage;
