"use client";

import { useCallback, useEffect, useState } from "react";

/* GST collected from customers, kept apart from Movo's revenue, by day / week
   / month — for tracking and GST filing (CSV download). */

type Row = { key: string; label: string; rides: number; charged: number; gst: number; revenueExGst: number; chauffeurPay: number; movoShare: number };
type Totals = Omit<Row, "key" | "label">;

const money = (n: number) => `$${(n ?? 0).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const GROUPS = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
] as const;
const RANGES = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
  { days: 3650, label: "All time" },
];

export default function GstReportPage() {
  const [group, setGroup] = useState<"day" | "week" | "month">("day");
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((g: string, d: number) => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    fetch(`/api/admin/financials/gst?group=${g}&days=${d}`, { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setRows(data.rows ?? []);
        setTotals(data.totals ?? null);
      })
      .catch(() => setError("Couldn't load the GST report. Please try again."))
      .finally(() => { clearTimeout(timeout); setLoading(false); });
  }, []);

  useEffect(() => { load(group, days); }, [group, days, load]);

  const downloadCsv = () => {
    const head = ["Period", "Paid rides", "Total charged", "GST collected", "Revenue excl. GST", "Chauffeur earnings", "Movo share"];
    const lines = rows.map((r) => [r.label, r.rides, r.charged, r.gst, r.revenueExGst, r.chauffeurPay, r.movoShare]);
    if (totals) lines.push(["Total", totals.rides, totals.charged, totals.gst, totals.revenueExGst, totals.chauffeurPay, totals.movoShare]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `movo-gst-${group}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">GST Collected</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            GST charged to customers on paid rides, kept separate from Movo&apos;s revenue. Refunded rides are excluded.
          </p>
        </div>
        <button type="button" onClick={downloadCsv} disabled={!rows.length}
          className="no-hover-fx px-4 py-2 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50 self-start md:self-auto"
          style={{ background: "#131936" }}>
          Download CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {GROUPS.map((g) => (
            <button key={g.id} type="button" onClick={() => setGroup(g.id)}
              className="no-hover-fx px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={group === g.id ? { background: "#131936", color: "white" } : { color: "#4b5563" }}>
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {RANGES.map((r) => (
            <button key={r.days} type="button" onClick={() => setDays(r.days)}
              className="no-hover-fx px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={days === r.days ? { background: "#131936", color: "white" } : { color: "#4b5563" }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "GST collected", value: totals ? money(totals.gst) : "—", strong: true },
          { label: "Revenue excl. GST", value: totals ? money(totals.revenueExGst) : "—" },
          { label: "Chauffeur earnings", value: totals ? money(totals.chauffeurPay) : "—" },
          { label: "Movo share", value: totals ? money(totals.movoShare) : "—" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[12px] text-gray-500">{c.label}</p>
            <p className={`text-[20px] font-bold mt-1 ${c.strong ? "text-[#131936]" : "text-gray-900"}`}>{loading ? "…" : c.value}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-[13px] text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-4 py-3 font-semibold">Period</th>
              <th className="px-4 py-3 font-semibold text-right">Paid rides</th>
              <th className="px-4 py-3 font-semibold text-right">Total charged</th>
              <th className="px-4 py-3 font-semibold text-right">GST collected</th>
              <th className="px-4 py-3 font-semibold text-right">Revenue excl. GST</th>
              <th className="px-4 py-3 font-semibold text-right">Chauffeur earnings</th>
              <th className="px-4 py-3 font-semibold text-right">Movo share</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
            {!loading && !rows.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No paid rides in this period.</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.key} className="border-b border-gray-50">
                <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{r.label}</td>
                <td className="px-4 py-3 text-right">{r.rides}</td>
                <td className="px-4 py-3 text-right">{money(r.charged)}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#131936]">{money(r.gst)}</td>
                <td className="px-4 py-3 text-right">{money(r.revenueExGst)}</td>
                <td className="px-4 py-3 text-right">{money(r.chauffeurPay)}</td>
                <td className="px-4 py-3 text-right">{money(r.movoShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400 mt-3">
        Dates are Winnipeg time. Movo share = revenue excl. GST minus chauffeur earnings (Safe Ride return costs are tracked under Safe Ride Returns).
      </p>
    </div>
  );
}
