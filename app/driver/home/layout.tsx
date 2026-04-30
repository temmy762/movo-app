import DriverBottomNav from "./components/DriverBottomNav";
import DriverSidebar from "./components/DriverSidebar";

export const metadata = {
  title: "MOVO PRIVÉ — Driver",
};

export default function DriverHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full flex overflow-hidden" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <DriverSidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
        {/* Bottom nav — mobile only */}
        <div className="md:hidden">
          <DriverBottomNav />
        </div>
      </div>

    </div>
  );
}
