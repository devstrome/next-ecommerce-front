import React from "react";
import { Outlet } from "next/navigation";
import UserSidebar from "../components/UserSidebar";
import ModernShell from "../components/ModernShell";

const UserLayout = () => {
  return (
    <ModernShell>
      {/* Sidebar Component */}
      <UserSidebar />

      {/* Main Content Area */}
      <div className="lg:ml-80">
        {/* Mobile top spacing for header */}
        <div className="lg:hidden h-20"></div>

        {/* Outlet Content */}
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <div />
        </div>

        {/* Mobile bottom spacing for bottom navigation */}
        <div className="lg:hidden h-20"></div>
      </div>
    </ModernShell>
  );
};

export default UserLayout;
