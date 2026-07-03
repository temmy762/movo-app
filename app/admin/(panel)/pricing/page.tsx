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
      body: JSON.stringify({ tiers, global }),
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
