"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", img: "/images/Home.png", href: "/home", match: (p: string) => p === "/home" },
  { label: "Rides", img: "/images/EMPTYCar.png", href: "/home/rides", match: (p: string) => p.startsWith("/home/rides") || p.startsWith("/home/pickup") || p === "/home/ride" || p.startsWith("/home/ride/") },
  { label: "Help", img: "/images/Help.png", href: "/home/help", match: (p: string) => p.startsWith("/home/help") },
  { label: "My Luxe ID", img: "/images/Male User.png", href: "/home/profile", match: (p: string) => p.startsWith("/home/profile") },
];

export default function BottomNav() {
  const pathname = usePathname() || "";
  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-3 z-50"
      style={{ background: "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)" }}
    >
      {navItems.map((item) => {
        const isActive = item.match(pathname);
        return (
          <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 px-3">
            <div
              className="relative w-6 h-6"
              style={{ filter: isActive ? "brightness(0) invert(1)" : "brightness(0) invert(0.6)" }}
            >
              <Image src={item.img} alt={item.label} fill className="object-contain" />
            </div>
            <span className={`text-[12px] font-medium ${isActive ? "text-white" : "text-white/50"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
