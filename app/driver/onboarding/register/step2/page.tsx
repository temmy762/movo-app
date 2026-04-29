"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const hearAboutOptions = [
  "Social Media", "Friend / Referral", "Google Search", "Radio / TV", "Other",
];

const representOptions = [
  "Individual Driver", "Fleet Owner", "Corporate Partner", "Logistics Company",
];

const countryCodes = [
  { code: "+1", flag: "🇨🇦", label: "CA +1" },
  { code: "+1us", flag: "🇺🇸", label: "US +1" },
  { code: "+44", flag: "🇬🇧", label: "UK +44" },
  { code: "+234", flag: "🇳🇬", label: "NG +234" },
];

function IconInput({
  icon,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-3 border border-gray-300 rounded-lg px-4 py-2.5">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="flex-1 focus:outline-none text-[14px] text-gray-800 placeholder-gray-300"
      />
    </div>
  );
}

function SelectRow({
  icon,
  placeholder,
  options,
}: {
  icon: React.ReactNode;
  placeholder: string;
  options: string[];
}) {
  const [value, setValue] = useState("");
  return (
    <div className="relative">
      <div className="flex items-center gap-3 border border-gray-300 rounded-lg px-4 py-2.5">
        <span className="text-gray-400 shrink-0">{icon}</span>
        <span className={`flex-1 text-[14px] ${value ? "text-gray-800" : "text-gray-300"}`}>
          {value || placeholder}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const PersonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="2,4 12,13 22,4" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 22V12h6v10" />
  </svg>
);

export default function DriverRegisterStep2Page() {
  const router = useRouter();
  const [dialCode, setDialCode] = useState("+1");

  const selectedDial = countryCodes.find((c) => c.code === dialCode);

  return (
    <div
      className="h-full bg-white flex flex-col"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[420px] px-8">

          {/* Logo */}
          <div className="flex items-center justify-center pt-6">
            <div className="relative w-44 h-44">
              <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
            </div>
          </div>

          {/* Title */}
          <div className="mt-2 mb-5">
            <h1 className="text-[20px] font-bold text-gray-900">Register</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">Enter your detail to create an account</p>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3">

            <IconInput icon={<PersonIcon />} placeholder="First Name" />
            <IconInput icon={<PersonIcon />} placeholder="Last Name" />
            <IconInput icon={<MailIcon />} placeholder="Email" type="email" />

            {/* Country code + phone */}
            <div className="flex gap-2">
              <div className="relative shrink-0 w-[110px]">
                <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2.5 h-full">
                  <span className="text-[13px] text-gray-700">
                    {selectedDial?.flag} {selectedDial?.code === "+1us" ? "+1" : selectedDial?.code}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <select
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                >
                  {countryCodes.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5">
                <input
                  type="tel"
                  placeholder="Phone number"
                  className="w-full focus:outline-none text-[14px] text-gray-800 placeholder-gray-300"
                />
              </div>
            </div>

            <SelectRow
              icon={<PersonIcon />}
              placeholder="Where did you hear about us?"
              options={hearAboutOptions}
            />

            <SelectRow
              icon={<BuildingIcon />}
              placeholder="Tell us who you represent to get started"
              options={representOptions}
            />

          </div>

          {/* Next */}
          <button
            type="button"
            onClick={() => router.push("/driver/onboarding/set-password")}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide mt-6"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Next
          </button>

          <p className="text-center text-[13px] text-gray-500 mt-4 pb-8">
            Already have an account?{" "}
            <Link
              href="/driver/onboarding/login"
              className="font-semibold"
              style={{ color: "#2D0A53" }}
            >
              Log In
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
