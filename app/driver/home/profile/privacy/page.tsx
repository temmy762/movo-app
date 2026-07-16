"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPolicyPage() {
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
        <h1 className="text-[18px] font-bold text-gray-900">Privacy Policy</h1>
      </header>
      <div className="px-4 pt-5 pb-10 w-full max-w-lg mx-auto space-y-4 text-[13px] text-gray-600 leading-relaxed">
        <p className="text-[15px] font-bold text-gray-900">Privacy Policy</p>
        <p>At Movo, we are committed to protecting your personal data in accordance with the UK General Data Protection Regulation (UK GDPR).</p>

        <p className="font-semibold text-gray-800">1. Data We Collect</p>
        <p>We collect your name, email address, phone number, vehicle details, location data, and ride history to provide and improve our services.</p>

        <p className="font-semibold text-gray-800">2. How We Use Your Data</p>
        <p>Your data is used to match you with ride requests, process payments, provide customer support, and comply with legal obligations.</p>

        <p className="font-semibold text-gray-800">3. Data Sharing</p>
        <p>We share your data with passengers only as necessary for completing rides. We do not sell your personal data to third parties.</p>

        <p className="font-semibold text-gray-800">4. Data Retention</p>
        <p>We retain your personal data for as long as your account is active or as required by law. You may request deletion at any time.</p>

        <p className="font-semibold text-gray-800">5. Your Rights</p>
        <p>You have the right to access, correct, or delete your data. Contact us at <a href="mailto:privacy@movoprive.com" className="underline">privacy@movoprive.com</a> to exercise your rights.</p>

        <p className="text-[11px] text-gray-400">Last updated: January 2025</p>
      </div>
    </div>
  );
}
