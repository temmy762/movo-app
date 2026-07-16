"use client";

import { useRouter } from "next/navigation";

export default function LegalNoticePage() {
  const router = useRouter();
  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
            <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-gray-900">Legal Notice</h1>
      </header>
      <div className="px-4 pt-5 pb-10 w-full max-w-lg mx-auto space-y-4 text-[13px] text-gray-600 leading-relaxed">
        <p className="text-[15px] font-bold text-gray-900">Movo — Legal Notice</p>
        <p>Movo is operated by Movo Ltd, a company registered in England and Wales.</p>
        <p><strong>Registered Address:</strong> 123 Example Street, London, EC1A 1BB, United Kingdom</p>
        <p><strong>Company Number:</strong> 12345678</p>
        <p><strong>VAT Number:</strong> GB 123 456 789</p>
        <p>All content on this platform, including text, graphics, logos, and software, is the property of Movo Ltd and is protected by applicable intellectual property laws.</p>
        <p>Use of this platform constitutes acceptance of our Terms & Conditions and Privacy Policy. Unauthorised use of this platform may give rise to a claim for damages.</p>
        <p>For legal enquiries, please contact: <a href="mailto:legal@movoprive.com" className="underline">legal@movoprive.com</a></p>
        <p className="text-[11px] text-gray-400">Last updated: January 2025</p>
      </div>
    </div>
  );
}
