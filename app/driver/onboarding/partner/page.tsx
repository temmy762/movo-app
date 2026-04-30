"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TOTAL_STEPS = 9;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 w-full max-w-[260px] mx-auto my-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          {/* Dot */}
          <div
            className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
            style={{
              background:
                i < step
                  ? "linear-gradient(135deg, #2D0A53 0%, #8B7500 100%)"
                  : "#d1d5db",
            }}
          >
            {i < step && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          {/* Connector line */}
          {i < TOTAL_STEPS - 1 && (
            <div
              className="h-[2px] flex-1"
              style={{
                background:
                  i < step - 1
                    ? "linear-gradient(90deg, #2D0A53, #8B7500)"
                    : "#e5e7eb",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[12px] text-gray-500 mb-1">
      {required && <span className="text-red-400 mr-0.5">*</span>}
      {children}
    </label>
  );
}

function TextInput({ placeholder = "" }: { placeholder?: string }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-800 focus:outline-none placeholder-gray-300"
      suppressHydrationWarning
    />
  );
}

function SelectInput({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative" suppressHydrationWarning>
      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-600 focus:outline-none appearance-none bg-white" suppressHydrationWarning>
        {children}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

export default function PartnerOnboardingStep1() {
  const router = useRouter();
  const [_username] = useState("Mohammed");
  const [_city] = useState("California");

  return (
    <div
      className="h-full bg-white flex flex-col"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[480px] px-6">

          {/* Logo */}
          <div className="flex items-center justify-center pt-5">
            <div className="relative w-36 h-36">
              <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-[20px] font-bold text-gray-900 mt-1 text-center">Partner Onboarding</h1>

          {/* Progress bar */}
          <ProgressBar step={1} />

          {/* Welcome */}
          <p className="text-[13px] text-gray-600 mb-1">
            Thank you{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(90deg, #2D0A53, #8B7500)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Mohammed
            </span>{" "}
            for choosing to partner with{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(90deg, #2D0A53, #8B7500)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Movo Privé
            </span>
            .<br />
            You have selected <strong>California</strong> as your primary city of operations.
          </p>

          <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
            Please provide the following mandatory information: Company name, Legal form, Country, City, Street and Postal Code.
          </p>

          {/* ── Company Information ── */}
          <p className="text-[13px] font-bold text-gray-800 mb-3">Company Information</p>

          <div className="flex flex-col gap-3 mb-5">
            <div>
              <FieldLabel>Company Information</FieldLabel>
              <SelectInput>
                <option value="">Select company type</option>
                <option>Sole Proprietorship</option>
                <option>Partnership</option>
                <option>Corporation</option>
                <option>LLC</option>
              </SelectInput>
            </div>

            <div>
              <FieldLabel>Company Type (Legal Form)</FieldLabel>
              <SelectInput>
                <option value="">Select legal form</option>
                <option>Inc.</option>
                <option>Ltd.</option>
                <option>LLC</option>
                <option>GmbH</option>
              </SelectInput>
            </div>
          </div>

          {/* ── Company Address ── */}
          <p className="text-[13px] font-bold text-gray-800 mb-3">Company Address</p>

          <div className="flex flex-col gap-3 mb-5">
            <div>
              <FieldLabel>Country</FieldLabel>
              <SelectInput>
                <option value="">Select country</option>
                <option>Canada</option>
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Nigeria</option>
              </SelectInput>
            </div>

            <div>
              <FieldLabel>Street</FieldLabel>
              <TextInput />
            </div>

            <div>
              <FieldLabel>Zip/Postal code</FieldLabel>
              <TextInput />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>City</FieldLabel>
                <TextInput />
              </div>
              <div>
                <FieldLabel>State/Province</FieldLabel>
                <SelectInput>
                  <option value=""></option>
                  <option>Ontario</option>
                  <option>Quebec</option>
                  <option>British Columbia</option>
                  <option>Alberta</option>
                  <option>California</option>
                  <option>New York</option>
                </SelectInput>
              </div>
            </div>

            <div>
              <FieldLabel required>Tax Identification Number</FieldLabel>
              <TextInput />
            </div>

            <div>
              <FieldLabel required>VAT ID/Number</FieldLabel>
              <TextInput />
            </div>

            <div>
              <FieldLabel required>Business Registration Number</FieldLabel>
              <TextInput />
            </div>
          </div>

          {/* FAQ note */}
          <p className="text-[12px] text-gray-500 mb-5">
            For more information regarding Partner Onboarding, you can visit our FAQ page{" "}
            <Link
              href="#"
              className="font-semibold underline"
              style={{ color: "#2D0A53" }}
            >
              here
            </Link>
          </p>

          {/* Next button */}
          <button
            type="button"
            onClick={() => router.push("/driver/onboarding/partner/fleet")}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide mb-8"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Next
          </button>

        </div>
      </div>
    </div>
  );
}
