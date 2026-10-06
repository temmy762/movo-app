"use client";

import { useState, useEffect, useCallback } from "react";

type TierConfig = {
  id: string; tier: string; name: string;
  baseFare: number; ratePerKm: number; ratePerMin: number;
  minFare: number; hourlyRate: number; hourlyMinHours: number;
  commissionRate: number;
};

type GlobalConfig = {
  id?: string; gstRate: number; serviceFeeRate: number;
  additionalStopFee: number; airportPickupFee: number;
  freeWaitingMinutes: number; waitingRatePerMin: number;
};

type SafeRideConfig = {
  id?: string;
  returnBaseFare: number; returnPerKm: number; returnPerMin: number;
  returnBookingFee: number; returnMinimum: number;
  returnBufferRate: number; lateNightBufferRate: number;
  lateNightStartHour: number; lateNightEndHour: number;
  demandMultiplier: number;
  chauffeurPayoutRate: number; supportPayout: number;
  freeWaitingMinutes: number; waitingRatePerMin: number;
  defaultReturnMode: string;
};

const SAFE_RIDE_FALLBACK: SafeRideConfig = {
  returnBaseFare: 3.5, returnPerKm: 0.9, returnPerMin: 0.3, returnBookingFee: 2.5, returnMinimum: 10,
  returnBufferRate: 0.15, lateNightBufferRate: 0.10, lateNightStartHour: 22, lateNightEndHour: 6,
  demandMultiplier: 1, chauffeurPayoutRate: 0.70, supportPayout: 40,
  freeWaitingMinutes: 3, waitingRatePerMin: 1, defaultReturnMode: "UBER",
};

const hourLabel = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`;

function Field({ label, value, onChange, step = "0.01", prefix = "$", suffix = "" }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: string; prefix?: string; suffix?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-[#131936]">
        {prefix && <span className="text-[13px] text-gray-400 shrink-0">{prefix}</span>}
        <input
          type="number"
          step={step}
          min={0}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 text-[13px] text-gray-800 font-medium focus:outline-none bg-transparent w-full"
        />
        {suffix && <span className="text-[13px] text-gray-400 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  classic: "#64748b", premium: "#16a34a", black: "#1e2d45", care: "#b45309",
};
const TIER_BG: Record<string, string> = {
  classic: "#f1f5f9", premium: "#f0fdf4", black: "#1e2d45", care: "#fffbeb",
};

export default function PricingPage() {
  const [tiers, setTiers]   = useState<TierConfig[]>([]);
  const [global, setGlobal] = useState<GlobalConfig>({
    gstRate: 0.05, serviceFeeRate: 0.12, additionalStopFee: 5,
    airportPickupFee: 10, freeWaitingMinutes: 5, waitingRatePerMin: 0.75,
  });
  const [safeRide, setSafeRide] = useState<SafeRideConfig>(SAFE_RIDE_FALLBACK);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/pricing")
      .then(r => r.json())
      .then(d => {
        if (d.tiers) setTiers(d.tiers);
        if (d.global) setGlobal(d.global);
        if (d.safeRide) setSafeRide(d.safeRide);
      })
      .catch(() => setError("Failed to load pricing config."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateTier = (index: number, field: keyof TierConfig, value: number) => {
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiers, global, safeRide }),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError("Failed to save. Please try again.");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-[#131936] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">Pricing Configuration</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">All fares are in CAD. Changes take effect immediately.</p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold shadow"
            style={{ background: saving ? "#9ca3af" : "linear-gradient(90deg, #1a1a2e, #131936, #C6BFB2)" }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600">{error}</div>
        )}

        {/* Per-Tier Pricing */}
        <h2 className="text-[14px] font-bold text-gray-700 mb-3 uppercase tracking-wider">Ride Pricing by Tier</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {tiers.map((t, i) => (
            <div key={t.tier} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Tier header */}
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: TIER_BG[t.tier] ?? "#f1f5f9" }}>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: TIER_COLORS[t.tier] ?? "#64748b", color: "white" }}>
                  {t.name}
                </span>
              </div>
              {/* Fields */}
              <div className="px-4 py-4 flex flex-col gap-3">
                <Field label="Base Fare" value={t.baseFare} onChange={v => updateTier(i, "baseFare", v)} />
                <Field label="Per km" value={t.ratePerKm} onChange={v => updateTier(i, "ratePerKm", v)} suffix="/km" />
                <Field label="Per minute" value={t.ratePerMin} onChange={v => updateTier(i, "ratePerMin", v)} suffix="/min" />
                <Field label="Minimum Fare" value={t.minFare} onChange={v => updateTier(i, "minFare", v)} />
                <Field label="Hourly Rate" value={t.hourlyRate} onChange={v => updateTier(i, "hourlyRate", v)} suffix="/hr" />
                <Field label="Min Hours (hourly)" value={t.hourlyMinHours} onChange={v => updateTier(i, "hourlyMinHours", v)} prefix="" step="1" suffix="hrs" />
                <Field label="Commission Rate" value={t.commissionRate} onChange={v => updateTier(i, "commissionRate", v)} prefix="" suffix="%" step="0.01" />
              </div>
            </div>
          ))}
        </div>

        {/* Global / Additional Charges */}
        <h2 className="text-[14px] font-bold text-gray-700 mb-3 uppercase tracking-wider">Global Charges & Taxes</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field
              label="GST Rate"
              value={+(global.gstRate * 100).toFixed(2)}
              onChange={v => setGlobal(g => ({ ...g, gstRate: v / 100 }))}
              prefix="" suffix="%" step="0.1"
            />
            <Field
              label="Service Fee Rate"
              value={+(global.serviceFeeRate * 100).toFixed(2)}
              onChange={v => setGlobal(g => ({ ...g, serviceFeeRate: v / 100 }))}
              prefix="" suffix="%" step="0.1"
            />
            <Field
              label="Additional Stop"
              value={global.additionalStopFee}
              onChange={v => setGlobal(g => ({ ...g, additionalStopFee: v }))}
            />
            <Field
              label="Airport Pickup Fee"
              value={global.airportPickupFee}
              onChange={v => setGlobal(g => ({ ...g, airportPickupFee: v }))}
            />
            <Field
              label="Free Waiting (min)"
              value={global.freeWaitingMinutes}
              onChange={v => setGlobal(g => ({ ...g, freeWaitingMinutes: Math.round(v) }))}
              prefix="" suffix="min" step="1"
            />
            <Field
              label="Waiting Rate"
              value={global.waitingRatePerMin}
              onChange={v => setGlobal(g => ({ ...g, waitingRatePerMin: v }))}
              suffix="/min"
            />
          </div>
        </div>

        {/* Safe Ride pricing engine */}
        {(() => {
          const sr = safeRide;
          const set = (k: keyof SafeRideConfig, v: number | string) => setSafeRide(p => ({ ...p, [k]: v }));
          const pct = (k: keyof SafeRideConfig) => ({
            value: +((sr[k] as number) * 100).toFixed(2),
            onChange: (v: number) => set(k, v / 100),
            prefix: "", suffix: "%", step: "0.5",
          });
          const care = tiers.find(t => t.tier === "care");
          /* Example: 12 km / 18 min trip, same route back */
          const preview = (lateNight: boolean) => {
            const service = care ? Math.max(care.minFare, care.baseFare + 12 * care.ratePerKm + 18 * care.ratePerMin) : 0;
            const back    = Math.max(sr.returnMinimum, sr.returnBaseFare + 12 * sr.returnPerKm + 18 * sr.returnPerMin + sr.returnBookingFee);
            const rla     = back * (1 + sr.returnBufferRate + (lateNight ? sr.lateNightBufferRate : 0)) * Math.max(1, sr.demandMultiplier);
            const fare    = service + rla;
            const gst     = fare * global.gstRate;
            return { service, back, rla, fare, gst, total: fare + gst, payout: service * sr.chauffeurPayoutRate, movo: service * (1 - sr.chauffeurPayoutRate) };
          };
          return (
            <>
              <h2 className="text-[14px] font-bold text-gray-700 mt-8 mb-1 uppercase tracking-wider">Safe Ride</h2>
              <p className="text-[12px] text-gray-400 mb-3">
                Fare = service portion (Safe Ride tier rates above, ${care?.minFare ?? 129} minimum) + Return Logistics Allowance + GST. No service fee.
              </p>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 flex flex-col gap-6">
                <div>
                  <p className="text-[13px] font-bold text-gray-800 mb-1">Return Logistics Allowance</p>
                  <p className="text-[11px] text-gray-400 mb-3">Estimated Uber cost for the chauffeur&apos;s return (destination → original pickup). Calibrate these from real Uber Central quotes for Winnipeg routes.</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Field label="Uber base fare" value={sr.returnBaseFare} onChange={v => set("returnBaseFare", v)} />
                    <Field label="Uber per km" value={sr.returnPerKm} onChange={v => set("returnPerKm", v)} suffix="/km" />
                    <Field label="Uber per minute" value={sr.returnPerMin} onChange={v => set("returnPerMin", v)} suffix="/min" />
                    <Field label="Uber booking fee" value={sr.returnBookingFee} onChange={v => set("returnBookingFee", v)} />
                    <Field label="Minimum return" value={sr.returnMinimum} onChange={v => set("returnMinimum", v)} />
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-800 mb-3">Buffers</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Field label="Base buffer" {...pct("returnBufferRate")} />
                    <Field label="Late-night extra" {...pct("lateNightBufferRate")} />
                    <Field label="Late night from (hour 0–23)" value={sr.lateNightStartHour} onChange={v => set("lateNightStartHour", Math.round(v))} prefix="" step="1" />
                    <Field label="Late night until (hour 0–23)" value={sr.lateNightEndHour} onChange={v => set("lateNightEndHour", Math.round(v))} prefix="" step="1" />
                    <Field label="High-demand multiplier" value={sr.demandMultiplier} onChange={v => set("demandMultiplier", v)} prefix="×" step="0.05" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    Late night is {hourLabel(sr.lateNightStartHour)} – {hourLabel(sr.lateNightEndHour)} Winnipeg time, judged on when the return happens.
                    Set the multiplier above 1 for events or busy periods, then back to 1 afterwards.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[13px] font-bold text-gray-800 mb-3">Chauffeur pay</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Chauffeur payout" {...pct("chauffeurPayoutRate")} />
                      <Field label="Support chauffeur payout" value={sr.supportPayout} onChange={v => set("supportPayout", v)} />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">Payout is a % of the service portion (and of waiting charges), locked when the ride is booked. Support payout applies only when Dispatch uses a Support Chauffeur.</p>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-800 mb-3">Waiting time &amp; return</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Free waiting" value={sr.freeWaitingMinutes} onChange={v => set("freeWaitingMinutes", Math.round(v))} prefix="" suffix="min" step="1" />
                      <Field label="Waiting rate" value={sr.waitingRatePerMin} onChange={v => set("waitingRatePerMin", v)} suffix="/min" />
                    </div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-3 mb-1">New bookings return the chauffeur by</label>
                    <select value={sr.defaultReturnMode} onChange={e => set("defaultReturnMode", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 focus:outline-none focus:border-[#131936]">
                      <option value="UBER">Uber (Dispatch books it)</option>
                      <option value="SUPPORT">Movo Support Chauffeur</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[false, true].map(night => {
                    const p = preview(night);
                    return (
                      <div key={String(night)} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-[12px]">
                        <p className="font-bold text-gray-500 mb-2">Example · 12 km / 18 min · {night ? "late night" : "daytime"}</p>
                        <div className="flex justify-between"><span className="text-gray-500">Service portion</span><span className="font-medium">${p.service.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Return allowance (Uber est. ${p.back.toFixed(2)})</span><span className="font-medium">${p.rla.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">GST</span><span className="font-medium">${p.gst.toFixed(2)}</span></div>
                        <div className="h-px bg-gray-200 my-1" />
                        <div className="flex justify-between font-bold"><span>Customer pays</span><span>${p.total.toFixed(2)}</span></div>
                        <div className="flex justify-between mt-1"><span className="text-gray-500">Chauffeur payout</span><span className="font-medium">${p.payout.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Movo keeps</span><span className="font-medium">${p.movo.toFixed(2)} + allowance − Uber cost</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {/* Pricing Preview */}
        <h2 className="text-[14px] font-bold text-gray-700 mt-8 mb-3 uppercase tracking-wider">Live Preview (10 km · 15 min trip)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map(t => {
            const raw  = t.baseFare + 10 * t.ratePerKm + 15 * t.ratePerMin;
            const fare = Math.max(raw, t.minFare);
            const svc  = fare * global.serviceFeeRate;
            const gst  = fare * global.gstRate;
            const tot  = fare + svc + gst;
            return (
              <div key={t.tier} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
                <p className="text-[12px] font-bold text-gray-500 mb-3">{t.name}</p>
                <div className="flex flex-col gap-1.5 text-[12px]">
                  <div className="flex justify-between"><span className="text-gray-500">Ride Fare</span><span className="font-medium">${fare.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Service Fee</span><span className="font-medium">${svc.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">GST</span><span className="font-medium">${gst.toFixed(2)}</span></div>
                  <div className="h-px bg-gray-100 my-1" />
                  <div className="flex justify-between font-bold"><span>Total</span><span>${tot.toFixed(2)}</span></div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
