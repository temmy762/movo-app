"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

const DARK = "#0A0A0F";

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[17px] font-bold text-gray-900 mb-2.5">{title}</h2>
      <div className="text-[13px] text-gray-600 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PolicyLayout({
  title,
  updatedAt,
  intro,
  children,
}: {
  title: string;
  updatedAt: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
      <nav className="sticky top-0 z-40 border-b border-gray-100" style={{ background: DARK }}>
        <div className="max-w-4xl mx-auto px-5 md:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Image src="/images/logo/logo-horizontal-ivory.svg" alt="Movo" width={100} height={28} unoptimized />
          </Link>
          <Link href="/" className="text-white/60 text-[13px] font-medium hover:text-white transition-colors">
            Back to home
          </Link>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-5 md:px-8 py-10 md:py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: "#C6BFB2" }}>Legal</p>
        <h1 className="text-[28px] md:text-[34px] font-extrabold text-gray-900 mb-2">{title}</h1>
        <p className="text-[12px] text-gray-400 mb-8">Last updated: {updatedAt}</p>
        {intro && <p className="text-[14px] text-gray-600 leading-relaxed mb-8">{intro}</p>}
        {children}
      </div>

      <footer className="border-t border-gray-100 py-6" style={{ background: "#FAFAF8" }}>
        <div className="max-w-4xl mx-auto px-5 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400">&copy; {new Date().getFullYear()} Movo. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center">
            <Link href="/privacy-policy" className="text-[11px] text-gray-400 hover:text-gray-700">Privacy Policy</Link>
            <Link href="/terms" className="text-[11px] text-gray-400 hover:text-gray-700">Terms &amp; Conditions</Link>
            <Link href="/chauffeur-agreement" className="text-[11px] text-gray-400 hover:text-gray-700">Chauffeur Agreement</Link>
            <Link href="/data-security" className="text-[11px] text-gray-400 hover:text-gray-700">Data Security</Link>
            <Link href="/complaints-policy" className="text-[11px] text-gray-400 hover:text-gray-700">Complaints</Link>
            <Link href="/lost-found-policy" className="text-[11px] text-gray-400 hover:text-gray-700">Lost &amp; Found</Link>
            <Link href="/contact" className="text-[11px] text-gray-400 hover:text-gray-700">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
