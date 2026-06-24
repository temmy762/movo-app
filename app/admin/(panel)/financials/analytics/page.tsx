"use client";

import { useState, useEffect } from "react";

type Summary = {
  grossRevenue: number;
  commissionEarned: number;
  payoutsIssued: number;
  outstandingPayouts: number;
  refundsIssued: number;
  netRevenue: number;
};

type MonthData = {
  month: string;
  grossRevenue: number;
  commission: number;
  payouts: number;
  refunds: number;
};

type Analytics = {
  summary: Summary;
  cashflow: MonthData[];
  availableYears: number[];
};

function StatCard({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-[12px] text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-[26px] font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarGroup({ data, maxVal }: { data: MonthData; maxVal: number }) {
  const h = (v: number) => Math.max(2, Math.round((v / maxVal) * 140));
  const bars = [
    { key: "grossRevenue", color: "#131936", label: "Revenue" },
    { key: "commission",   color: "#C6BFB2", label: "Commission" },
    { key: "payouts",      color: "#0284c7", label: "Payouts" },
    { key: "refunds",      color: "#ef4444", label: "Refunds" },
  ] as const;

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-[28px]">
      <div className="flex items-end gap-0.5" style={{ height: 140 }}>
        {bars.map(({ key, color }) => (
          <div
            key={key}
            className="w-2 rounded-t"
            style={{ height: h(data[key]), background: color }}
            title={`${key}: $${data[key].toFixed(2)}`}
          />
        ))}
      </div>
      <span className="text-[9px] text-gray-400">{data.month}</span>
    </div>
  );
}

export default function EarningsAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading]     = useState(true);
  const [year, setYear]           = useState(new Date().getFullYear());

  const fetchData = (y: number) => {
    setLoading(true);
    fetch(`/api/admin/financials/analytics?year=${y}`)
      .then((r) => r.json())
      .then((d) => { if (d.summary) setAnalytics(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(year); }, [year]);

  const s = analytics?.summary;
  const cashflow = analytics?.cashflow ?? [];
  const maxVal = cashflow.length
    ? Math.max(...cashflow.map((m) => Math.max(m.grossRevenue, m.commission, m.payouts, m.refunds)), 1)
    : 1;

  const statCards = [
    { label: "Gross Revenue",        value: `$${(s?.grossRevenue ?? 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,     color: "#131936" },
    { label: "Commission Earned",     value: `$${(s?.commissionEarned ?? 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,  color: "#C6BFB2" },
    { label: "Driver Payouts Issued", value: `$${(s?.payoutsIssued ?? 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,    color: "#0284c7" },
    { label: "Outstanding Payouts",   value: `$${(s?.outstandingPayouts ?? 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "#d97706", sub: "Pending approval" },
    { label: "Refunds Issued",        value: `$${(s?.refundsIssued ?? 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,    color: "#ef4444" },
    { label: "Net Revenue",           value: `$${(s?.netRevenue ?? 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,        color: "#16a34a", sub: "After payouts & refunds" },
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="p-5 space-y-6 min-h-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">Earnings Analytics</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">Platform revenue, commissions, payouts and refunds</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-gray-500">Year:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-[12px] text-gray-700 focus:outline-none"
              suppressHydrationWarning
            >
              {(analytics?.availableYears ?? [year]).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-3" />
                <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {statCards.map((c) => (
              <StatCard key={c.label} label={c.label} value={c.value} sub={c.sub} color={c.color} />
            ))}
          </div>
        )}

        {/* Monthly chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <p className="text-[14px] font-bold text-gray-900">Monthly Breakdown — {year}</p>
            <div className="flex flex-wrap items-center gap-3">
              {[
                { label: "Revenue",    color: "#131936" },
                { label: "Commission", color: "#C6BFB2" },
                { label: "Payouts",    color: "#0284c7" },
                { label: "Refunds",    color: "#ef4444" },
              ].map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-end gap-2 h-40">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex-1 bg-gray-100 rounded animate-pulse" style={{ height: `${30 + Math.random() * 80}px` }} />
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-1 overflow-x-auto pb-1">
              {cashflow.map((m) => (
                <BarGroup key={m.month} data={m} maxVal={maxVal} />
              ))}
            </div>
          )}
        </div>

        {/* Monthly table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[14px] font-bold text-gray-900">Monthly Detail</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  {["Month", "Gross Revenue", "Commission", "Payouts", "Refunds", "Net"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
                ) : cashflow.map((m) => {
                  const net = m.grossRevenue - m.payouts - m.refunds;
                  return (
                    <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-semibold text-gray-700">{m.month}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">${m.grossRevenue.toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: "#C6BFB2" }}>${m.commission.toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: "#0284c7" }}>${m.payouts.toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: "#ef4444" }}>${m.refunds.toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: net >= 0 ? "#16a34a" : "#ef4444" }}>
                        {net < 0 ? "-" : ""}${Math.abs(net).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {!loading && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                    <td className="px-4 py-3 font-bold text-gray-900">Total</td>
                    <td className="px-4 py-3 font-bold text-gray-900">${cashflow.reduce((s, m) => s + m.grossRevenue, 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#C6BFB2" }}>${cashflow.reduce((s, m) => s + m.commission, 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#0284c7" }}>${cashflow.reduce((s, m) => s + m.payouts, 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#ef4444" }}>${cashflow.reduce((s, m) => s + m.refunds, 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#16a34a" }}>${s?.netRevenue.toFixed(2) ?? "0.00"}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
