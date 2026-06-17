"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={close}
        />
      )}
      <AdminSidebar open={sidebarOpen} onClose={close} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AdminTopBar onToggleSidebar={() => setSidebarOpen(v => !v)} sidebarOpen={sidebarOpen} />
        <div className="flex-1 overflow-y-auto min-h-0 relative">{children}</div>
      </div>
    </>
  );
}
