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
    label: "Offers",
    href: "/driver/home/offers",
    match: (p: string) => p.startsWith("/driver/home/offers"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "rgba(255,255,255,0.5)"} strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    label: "Planned",
    href: "/driver/home/planned",
    match: (p: string) => p.startsWith("/driver/home/planned"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "rgba(255,255,255,0.5)"} strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" strokeWidth="3" />
        <line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" strokeWidth="3" />
        <line x1="3" y1="18" x2="3.01" y2="18" strokeLinecap="round" strokeWidth="3" />
      </svg>
    ),
  },
  {
    label: "Finish",
    href: "/driver/home/finish",
    match: (p: string) => p.startsWith("/driver/home/finish"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "rgba(255,255,255,0.5)"} strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
];

export default function DriverSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 h-full flex flex-col py-6 px-4 shrink-0"
      style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #2D0A53 60%, #8B7500 100%)" }}
    >
      {/* Logo */}
      <div className="relative w-32 h-16 mx-auto mb-8">
        <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" />
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
