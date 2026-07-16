"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFleetOnboarding } from "../context";

const TOTAL_STEPS = 9;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full max-w-[260px] mx-auto my-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div
            className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: i < step ? "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" : "#d1d5db" }}
          >
            {i < step && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div className="h-[2px] flex-1" style={{ background: i < step - 1 ? "linear-gradient(90deg, #131936, #C6BFB2)" : "#e5e7eb" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function RadioGroup({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <p className="text-[13px] text-gray-700 mb-2">
        <span className="text-red-400 mr-0.5">*</span>{label}
      </p>
      <div className="flex gap-6">
        {["Yes", "No"].map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer text-[13px] text-gray-700">
            <div
              onClick={() => onChange(opt)}
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer"
              style={{ borderColor: value === opt ? "#131936" : "#d1d5db" }}
            >
              {value === opt && (
                <div className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(135deg, #131936, #C6BFB2)" }} />
              )}
            </div>
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function SelectInput({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (val: string) => void }) {
  return (
    <div className="mb-3">
      <p className="text-[12px] text-gray-500 mb-1"><span className="text-red-400 mr-0.5">*</span>{label}</p>
      <div className="relative" suppressHydrationWarning>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-600 focus:outline-none appearance-none bg-white" suppressHydrationWarning>
          <option value=""></option>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  return (
    <div className="mb-3">
      <p className="text-[12px] text-gray-500 mb-1"><span className="text-red-400 mr-0.5">*</span>{label}</p>
      <input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-800 focus:outline-none" suppressHydrationWarning />
    </div>
  );
}

export default function FleetInformationPage() {
  const router = useRouter();
  const { data, updateData } = useFleetOnboarding();

  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[480px] px-6">

          {/* Logo */}
          <div className="flex items-center justify-center pt-5">
            <div className="relative w-36 h-36">
              <Image src="/images/logo/logo-stacked-navy.svg" alt="MOVO" fill className="object-contain" priority />
            </div>
          </div>

          <h1 className="text-[20px] font-bold text-gray-900 mt-1 text-center">Fleet Partner Onboarding</h1>
          <ProgressBar step={2} />

          <p className="text-[13px] font-bold text-gray-800 mb-1">Fleet Information</p>
          <p className="text-[12px] text-gray-500 mb-4">Please provide the following information about your fleet:</p>

          {/* Fleet size */}
          <SelectInput
            label="What is the total number of chauffeurs you employ"
            options={["1–5", "6–10", "11–20", "21–50", "50+"]}
            value={data.fleetSize}
            onChange={(val) => updateData({ fleetSize: val })}
          />

          {/* Fleet description */}
          <div className="mb-6">
            <p className="text-[12px] text-gray-500 mb-1"><span className="text-red-400 mr-0.5">*</span>Describe your fleet's vehicles briefly (brand, model, year)</p>
            <textarea
              rows={3}
              value={data.vehicleDescriptions}
              onChange={(e) => updateData({ vehicleDescriptions: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-800 focus:outline-none resize-none"
              suppressHydrationWarning
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={() => router.push("/driver/onboarding/partner")}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] border border-gray-300 text-gray-600"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => router.push("/driver/onboarding/partner/vehicle")}
              className="flex-1 py-3 rounded-xl text-white font-bold text-[14px]"
              style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
            >
              Next
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
