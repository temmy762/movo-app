"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const TOTAL_STEPS = 4;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full max-w-[260px] mx-auto my-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div
            className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: i < step ? "linear-gradient(135deg, #2D0A53 0%, #8B7500 100%)" : "#d1d5db" }}
          >
            {i < step && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div className="h-[2px] flex-1" style={{ background: i < step - 1 ? "linear-gradient(90deg, #2D0A53, #8B7500)" : "#e5e7eb" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <p className="text-[12px] text-gray-500 mb-1"><span className="text-red-400 mr-0.5">*</span>{label}</p>
      <div className="relative" suppressHydrationWarning>
        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-600 focus:outline-none appearance-none bg-white" suppressHydrationWarning>
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

function TextField({ label }: { label: string }) {
  return (
    <div>
      <p className="text-[12px] text-gray-500 mb-1"><span className="text-red-400 mr-0.5">*</span>{label}</p>
      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-800 focus:outline-none" suppressHydrationWarning />
    </div>
  );
}

const years = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i));
const vehicleClasses = ["First Class", "Business Class", "Business Van", "Economy"];
const colors = ["Black", "White", "Silver", "Grey", "Dark Blue", "Other"];
const brands = ["Mercedes-Benz", "BMW", "Audi", "Lexus", "Cadillac", "Lincoln", "Rolls-Royce", "Bentley"];

export default function VehicleInformationPage() {
  const router = useRouter();

  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[480px] px-6">

          {/* Logo */}
          <div className="flex items-center justify-center pt-5">
            <div className="relative w-36 h-36">
              <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
            </div>
          </div>

          <h1 className="text-[20px] font-bold text-gray-900 mt-1 text-center">Partner Onboarding</h1>
          <ProgressBar step={3} />

          <p className="text-[13px] font-bold text-gray-800 mb-4">First Vehicle Information</p>

          <div className="flex flex-col gap-3 mb-4">
            <SelectField label="Vehicle Year of Manufacture (YOM)" options={years} />
            <SelectField label="Vehicle Brand and Model" options={brands} />

            {/* Class + Color side by side */}
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="Vehicle Class" options={vehicleClasses} />
              <SelectField label="Vehicle Color" options={colors} />
            </div>

            {/* Plate + VIN side by side */}
            <div className="grid grid-cols-2 gap-2">
              <TextField label="License Number Plate" />
              <TextField label="Vehicle VIN" />
            </div>
          </div>

          {/* Review notice */}
          <div className="border border-gray-200 rounded-xl bg-gray-50 px-4 py-3 mb-5">
            <p className="text-[12px] text-gray-600 mb-2">
              Upon clicking <span className="font-semibold">&quot;Next&quot;</span>, the following will be submitted for review:
            </p>
            <ul className="text-[12px] text-gray-500 space-y-0.5 pl-1">
              {["Company information", "Fleet information", "First chauffeurs information", "First vehicles information"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-gray-500 mt-2 font-medium">
              Please verify that the information provided above is correct, as it cannot be changed once submitted.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={() => router.push("/driver/onboarding/partner/fleet")}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] border border-gray-300 text-gray-600"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => router.push("/driver/onboarding/partner/program")}
              className="flex-1 py-3 rounded-xl text-white font-bold text-[14px]"
              style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
            >
              Next
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
