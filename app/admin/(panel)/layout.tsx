import AdminShell from "./components/AdminShell";

export const metadata = {
  title: "MOVO — Admin",
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-gray-50" style={{ fontFamily: "var(--font-body)" }}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
