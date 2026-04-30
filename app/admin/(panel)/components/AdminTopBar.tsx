"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const titles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/bookings": "Bookings",
  "/admin/units": "Units",
  "/admin/calendar": "Calendar",
  "/admin/clients": "Clients",
  "/admin/drivers": "Drivers",
  "/admin/financials": "Financials",
  "/admin/tracking": "Tracking",
  "/admin/messages": "Messages",
};

function resolveTitle(pathname: string): { title: string; parent?: { label: string; href: string } } {
  if (pathname.startsWith("/admin/units/") && pathname !== "/admin/units")
    return { title: "Unit Details", parent: { label: "Units", href: "/admin/units" } };
  return { title: titles[pathname] ?? "Admin" };
}

export default function AdminTopBar() {
  const pathname = usePathname();
  const { title, parent } = resolveTitle(pathname);

  const [showSearch, setShowSearch]   = useState(false);
  const [searchVal, setSearchVal]     = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setShowSettings(false);
    };
    if (showSettings) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showSettings]);

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex flex-col gap-0.5">
        {parent && (
          <div className="flex items-center gap-1.5">
            <Link href={parent.href} className="no-hover-fx text-[10px] text-gray-400 hover:text-gray-600">{parent.label}</Link>
            <span className="text-[10px] text-gray-300">›</span>
            <span className="text-[10px] text-gray-400">{title}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {parent && (
            <Link href={parent.href}
              className="no-hover-fx w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </Link>
          )}
          <h1 className="text-[17px] font-bold text-gray-900">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">

        {/* Inline search bar (shown when toggled) */}
        {showSearch && (
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50/80">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              autoFocus
              type="text"
              placeholder="Search admin..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") { setShowSearch(false); setSearchVal(""); } }}
              className="text-[12px] focus:outline-none w-48 bg-transparent placeholder-gray-300"
              suppressHydrationWarning />
            <button onClick={() => { setShowSearch(false); setSearchVal(""); }}
              className="no-hover-fx text-gray-400 text-[16px] leading-none">×</button>
          </div>
        )}

        {/* Search toggle button */}
        <button
          className="no-hover-fx w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: showSearch ? "#f3f0ff" : "#f9fafb" }}
          onClick={() => setShowSearch(v => !v)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke={showSearch ? "#7c3aed" : "#6b7280"} strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>

        {/* Settings button + dropdown */}
        <div className="relative" ref={settingsRef}>
          <button
            className="no-hover-fx w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: showSettings ? "#f3f0ff" : "#f9fafb" }}
            onClick={() => setShowSettings(v => !v)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={showSettings ? "#7c3aed" : "#6b7280"} strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
          </button>
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
              <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Settings</p>
              {["Profile", "Preferences", "Notifications", "Theme"].map(item => (
                <button key={item} onClick={() => setShowSettings(false)}
                  className="no-hover-fx w-full px-4 py-2.5 text-left text-[12px] text-gray-700 hover:bg-gray-50 transition-colors">
                  {item}
                </button>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button onClick={() => setShowSettings(false)}
                  className="no-hover-fx w-full px-4 py-2.5 text-left text-[12px] text-red-500 hover:bg-red-50 transition-colors">
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification button */}
        <button className="no-hover-fx w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center relative">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"/>
        </button>

        {/* User info */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-100">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-indigo-100 flex items-center justify-center">
            <svg width="28" height="32" viewBox="0 0 40 48" fill="none">
              <circle cx="20" cy="13" r="9" fill="#c4b5fd"/>
              <path d="M12 11 Q20 4 28 11 Q28 6 20 4 Q12 6 12 11z" fill="#1a1a2e"/>
              <path d="M8 48 Q8 30 20 26 Q32 30 32 48Z" fill="#2D0A53"/>
              <path d="M19 26 L20 34 L21 26" fill="white"/>
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-gray-800">Abram Schleifer</span>
            <span className="text-[10px] text-gray-400">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
