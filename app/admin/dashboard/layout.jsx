'use client'
import AdminNavbar from '../../../src/components/AdminNavbar';
import Sidebar from '../../../src/components/Sidebar';
import ScrollToTop from '../../../src/components/ScrollToTop';
import AdminBreadcrumb from '../../../src/components/AdminBreadcrumb';
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useAdmin } from '../../../src/context/AdminContext';
import { POSProvider } from '../../../src/context/POSContext';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, loading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-pure-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="bg-pure-white min-h-screen">
      <AdminNavbar toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="pt-16 sm:ml-64">
        <AdminBreadcrumb />
        <POSProvider>
          {children}
        </POSProvider>
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 sm:hidden" onClick={toggleSidebar}></div>
      )}
      <ScrollToTop />
    </div>
  );
}
