"use client";

import { useRouter } from "next/navigation";

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <a href={href}
      className="flex items-center gap-4 py-3.5 border-b border-gray-100 last:border-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-[13px] font-semibold text-gray-800">{value}</p>
      </div>
    </a>
  );
}

export default function HelpPage() {
  const router = useRouter();
  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
            <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-gray-900">Help & Support</h1>
      </header>

      <div className="px-4 pt-5 pb-8 w-full max-w-lg mx-auto">
        <p className="text-[13px] text-gray-500 mb-4">
          Our support team is available 7 days a week. Reach out through any of the channels below.
        </p>

        <div className="bg-white rounded-2xl px-4 shadow-sm mb-5">
          <ContactRow
            href="mailto:support@movoprive.com"
            label="Email"
            value="support@movoprive.com"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2,4 12,13 22,4" /></svg>}
          />
          <ContactRow
            href="tel:+441234567890"
            label="Phone"
            value="+44 123 456 7890"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.1 1.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" /></svg>}
          />
          <ContactRow
            href="https://wa.me/441234567890"
            label="WhatsApp"
            value="Chat with us"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
          />
        </div>

        <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
          <p className="text-[13px] font-bold text-gray-900 mb-1">Support Hours</p>
          <p className="text-[12px] text-gray-500">Monday – Sunday: 8:00 AM – 10:00 PM (GMT)</p>
        </div>
      </div>
    </div>
  );
}
