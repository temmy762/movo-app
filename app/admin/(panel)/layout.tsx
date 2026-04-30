import AdminSidebar from "./components/AdminSidebar";
import AdminTopBar from "./components/AdminTopBar";

export const metadata = {
  title: "MOVO PRIVÉ — Admin",
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-gray-50" style={{ fontFamily: "var(--font-poppins)" }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopBar />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
