"use client";

import { useCallback, useEffect, useState } from "react";

/* Return Logistics Allowance vs actual Uber return cost — per Safe Ride and
   in total — so Movo can see its real margin and tune the return buffer. */

type Row = {
  id: string; createdAt: string; clientName: string; pickup: string; dropoff: string; status: string;
  total: number; servicePortion: number | null; allowance: number; chauffeurPayout: number | null;
  returnMode: string | null; uberRef: string | null; uberCost: number | null; variance: number | null;
  lateNight: boolean; demandMultiplier: number;
};
type Summary = {
  rides: number; ridesWithUberCost: number; allowanceTotal: number; uberCostTotal: number;
  varianceTotal: number; overBudget: number; awaitingUberCost: number;
};

const money = (n: number | null | undefined) => (n == null ? "—" : `$${n.toFixed(2)}`);
const PERIODS = [7, 30, 90, 365];

export default function SafeRideReturnsPage() {
  const [days, setDays]       = useState(30);
  const [rows, setRows]       = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback((d: number) => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    fetch(`/api/admin/safe-ride/returns?days=${d}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setRows(data.rows ?? []);
        setSummary(data.summary ?? null);
      })
      .catch(() => setError("Failed to load. Please try again."))
      .finally(() => { clearTimeout(timeout); setLoading(false); });
  }, []);

  /* Deferred a tick so the effect itself doesn't set state synchronously */
  useEffect(() => {
    const t = setTimeout(() => load(days), 0);
    return () => clearTimeout(t);
  }, [days, load]);

  const cards = summary ? [
    { label: "Allowance charged",   value: money(summary.allowanceTotal),  sub: `${summary.ridesWithUberCost} rides with Uber cost` },
    { label: "Actual Uber cost",    value: money(summary.uberCostTotal),   sub: "Recorded by Dispatch" },
    { label: "Allowance − Uber",    value: money(summary.varianceTotal),   sub: summary.varianceTotal >= 0 ? "Buffer covered returns" : "Returns cost more than charged", warn: summary.varianceTotal < 0 },
    { label: "Over budget rides",   value: String(summary.overBudget),     sub: `${summary.awaitingUberCost} completed rides missing an Uber cost`, warn: summary.overBudget > 0 },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">Safe Ride Returns</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">Return Logistics Allowance charged vs actual Uber cost. Use this to tune the buffers on the Pricing page.</p>
          </div>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button key={p} type="button" onClick={() => setDays(p)}
                className="no-hover-fx px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{ background: days === p ? "#131936" : "#f3f4f6", color: days === p ? "white" : "#6b7280" }}>
                {p === 365 ? "1 year" : `${p} days`}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600">{error}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {cards.map(c => (
            <div key={c.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{c.label}</p>
              <p className="text-[20px] font-bold mt-1" style={{ color: c.warn ? "#dc2626" : "#131936" }}>{c.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["Date", "Customer", "Route", "Return", "Service", "Allowance", "Uber cost", "Allowance − Uber", "Payout"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No Safe Rides priced by the new engine in this period.</td></tr>}
              {!loading && rows.map(r => (
                <tr key={r.id} className="border-b border-gray-50 align-top">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    {r.lateNight && <span className="ml-1 text-[10px] font-semibold text-indigo-600">night</span>}
                    {r.demandMultiplier > 1 && <span className="ml-1 text-[10px] font-semibold text-amber-600">×{r.demandMultiplier}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{r.clientName}<p className="text-[10px] text-gray-400">{r.status}</p></td>
                  <td className="px-4 py-3 text-gray-500 max-w-[220px]"><p className="truncate">{r.dropoff}</p><p className="truncate text-gray-400">→ {r.pickup}</p></td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.returnMode === "SUPPORT" ? "Support" : "Uber"}{r.uberRef && <p className="text-[10px] text-gray-400">{r.uberRef}</p>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{money(r.servicePortion)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{money(r.allowance)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{money(r.uberCost)}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-semibold" style={{ color: r.variance == null ? "#9ca3af" : r.variance < 0 ? "#dc2626" : "#16a34a" }}>{money(r.variance)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{money(r.chauffeurPayout)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
