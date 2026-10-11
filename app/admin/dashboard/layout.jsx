'use client'
import AdminNavbar from '../../../src/components/AdminNavbar';
import Sidebar from '../../../src/components/Sidebar';
import ScrollToTop from '../../../src/components/ScrollToTop';
import AdminBreadcrumb from '../../../src/components/AdminBreadcrumb';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from "next/navigation";
import { useAdmin } from '../../../src/context/AdminContext';
import { adminPermissionForPath, firstAllowedAdminPath } from '../../../src/lib/adminPermissions';
import { POSProvider } from '../../../src/context/POSContext';
import { AdminProductProvider } from '../../../src/context/AdminProductContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, loading, admin, hasPermission } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const requiredPermission = adminPermissionForPath(pathname);
  const allowedByRole = !requiredPermission || hasPermission(requiredPermission);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!loading && isAuthenticated && !allowedByRole) {
      router.replace(firstAllowedAdminPath(admin));
    }
  }, [loading, isAuthenticated, allowedByRole, admin, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-pure-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (!allowedByRole) {
    return <div className="flex min-h-screen items-center justify-center p-8 text-center text-gray-700">Your admin role does not have access to this section.</div>;
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="bg-pure-white min-h-screen">
      <AdminNavbar toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="min-w-0 pt-16 pb-8 lg:ml-64">
        <AdminBreadcrumb />
        <POSProvider>
          <AdminProductProvider>
            <div className="admin-responsive-content min-w-0 px-3 sm:px-4 lg:px-0">
              {children}
            </div>
          </AdminProductProvider>
        </POSProvider>
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}
      <ScrollToTop />
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
