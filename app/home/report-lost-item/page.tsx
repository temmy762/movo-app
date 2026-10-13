"use client";

/* Customer: report an item left behind on a ride. Linked to the booking so
   support can find it by its MOVO-B reference. */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ReportLostItemContent() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params.get("bookingId");
  const bookingNumber = params.get("ref");

  const [item, setItem]       = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (item.trim().length < 3) { setError("Please describe the item."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/lost-found", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, itemDescription: item.trim(), contactInfo: contact.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Couldn't submit your report. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white text-center" style={{ fontFamily: "var(--font-body)" }}>
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 className="text-[20px] font-bold text-gray-900 mb-2">Report received</h1>
        <p className="text-[13px] text-gray-500 max-w-xs">We&apos;ve logged your lost item{bookingNumber ? ` against booking ${bookingNumber}` : ""}. Our team will contact you if it&apos;s found.</p>
        <button type="button" onClick={() => router.push("/home/rides")}
          className="mt-6 px-6 py-3 rounded-full text-white font-bold text-[14px]" style={{ background: "#131936" }}>
          Back to my rides
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-body)" }}>
      <div className="w-full max-w-lg mx-auto px-5 pt-6 pb-10">
        <button type="button" onClick={() => router.back()} className="no-hover-fx flex items-center gap-1 text-[14px] text-gray-500 mb-5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>
        <h1 className="text-[22px] font-bold text-gray-900">Report a lost item</h1>
        {bookingNumber && <p className="text-[12px] font-mono text-gray-500 mt-1">Booking {bookingNumber}</p>}
        <form onSubmit={submit} className="flex flex-col gap-4 mt-6">
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">What did you leave behind? *</label>
            <textarea value={item} onChange={e => setItem(e.target.value.slice(0, 500))} rows={4}
              placeholder="e.g. Black leather wallet, left on the back seat"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-[14px] focus:outline-none focus:border-[#131936] resize-none" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Best way to reach you (optional)</label>
            <input value={contact} onChange={e => setContact(e.target.value.slice(0, 120))} placeholder="Phone or email"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-[14px] focus:outline-none focus:border-[#131936]" />
          </div>
          {error && <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-full text-white font-bold text-[15px] disabled:opacity-60" style={{ background: "#0A0A0F" }}>
            {loading ? "Submitting…" : "Submit report"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ReportLostItemPage() {
  return <Suspense><ReportLostItemContent /></Suspense>;
}
