"use client";

import { useConsent } from "@/context/ConsentContext";

interface Props {
  /** Render as a plain inline text link (default) or a small pill button */
  variant?: "link" | "pill";
  className?: string;
}

export default function ConsentTrigger({ variant = "link", className = "" }: Props) {
  const { openModal } = useConsent();

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors ${className}`}
        style={{ borderColor: "#2D0A5330", color: "#2D0A53", background: "#f5f0ff" }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
        </svg>
        Privacy &amp; Cookies
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openModal}
      className={`text-[12px] underline font-medium ${className}`}
      style={{ color: "#2D0A53" }}
    >
      Privacy &amp; Cookies
    </button>
  );
}
