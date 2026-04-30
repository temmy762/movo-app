"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Home",
    href: "/driver/home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#9ca3af"} strokeWidth="2">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
    match: (p: string) => p === "/driver/home",
  },
  {
    label: "Offers",
    href: "/driver/home/offers",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#9ca3af"} strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/driver/home/offers"),
  },
  {
    label: "Planned",
    href: "/driver/home/planned",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#9ca3af"} strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" strokeWidth="3" />
        <line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" strokeWidth="3" />
        <line x1="3" y1="18" x2="3.01" y2="18" strokeLinecap="round" strokeWidth="3" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/driver/home/planned"),
  },
  {
    label: "Finish",
    href: "/driver/home/finish",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#9ca3af"} strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/driver/home/finish"),
  },
];

export default function DriverBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="w-full flex items-center justify-around py-3 shrink-0"
      style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
    >
      {navItems.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="no-hover-fx flex flex-col items-center gap-1 min-w-[56px]"
          >
            {item.icon(active)}
            <span
              className="text-[11px] font-medium"
              style={{ color: active ? "white" : "#9ca3af" }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
