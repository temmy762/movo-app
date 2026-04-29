"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const countries = [
  { code: "CA", flag: "🇨🇦", label: "Canada" },
  { code: "US", flag: "🇺🇸", label: "United States" },
  { code: "GB", flag: "🇬🇧", label: "United Kingdom" },
  { code: "NG", flag: "🇳🇬", label: "Nigeria" },
];

const cities: Record<string, string[]> = {
  CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Miami"],
  GB: ["London", "Manchester", "Birmingham", "Edinburgh"],
  NG: ["Lagos", "Abuja", "Port Harcourt", "Kano"],
};

export default function DriverRegisterStep1Page() {
  const router = useRouter();
  const [country, setCountry] = useState("CA");
  const [city, setCity] = useState("");

  const selectedCountry = countries.find((c) => c.code === country);
  const availableCities = cities[country] || [];

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
          <div className="mt-2 mb-6">
            <h1 className="text-[20px] font-bold text-gray-900">Register</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">Enter your detail to create an account</p>
          </div>

          {/* Country dropdown */}
          <div className="relative mb-3">
            <div className="flex items-center justify-between border border-gray-300 rounded-lg px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-[18px]">{selectedCountry?.flag}</span>
                <span className="text-[14px] text-gray-700">
                  {selectedCountry?.label || "Select Country"}
                </span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <select
              value={country}
              onChange={(e) => { setCountry(e.target.value); setCity(""); }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* City dropdown */}
          <div className="relative mb-6">
            <div className="flex items-center justify-between border border-gray-300 rounded-lg px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-[18px]">{selectedCountry?.flag}</span>
                <span className={`text-[14px] ${city ? "text-gray-700" : "text-gray-400"}`}>
                  {city || "Select City"}
                </span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              <option value="">Select City</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Next button */}
          <button
            type="button"
            onClick={() => router.push("/driver/onboarding/register/step2")}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Next
          </button>

          {/* Already have account */}
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
