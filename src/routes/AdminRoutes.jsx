'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "../context/AdminContext";
import { useEffect, useState } from "react";

const AdminRoutes = () => {
  const { isAuthenticated, loading, refreshToken } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated && !loading && getStorage("adminRefreshToken")) {
        try {
          await refreshToken();
        } catch (err) {
          console.warn("Admin token refresh failed", err);
        }
      }
      setCheckedAuth(true);
    };
    verifyAuth();
  }, [isAuthenticated, loading, refreshToken]);

  useEffect(() => {
    if (!loading && checkedAuth && !isAuthenticated) {
      router.push('/admin');
    }
  }, [loading, checkedAuth, isAuthenticated, router]);

  if (loading || !checkedAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return isAuthenticated ? <div /> : null;
};

export default AdminRoutes;
