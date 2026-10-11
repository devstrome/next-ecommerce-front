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
    <nav aria-label="Breadcrumb" className={`bg-gradient-to-r from-[#7f001e] via-[#bd1238] to-[#e31845] text-white shadow-sm ${isProfile ? '' : 'sticky top-16 sm:top-20 z-30'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ol className="flex min-h-11 items-center gap-2 overflow-x-auto whitespace-nowrap py-2 text-xs sm:text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {breadcrumbs.map((breadcrumb, index) => (
            <li key={breadcrumb.path} className="flex min-w-0 shrink-0 items-center gap-2">
              {index > 0 && (
                <FaChevronRight aria-hidden="true" className="shrink-0 text-white/65 text-[10px]" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span aria-current="page" className="flex max-w-[52vw] items-center gap-1.5 truncate rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-semibold text-white sm:max-w-[32rem]">
                  {index === 0 && <FaHome aria-hidden="true" className="shrink-0" />}
                  <span className="truncate">{breadcrumb.label}</span>
                </span>
              ) : (
                <Link href={breadcrumb.path}
                  className="flex items-center gap-1.5 rounded-full px-1.5 py-1 font-medium text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                >
                  {index === 0 && <FaHome aria-hidden="true" className="shrink-0" />}
                  <span>{breadcrumb.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
};

export default Breadcrumb;
