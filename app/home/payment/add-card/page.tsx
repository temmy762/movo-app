"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const gradientBorder = {
  background:
    "linear-gradient(white, white) padding-box, linear-gradient(135deg, #2D0A53 0%, #8B7500 100%) border-box",
  border: "1.5px solid transparent",
};

function CardField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3 py-2.5 rounded-lg text-[13px] text-gray-800 placeholder-gray-300 focus:outline-none"
        style={gradientBorder}
      />
    </div>
  );
}

export default function AddCardPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  function formatCardNumber(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* White card */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-gray-100 relative">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-5 no-hover-fx"
            aria-label="Go back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[18px] font-bold text-gray-900">Add credit card</h1>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col items-center px-5 py-6">
          <div className="w-full max-w-xs flex flex-col gap-4">
          <CardField
            label="Full Name"
            value={fullName}
            onChange={setFullName}
            placeholder="CARDHOLDER"
          />
          <CardField
            label="Number"
            value={number}
            onChange={(v) => setNumber(formatCardNumber(v))}
            placeholder="•••• •••• •••• ••••"
            maxLength={19}
          />
          <CardField
            label="Expiration Date"
            value={expiry}
            onChange={(v) => setExpiry(formatExpiry(v))}
            placeholder="MM/YY"
            maxLength={5}
          />
          <CardField
            label="CVV"
            value={cvv}
            onChange={setCvv}
            placeholder="•••"
            type="password"
            maxLength={4}
          />
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center px-5 pb-7">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full max-w-xs py-3 rounded-xl text-white font-bold text-[14px]"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Add credit card
          </button>
        </div>
      </div>
    </div>
  );
}
