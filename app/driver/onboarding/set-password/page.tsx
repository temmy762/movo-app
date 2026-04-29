"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function PasswordField({
  label,
  indicator,
  indicatorColor,
}: {
  label: string;
  indicator?: string;
  indicatorColor?: string;
}) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div>
      <label className="block text-[12px] text-gray-500 mb-1">{label}</label>
      <div className="flex items-center border border-gray-300 rounded-lg px-4 py-2.5 relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 focus:outline-none text-[14px] text-gray-800 pr-16"
        />
        {indicator && value.length > 0 && (
          <span
            className="absolute right-10 text-[11px] font-semibold"
            style={{ color: indicatorColor }}
          >
            {indicator}
          </span>
        )}
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="no-hover-fx absolute right-3 text-gray-400"
        >
          {show ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function DriverSetPasswordPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center justify-start px-8 pt-10"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="w-full max-w-[420px]">

        {/* Title */}
        <h1 className="text-[20px] font-bold text-gray-900 text-center mb-1">
          Change Your Password
        </h1>

        {/* Instruction */}
        <p className="text-[13px] text-gray-500 text-center mb-1">
          Enter a new password for{" "}
          <span
            className="font-medium"
            style={{
              background: "linear-gradient(90deg, #2D0A53, #8B7500)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            driver@example.com
          </span>
          . Make sure to include at least:
        </p>

        {/* Requirements */}
        <ul className="text-[12px] text-gray-600 mb-6 space-y-1 pl-2">
          {["8 characters", "1 letter", "1 number", "1 special character"].map((req) => (
            <li key={req} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-800 shrink-0" />
              {req}
            </li>
          ))}
        </ul>

        {/* Password fields */}
        <div className="flex flex-col gap-4 mb-2">
          <PasswordField
            label="*New Password"
            indicator="Good"
            indicatorColor="#2D0A53"
          />
          <PasswordField
            label="*Confirm New Password"
            indicator="Match"
            indicatorColor="#8B7500"
          />
        </div>

        <p className="text-[11px] text-gray-400 mb-6">*required</p>

        {/* Change Password button */}
        <button
          type="button"
          onClick={() => router.push("/driver/onboarding/login")}
          className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide"
          style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
        >
          Change Password
        </button>

      </div>
    </div>
  );
}
