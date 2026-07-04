"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function ReportFoundItemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "";

  const [itemDescription, setItemDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!itemDescription.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/lost-found", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: bookingId || undefined, itemDescription, contactInfo: contactInfo || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to submit");
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: "var(--font-body)" }}>
      <header className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <button className="no-hover-fx" onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <p className="text-[15px] font-bold text-gray-900">Report Found Item</p>
      </header>

      <div className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">
        {submitted ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-[15px] font-bold text-gray-900 mb-1">Report submitted</p>
            <p className="text-[13px] text-gray-500 mb-6">Thanks — our team will match this against any lost-item reports.</p>
            <button type="button" onClick={() => router.push("/driver/home")} className="w-full py-3 rounded-xl text-white font-bold text-[14px]" style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>Done</button>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-gray-500 mb-4">Found something in your vehicle after a ride? Let us know so we can reunite it with its owner.</p>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Item Description</label>
            <textarea value={itemDescription} onChange={e => setItemDescription(e.target.value)} rows={3}
              placeholder="e.g. Black leather wallet, navy scarf…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#131936] resize-none mb-3" />
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Your Contact Info (optional)</label>
            <input value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="Best way to reach you"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#131936] mb-4" />
            {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
            <button type="button" onClick={submit} disabled={!itemDescription.trim() || submitting}
              className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#0A0A0F,#131936,#2A3055)" }}>
              {submitting ? "Submitting…" : "Submit Report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReportFoundItemPage() {
  return (
    <Suspense>
      <ReportFoundItemContent />
    </Suspense>
  );
}
