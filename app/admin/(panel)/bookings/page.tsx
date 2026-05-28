"use client";

import React, { useState, useEffect, useCallback } from "react";

// ── Sparklines ────────────────────────────────────────────────────────────
function UpWave() {
  return (
    <svg width="90" height="40" viewBox="0 0 90 40" fill="none">
      <defs>
        <linearGradient id="upWaveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 30 C8 28 12 32 18 26 C24 20 28 24 35 18 C42 12 48 14 55 10 C62 6 70 8 78 5 C82 3 86 2 90 2"
        fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <path d="M0 30 C8 28 12 32 18 26 C24 20 28 24 35 18 C42 12 48 14 55 10 C62 6 70 8 78 5 C82 3 86 2 90 2 L90 40 L0 40 Z"
        fill="url(#upWaveGrad)" />
    </svg>
  );
}
function DownWave() {
  return (
    <svg width="90" height="40" viewBox="0 0 90 40" fill="none">
      <defs>
        <linearGradient id="downWaveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 20 C6 19 10 16 16 18 C22 20 26 12 32 8 C36 5 40 10 46 18 C52 26 58 30 66 32 C74 34 82 32 90 30"
        fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M0 20 C6 19 10 16 16 18 C22 20 26 12 32 8 C36 5 40 10 46 18 C52 26 58 30 66 32 C74 34 82 32 90 30 L90 40 L0 40 Z"
        fill="url(#downWaveGrad)" />
    </svg>
  );
}

// ── Booking Stat Cards ─────────────────────────────────────────────────────
const bookingStats = [
  { label: "Upcoming Bookings",  value: 145, pct: "+2.97%", up: true  },
  { label: "Pending Bookings",   value: 106, pct: "+1.72%", up: true  },
  { label: "Cancelled Bookings", value: 86,  pct: "-4.02%", up: false },
  { label: "Completed Bookings", value: 298, pct: "+3.15%", up: true  },
];

function BookingStatCard({ s }: { s: typeof bookingStats[0] }) {
  return (
    <div className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm">
      {/* Icon + Label */}
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "#e0f2fe" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <p className="text-[11px] sm:text-[12px] text-gray-500 font-medium leading-tight">{s.label}</p>
      </div>
      {/* Number + Wave */}
      <div className="flex items-end justify-between gap-1">
        <div>
          <p className="text-[22px] sm:text-[28px] font-bold text-gray-900 leading-none">{s.value}</p>
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
            <span className="flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold"
              style={{ background: s.up ? "#dcfce7" : "#fee2e2", color: s.up ? "#16a34a" : "#dc2626" }}>
              {s.up ? "↑" : "↓"} {s.pct}
            </span>
            <span className="hidden sm:inline text-[11px] text-gray-400">from last week</span>
          </div>
        </div>
        <div className="hidden sm:block shrink-0">{s.up ? <UpWave /> : <DownWave />}</div>
      </div>
    </div>
  );
}

// ── Bookings Bar Chart (bidirectional) ────────────────────────────────────
const HALF_H = 110;

type OverviewItem = { m: string; done: number; cancelled: number };
function BookingsBarChart({ data }: { data: OverviewItem[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const MAX_VAL = data.length > 0 ? Math.max(...data.map(d => Math.max(d.done, d.cancelled)), 100) : 600;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[14px] font-bold text-gray-900">Bookings Overview</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shrink-0" /> Done
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: "#1e2d45" }} /> Cancelled
            </span>
          </div>
        </div>
        <select className="self-start sm:self-auto text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option>Last 8 Month</option><option>Last 6 Months</option><option>This Year</option>
        </select>
      </div>

      {/* Chart body */}
      <div className="overflow-x-auto -mx-1">
      <div className="flex gap-2 min-w-[400px]">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between text-right pr-1 shrink-0" style={{ height: `${HALF_H * 2}px` }}>
          {["600","300","0","300","600"].map((l, i) => (
            <span key={i} className="text-[9px] text-gray-400 leading-none">{l}</span>
          ))}
        </div>

        {/* Bars + grid */}
        <div className="flex-1 relative">
          {/* Dashed grid lines */}
          {[0, 25, 50, 75, 100].map(pct => (
            <div key={pct} className="absolute left-0 right-0 border-t border-dashed border-gray-100"
              style={{ top: `${(pct / 100) * HALF_H * 2}px` }} />
          ))}

          {/* Bars */}
          <div className="flex gap-1 relative" style={{ height: `${HALF_H * 2}px` }}>
            {data.map((d, i) => {
              const doneH  = Math.round((d.done      / MAX_VAL) * HALF_H);
              const cancH  = Math.round((d.cancelled / MAX_VAL) * HALF_H);
              const active = hovered === i;
              return (
                <div key={d.m} className="flex-1 flex flex-col relative cursor-pointer"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}>
                  {/* Tooltip */}
                  {active && (
                    <div className="absolute z-10 left-1/2 -translate-x-1/2 -top-[72px] bg-white border border-gray-100 rounded-xl px-3 py-2 text-center shadow-lg whitespace-nowrap">
                      <p className="text-[10px] font-semibold text-gray-700 mb-1">{d.m} 2028</p>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-[9px] text-gray-400">Done</p>
                          <p className="text-[13px] font-bold text-red-500">{d.done}</p>
                        </div>
                        <div className="w-px h-6 bg-gray-100" />
                        <div className="text-center">
                          <p className="text-[9px] text-gray-400">Cancelled</p>
                          <p className="text-[13px] font-bold" style={{ color: "#1e2d45" }}>{d.cancelled}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Upper half — Done (red), grows upward from center */}
                  <div className="flex items-end" style={{ height: `${HALF_H}px` }}>
                    <div className="w-full" style={{
                      height: `${doneH}px`,
                      background: "#ef4444",
                      borderRadius: "3px 3px 0 0",
                    }} />
                  </div>
                  {/* Lower half — Cancelled (dark navy), grows downward from center */}
                  <div className="flex items-start" style={{ height: `${HALF_H}px` }}>
                    <div className="w-full" style={{
                      height: `${cancH}px`,
                      background: "#1e2d45",
                      borderRadius: "0 0 3px 3px",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex gap-1 mt-1 pl-8 min-w-[400px]">
        {data.map(d => (
          <div key={d.m} className="flex-1 text-center">
            <span className="text-[9px] text-gray-400">{d.m}</span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

// ── Real booking type from API ─────────────────────────────────────────────
type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type PaymentStatus = "UNPAID" | "PAID" | "FAILED" | "REFUNDED";
type Booking = {
  id: string;
  clientName: string;
  pickup: string;
  dropoff: string;
  carTier: string;
  carName: string;
  fare: number;
  serviceFee: number;
  total: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusConfig: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: "#fef3c7", color: "#d97706", label: "Pending"   },
  CONFIRMED: { bg: "#e0f2fe", color: "#0284c7", label: "Confirmed" },
  COMPLETED: { bg: "#1e2d45", color: "white",   label: "Completed" },
  CANCELLED: { bg: "#fee2e2", color: "#dc2626", label: "Cancelled" },
};

const tierBg: Record<string, string> = {
  classic: "#f1f5f9", premium: "#f0fdf4", black: "#1e2d45",
};
const tierColor: Record<string, string> = {
  classic: "#64748b", premium: "#16a34a", black: "white",
};

const COLS = ["Booking ID","Date","Client","Car","Pickup","Dropoff","Payment","Status","Action"];

function SortIcon() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="inline ml-1 opacity-40">
      <path d="M4 0L7 4H1L4 0Z" fill="currentColor"/>
      <path d="M4 12L1 8H7L4 12Z" fill="currentColor"/>
    </svg>
  );
}

type CountsShape = { pending: number; confirmed: number; completed: number; cancelled: number };
function FullBookingsTable({ onCountsChange }: { onCountsChange?: (counts: CountsShape) => void }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("All");
  const [page, setPage]         = useState(1);
  const [confirming, setConfirming] = useState<string | null>(null);
  const PER_PAGE = 10;

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/bookings")
      .then(r => r.json())
      .then((data: unknown) => {
        const rows = Array.isArray(data) ? (data as Booking[]) : [];
        setBookings(rows);
        if (onCountsChange) {
          onCountsChange({
            pending:   rows.filter(b => b.status === "PENDING").length,
            confirmed: rows.filter(b => b.status === "CONFIRMED").length,
            completed: rows.filter(b => b.status === "COMPLETED").length,
            cancelled: rows.filter(b => b.status === "CANCELLED").length,
          });
        }
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [onCountsChange]);

  useEffect(() => {
    load();
    const retry = setTimeout(load, 3000);
    return () => clearTimeout(retry);
  }, [load]);

  const handleConfirm = async (id: string) => {
    setConfirming(id);
    await fetch(`/api/bookings/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    await load();
    setConfirming(null);
  };

  const filtered = bookings.filter(b =>
    (status === "All" || b.status === status) &&
    (b.clientName.toLowerCase().includes(search.toLowerCase()) ||
     b.id.toLowerCase().includes(search.toLowerCase()) ||
     b.carName.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
        <p className="text-[15px] font-bold text-gray-900">Car Bookings</p>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-1 sm:flex-none">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search client, car or ID"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="text-[12px] w-full sm:w-44 focus:outline-none placeholder-gray-300"
              suppressHydrationWarning />
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="text-[12px] text-gray-600 focus:outline-none bg-transparent cursor-pointer" suppressHydrationWarning>
              <option value="All">All Statuses</option>
              {["PENDING","CONFIRMED","COMPLETED","CANCELLED"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={load} className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-semibold"
            style={{ background: "#ef4444" }}>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Desktop table (lg+) ── */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {COLS.map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                  {h}<SortIcon />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[13px] text-gray-400">Loading bookings…</td></tr>
            )}
            {!loading && paged.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[13px] text-gray-400">No bookings found.</td></tr>
            )}
            {!loading && paged.map(b => {
              const sc = statusConfig[b.status];
              const date = new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              return (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-gray-700 whitespace-nowrap font-mono text-[10px]">{b.id.slice(0, 10)}…</td>
                  <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{date}</td>
                  <td className="px-4 py-3.5 font-medium text-gray-800 whitespace-nowrap">{b.clientName}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="text-gray-800 font-medium mr-1.5">{b.carName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{ background: tierBg[b.carTier] ?? "#f1f5f9", color: tierColor[b.carTier] ?? "#64748b" }}>
                      {b.carTier}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 max-w-[140px] truncate">{b.pickup}</td>
                  <td className="px-4 py-3.5 text-gray-500 max-w-[140px] truncate">{b.dropoff}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="font-bold text-gray-800 mr-1.5">${b.total.toFixed(2)}</span>
                    {b.paymentStatus === "PAID"
                      ? <span className="text-[11px] text-green-600 font-medium">Paid</span>
                      : <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#fef3c7", color: "#d97706" }}>Unpaid</span>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
                      style={{ background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {b.status === "PENDING" && (
                      <button
                        onClick={() => handleConfirm(b.id)}
                        disabled={confirming === b.id}
                        className="no-hover-fx px-3 py-1 rounded-lg text-white text-[11px] font-semibold"
                        style={{ background: confirming === b.id ? "#9ca3af" : "#2D0A53" }}>
                        {confirming === b.id ? "…" : "Confirm"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list (< lg) ── */}
      <div className="lg:hidden">
        {loading && (
          <p className="px-4 py-8 text-center text-[13px] text-gray-400">Loading bookings…</p>
        )}
        {!loading && paged.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-gray-400">No bookings found.</p>
        )}
        {!loading && paged.map(b => {
          const sc = statusConfig[b.status];
          const date = new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          return (
            <div key={b.id} className="border-b border-gray-100 px-4 py-4">
              {/* Row 1: ID + Status */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-gray-400 font-semibold">{b.id.slice(0, 12)}…</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: sc.bg, color: sc.color }}>
                  {sc.label}
                </span>
              </div>
              {/* Row 2: Client + Car */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-semibold text-gray-900">{b.clientName}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-gray-600">{b.carName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ background: tierBg[b.carTier] ?? "#f1f5f9", color: tierColor[b.carTier] ?? "#64748b" }}>
                    {b.carTier}
                  </span>
                </div>
              </div>
              {/* Row 3: Route */}
              <div className="flex flex-col gap-1 mb-2 pl-1">
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2D0A53] shrink-0 mt-1" />
                  <p className="text-[11px] text-gray-500 leading-tight truncate">{b.pickup}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />
                  <p className="text-[11px] text-gray-500 leading-tight truncate">{b.dropoff}</p>
                </div>
              </div>
              {/* Row 4: Payment + Date + Action */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-gray-900">${b.total.toFixed(2)}</span>
                  {b.paymentStatus === "PAID"
                    ? <span className="text-[11px] text-green-600 font-medium">Paid</span>
                    : <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#fef3c7", color: "#d97706" }}>Unpaid</span>
                  }
                  <span className="text-[11px] text-gray-400">{date}</span>
                </div>
                {b.status === "PENDING" && (
                  <button
                    onClick={() => handleConfirm(b.id)}
                    disabled={confirming === b.id}
                    className="no-hover-fx px-3 py-1.5 rounded-lg text-white text-[11px] font-semibold"
                    style={{ background: confirming === b.id ? "#9ca3af" : "#2D0A53" }}>
                    {confirming === b.id ? "…" : "Confirm"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">Rows per page:</span>
          <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none" suppressHydrationWarning>
            <option>10</option><option>20</option><option>50</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button className="no-hover-fx w-7 h-7 rounded flex items-center justify-center text-gray-400 text-[12px] disabled:opacity-30"
            disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n}
              className="no-hover-fx w-7 h-7 rounded text-[11px] font-medium"
              style={{ background: n === page ? "linear-gradient(90deg,#2D0A53,#8B7500)" : "transparent", color: n === page ? "white" : "#6b7280" }}
              onClick={() => setPage(n)}>{n}</button>
          ))}
          <button className="no-hover-fx w-7 h-7 rounded flex items-center justify-center text-gray-400 text-[12px] disabled:opacity-30"
            disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          <span className="text-[11px] text-gray-400 ml-1">Next</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const [counts,   setCounts]   = useState({ pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
  const [chartData, setChartData] = useState<OverviewItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(d => {
        if (d?.monthlyBookings) {
          setChartData(d.monthlyBookings.map((b: { m: string; done: number; cancelled: number }) => ({ m: b.m, done: b.done, cancelled: b.cancelled })));
        }
      })
      .catch(console.error);
  }, []);

  const livStats = [
    { label: "Pending Bookings",   value: counts.pending,   pct: "", up: true  },
    { label: "Confirmed Bookings", value: counts.confirmed, pct: "", up: true  },
    { label: "Cancelled Bookings", value: counts.cancelled, pct: "", up: false },
    { label: "Completed Bookings", value: counts.completed, pct: "", up: true  },
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="p-5 space-y-5 min-h-full">
        {/* Top: live stats + bar chart */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
          <div className="grid grid-cols-2 gap-3">
            {livStats.map(s => <BookingStatCard key={s.label} s={s} />)}
          </div>
          <BookingsBarChart data={chartData} />
        </div>

        {/* Full bookings table */}
        <FullBookingsTable onCountsChange={setCounts} />
      </div>
    </div>
  );
}
