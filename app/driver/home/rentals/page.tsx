"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);

type RentalVehicleRow = {
  id: string; make: string; model: string; year: number; color: string | null; tier: string;
  dailyRate: number; weeklyRate: number; monthlyRate: number;
  status: "AVAILABLE" | "RENTED" | "MAINTENANCE" | "OUT_OF_SERVICE";
  photoCount: number; requested: boolean; mine: boolean;
};

type ActiveRental = {
  id: string; plan: "DAILY" | "WEEKLY" | "MONTHLY"; amount: number;
  status: "REQUESTED" | "APPROVED"; startDate: string | null; endDate: string | null;
  adminNote: string | null; returnRequestedAt: string | null;
  vehicle: { id: string; make: string; model: string; year: number; color: string | null; tier: string };
};

type HistoryRow = Omit<ActiveRental, "status"> & {
  status: "REQUESTED" | "APPROVED" | "DECLINED" | "COMPLETED" | "CANCELLED";
  returnCharge: number | null; returnChargeNote: string | null; createdAt: string;
};

const PLAN_LABELS: Record<string, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly" };
const PLAN_DAYS: Record<string, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30 };
const TIER_LABELS: Record<string, string> = { classic: "Standard", premium: "Executive", black: "Concierge" };

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/* datetime-local input value (local time, no timezone) from a Date */
function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* Default pickup: now, rounded up to the next 30-minute slot */
function defaultPickup(): Date {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 30) * 30, 0, 0);
  return d;
}

/* ── Payment step for a rental request ── */
function RentalCheckoutForm({ onPaid }: { onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }
    onPaid();
  };

  return (
    <>
      <div className="rounded-xl overflow-hidden border border-gray-200 p-4 mb-4">
        <PaymentElement />
      </div>
      {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
      <button type="button" onClick={handlePay} disabled={!stripe || submitting}
        className="w-full py-3.5 rounded-full text-white font-bold text-[15px] tracking-wide"
        style={{ background: !stripe || submitting ? "#9ca3af" : "linear-gradient(135deg,#0A0A0F 0%,#131936 50%,#2A3055 100%)" }}>
        {submitting ? "Processing…" : "Pay & Submit Request"}
      </button>
    </>
  );
}

export default function DriverRentalsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<RentalVehicleRow[]>([]);
  const [active, setActive] = useState<ActiveRental | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [hasOwnVehicle, setHasOwnVehicle] = useState(false);

  const [selected, setSelected] = useState<RentalVehicleRow | null>(null);
  const [plan, setPlan] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  /* Only meaningful for the Daily plan — Weekly/Monthly are flat blocks.
     Lets a chauffeur book e.g. "3 days" instead of being stuck paying the
     single-day rate no matter how many days they actually pick. */
  const [days, setDays] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  /* Pickup/return window — chauffeur picks both so the rental period is
     scheduled and clear, not just implied by the plan length. */
  const [pickupAt, setPickupAt] = useState(() => toDatetimeLocal(defaultPickup()));
  const [returnAt, setReturnAt] = useState(() => toDatetimeLocal(new Date(defaultPickup().getTime() + PLAN_DAYS.DAILY * 86_400_000)));
  const [returnEdited, setReturnEdited] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);

  /* How many days this request actually spans — the paid-for duration */
  const durationDays = plan === "DAILY" ? days : PLAN_DAYS[plan];

  /* Auto-suggest the return time whenever pickup, plan, or day count changes,
     unless the chauffeur has deliberately typed their own return time */
  useEffect(() => {
    if (returnEdited) return;
    const pickup = new Date(pickupAt);
    if (isNaN(pickup.getTime())) return;
    setReturnAt(toDatetimeLocal(new Date(pickup.getTime() + durationDays * 86_400_000)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupAt, plan, days]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/rentals/vehicles").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/driver/rental").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([v, d]) => {
        setVehicles(Array.isArray(v) ? v : []);
        setActive(d?.active ?? null);
        setHistory(Array.isArray(d?.history) ? d.history : []);
        setHasOwnVehicle(!!d?.hasOwnVehicle);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const rateFor = (v: RentalVehicleRow, p: string, d: number) =>
    p === "DAILY" ? v.dailyRate * d : p === "WEEKLY" ? v.weeklyRate : v.monthlyRate;

  const startRequest = async () => {
    if (!selected || !agreed || starting) return;
    setDateError(null);
    const pickup = new Date(pickupAt);
    const ret = new Date(returnAt);
    if (isNaN(pickup.getTime()) || isNaN(ret.getTime())) {
      setDateError("Please choose a pickup and return date/time.");
      return;
    }
    if (pickup.getTime() < Date.now() - 5 * 60 * 1000) {
      setDateError("Pickup date/time can't be in the past.");
      return;
    }
    if (ret.getTime() <= pickup.getTime()) {
      setDateError("Return date/time must be after the pickup date/time.");
      return;
    }
    if (ret.getTime() - pickup.getTime() < durationDays * 86_400_000 * 0.9) {
      setDateError(plan === "DAILY"
        ? `The return time is too soon for ${days} day${days !== 1 ? "s" : ""} — adjust the return time or the day count.`
        : `The return time is too soon for a ${PLAN_LABELS[plan].toLowerCase()} rental.`);
      return;
    }

    setStarting(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/rentals/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: selected.id, plan, days }),
      });
      const d = await res.json();
      if (!res.ok) { setRequestError(d?.error ?? "Couldn't start this rental request."); setStarting(false); return; }
      setClientSecret(d.clientSecret);
      setIntentId(d.intentId);
    } catch {
      setRequestError("Network error — please try again.");
    } finally {
      setStarting(false);
    }
  };

  const finalizeRequest = async () => {
    if (!selected || !intentId) return;
    try {
      const res = await fetch("/api/rentals/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: selected.id, plan, days, intentId,
          pickupAt: new Date(pickupAt).toISOString(),
          returnAt: new Date(returnAt).toISOString(),
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setSelected(null);
        setClientSecret(null);
        setIntentId(null);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        setRequestError(d?.error ?? "Payment succeeded but the request couldn't be recorded — contact support.");
      }
    } catch {
      setRequestError("Payment succeeded but the request couldn't be recorded — contact support.");
    }
  };

  const requestReturn = async () => {
    if (!active || returning) return;
    setReturning(true);
    try {
      await fetch(`/api/rentals/${active.id}/return-request`, { method: "PATCH" });
    } catch { /* fall through — reload reflects real state either way */ }
    setReturning(false);
    load();
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx" onClick={() => (selected ? setSelected(null) : router.push("/driver/home"))}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-[18px] font-bold text-gray-900">Rent a Movo Vehicle</h1>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16 text-[13px] text-gray-400">
          <span className="w-5 h-5 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin mr-2" />
          Loading…
        </div>
      ) : submitted ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg,#0d1128,#131936)" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-[16px] font-bold text-gray-900 mb-1">Request submitted</p>
          <p className="text-[13px] text-gray-500 max-w-xs">
            Your payment was received and your rental request is with the Movo team for review. You&apos;ll be notified as soon as it&apos;s approved.
          </p>
          <button className="no-hover-fx mt-5 text-[13px] font-semibold"
            style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            onClick={() => setSubmitted(false)}>
            Back to Rentals
          </button>
        </div>

      ) : selected ? (
        /* ── Plan + payment step ── */
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <p className="text-[15px] font-bold text-gray-900 mb-0.5">{selected.year} {selected.make} {selected.model}</p>
            <p className="text-[12px] text-gray-400 mb-3">{selected.color ?? ""} · {TIER_LABELS[selected.tier] ?? selected.tier} tier</p>

            <p className="text-[12px] font-semibold text-gray-700 mb-2">Choose a plan</p>
            <div className="flex flex-col gap-2 mb-2">
              {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((p) => (
                <label key={p}
                  className="flex items-center justify-between rounded-xl border px-3.5 py-3 cursor-pointer"
                  style={{ borderColor: plan === p ? "#131936" : "#e5e7eb", background: plan === p ? "#f8f8f6" : "white" }}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="plan" checked={plan === p} onChange={() => setPlan(p)} className="accent-[#131936]" />
                    <span className="text-[13px] font-semibold text-gray-900">{PLAN_LABELS[p]}</span>
                    {p === "DAILY" && <span className="text-[11px] text-gray-400">(${selected.dailyRate.toFixed(0)}/day)</span>}
                  </div>
                  <span className="text-[14px] font-bold" style={{ color: "#131936" }}>${rateFor(selected, p, days).toFixed(2)}</span>
                </label>
              ))}
            </div>

            {/* Daily is the only plan billed per day — let the chauffeur pick
                how many, e.g. "3 days" instead of being stuck paying the
                single-day rate regardless of how long they actually keep it. */}
            {plan === "DAILY" && (
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3.5 py-3">
                <span className="text-[12px] font-semibold text-gray-700">Number of days</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setDays((d) => Math.max(1, d - 1))}
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-[16px] font-bold">−</button>
                  <span className="text-[14px] font-semibold text-gray-900 w-6 text-center">{days}</span>
                  <button type="button" onClick={() => setDays((d) => Math.min(90, d + 1))}
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-[16px] font-bold">+</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-2">Pickup &amp; return</p>
            <p className="text-[11px] text-gray-400 mb-3">Schedule now or in advance — the return time is suggested from your plan but you can adjust it.</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Pickup date &amp; time</label>
                <input type="datetime-local" value={pickupAt}
                  onChange={(e) => setPickupAt(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-[#131936]" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Return date &amp; time</label>
                <input type="datetime-local" value={returnAt}
                  onChange={(e) => { setReturnAt(e.target.value); setReturnEdited(true); }}
                  className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-[#131936]" />
              </div>
            </div>
            {dateError && <p className="text-[11px] text-red-500 mt-2">{dateError}</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <p className="text-[12px] font-semibold text-gray-700 mb-2">What&apos;s included</p>
            <ul className="text-[11px] text-gray-500 leading-relaxed list-disc pl-4 mb-3">
              <li>Commercial-use approved.</li>
              <li>Maintenance included.</li>
              <li>Roadside assistance.</li>
              <li>Fuel provided at pickup — return at the same level.</li>
            </ul>
            <p className="text-[12px] font-semibold text-gray-700 mb-2">Rental Terms</p>
            <ul className="text-[11px] text-gray-500 leading-relaxed list-disc pl-4 mb-3">
              <li>Vehicle must be returned clean and with a full tank of fuel.</li>
              <li>If returned without a full tank, the fuel cost plus a CAD $20 refueling service fee will be charged to your card on file.</li>
              <li>Damages or excessive cleaning are handled according to Movo&apos;s rental policy.</li>
            </ul>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-[#131936]" />
              <span className="text-[12px] text-gray-700">I have read and agree to Movo&apos;s vehicle rental terms.</span>
            </label>
          </div>

          {requestError && <p className="text-[12px] text-red-500 mb-3 px-1">{requestError}</p>}

          {!clientSecret ? (
            <button type="button" onClick={startRequest} disabled={!agreed || starting}
              className="w-full py-3.5 rounded-full text-white font-bold text-[15px] tracking-wide disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#0A0A0F 0%,#131936 50%,#2A3055 100%)" }}>
              {starting ? "Preparing payment…" : `Continue to Payment — $${rateFor(selected, plan, days).toFixed(2)}`}
            </button>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <RentalCheckoutForm onPaid={finalizeRequest} />
            </Elements>
          )}
        </div>

      ) : active ? (
        /* ── Existing request/rental status ── */
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={active.status === "APPROVED" ? { background: "#dcfce7", color: "#166534" } : { background: "#fef9c3", color: "#854d0e" }}>
                {active.status === "APPROVED" ? "Active Rental" : "Awaiting Approval"}
              </span>
              <span className="text-[13px] font-bold" style={{ color: "#131936" }}>${active.amount.toFixed(2)} — {PLAN_LABELS[active.plan]}</span>
            </div>
            <p className="text-[15px] font-bold text-gray-900 mb-0.5">{active.vehicle.year} {active.vehicle.make} {active.vehicle.model}</p>
            <p className="text-[12px] text-gray-400 mb-3">{active.vehicle.color ?? ""} · {TIER_LABELS[active.vehicle.tier] ?? active.vehicle.tier} tier</p>
            {(active.startDate || active.endDate) && (
              <div className="flex flex-col gap-1 mb-3 rounded-xl px-3 py-2.5" style={{ background: "#f8f8f6" }}>
                <div className="flex items-center gap-2 text-[12px] text-gray-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2" className="shrink-0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span><span className="text-gray-400">Pickup:</span> {fmtDateTime(active.startDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-gray-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2" className="shrink-0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span><span className="text-gray-400">Return by:</span> {fmtDateTime(active.endDate)}</span>
                </div>
              </div>
            )}
            {active.status === "REQUESTED" && (
              <p className="text-[12px] text-gray-500">Your payment was received. The Movo team will review your request shortly.</p>
            )}
            {active.status === "APPROVED" && (
              active.returnRequestedAt ? (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#eef2ff" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                  <p className="text-[12px] text-indigo-700">Return requested — the Movo team has been notified and will confirm shortly.</p>
                </div>
              ) : (
                <button type="button" onClick={requestReturn} disabled={returning}
                  className="no-hover-fx w-full py-3 rounded-xl font-bold text-[14px] disabled:opacity-50"
                  style={{ border: "1.5px solid #131936", color: "#131936" }}>
                  {returning ? "…" : "I'm Returning This Vehicle"}
                </button>
              )
            )}
          </div>
          <p className="text-[11px] text-gray-400 text-center px-4">
            Only one active rental request at a time. Contact Movo support if you need to make changes.
          </p>
        </div>

      ) : (
        /* ── Browse available rental vehicles ── */
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {hasOwnVehicle && (
            <div className="rounded-xl px-3.5 py-2.5 mb-1" style={{ background: "#f8f8f6", border: "1px solid #e5e7eb" }}>
              <p className="text-[11px] text-gray-500">
                Renting a Movo vehicle will replace the vehicle currently on your account while the rental is active. It&apos;s restored automatically once you return the rental vehicle.
              </p>
            </div>
          )}
          {vehicles.length === 0 ? (
            <p className="text-center text-[13px] text-gray-400 py-16">No rental vehicles available right now — check back soon.</p>
          ) : vehicles.map((v) => {
            const bookable = v.status === "AVAILABLE" && !v.requested;
            return (
              <div key={v.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {v.photoCount > 0 && (
                  <div className="w-full h-40 bg-gray-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/rentals/vehicles/${v.id}/photo?i=0`} alt={`${v.make} ${v.model}`} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[15px] font-bold text-gray-900">{v.year} {v.make} {v.model}</p>
                    {v.status !== "AVAILABLE" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Rented</span>
                    ) : v.requested ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Requested</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Available</span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-400 mb-3">{v.color ?? ""} · {TIER_LABELS[v.tier] ?? v.tier} tier</p>
                  <div className="flex items-center gap-3 mb-3 text-[11px] text-gray-600">
                    <span>${v.dailyRate.toFixed(0)}/day</span>
                    <span className="text-gray-300">·</span>
                    <span>${v.weeklyRate.toFixed(0)}/week</span>
                    <span className="text-gray-300">·</span>
                    <span>${v.monthlyRate.toFixed(0)}/month</span>
                  </div>
                  <button type="button" disabled={!bookable}
                    onClick={() => {
                      setSelected(v); setPlan("DAILY"); setDays(1); setAgreed(false); setDateError(null);
                      const pickup = defaultPickup();
                      setPickupAt(toDatetimeLocal(pickup));
                      setReturnAt(toDatetimeLocal(new Date(pickup.getTime() + PLAN_DAYS.DAILY * 86_400_000)));
                      setReturnEdited(false);
                    }}
                    className="no-hover-fx w-full py-2.5 rounded-xl text-white font-bold text-[13px] disabled:opacity-50"
                    style={{ background: bookable ? "linear-gradient(90deg,#131936,#C6BFB2)" : "#9ca3af" }}>
                    {bookable ? "Rent This Vehicle" : v.status === "AVAILABLE" ? "Already Requested" : "Not Available"}
                  </button>
                </div>
              </div>
            );
          })}

          {history.length > 0 && (
            <div className="mt-4">
              <p className="text-[12px] font-semibold text-gray-500 mb-2">Past Requests</p>
              <div className="flex flex-col gap-2">
                {history.map((h) => (
                  <div key={h.id} className="bg-white rounded-xl px-3.5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800">{h.vehicle.year} {h.vehicle.make} {h.vehicle.model}</p>
                      <p className="text-[10px] text-gray-400">{PLAN_LABELS[h.plan]} · {fmtDate(h.createdAt)}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={
                        h.status === "COMPLETED" ? { background: "#dcfce7", color: "#166534" } :
                        h.status === "DECLINED"  ? { background: "#fee2e2", color: "#991b1b" } :
                        { background: "#f3f4f6", color: "#6b7280" }
                      }>
                      {h.status.charAt(0) + h.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
