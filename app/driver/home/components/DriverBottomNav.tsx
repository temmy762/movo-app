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
    label: "Reserved",
    href: "/driver/home/planned",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#9ca3af"} strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/driver/home/planned"),
  },
  {
    label: "Today's Rides",
    href: "/driver/home/finish/my-rides",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#9ca3af"} strokeWidth="2">
        <path d="M5 17H3a1 1 0 0 1-1-1v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4a1 1 0 0 1-1 1h-2" />
        <circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/driver/home/finish"),
  },
  {
    label: "Earnings",
    href: "/driver/home/wallet",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#9ca3af"} strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M14.5 9.3a2.6 2.6 0 0 0-2.5-1.6c-1.4 0-2.5.9-2.5 2s1.1 1.7 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2a2.6 2.6 0 0 1-2.5-1.6" />
        <line x1="12" y1="6" x2="12" y2="7.7" /><line x1="12" y1="16.3" x2="12" y2="18" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/driver/home/wallet"),
  },
  {
    label: "Inbox",
    href: "/driver/home/news",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#9ca3af"} strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 6l10 7L22 6" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/driver/home/news") || p.startsWith("/driver/home/offers"),
  },
];

export default function DriverBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="w-full flex items-center justify-around py-3 shrink-0"
      style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
    >
      {navItems.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="no-hover-fx flex flex-col items-center gap-1 flex-1 min-w-0"
          >
            {item.icon(active)}
            <span
              className="text-[10px] font-medium truncate max-w-full px-0.5"
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
