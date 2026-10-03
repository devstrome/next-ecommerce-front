'use client'
import React from 'react';
import Link from "next/link"
import { usePathname } from "next/navigation";
import { FaHome, FaChevronRight } from 'react-icons/fa';
import { useNavigation } from '../context/NavigationContext';

const Breadcrumb = () => {
  const pathname = usePathname();
  const { getBreadcrumbs } = useNavigation();
  const breadcrumbs = getBreadcrumbs();

  if (pathname === '/') {
    return null;
  }

  const isProfile = pathname.startsWith('/profile');

  return (
    <nav className={`bg-white border-b border-[#F4F4F4] ${isProfile ? '' : 'sticky top-16 sm:top-20 z-30'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 py-3">
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={breadcrumb.path}>
              {index > 0 && (
                <FaChevronRight className="text-[#BDBDBD] text-sm" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="flex items-center space-x-1 text-sm font-medium text-maybelline-pink">
                  {index === 0 && <span className="text-sm"><FaHome className="text-maybelline-pink" /></span>}
                  <span>{breadcrumb.label}</span>
                </span>
              ) : (
                <Link href={breadcrumb.path}
                  className="flex items-center space-x-1 text-sm font-medium text-[#4A4A4A] hover:text-maybelline-pink transition-colors duration-200"
                >
                  {index === 0 && <span className="text-sm"><FaHome className="text-[#4A4A4A]" /></span>}
                  <span>{breadcrumb.label}</span>
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Breadcrumb;
