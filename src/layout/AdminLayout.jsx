import { Outlet } from "next/navigation";
import { AdminProvider } from "../context/AdminContext";
import { AdminChatProvider } from "../context/AdminChatContext";
import ModernShell from "../components/ModernShell";

function AdminLayout() {
  return (
    <AdminProvider>
      <AdminChatProvider>
        <ModernShell>
          <div className="flex flex-col min-h-screen">
            <div />
          </div>
        </ModernShell>
      </AdminChatProvider>
    </AdminProvider>
  );
}

export default AdminLayout;
