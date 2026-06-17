"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const titles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/bookings": "Bookings",
  "/admin/units": "Units",
  "/admin/calendar": "Calendar",
  "/admin/clients": "Clients",
  "/admin/drivers": "Drivers",
  "/admin/financials": "Financials",
  "/admin/financials/payments": "Payments",
  "/admin/financials/expenses": "Expenses",
  "/admin/tracking": "Tracking",
  "/admin/messages": "Messages",
};

function resolveTitle(pathname: string): { title: string; parent?: { label: string; href: string } } {
  if (pathname.startsWith("/admin/units/") && pathname !== "/admin/units")
    return { title: "Unit Details", parent: { label: "Units", href: "/admin/units" } };
  if (pathname === "/admin/financials/payments")
    return { title: "Payments", parent: { label: "Financials", href: "/admin/financials/payments" } };
  if (pathname === "/admin/financials/expenses")
    return { title: "Expenses", parent: { label: "Financials", href: "/admin/financials/expenses" } };
  return { title: titles[pathname] ?? "Admin" };
}

type NotifItem = { id: string; type: "booking" | "support" | "payout" | "incident"; title: string; sub: string; time: string; href: string; };

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminTopBar({ onToggleSidebar, sidebarOpen }: { onToggleSidebar: () => void; sidebarOpen: boolean }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { title, parent } = resolveTitle(pathname);

  const [showSearch, setShowSearch]     = useState(false);
  const [searchVal, setSearchVal]       = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif]       = useState(false);
  const [notifs, setNotifs]             = useState<NotifItem[]>([]);
  const [userName, setUserName]         = useState("Admin");
  const [userInitials, setUserInitials] = useState("A");

  const settingsRef = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);

  // ── Fetch current user ───────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        const full = `${d.user.firstName} ${d.user.lastName}`;
        setUserName(full);
        setUserInitials(`${d.user.firstName[0]}${d.user.lastName[0]}`.toUpperCase());
      }
    }).catch(() => {});
  }, []);

  // ── Fetch notifications (initial + 60s poll) ─────────────────────────────
  useEffect(() => {
    const load = () => {
      fetch("/api/admin/notifications").then(r => r.json()).then(d => {
        if (d.items) setNotifs(d.items);
      }).catch(() => {});
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  // ── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))    setShowNotif(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ── Sign out ─────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  // ── Search submit ─────────────────────────────────────────────────────────
  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || !searchVal.trim()) return;
    const q = encodeURIComponent(searchVal.trim());
    setShowSearch(false); setSearchVal("");
    router.push(`/admin/bookings?search=${q}`);
  };

  // ── Mark notification as read ──────────────────────────────────────────────
  const handleNotificationClick = async (notification: NotifItem) => {
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationId: notification.id,
          type: notification.type,
        }),
      });
      // Remove from list after marking as read
      setNotifs(prev => prev.filter(n => n.id !== notification.id));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
    setShowNotif(false);
    router.push(notification.href);
  };

  const settingsLinks = [
    { label: "Bookings",  href: "/admin/bookings" },
    { label: "Clients",   href: "/admin/clients" },
    { label: "Drivers",   href: "/admin/drivers" },
    { label: "Units",     href: "/admin/units" },
  ];

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
      {/* Hamburger — mobile only */}
      <button
        onClick={onToggleSidebar}
        className="no-hover-fx md:hidden w-9 h-9 rounded-xl flex items-center justify-center mr-2 shrink-0 transition-colors"
        style={{ background: sidebarOpen ? "#f3f0ff" : "#f9fafb" }}
        aria-label="Toggle sidebar">
        {sidebarOpen ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>

      {/* Page title */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        {parent && (
          <div className="flex items-center gap-1.5">
            <Link href={parent.href} className="no-hover-fx text-[10px] text-gray-400 hover:text-gray-600">{parent.label}</Link>
            <span className="text-[10px] text-gray-300">›</span>
            <span className="text-[10px] text-gray-400">{title}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {parent && (
            <Link href={parent.href} className="no-hover-fx w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </Link>
          )}
          <h1 className="text-[17px] font-bold text-gray-900">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">

        {/* Search bar (inline) */}
        {showSearch && (
          <div className="hidden md:flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50/80">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input autoFocus type="text" placeholder="Search bookings, clients…"
              value={searchVal} onChange={e => setSearchVal(e.target.value)}
              onKeyDown={handleSearch}
              className="text-[12px] focus:outline-none w-48 bg-transparent placeholder-gray-300" suppressHydrationWarning/>
            <button onClick={() => { setShowSearch(false); setSearchVal(""); }}
              className="no-hover-fx text-gray-400 text-[16px] leading-none">×</button>
          </div>
        )}

        {/* Search toggle */}
        <button className="no-hover-fx w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: showSearch ? "#f3f0ff" : "#f9fafb" }}
          onClick={() => { setShowSearch(v => !v); setShowNotif(false); setShowSettings(false); }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke={showSearch ? "#7c3aed" : "#6b7280"} strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>

        {/* Settings dropdown */}
        <div className="relative" ref={settingsRef}>
          <button className="no-hover-fx w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: showSettings ? "#f3f0ff" : "#f9fafb" }}
            onClick={() => { setShowSettings(v => !v); setShowNotif(false); setShowSearch(false); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={showSettings ? "#7c3aed" : "#6b7280"} strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
              <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Quick Navigation</p>
              {settingsLinks.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setShowSettings(false)}
                  className="no-hover-fx flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-[12px] text-gray-700 hover:bg-gray-50">
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button onClick={handleSignOut}
                  className="no-hover-fx w-full px-4 py-2.5 text-left text-[12px] text-red-500 hover:bg-red-50 flex items-center gap-2.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button className="no-hover-fx w-8 h-8 rounded-lg flex items-center justify-center relative"
            style={{ background: showNotif ? "#fef2f2" : "#f9fafb" }}
            onClick={() => { setShowNotif(v => !v); setShowSettings(false); setShowSearch(false); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={showNotif ? "#ef4444" : "#6b7280"} strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifs.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                {notifs.length > 9 ? "9+" : notifs.length}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-[13px] font-bold text-gray-900">Notifications</p>
                {notifs.length > 0 && (
                  <span className="text-[10px] font-semibold text-white bg-red-500 px-2 py-0.5 rounded-full">
                    {notifs.length} new
                  </span>
                )}
              </div>
              <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-50">
                {notifs.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[12px] text-gray-400">All caught up!</p>
                ) : notifs.map(n => (
                  <button key={n.id} onClick={() => handleNotificationClick(n)}
                    className="no-hover-fx w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: n.type === "booking" ? "#eff6ff" : n.type === "payout" ? "#f0fdf4" : n.type === "incident" ? "#fff7ed" : "#fef2f2" }}>
                      {n.type === "booking" && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      )}
                      {n.type === "support" && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      )}
                      {n.type === "payout" && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                          <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                      {n.type === "incident" && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 truncate">{n.title}</p>
                      <p className="text-[11px] text-gray-400 truncate">{n.sub}</p>
                    </div>
                    <span className="text-[10px] text-gray-300 shrink-0 mt-0.5">{timeAgo(n.time)}</span>
                  </button>
                ))}
              </div>
              {notifs.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100">
                  <Link href="/admin/bookings" onClick={() => setShowNotif(false)}
                    className="no-hover-fx block text-center text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
                    View all bookings →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User avatar + name */}
        <div className="flex items-center gap-2 md:gap-2.5 pl-2 md:pl-3 border-l border-gray-100">
          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-[13px] font-bold"
            style={{ background: "linear-gradient(135deg,#2D0A53,#7c3aed)" }}>
            {userInitials}
          </div>
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-gray-800">{userName}</span>
            <span className="text-[10px] text-gray-400">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
