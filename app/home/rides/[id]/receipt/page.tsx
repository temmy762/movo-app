"use client";

/* Downloadable ride receipt. "Download PDF" uses the device's own
   print-to-PDF (iPhone/Android/desktop), so the saved file is exactly this
   page; "Email me this receipt" re-sends it to the account email. */

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";

type Receipt = {
  bookingId: string; bookingNumber: string | null; receiptNumber: string | null;
  service: string; status: string; paymentStatus: string;
  customerName: string; customerEmail: string | null;
  pickup: string; dropoff: string; stops: string[];
  chauffeur: string | null; vehicle: string | null;
  bookedAt: string; startedAt: string | null; completedAt: string | null;
  items: { label: string; amount: number }[]; total: number; card: string;
};

const money = (n: number) => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;

function ReceiptContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [r, setR] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailState, setEmailState] = useState<{ sending: boolean; msg: string | null; ok?: boolean }>({ sending: false, msg: null });

  useEffect(() => {
    fetch(`/api/bookings/${id}/receipt`, { cache: "no-store" })
      .then(async (res) => {
        const d = await res.json().catch(() => null);
        if (!res.ok) throw new Error(d?.error ?? "Couldn't load your receipt");
        setR(d);
        /* The saved PDF is named after the receipt */
        if (d?.receiptNumber) document.title = `Movo receipt ${d.receiptNumber}`;
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load your receipt"));
  }, [id]);

  const emailIt = async () => {
    setEmailState({ sending: true, msg: null });
    const res = await fetch(`/api/bookings/${id}/receipt`, { method: "POST" }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setEmailState(res?.ok
      ? { sending: false, ok: true, msg: `Sent to ${d?.sentTo}. Check your inbox (and spam).` }
      : { sending: false, ok: false, msg: d?.error ?? "Couldn't send the email. Please try again." });
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white">
        <p className="text-[15px] font-bold text-gray-900 mb-2">Receipt unavailable</p>
        <p className="text-[13px] text-gray-500 mb-5">{error}</p>
        <button type="button" onClick={() => router.back()} className="no-hover-fx text-[13px] font-semibold underline text-gray-700">Back</button>
      </div>
    );
  }
  if (!r) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-6 h-6 border-2 border-gray-200 border-t-[#131936] rounded-full animate-spin" />
      </div>
    );
  }

  const refunded = r.paymentStatus === "REFUNDED";

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white py-6 px-4 print:p-0" style={{ fontFamily: "var(--font-body)" }}>
      {/* Actions — not part of the PDF */}
      <div className="max-w-xl mx-auto mb-4 print:hidden">
        <button type="button" onClick={() => router.back()}
          className="no-hover-fx flex items-center gap-1 text-[14px] text-gray-500 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => window.print()}
            className="no-hover-fx py-3 rounded-full text-white font-bold text-[14px] flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Download PDF
          </button>
          <button type="button" onClick={emailIt} disabled={emailState.sending}
            className="no-hover-fx py-3 rounded-full font-bold text-[14px] border border-gray-300 bg-white text-gray-800 disabled:opacity-60">
            {emailState.sending ? "Sending…" : "Email me this receipt"}
          </button>
        </div>
        {emailState.msg && (
          <p className={`text-[12px] mt-2 text-center ${emailState.ok ? "text-green-700" : "text-red-600"}`}>{emailState.msg}</p>
        )}
        <p className="text-[11px] text-gray-400 mt-2 text-center">
          &ldquo;Download PDF&rdquo; opens your device&apos;s save/print screen — choose &ldquo;Save as PDF&rdquo;.
        </p>
      </div>

      {/* The receipt */}
      <div className="max-w-xl mx-auto bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none p-7 md:p-9">
        <div className="flex items-start justify-between gap-4 mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/email-logo-static.png" alt="MOVO" className="h-14 w-auto" />
          <div className="text-right">
            <p className="text-[20px] font-bold text-gray-900 leading-tight">{refunded ? "Receipt — refunded" : "Receipt"}</p>
            {r.receiptNumber && <p className="text-[12px] font-mono text-gray-600 mt-1">{r.receiptNumber}</p>}
            {r.bookingNumber && <p className="text-[11px] font-mono text-gray-400">Booking {r.bookingNumber}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-[12px] mb-6">
          <div>
            <p className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold mb-1">Billed to</p>
            <p className="text-gray-900 font-semibold">{r.customerName}</p>
            {r.customerEmail && <p className="text-gray-500 break-all">{r.customerEmail}</p>}
          </div>
          <div className="text-right">
            <p className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold mb-1">Date</p>
            <p className="text-gray-900">{r.completedAt ?? r.bookedAt}</p>
            <p className="text-gray-500">{r.service}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-5 text-[12px]">
          <p className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold mb-2">Trip</p>
          <p className="text-gray-800"><span className="text-gray-400">From </span>{r.pickup}</p>
          {r.stops.map((s, i) => (
            <p key={`${i}-${s}`} className="text-gray-800"><span className="text-gray-400">Stop {i + 1} </span>{s}</p>
          ))}
          <p className="text-gray-800"><span className="text-gray-400">To </span>{r.dropoff}</p>
          {(r.chauffeur || r.vehicle) && (
            <p className="text-gray-500 mt-2">
              {r.chauffeur ? `Chauffeur: ${r.chauffeur}` : ""}{r.chauffeur && r.vehicle ? " · " : ""}{r.vehicle ? `Vehicle: ${r.vehicle}` : ""}
            </p>
          )}
          <p className="text-gray-500">
            Booked {r.bookedAt}{r.startedAt ? ` · Started ${r.startedAt}` : ""}{r.completedAt ? ` · Completed ${r.completedAt}` : ""}
          </p>
        </div>

        <div className="border-t border-gray-100 pt-4">
          {r.items.map((it) => (
            <div key={it.label} className="flex justify-between text-[13px] py-1">
              <span className="text-gray-600">{it.label}</span>
              <span className="text-gray-900">{money(it.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[15px] font-bold border-t border-gray-200 mt-2 pt-3">
            <span>Total (CAD)</span>
            <span>{money(r.total)}</span>
          </div>
          <p className="text-[12px] text-gray-500 mt-2">
            {refunded ? "Refunded to" : "Paid with"} {r.card}
          </p>
        </div>

        <div className="border-t border-gray-100 mt-7 pt-4 text-[11px] text-gray-400 leading-relaxed">
          <p>Movo Privé · Winnipeg, Manitoba · movoprive.com</p>
          <p>Questions about this receipt? support@movoprive.com</p>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense>
      <ReceiptContent />
    </Suspense>
  );
}
