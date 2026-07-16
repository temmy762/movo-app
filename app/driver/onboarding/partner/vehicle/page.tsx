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

function SelectField({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (val: string) => void }) {
  return (
    <div>
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

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  return (
    <div>
      <p className="text-[12px] text-gray-500 mb-1"><span className="text-red-400 mr-0.5">*</span>{label}</p>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-800 focus:outline-none" suppressHydrationWarning />
    </div>
  );
}

const years = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i));
const vehicleClasses = ["Economy (Standard)", "Premium (Executive)", "First Class (Concierge)"];
const colors = ["Black", "White", "Silver", "Grey", "Dark Blue", "Other"];
const brands = ["Mercedes-Benz", "BMW", "Audi", "Lexus", "Cadillac", "Lincoln", "Rolls-Royce", "Bentley"];

export default function VehicleInformationPage() {
  const router = useRouter();
  const { data, updateData } = useFleetOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    
    // Validate only fields that belong to this step (vehicle & first chauffeur)
    const requiredFields = [
      { key: "firstVehicleYear", label: "Vehicle Year" },
      { key: "firstVehicleBrand", label: "Vehicle Brand" },
      { key: "firstVehicleClass", label: "Vehicle Class" },
      { key: "firstVehicleColor", label: "Vehicle Color" },
      { key: "firstVehiclePlate", label: "License Plate" },
      { key: "firstVehicleVin", label: "Vehicle VIN" },
      { key: "firstChauffeurFirstName", label: "Chauffeur First Name" },
      { key: "firstChauffeurLastName", label: "Chauffeur Last Name" },
      { key: "firstChauffeurEmail", label: "Chauffeur Email" },
      { key: "firstChauffeurPhone", label: "Chauffeur Phone" },
    ];

    const missing = requiredFields.filter((field) => !data[field.key as keyof typeof data]);
    if (missing.length > 0) {
      setError(`Missing required fields: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/driver/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FLEET",
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save onboarding");
        return;
      }

      // Success - redirect to next step (program/training)
      router.push("/driver/onboarding/partner/program");
    } catch (err) {
      console.error("Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <ProgressBar step={3} />

          <p className="text-[13px] font-bold text-gray-800 mb-4">First Vehicle & Chauffeur Information</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[12px] text-red-600">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-4">
            <SelectField 
              label="Vehicle Year of Manufacture (YOM)" 
              options={years}
              value={data.firstVehicleYear}
              onChange={(val) => updateData({ firstVehicleYear: val })}
            />
            <SelectField 
              label="Vehicle Brand and Model" 
              options={brands}
              value={data.firstVehicleBrand}
              onChange={(val) => updateData({ firstVehicleBrand: val, firstVehicleModel: val })}
            />

            {/* Class + Color side by side */}
            <div className="grid grid-cols-2 gap-2">
              <SelectField 
                label="Vehicle Class" 
                options={vehicleClasses}
                value={data.firstVehicleClass}
                onChange={(val) => updateData({ firstVehicleClass: val })}
              />
              <SelectField 
                label="Vehicle Color" 
                options={colors}
                value={data.firstVehicleColor}
                onChange={(val) => updateData({ firstVehicleColor: val })}
              />
            </div>

            {/* Plate + VIN side by side */}
            <div className="grid grid-cols-2 gap-2">
              <TextField 
                label="License Number Plate"
                value={data.firstVehiclePlate}
                onChange={(val) => updateData({ firstVehiclePlate: val })}
              />
              <TextField 
                label="Vehicle VIN"
                value={data.firstVehicleVin}
                onChange={(val) => updateData({ firstVehicleVin: val })}
              />
            </div>
          </div>

          {/* Chauffeur Information */}
          <p className="text-[13px] font-bold text-gray-800 mb-4 mt-6">First Chauffeur Information</p>

          <div className="flex flex-col gap-3 mb-4">
            <TextField 
              label="Chauffeur First Name"
              value={data.firstChauffeurFirstName}
              onChange={(val) => updateData({ firstChauffeurFirstName: val })}
            />
            <TextField 
              label="Chauffeur Last Name"
              value={data.firstChauffeurLastName}
              onChange={(val) => updateData({ firstChauffeurLastName: val })}
            />
            <TextField 
              label="Chauffeur Email"
              value={data.firstChauffeurEmail}
              onChange={(val) => updateData({ firstChauffeurEmail: val })}
            />
            <TextField 
              label="Chauffeur Phone"
              value={data.firstChauffeurPhone}
              onChange={(val) => updateData({ firstChauffeurPhone: val })}
            />
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
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] border border-gray-300 text-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
            >
              {isSubmitting ? "Saving..." : "Next →"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
