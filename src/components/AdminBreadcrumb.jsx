'use client'
import React from 'react';
import Link from "next/link"
import { usePathname } from "next/navigation";

const AdminBreadcrumb = () => {
  const pathname = usePathname();
  
  const getRouteInfo = (path) => {
    const routeMap = {
      'dashboard': 'Dashboard',
      'products': 'Products',
      'users': 'Users',
      'orders': 'Orders',
      'categories': 'Categories',
      'inventory': 'Inventory',
      'shipping': 'Shipping',
      'coupons': 'Coupons',
      'contacts': 'Contacts',
      'slides': 'Sliders',
      'top-rated': 'Top Rated',
      'colors': 'Colors',
      'sizes': 'Sizes',
      'gender': 'Genders',
      'measure-type': 'Measure Types',
      'badges': 'Badges',
      'profile': 'Profile',
      'admins': 'Admin Management',
      'createproducts': 'Create Product',
      'related': 'Related Products',
      'inbox': 'Messages',
      'pos': 'Point of Sale',
      'pos-orders': 'POS Orders'
    };
    
    return routeMap[path] || path.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const generateBreadcrumbs = () => {
    const pathnames = pathname.split('/').filter(x => x);
    const breadcrumbs = [];

    let currentPath = '';
    pathnames.forEach((name, index) => {
      currentPath += `/${name}`;
      
      if (name === 'admin') return;
      
      const routeName = getRouteInfo(name);
      
      breadcrumbs.push({
        name: routeName,
        path: currentPath,
        icon: null
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (pathname === '/admin') {
    return null;
  }

  return (
    <nav className="bg-white border-b border-cool-gray px-4 sm:px-6">
      <div className="flex items-center space-x-2 py-3">
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={breadcrumb.path}>
              {index > 0 && (
                <span className="text-[#4A4A4A]">{'>'}</span>
              )}
              <Link href={breadcrumb.path}
                className={`flex items-center space-x-1 text-sm font-medium transition-colors duration-200 hover:text-maybelline-pink ${
                  index === breadcrumbs.length - 1
                    ? 'text-[#1B1B1B] cursor-default'
                    : 'text-[#4A4A4A] hover:text-maybelline-pink'
                }`}
                onClick={index === breadcrumbs.length - 1 ? (e) => e.preventDefault() : undefined}
              >
                {breadcrumb.icon && <span>{breadcrumb.icon}</span>}
                <span>{breadcrumb.name}</span>
              </Link>
            </React.Fragment>
          ))}
        </div>
    </nav>
  );
};

export default AdminBreadcrumb;
