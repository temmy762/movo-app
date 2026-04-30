"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  badge?: number;
  match: (p: string) => boolean;
  icon: (active: boolean) => React.ReactNode;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard", href: "/admin",
    match: (p) => p === "/admin",
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#2D0A53" : "#9ca3af"} strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Bookings", href: "/admin/bookings",
    match: (p) => p.startsWith("/admin/bookings"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#2D0A53" : "#9ca3af"} strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Units", href: "/admin/units",
    match: (p) => p.startsWith("/admin/units"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#2D0A53" : "#9ca3af"} strokeWidth="2">
        <rect x="2" y="10" width="20" height="9" rx="2" />
        <path d="M5 10V8a7 7 0 0 1 14 0v2" />
      </svg>
    ),
  },
  {
    label: "Calendar", href: "/admin/calendar",
    match: (p) => p.startsWith("/admin/calendar"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#2D0A53" : "#9ca3af"} strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <circle cx="8" cy="15" r="1" fill={a ? "#2D0A53" : "#9ca3af"} />
        <circle cx="12" cy="15" r="1" fill={a ? "#2D0A53" : "#9ca3af"} />
      </svg>
    ),
  },
  {
    label: "Clients", href: "/admin/clients",
    match: (p) => p.startsWith("/admin/clients"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#2D0A53" : "#9ca3af"} strokeWidth="2">
        <circle cx="9" cy="7" r="4" /><path d="M2 21c0-4 3.1-7 7-7" />
        <circle cx="17" cy="9" r="3" /><path d="M22 21c0-3-2.2-5.5-5-5.5" />
      </svg>
    ),
  },
  {
    label: "Drivers", href: "/admin/drivers",
    match: (p) => p.startsWith("/admin/drivers"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#2D0A53" : "#9ca3af"} strokeWidth="2">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    label: "Financials", href: "/admin/financials",
    match: (p) => p.startsWith("/admin/financials"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#2D0A53" : "#9ca3af"} strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: "Tracking", href: "/admin/tracking",
    match: (p) => p.startsWith("/admin/tracking"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#2D0A53" : "#9ca3af"} strokeWidth="2">
        <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" />
        <line x1="12" y1="3" x2="12" y2="1" /><line x1="12" y1="23" x2="12" y2="21" />
        <line x1="3" y1="12" x2="1" y2="12" /><line x1="23" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    label: "Messages", href: "/admin/messages", badge: 1,
    match: (p) => p.startsWith("/admin/messages"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#2D0A53" : "#9ca3af"} strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-[220px] h-full flex flex-col shrink-0 bg-white border-r border-gray-100 py-5">

      {/* Logo */}
      <div className="relative w-36 h-10 mx-auto mb-6">
        <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {navItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="no-hover-fx flex items-center gap-3 px-3 py-2.5 rounded-xl relative"
              style={{ background: active ? "linear-gradient(90deg,rgba(45,10,83,0.08),rgba(139,117,0,0.06))" : "transparent" }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                  style={{ background: "linear-gradient(180deg,#2D0A53,#8B7500)" }}
                />
              )}
              {item.icon(active)}
              <span
                className="text-[13px] font-medium flex-1"
                style={{ color: active ? "#2D0A53" : "#6b7280" }}
              >
                {item.label}
              </span>
              {item.badge && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 mt-2">
        <button
          className="no-hover-fx flex items-center gap-3 px-3 py-2.5 rounded-xl w-full"
          onClick={() => router.push("/admin/login")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="text-[13px] font-medium text-gray-400">Logout</span>
        </button>
      </div>

    </aside>
  );
}
