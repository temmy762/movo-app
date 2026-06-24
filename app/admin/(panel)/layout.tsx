import AdminShell from "./components/AdminShell";

export const metadata = {
  title: "MOVO PRIVÉ — Admin",
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex overflow-hidden" style={{ background: "#0F1120", fontFamily: "var(--font-body)" }}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
