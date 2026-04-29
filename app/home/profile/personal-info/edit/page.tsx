"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const gradientBorder = {
  background:
    "linear-gradient(white, white) padding-box, linear-gradient(135deg, #2D0A53 0%, #8B7500 100%) border-box",
  border: "1.5px solid transparent",
};

function Field({
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-lg text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none"
      style={gradientBorder}
    />
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg text-[13px] text-gray-800 focus:outline-none appearance-none"
        style={gradientBorder}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

const titles = [
  { label: "Mr.", value: "mr" },
  { label: "Mrs.", value: "mrs" },
  { label: "Ms.", value: "ms" },
  { label: "Dr.", value: "dr" },
];

const countryCodes = [
  { label: "US +1", value: "us" },
  { label: "UK +44", value: "uk" },
  { label: "NG +234", value: "ng" },
  { label: "CA +1", value: "ca" },
];

const countries = [
  { label: "USA", value: "usa" },
  { label: "United Kingdom", value: "uk" },
  { label: "Nigeria", value: "ng" },
  { label: "Canada", value: "ca" },
];

export default function EditPersonalInfoPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("us");
  const [mobile, setMobile] = useState("");
  const [company, setCompany] = useState("");
  const [street, setStreet] = useState("");
  const [postCode, setPostCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("usa");

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="no-hover-fx"
            aria-label="Go back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="text-[18px] font-bold text-gray-900">Personal information</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="no-hover-fx"
            aria-label="Save"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
        <div
          className="h-[2px] mt-2"
          style={{ background: "linear-gradient(90deg, #2D0A53 0%, #8B7500 100%)" }}
        />
      </div>

      {/* 3-card grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 px-3 py-4">

        {/* Left card */}
        <div className="hidden md:block rounded-2xl bg-white" />

        {/* Center card */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-5 flex flex-col gap-5 overflow-y-auto">

          {/* Contact details */}
          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-bold text-gray-900">Contact details</p>
            <SelectField
              value={title}
              onChange={setTitle}
              options={titles}
              placeholder="TITLE"
            />
            <Field placeholder="FIRST NAME" value={firstName} onChange={setFirstName} />
            <Field placeholder="LAST NAME" value={lastName} onChange={setLastName} />
            <Field placeholder="EMAIL" value={email} onChange={setEmail} type="email" />
            {/* Country code + mobile */}
            <div className="flex gap-2">
              <div className="w-[110px] shrink-0">
                <SelectField
                  value={countryCode}
                  onChange={setCountryCode}
                  options={countryCodes}
                  placeholder="CODE"
                />
              </div>
              <div className="flex-1">
                <Field placeholder="MOBILE NUMBER" value={mobile} onChange={setMobile} type="tel" />
              </div>
            </div>
          </div>

          {/* Billing address */}
          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-bold text-gray-900">Billing address</p>
            <Field placeholder="COMPANY" value={company} onChange={setCompany} />
            <Field placeholder="STREET" value={street} onChange={setStreet} />
            <Field placeholder="POST CODE" value={postCode} onChange={setPostCode} />
            <Field placeholder="CITY" value={city} onChange={setCity} />
            <SelectField
              value={country}
              onChange={setCountry}
              options={countries}
              placeholder="SELECT COUNTRY"
            />
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] mt-2"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Save changes
          </button>
        </div>

        {/* Right card */}
        <div className="hidden md:block rounded-2xl bg-white" />

      </div>
    </div>
  );
}
