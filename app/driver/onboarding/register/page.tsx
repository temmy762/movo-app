"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const countries = [
  { code: "CA", flag: "🇨🇦", label: "Canada" },
];

const cities: Record<string, string[]> = {
  CA: ["Winnipeg"],
};

export default function DriverRegisterStep1Page() {
  const router = useRouter();
  const [country, setCountry] = useState("CA");
  const [city, setCity] = useState("Winnipeg");

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

          {/* Location display (read-only) */}
          <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-[11px] text-gray-500 font-medium mb-2">Service Location</p>
            <div className="flex items-center gap-2">
              <span className="text-[18px]">{selectedCountry?.flag}</span>
              <span className="text-[14px] font-semibold text-gray-700">
                {city}, {selectedCountry?.label}
              </span>
            </div>
          </div>

          {/* Next button */}
          <button
            type="button"
            onClick={() => {
              if (!city) return;
              const params = new URLSearchParams({ country, city });
              router.push(`/driver/onboarding/register/step2?${params.toString()}`);
            }}
            disabled={!city}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-60"
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
