import AdminSidebar from "./components/AdminSidebar";

export const metadata = {
  title: "MOVO PRIVÉ — Admin",
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-gray-50" style={{ fontFamily: "var(--font-poppins)" }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-[17px] font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-3">
            <button className="no-hover-fx w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <button className="no-hover-fx w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
              </svg>
            </button>
            <button className="no-hover-fx w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center relative">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }}
              >
                A
              </div>
              <span className="text-[13px] font-semibold text-gray-700">Alyph Achilles</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
