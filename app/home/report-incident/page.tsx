"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const INCIDENT_TYPES = [
  { value: "ACCIDENT",       label: "Accident" },
  { value: "UNSAFE_DRIVING", label: "Unsafe Driving" },
  { value: "HARASSMENT",     label: "Harassment" },
  { value: "VEHICLE_ISSUE",  label: "Vehicle Issue" },
  { value: "ROUTE_DEVIATION",label: "Route Deviation" },
  { value: "OTHER",          label: "Other" },
];

function ReportIncidentContent() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const bookingId   = searchParams.get("bookingId");

  const [type,        setType]        = useState("OTHER");
  const [description, setDescription] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (description.trim().length < 10) {
      setError("Please describe the incident in at least 10 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, type, description: description.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to submit report.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white" style={{ fontFamily: "var(--font-poppins)" }}>
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-[18px] font-bold text-gray-900 mb-2">Report Submitted</p>
        <p className="text-[13px] text-gray-500 text-center mb-6">
          Our team will review your incident report shortly. Thank you for keeping MOVO safe.
        </p>
        <button
          onClick={() => router.back()}
          className="no-hover-fx px-8 py-3 rounded-xl text-white font-semibold text-[14px]"
          style={{ background: "linear-gradient(90deg,#1a1a2e 0%,#2D0A53 50%,#8B7500 100%)" }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-gray-100">
        <button onClick={() => router.back()} className="no-hover-fx w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className="text-[17px] font-bold text-gray-900">Report Incident</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-5 py-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
        {bookingId && (
          <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-[12px] text-blue-700">Linked to booking <span className="font-semibold">#{bookingId.slice(0, 8)}</span></p>
          </div>
        )}

        <div>
          <p className="text-[13px] font-semibold text-gray-700 mb-2">Incident Type</p>
          <div className="grid grid-cols-2 gap-2">
            {INCIDENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className="no-hover-fx py-2.5 px-3 rounded-xl text-[12px] font-medium border transition-all"
                style={type === t.value
                  ? { background: "#2D0A53", color: "white", borderColor: "#2D0A53" }
                  : { background: "white", color: "#374151", borderColor: "#e5e7eb" }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[13px] font-semibold text-gray-700 mb-2">Describe What Happened</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please provide a clear description of the incident, including what happened, when, and any relevant details…"
            rows={6}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-400 resize-none"
          />
          <p className="text-[11px] text-gray-400 mt-1">{description.trim().length} characters (min 10)</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-[12px] text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="no-hover-fx w-full py-3.5 rounded-xl text-white font-bold text-[15px] mt-auto"
          style={{ background: loading ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#2D0A53 50%,#8B7500 100%)" }}
        >
          {loading ? "Submitting…" : "Submit Report"}
        </button>
      </form>
    </div>
  );
}

export default function ReportIncidentPage() {
  return (
    <Suspense>
      <ReportIncidentContent />
    </Suspense>
  );
}
