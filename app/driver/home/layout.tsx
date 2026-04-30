import DriverBottomNav from "./components/DriverBottomNav";

export const metadata = {
  title: "MOVO PRIVÉ — Driver",
};

export default function DriverHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden" style={{ fontFamily: "var(--font-poppins)" }}>
      <div className="flex-1 overflow-y-auto">{children}</div>
      <DriverBottomNav />
    </div>
  );
}
