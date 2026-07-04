"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  badge?: number;
  match: (p: string) => boolean;
  icon: (active: boolean) => React.ReactNode;
};

type NavGroup = {
  label: string;
  groupMatch: (p: string) => boolean;
  icon: (active: boolean) => React.ReactNode;
  children: { label: string; href: string }[];
};

type NavEntry = ({ kind: "item" } & NavItem) | ({ kind: "group" } & NavGroup);

const navItems: NavEntry[] = [
  {
    kind: "item",
    label: "Dashboard", href: "/admin",
    match: (p) => p === "/admin",
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    kind: "item",
    label: "Bookings", href: "/admin/bookings",
    match: (p) => p.startsWith("/admin/bookings"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    kind: "item",
    label: "Units", href: "/admin/units",
    match: (p) => p.startsWith("/admin/units"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <rect x="2" y="10" width="20" height="9" rx="2" />
        <path d="M5 10V8a7 7 0 0 1 14 0v2" />
      </svg>
    ),
  },
  {
    kind: "item",
    label: "Calendar", href: "/admin/calendar",
    match: (p) => p.startsWith("/admin/calendar"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <circle cx="8" cy="15" r="1" fill={a ? "#131936" : "#9ca3af"} />
        <circle cx="12" cy="15" r="1" fill={a ? "#131936" : "#9ca3af"} />
      </svg>
    ),
  },
  {
    kind: "item",
    label: "Clients", href: "/admin/clients",
    match: (p) => p.startsWith("/admin/clients"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <circle cx="9" cy="7" r="4" /><path d="M2 21c0-4 3.1-7 7-7" />
        <circle cx="17" cy="9" r="3" /><path d="M22 21c0-3-2.2-5.5-5-5.5" />
      </svg>
    ),
  },
  {
    kind: "item",
    label: "Drivers", href: "/admin/drivers",
    match: (p) => p.startsWith("/admin/drivers"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    kind: "group",
    label: "Financials",
    groupMatch: (p) => p.startsWith("/admin/financials"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    children: [
      { label: "Payments",  href: "/admin/financials/payments" },
      { label: "Expenses",  href: "/admin/financials/expenses" },
      { label: "Payouts",   href: "/admin/financials/payouts" },
      { label: "Analytics", href: "/admin/financials/analytics" },
    ],
  },
  {
    kind: "item",
    label: "Tracking", href: "/admin/tracking",
    match: (p) => p.startsWith("/admin/tracking"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" />
        <line x1="12" y1="3" x2="12" y2="1" /><line x1="12" y1="23" x2="12" y2="21" />
        <line x1="3" y1="12" x2="1" y2="12" /><line x1="23" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    kind: "item",
    label: "Messages", href: "/admin/messages",
    match: (p) => p.startsWith("/admin/messages"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    kind: "item",
    label: "Onboarding", href: "/admin/onboarding",
    match: (p) => p.startsWith("/admin/onboarding"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <polyline points="16 11 18 13 22 9"/>
      </svg>
    ),
  },
  {
    kind: "item",
    label: "Incidents", href: "/admin/incidents",
    match: (p) => p.startsWith("/admin/incidents"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    kind: "item",
    label: "Pricing", href: "/admin/pricing",
    match: (p) => p.startsWith("/admin/pricing"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    kind: "group",
    label: "Compliance",
    groupMatch: (p) => p.startsWith("/admin/compliance"),
    icon: (a) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? "#131936" : "#9ca3af"} strokeWidth="2">
        <path d="M9 12l2 2 4-4" /><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.85 0 3.57.56 5 1.52" />
      </svg>
    ),
    children: [
      { label: "Complaints",       href: "/admin/compliance/complaints" },
      { label: "Lost & Found",     href: "/admin/compliance/lost-found" },
      { label: "Consent Records",  href: "/admin/compliance/consent-records" },
      { label: "Audit Log",        href: "/admin/compliance/audit-log" },
      { label: "Incident Reports", href: "/admin/incidents" },
    ],
  },
];

export default function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Financials: pathname.startsWith("/admin/financials") });
  const [msgUnread, setMsgUnread] = useState(0);
  const [pendingOnboarding, setPendingOnboarding] = useState(0);
  const prevPath = useRef(pathname);

  useEffect(() => {
    fetch("/api/admin/messages")
      .then(r => r.json())
      .then((data: { unread: boolean }[]) => {
        if (Array.isArray(data)) setMsgUnread(data.filter(c => c.unread).length);
      })
      .catch(() => {});

    fetch("/api/admin/onboarding/pending-count")
      .then(r => r.json())
      .then((d: { count: number }) => { if (typeof d.count === "number") setPendingOnboarding(d.count); })
      .catch(() => {});
  }, [pathname]); // re-check on navigation

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  const toggleGroup = (label: string) => setExpanded(p => ({ ...p, [label]: !p[label] }));

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col w-[220px] shrink-0 bg-[#0A0A0F] border-r border-[#2A3055] py-5 transition-transform duration-300 ${
      open ? "translate-x-0" : "-translate-x-full"
    } md:static md:translate-x-0 md:h-full`}>

      {/* Logo */}
      <div className="relative w-40 h-12 mx-auto mb-6">
        <Image src="/images/logo/logo-horizontal-ivory.svg" alt="MOVO PRIVÉ" fill className="object-contain" priority />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {navItems.map((entry) => {
          if (entry.kind === "group") {
            const groupActive = entry.groupMatch(pathname);
            const open = expanded[entry.label] ?? groupActive;
            return (
              <div key={entry.label}>
                <button
                  onClick={() => toggleGroup(entry.label)}
                  className="no-hover-fx flex items-center gap-3 px-3 py-2.5 rounded-xl w-full relative"
                  style={{ background: groupActive ? "rgba(19,25,54,0.7)" : "transparent" }}
                >
                  {groupActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                      style={{ background: "linear-gradient(180deg,#C6BFB2,#8A8F9E)" }}/>
                  )}
                  {entry.icon(groupActive)}
                  <span className="text-[13px] font-medium flex-1 text-left" style={{ color: groupActive ? "#F5F5F2" : "#8A8F9E" }}>
                    {entry.label}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={groupActive ? "#F5F5F2" : "#8A8F9E"} strokeWidth="2.5"
                    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
                {open && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                    {entry.children.map(child => {
                      const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                      return (
                        <Link key={child.href} href={child.href}
                          className="no-hover-fx flex items-center gap-2.5 px-3 py-2 rounded-xl relative"
                          style={{ background: childActive ? "rgba(197,191,178,0.12)" : "transparent" }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: childActive ? "#C6BFB2" : "#4b5563" }}/>
                          <span className="text-[12px] font-medium" style={{ color: childActive ? "#F5F5F2" : "#8A8F9E" }}>
                            {child.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const active = entry.match(pathname);
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className="no-hover-fx flex items-center gap-3 px-3 py-2.5 rounded-xl relative"
              style={{ background: active ? "rgba(197,191,178,0.1)" : "transparent" }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                  style={{ background: "linear-gradient(180deg,#C6BFB2,#8A8F9E)" }}
                />
              )}
              {entry.icon(active)}
              <span
                className="text-[13px] font-medium flex-1"
                style={{ color: active ? "#F5F5F2" : "#8A8F9E" }}
              >
                {entry.label}
              </span>
              {entry.label === "Messages" && msgUnread > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {msgUnread}
                </span>
              )}
              {entry.label === "Onboarding" && pendingOnboarding > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingOnboarding > 9 ? "9+" : pendingOnboarding}
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
          <span className="text-[13px] font-medium" style={{color:"#8A8F9E"}}>Logout</span>
        </button>
      </div>

    </aside>
  );
}
