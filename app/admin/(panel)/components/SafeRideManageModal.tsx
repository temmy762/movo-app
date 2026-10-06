"use client";

import { useState } from "react";

/* Admin view of one Safe Ride: internal price breakdown, the chauffeur's
   return leg (Uber or Support Chauffeur), and recording the Uber Dispatch
   booked in Uber Central. */

export type SafeRideAdminBooking = {
  id: string;
  clientName: string;
  pickup: string;
  dropoff: string;
  status: string;
  fare: number;
  gst: number | null;
  total: number;
  waitingFee: number | null;
  careServicePortion: number | null;
  careReturnAllowance: number | null;
  chauffeurPayout: number | null;
  returnMode: string | null;
  uberReturnRef: string | null;
  uberReturnCost: number | null;
  uberReturnBookedAt: string | null;
  careAssignments: { id: string; role: "PRIMARY" | "SUPPORT"; status: string; driver: { firstName: string; lastName: string; phone: string | null } | null }[];
};

const money = (n: number | null | undefined) => (n == null ? "—" : `$${n.toFixed(2)}`);

export function needsUberBooking(b: SafeRideAdminBooking): boolean {
  return b.returnMode === "UBER" && !b.uberReturnBookedAt &&
    b.careAssignments.some(a => a.role === "PRIMARY" && a.status === "AWAITING_RETURN");
}

export default function SafeRideManageModal({ booking, onClose, onChanged }: {
  booking: SafeRideAdminBooking;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [uberRef,  setUberRef]  = useState(booking.uberReturnRef ?? "");
  const [uberCost, setUberCost] = useState(booking.uberReturnCost != null ? String(booking.uberReturnCost) : "");
  const [busy,  setBusy]  = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const primary  = booking.careAssignments.find(a => a.role === "PRIMARY" && a.status !== "CANCELLED" && a.status !== "PENDING");
  const awaiting = primary?.status === "AWAITING_RETURN";
  const closed   = booking.status === "CANCELLED";
  const isUber   = booking.returnMode === "UBER";

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch("/api/admin/care", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, action, ...extra }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d?.error || `Action failed (${res.status})`);
        return;
      }
      onChanged();
    } catch (e) {
      setError(e instanceof Error && e.name === "AbortError" ? "Request timed out — please try again." : "Network error — please try again.");
    } finally {
      clearTimeout(timeout);
      setBusy(null);
    }
  };

  /* Margin: service portion − payout + (allowance − actual Uber cost) */
  const service   = booking.careServicePortion;
  const allowance = booking.careReturnAllowance;
  const margin = service != null && booking.chauffeurPayout != null
    ? service - booking.chauffeurPayout + (allowance ?? 0) - (booking.uberReturnCost ?? 0)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">Safe Ride · {booking.clientName}</h3>
            <p className="text-[11px] font-mono text-gray-400">{booking.id}</p>
          </div>
          <button onClick={onClose} className="no-hover-fx text-gray-400 text-[18px] leading-none">×</button>
        </div>

        {/* Price breakdown (customer only ever sees the single fare) */}
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-[12px] mb-4">
          <p className="font-bold text-gray-500 mb-2">Price breakdown</p>
          {service == null ? (
            <p className="text-gray-500">Booked before the Safe Ride pricing engine — fare {money(booking.fare)}, total {money(booking.total)}.</p>
          ) : (
            <>
              <div className="flex justify-between"><span className="text-gray-500">Service portion</span><span className="font-medium">{money(service)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Return Logistics Allowance</span><span className="font-medium">{money(allowance)}</span></div>
              {!!booking.waitingFee && <div className="flex justify-between"><span className="text-gray-500">Waiting time</span><span className="font-medium">{money(booking.waitingFee)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">GST</span><span className="font-medium">{money(booking.gst)}</span></div>
              <div className="h-px bg-gray-200 my-1" />
              <div className="flex justify-between font-bold"><span>Customer paid</span><span>{money(booking.total)}</span></div>
              <div className="flex justify-between mt-2"><span className="text-gray-500">Chauffeur payout (locked)</span><span className="font-medium">{money(booking.chauffeurPayout)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Actual Uber return cost</span><span className="font-medium">{money(booking.uberReturnCost)}</span></div>
              <div className="flex justify-between font-semibold"><span>Movo margin{booking.uberReturnCost == null ? " (before Uber cost)" : ""}</span><span>{money(margin)}</span></div>
            </>
          )}
        </div>

        {/* Return method */}
        {!closed && (
          <div className="mb-4">
            <p className="text-[12px] font-bold text-gray-700 mb-2">Chauffeur return</p>
            <div className="flex gap-2">
              {(["UBER", "SUPPORT"] as const).map(m => (
                <button key={m} type="button"
                  disabled={!!busy || booking.returnMode === m || (m === "SUPPORT" && !!booking.uberReturnBookedAt)}
                  onClick={() => act("set_return_mode", { returnMode: m })}
                  className="no-hover-fx flex-1 py-2 rounded-xl text-[12px] font-semibold border disabled:opacity-60"
                  style={booking.returnMode === m
                    ? { background: "#131936", color: "white", borderColor: "#131936" }
                    : { background: "white", color: "#374151", borderColor: "#e5e7eb" }}>
                  {m === "UBER" ? "Uber (Dispatch books)" : "Support Chauffeur"}
                </button>
              ))}
            </div>
            {!booking.returnMode && <p className="text-[11px] text-gray-400 mt-1">Legacy booking — uses the Support Chauffeur flow.</p>}
          </div>
        )}

        {/* Uber return booking */}
        {isUber && !closed && (
          <div className="rounded-xl border px-4 py-3 mb-4"
            style={awaiting && !booking.uberReturnBookedAt ? { borderColor: "#fca5a5", background: "#fef2f2" } : { borderColor: "#e5e7eb" }}>
            <p className="text-[12px] font-bold text-gray-800 mb-1">
              {awaiting && !booking.uberReturnBookedAt ? "Action needed: book the chauffeur's Uber" : "Uber return"}
            </p>
            <p className="text-[11px] text-gray-500 mb-1">From: <span className="text-gray-800">{booking.dropoff}</span></p>
            <p className="text-[11px] text-gray-500 mb-2">To (original pickup): <span className="text-gray-800">{booking.pickup}</span></p>
            {primary?.driver && (
              <p className="text-[11px] text-gray-500 mb-3">
                Rider name for Uber: <span className="text-gray-800">{primary.driver.firstName} {primary.driver.lastName}</span>
                {primary.driver.phone ? <> · <a className="underline" href={`tel:${primary.driver.phone}`}>{primary.driver.phone}</a></> : null}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input value={uberRef} onChange={e => setUberRef(e.target.value)} placeholder="Uber trip ref (optional)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-[#131936]" />
              <input value={uberCost} onChange={e => setUberCost(e.target.value)} placeholder="Cost (CAD)" inputMode="decimal"
                className="border border-gray-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-[#131936]" />
            </div>
            <button type="button" disabled={!!busy || uberCost.trim() === ""}
              onClick={() => act("record_uber_return", { uberRef, uberCost: parseFloat(uberCost) })}
              className="no-hover-fx w-full py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-60"
              style={{ background: "#131936" }}>
              {busy === "record_uber_return" ? "Saving…" : booking.uberReturnBookedAt ? "Update Uber booking" : "Record Uber booking & notify chauffeur"}
            </button>
            {booking.uberReturnBookedAt && (
              <p className="text-[10px] text-gray-400 mt-1.5">Booked {new Date(booking.uberReturnBookedAt).toLocaleString("en-CA", { timeZone: "America/Winnipeg" })}</p>
            )}
          </div>
        )}

        {awaiting && (
          <button type="button" disabled={!!busy} onClick={() => act("mark_returned")}
            className="no-hover-fx w-full py-2.5 rounded-xl text-[12px] font-bold border border-gray-300 text-gray-700 mb-2 disabled:opacity-60">
            {busy === "mark_returned" ? "Saving…" : "Mark chauffeur back at their vehicle"}
          </button>
        )}

        {error && <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      </div>
    </div>
  );
}
