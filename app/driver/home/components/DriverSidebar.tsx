"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Home",
    href: "/driver/home",
    match: (p: string) => p === "/driver/home",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "rgba(255,255,255,0.5)"} strokeWidth="2">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    label: "Reserved",
    href: "/driver/home/planned",
    match: (p: string) => p.startsWith("/driver/home/planned"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "rgba(255,255,255,0.5)"} strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Today's Rides",
    href: "/driver/home/finish/my-rides",
    match: (p: string) => p.startsWith("/driver/home/finish"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "rgba(255,255,255,0.5)"} strokeWidth="2">
        <path d="M5 17H3a1 1 0 0 1-1-1v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4a1 1 0 0 1-1 1h-2" />
        <circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" />
      </svg>
    ),
  },
  {
    label: "Earnings",
    href: "/driver/home/wallet",
    match: (p: string) => p.startsWith("/driver/home/wallet"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "rgba(255,255,255,0.5)"} strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M14.5 9.3a2.6 2.6 0 0 0-2.5-1.6c-1.4 0-2.5.9-2.5 2s1.1 1.7 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2a2.6 2.6 0 0 1-2.5-1.6" />
        <line x1="12" y1="6" x2="12" y2="7.7" /><line x1="12" y1="16.3" x2="12" y2="18" />
      </svg>
    ),
  },
  {
    label: "Inbox",
    href: "/driver/home/news",
    match: (p: string) => p.startsWith("/driver/home/news") || p.startsWith("/driver/home/offers"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "rgba(255,255,255,0.5)"} strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 6l10 7L22 6" />
      </svg>
    ),
  },
];

export default function DriverSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 h-full flex flex-col py-6 px-4 shrink-0"
      style={{ background: "linear-gradient(180deg, #0A0A0F 0%, #131936 60%, #2A3055 100%)" }}
    >
      {/* Logo */}
      <div className="relative w-48 h-24 mx-auto mb-8">
        <Image src="/images/logo/logo-horizontal-ivory.svg" alt="MOVO" fill className="object-contain" />
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="no-hover-fx flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
              style={{ background: active ? "rgba(255,255,255,0.15)" : "transparent" }}
            >
              {item.icon(active)}
              <span
                className="text-[14px] font-medium"
                style={{ color: active ? "white" : "rgba(255,255,255,0.55)" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Profile link */}
      <Link
        href="/driver/home/profile"
        className="no-hover-fx flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <span className="text-[13px] text-white/60">Profile</span>
      </Link>
    </aside>
  );
}
