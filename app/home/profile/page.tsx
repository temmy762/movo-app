"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";

const menuItems = [
  {
    label: "Personal information",
    href: "/home/profile/personal-info",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    label: "Payment",
    href: "/home/payment",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    label: "Promotions",
    href: "/home/promotions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
      </svg>
    ),
  },
  {
    label: "Notifications",
    href: "/home/notifications",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/home/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    label: "Log out",
    href: "/onboarding/login",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  },
];

export default function ProfilePage() {
  const router = useRouter();

  return (
    <div className="h-screen flex flex-col bg-white" style={{ fontFamily: "var(--font-poppins)" }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* Banner */}
        <div className="relative w-full" style={{ height: "42vw", maxHeight: 220, minHeight: 160 }}>
          <Image
            src="/images/account banner.png"
            alt="Account banner"
            fill
            className="object-cover object-top"
            priority
          />
        </div>

        {/* Welcome */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-[13px] text-gray-500">Welcome</p>
          <p className="text-[22px] font-bold text-gray-900 leading-tight">Laura</p>
        </div>

        {/* Gradient divider */}
        <div
          className="mx-5 h-[2px] mb-2"
          style={{ background: "linear-gradient(90deg, #2D0A53 0%, #8B7500 100%)" }}
        />

        {/* Menu */}
        <nav className="flex flex-col">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.href)}
              className="no-hover-fx flex items-center justify-between px-5 py-4 border-b border-gray-100"
            >
              <div className="flex items-center gap-3 text-gray-700">
                {item.icon}
                <span className="text-[14px] font-medium">{item.label}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </nav>

      </div>

      <BottomNav />
    </div>
  );
}
