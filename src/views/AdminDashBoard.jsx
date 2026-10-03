'use client'
import AdminNavbar from '../components/AdminNavbar';
import Sidebar from '../components/Sidebar';
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useAdmin } from '../context/AdminContext';
import AdminBreadcrumb from '../components/AdminBreadcrumb';

const AdminDashBoard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, loading } = useAdmin();
  const router = useRouter();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="bg-pure-white min-h-screen">
      <AdminNavbar toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1">
        <div className="mt-16 mb-0">
          <AdminBreadcrumb />
        </div>
        <div />
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
    </div>
  );
};

export default AdminDashBoard;
