"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type ApiStats = {
  counts: {
    total: number; pending: number; confirmed: number; completed: number; cancelled: number;
    totalDrivers: number; activeDrivers: number; onlineDrivers: number; totalClients: number;
  };
  revenue: { total: number };
  rentStatus: { hired: number; pending: number; cancelled: number };
  monthlyEarnings: { month: string; v: number }[];
  monthlyBookings: { m: string; total: number; done: number; cancelled: number }[];
  recentBookings: {
    id: string; clientName: string; carName: string; carTier: string;
    fare: number; total: number; paymentStatus: string; status: string; createdAt: string;
  }[];
  recentActivity: {
    id: string; clientName: string; carName: string; carTier: string; status: string; createdAt: string;
  }[];
  tierBreakdown: { tier: string; count: number }[];
};

// ── Stat Card Icons ────────────────────────────────────────────────────────
const STAT_ICONS = [
  <svg key="rev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  <svg key="bk"  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  <svg key="rent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14l4 4v4a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>,
  <svg key="avail" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
];

function StatCard({ label, value, icon, loading }: { label: string; value: string; icon: ReactNode; loading: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "#f3f0ff" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium mb-0.5 truncate">{label}</p>
        {loading
          ? <div className="h-5 w-20 bg-gray-100 rounded animate-pulse mt-1"/>
          : <p className="text-[15px] sm:text-[22px] font-bold text-gray-900 leading-tight truncate">{value}</p>
        }
      </div>
    </div>
  );
}

// ── Earnings Summary (SVG Area Chart) ─────────────────────────────────────
const E_W = 340; const E_H = 100; const E_PAD = 8;

function smoothPath(pts: {x:number;y:number}[]) {
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i-1].x + pts[i].x) / 2;
    d += ` C ${mx},${pts[i-1].y} ${mx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  return d;
}

function EarningsChart({ data, period, onPeriodChange }: { data: { month: string; v: number }[]; period: string; onPeriodChange: (p: string) => void }) {
  if (!data.length) return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-center h-40">
      <p className="text-[13px] text-gray-400">No earnings data yet.</p>
    </div>
  );
  const eMax = Math.max(...data.map(d => d.v), 1000);
  const step = Math.ceil(eMax / 4 / 1000) * 1000;
  const yMax = step * 4;
  const yLabels = [`$${yMax/1000}K`, `$${yMax*0.75/1000}K`, `$${yMax*0.5/1000}K`, `$${yMax*0.25/1000}K`, "$0"];
  const pts = data.map((d, i) => ({
    x: E_PAD + (i / Math.max(data.length - 1, 1)) * (E_W - E_PAD * 2),
    y: E_PAD + (1 - d.v / yMax) * (E_H - E_PAD * 2),
  }));
  const peakIdx = data.findIndex(d => d.v === Math.max(...data.map(d => d.v)));
  const linePath = smoothPath(pts);
  const areaPath = linePath + ` L ${pts[pts.length-1].x},${E_H} L ${pts[0].x},${E_H} Z`;
  const peak = data[peakIdx];
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold text-gray-900">Earnings Summary</p>
        <select value={period} onChange={e => onPeriodChange(e.target.value)} className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option value="3m">Last 3 Months</option>
          <option value="6m">Last 6 Months</option>
          <option value="8m">Last 8 Months</option>
          <option value="12m">Last 12 Months</option>
          <option value="all">All Time</option>
        </select>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between text-right shrink-0" style={{ height: `${E_H}px` }}>
          {yLabels.map((l,i) => <span key={i} className="text-[9px] text-gray-400 leading-none">{l}</span>)}
        </div>
        <div className="flex-1 relative">
          <svg viewBox={`0 0 ${E_W} ${E_H}`} className="w-full" style={{ height: `${E_H}px` }}>
            <defs>
              <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((f,i) => (
              <line key={i} x1={E_PAD} y1={E_PAD + f*(E_H-E_PAD*2)} x2={E_W-E_PAD} y2={E_PAD + f*(E_H-E_PAD*2)}
                stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 3"/>
            ))}
            <path d={areaPath} fill="url(#eGrad)"/>
            <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#ef4444"/>)}
            {peak && pts[peakIdx] && (
              <g>
                <rect x={pts[peakIdx].x - 38} y={pts[peakIdx].y - 36} width="76" height="30" rx="6"
                  fill="white" stroke="#e5e7eb" strokeWidth="1"/>
                <text x={pts[peakIdx].x} y={pts[peakIdx].y - 22} textAnchor="middle" fontSize="8" fill="#9ca3af">{peak.month}</text>
                <text x={pts[peakIdx].x} y={pts[peakIdx].y - 12} textAnchor="middle" fontSize="10" fontWeight="700" fill="#111827">${peak.v.toLocaleString()}</text>
                <line x1={pts[peakIdx].x} y1={pts[peakIdx].y - 6} x2={pts[peakIdx].x} y2={pts[peakIdx].y - 4} stroke="#e5e7eb" strokeWidth="1"/>
              </g>
            )}
          </svg>
          <div className="flex justify-between mt-1 px-[8px]">
            {data.map(d => <span key={d.month} className="text-[9px] text-gray-400">{d.month}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rent Status (SVG Donut) ────────────────────────────────────────────────
function RentStatusChart({ hired, pending, cancelled, period, onPeriodChange }: { hired: number; pending: number; cancelled: number; period: string; onPeriodChange: (p: string) => void }) {
  const r = 46; const cx = 65; const cy = 68;
  const c = 2 * Math.PI * r;
  const hiredArc    = (hired    / 100) * c;
  const pendingArc  = (pending  / 100) * c;
  const cancelledArc= (cancelled/ 100) * c;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold text-gray-900">Rent Status</p>
        <select value={period} onChange={e => onPeriodChange(e.target.value)} className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option value="3m">Last 3 Months</option>
          <option value="6m">Last 6 Months</option>
          <option value="8m">Last 8 Months</option>
          <option value="12m">Last 12 Months</option>
          <option value="all">All Time</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <svg width="136" height="136" viewBox="0 0 136 136">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="22" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d45" strokeWidth="22"
            strokeDasharray={`${hiredArc} ${c - hiredArc}`} strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="22"
            strokeDasharray={`${pendingArc} ${c - pendingArc}`} strokeDashoffset={-hiredArc}
            transform={`rotate(-90 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#d1d5db" strokeWidth="22"
            strokeDasharray={`${cancelledArc} ${c - cancelledArc}`} strokeDashoffset={-(hiredArc + pendingArc)}
            transform={`rotate(-90 ${cx} ${cy})`} />
        </svg>
        <div className="flex flex-col gap-2.5">
          {[
            { label: "Hired",     pct: `${hired}%`,     color: "#1e2d45" },
            { label: "Pending",   pct: `${pending}%`,   color: "#ef4444" },
            { label: "Cancelled", pct: `${cancelled}%`, color: "#d1d5db" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
              <span className="text-[12px] text-gray-600 w-16">{l.label}</span>
              <span className="text-[12px] font-bold text-gray-800">{l.pct}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bookings Overview (Bar Chart) ──────────────────────────────────────────
const BAR_H = 120;

function BookingsBarChart({ data }: { data: { m: string; total: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const barMax = Math.max(...data.map(d => d.total), 1);
  const yStep  = Math.ceil(barMax / 3 / 10) * 10;
  const yMax   = yStep * 3 || 30;
  const yLabels = [String(yMax), String(Math.round(yMax * 2/3)), String(Math.round(yMax / 3)), "0"];
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold text-gray-900">Bookings Overview</p>
        <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option>Last 8 Months</option>
        </select>
      </div>
      <div className="overflow-x-auto -mx-1">
      <div className="flex gap-2 min-w-[360px]">
        <div className="flex flex-col justify-between text-right shrink-0 pr-1" style={{ height: `${BAR_H}px` }}>
          {yLabels.map((l,i) => <span key={i} className="text-[9px] text-gray-400 leading-none">{l}</span>)}
        </div>
        <div className="flex-1 relative">
          {[0,1/3,2/3,1].map((f,i) => (
            <div key={i} className="absolute left-0 right-0 border-t border-dashed border-gray-100"
              style={{ top: `${f * BAR_H}px` }} />
          ))}
          <div className="flex items-end gap-1 relative" style={{ height: `${BAR_H}px` }}>
            {data.map((d, i) => {
              const hi = d.total === Math.max(...data.map(x => x.total));
              const h  = Math.max(Math.round((d.total / yMax) * BAR_H), d.total > 0 ? 2 : 0);
              return (
                <div key={d.m} className="flex-1 flex items-end cursor-pointer relative"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}>
                  {hovered === i && (
                    <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 bg-white border border-gray-100 rounded-xl px-3 py-1.5 text-center shadow-lg whitespace-nowrap">
                      <p className="text-[9px] text-gray-400">{d.m}</p>
                      <p className="text-[14px] font-bold text-gray-900">{d.total}</p>
                    </div>
                  )}
                  <div className="w-full rounded-t" style={{ height: `${h}px`, background: hi ? "#ef4444" : "#1e2d45" }} />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-1">
            {data.map(d => <div key={d.m} className="flex-1 text-center"><span className="text-[9px] text-gray-400">{d.m}</span></div>)}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Reminders ──────────────────────────────────────────────────────────────
const reminders = [
  { text: "Inspect and service the fleet vehicles before next dispatch cycle.", date: "2028-08-18" },
  { text: "Update the car rental pricing plans for the upcoming season.",       date: "2028-08-18" },
  { text: "Review customer feedback and implement improvements.",               date: "2028-08-18" },
];
function RemindersPanel() {
  const [list, setList]         = useState(reminders);
  const [showAdd, setShowAdd]   = useState(false);
  const [inputText, setInputText] = useState("");

  const addReminder = () => {
    if (!inputText.trim()) return;
    const d = new Date().toISOString().split("T")[0];
    setList(prev => [...prev, { text: inputText.trim(), date: d }]);
    setInputText("");
    setShowAdd(false);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px] font-bold text-gray-900">Reminders</p>
        <button
          className="no-hover-fx w-6 h-6 rounded-lg flex items-center justify-center text-[18px] leading-none transition-colors"
          style={{ background: showAdd ? "#fef3c7" : "#f9fafb", color: showAdd ? "#d97706" : "#9ca3af" }}
          onClick={() => setShowAdd(v => !v)}>+</button>
      </div>
      {showAdd && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            type="text"
            placeholder="New reminder..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addReminder(); if (e.key === "Escape") setShowAdd(false); }}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] text-gray-700 focus:outline-none placeholder-gray-300"
            suppressHydrationWarning />
          <button onClick={addReminder}
            className="no-hover-fx px-3 py-1.5 rounded-lg text-white text-[12px] font-semibold"
            style={{ background: "#ef4444" }}>Add</button>
        </div>
      )}
      <div className="flex flex-col gap-4">
        {list.map((r, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
            <div>
              <p className="text-[12px] text-gray-600 leading-relaxed">{r.text}</p>
              <p className="text-[10px] text-gray-400 mt-1">{r.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bookings Table ─────────────────────────────────────────────────────────────
type DBStatus = "Returned" | "Ongoing" | "Pending";
type RawBooking = { id: string; clientName: string; carName: string; carTier: string; fare: number; total: number; paymentStatus: string; status: string; createdAt: string; };
type DBooking = { id: string; date: string; client: string; car: string; carType: string; plan: string; from: string; to: string; amount: string; paid: boolean; status: DBStatus; };

function mapBooking(b: RawBooking): DBooking {
  const statusMap: Record<string, DBStatus> = { COMPLETED: "Returned", CONFIRMED: "Ongoing", PENDING: "Pending", CANCELLED: "Returned" };
  return {
    id:     `BK-${b.id.slice(-6).toUpperCase()}`,
    date:   new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    client: b.clientName,
    car:    b.carName,
    carType:b.carTier,
    plan:   "1 Trip",
    from:   new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    to:     "—",
    amount: `$${b.total.toLocaleString()}`,
    paid:   b.paymentStatus === "PAID",
    status: statusMap[b.status] ?? "Pending",
  };
}

const dbStatusCfg: Record<DBStatus, { bg: string; color: string }> = {
  Returned: { bg: "#1e2d45", color: "white"   },
  Ongoing:  { bg: "#e0f2fe", color: "#0284c7" },
  Pending:  { bg: "#fef3c7", color: "#d97706" },
};
const ctBg: Record<string,string>  = { classic:"#f1f5f9", premium:"#f0fdf4", black:"#1e293b" };
const ctCol: Record<string,string> = { classic:"#64748b", premium:"#16a34a", black:"#f8fafc" };

function BookingsTable({ rawBookings, loading }: { rawBookings: RawBooking[]; loading: boolean }) {
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showFilter, setShowFilter]     = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
    };
    if (showFilter) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showFilter]);

  const dbBookings = rawBookings.map(mapBooking);

  const filtered = dbBookings.filter(b =>
    (filterStatus === "All" || b.status === filterStatus) &&
    (b.client.toLowerCase().includes(search.toLowerCase()) ||
     b.id.toLowerCase().includes(search.toLowerCase()) ||
     b.car.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
        <p className="text-[14px] font-bold text-gray-900">Car Bookings</p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live search */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-1 sm:flex-none min-w-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search client name, car, etc"
              value={search} onChange={e => setSearch(e.target.value)}
              className="text-[12px] text-gray-600 focus:outline-none flex-1 min-w-0 placeholder-gray-300"
              suppressHydrationWarning />
            {search && (
              <button onClick={() => setSearch("")}
                className="no-hover-fx text-gray-300 hover:text-gray-500 text-[15px] leading-none">×</button>
            )}
          </div>
          {/* Filter dropdown */}
          <div className="relative" ref={filterRef}>
            <div
              className="flex items-center gap-1.5 border rounded-xl px-3 py-2 cursor-pointer select-none transition-colors"
              style={{
                borderColor: filterStatus !== "All" ? "#7c3aed" : "#e5e7eb",
                background:  filterStatus !== "All" ? "#f3f0ff" : "transparent",
              }}
              onClick={() => setShowFilter(v => !v)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke={filterStatus !== "All" ? "#7c3aed" : "#6b7280"} strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              <span className="text-[12px] font-medium"
                style={{ color: filterStatus !== "All" ? "#7c3aed" : "#4b5563" }}>
                {filterStatus === "All" ? "Filter" : filterStatus}
              </span>
              {filterStatus !== "All" && (
                <button onClick={e => { e.stopPropagation(); setFilterStatus("All"); }}
                  className="no-hover-fx text-[14px] leading-none ml-0.5"
                  style={{ color: "#7c3aed" }}>×</button>
              )}
            </div>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-30">
                {["All", "Returned", "Ongoing", "Pending"].map(s => (
                  <button key={s}
                    className="no-hover-fx w-full px-4 py-2 text-left text-[12px] transition-colors"
                    style={{
                      color:      s === filterStatus ? "#7c3aed" : "#374151",
                      background: s === filterStatus ? "#f3f0ff" : "transparent",
                      fontWeight: s === filterStatus ? 600 : 400,
                    }}
                    onClick={() => { setFilterStatus(s); setShowFilter(false); }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {["Booking ID","Booking Date","Client Name","Car Model","Plan","Date","Payment","Status"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const sc = dbStatusCfg[b.status];
              return (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-gray-700 whitespace-nowrap">{b.id}</td>
                  <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{b.date}</td>
                  <td className="px-4 py-3.5 font-medium text-gray-800 whitespace-nowrap">{b.client}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="font-medium text-gray-800 mr-1.5">{b.car}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ background: ctBg[b.carType] ?? "#f1f5f9", color: ctCol[b.carType] ?? "#64748b" }}>{b.carType}</span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{b.plan}</td>
                  <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{b.from} <span className="text-gray-300 mx-1">to</span> {b.to}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="font-bold text-gray-800 mr-1.5">{b.amount}</span>
                    {b.paid
                      ? <span className="text-[11px] text-gray-400">Paid</span>
                      : <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background:"#fef3c7",color:"#d97706" }}>Pending</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
                      style={{ background: sc.bg, color: sc.color }}>{b.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile booking cards ── */}
      <div className="md:hidden divide-y divide-gray-50">
        {filtered.map(b => {
          const sc = dbStatusCfg[b.status];
          return (
            <div key={b.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-gray-400">{b.id}</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: sc.bg, color: sc.color }}>{b.status}</span>
              </div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[14px] font-bold text-gray-900">{b.client}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[12px] text-gray-500">{b.car}</p>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ background: ctBg[b.carType] ?? "#f1f5f9", color: ctCol[b.carType] ?? "#64748b" }}>{b.carType}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[15px] font-bold text-gray-900">{b.amount}</p>
                  {b.paid
                    ? <p className="text-[10px] text-gray-400 mt-0.5">Paid</p>
                    : <p className="text-[10px] font-semibold text-amber-600 mt-0.5">Unpaid</p>}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>{b.from} → {b.to}</span>
                <span className="font-medium text-gray-500">{b.plan}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-gray-400">No bookings found.</p>
        )}
      </div>
    </div>
  );
}

// ── Car Availability Panel (right sidebar) ─────────────────────────────────
type TierEntry  = { tier: string; count: number };
type ActivityEntry = { id: string; clientName: string; carName: string; status: string; createdAt: string };

const TIER_IMGS: Record<string, string> = { classic: "/images/movo classic.png", premium: "/images/movo premium.png", black: "/images/prive black.png" };
const TIER_COLORS = ["#1e2d45", "#ef4444", "#8b5cf6", "#06b6d4", "#22c55e"];
const ACT_COLORS  = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4"];

type AvailDriver = { id:string; name:string; car:string; plate:string; tier:string; isOnline:boolean; available:boolean; };
type AvailResult = { total:number; available:number; busy:number; drivers:AvailDriver[]; };

function CarAvailabilityPanel({ tiers, activityItems, loading }: { tiers: TierEntry[]; activityItems: ActivityEntry[]; loading: boolean }) {
  const [carType, setCarType]       = useState("");
  const [date, setDate]             = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime]             = useState("10:00");
  const [checking, setChecking]     = useState(false);
  const [result, setResult]         = useState<AvailResult | null>(null);
  const [checkErr, setCheckErr]     = useState("");

  const handleCheck = async () => {
    setChecking(true); setCheckErr(""); setResult(null);
    try {
      const params = new URLSearchParams({ date });
      if (carType) params.set("tier", carType);
      const r = await fetch(`/api/admin/availability?${params}`);
      const d = await r.json();
      if (d.error) setCheckErr(d.error);
      else setResult(d);
    } catch { setCheckErr("Network error"); }
    finally { setChecking(false); }
  };

  const tierTotal = tiers.reduce((s, t) => s + t.count, 0) || 1;

  const now = new Date();
  const todayItems     = activityItems.filter(a => new Date(a.createdAt).toDateString() === now.toDateString());
  const yesterdayItems = activityItems.filter(a => {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return new Date(a.createdAt).toDateString() === d.toDateString();
  });
  const olderItems = activityItems.filter(a => {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return new Date(a.createdAt) < d;
  });

  const groups = [
    { when: "Today",     items: todayItems },
    { when: "Yesterday", items: yesterdayItems },
    { when: "Earlier",   items: olderItems },
  ].filter(g => g.items.length > 0);
  return (
    <aside className="hidden xl:flex flex-col w-[270px] h-full shrink-0 bg-white border-l border-gray-100 overflow-y-auto">
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-[13px] font-bold text-gray-900 mb-3">Car Availability</p>
        <div className="flex flex-col gap-2 mb-3">
          <select value={carType} onChange={e => setCarType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-600 focus:outline-none" suppressHydrationWarning>
            <option value="">Car Type</option>
            {tiers.map(c => <option key={c.tier} value={c.tier}>{c.tier.charAt(0).toUpperCase()+c.tier.slice(1)}</option>)}
          </select>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <rect x="3" y="4" width="18" height="17" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="flex-1 text-[12px] text-gray-600 focus:outline-none bg-transparent"
              suppressHydrationWarning />
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="flex-1 text-[12px] text-gray-600 focus:outline-none bg-transparent"
              suppressHydrationWarning />
          </div>
        </div>
        <button onClick={handleCheck} disabled={checking}
          className="no-hover-fx w-full py-2 rounded-lg text-white font-semibold text-[13px] flex items-center justify-center gap-2"
          style={{ background: checking ? "#fca5a5" : "#ef4444" }}>
          {checking && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
          {checking ? "Checking…" : "Check"}
        </button>

        {/* ── Results ── */}
        {checkErr && <p className="mt-2 text-[10px] text-red-400 text-center">{checkErr}</p>}
        {result && (
          <div className="mt-3">
            <div className="flex gap-2 mb-2">
              <div className="flex-1 bg-green-50 rounded-xl p-2 text-center">
                <p className="text-[18px] font-bold text-green-600">{result.available}</p>
                <p className="text-[9px] text-green-500 font-medium">Available</p>
              </div>
              <div className="flex-1 bg-red-50 rounded-xl p-2 text-center">
                <p className="text-[18px] font-bold text-red-400">{result.busy}</p>
                <p className="text-[9px] text-red-400 font-medium">Busy</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-[18px] font-bold text-gray-600">{result.total}</p>
                <p className="text-[9px] text-gray-400 font-medium">Total</p>
              </div>
            </div>
            {result.drivers.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-2">No active drivers found.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                {result.drivers.map(d => (
                  <div key={d.id} className="flex items-center gap-2 rounded-lg p-1.5"
                    style={{ background: d.available ? "#f0fdf4" : "#fef2f2" }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.available ? "#22c55e" : "#ef4444" }}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-800 truncate">{d.name}</p>
                      <p className="text-[9px] text-gray-400 truncate">{d.car} · {d.plate}</p>
                    </div>
                    <span className="text-[9px] font-semibold shrink-0" style={{ color: d.available ? "#16a34a" : "#dc2626" }}>
                      {d.available ? "Free" : "Busy"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-bold text-gray-700">Car Types</p>
          <span className="text-gray-400 text-[16px] leading-none cursor-pointer">···</span>
        </div>
        <div className="flex flex-col gap-3">
          {loading && <div className="h-20 bg-gray-50 rounded-xl animate-pulse"/>}
          {!loading && tiers.length === 0 && <p className="text-[12px] text-gray-400 text-center py-4">No vehicles registered.</p>}
          {tiers.map((c, idx) => {
            const pct = Math.round((c.count / tierTotal) * 100);
            const img = TIER_IMGS[c.tier.toLowerCase()] ?? "/images/movo classic.png";
            return (
              <div key={c.tier} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2">
                <div className="relative w-16 h-10 shrink-0 rounded-lg overflow-hidden bg-white">
                  <Image src={img} alt={c.tier} fill className="object-contain p-1" sizes="64px" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-gray-700 capitalize">{c.tier}</span>
                    <span className="text-[11px] font-bold text-gray-700">{c.count} car{c.count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: TIER_COLORS[idx % TIER_COLORS.length] }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-[12px] font-bold text-gray-700 mb-3">Recent Activity</p>
        {loading && <div className="h-16 bg-gray-50 rounded-xl animate-pulse"/>}
        {!loading && groups.length === 0 && <p className="text-[12px] text-gray-400 text-center py-4">No recent activity.</p>}
        {groups.map(group => (
          <div key={group.when} className="mb-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{group.when}</p>
            <div className="flex flex-col gap-3">
              {group.items.map((item, i) => {
                const initials = item.clientName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
                const color    = ACT_COLORS[item.clientName.charCodeAt(0) % ACT_COLORS.length];
                const verb     = item.status === "COMPLETED" ? "completed" : item.status === "CONFIRMED" ? "confirmed" : "placed";
                return (
                  <div key={item.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5"
                      style={{ background: color }}>{initials}</div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{item.clientName} {verb} a booking for {item.carName}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [apiData, setApiData] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [earningsPeriod, setEarningsPeriod] = useState("8m");

  useEffect(() => {
    setLoading(true);
    const url = new URL("/api/admin/stats", window.location.origin);
    url.searchParams.set("period", earningsPeriod);
    fetch(url.toString())
      .then(r => r.json())
      .then(setApiData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [earningsPeriod]);

  const c = apiData?.counts;
  const statCards = [
    { label: "Total Revenue",  value: c ? `$${apiData!.revenue.total.toLocaleString()}` : "—" },
    { label: "New Bookings",   value: c ? String(c.total) : "—" },
    { label: "Rented Cars",    value: c ? `${c.confirmed + c.completed} Units` : "—" },
    { label: "Available Cars", value: c ? `${c.activeDrivers} Units` : "—" },
  ];

  return (
    <div className="flex h-full overflow-hidden">

      {/* Scrollable main content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-5">
          {statCards.map((s, i) => (
            <StatCard key={s.label} label={s.label} value={s.value} icon={STAT_ICONS[i]} loading={loading} />
          ))}
        </div>

        {/* Earnings + Rent Status */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 sm:gap-4 mb-4 sm:mb-5">
          <EarningsChart data={apiData?.monthlyEarnings ?? []} period={earningsPeriod} onPeriodChange={setEarningsPeriod} />
          <RentStatusChart
            hired={apiData?.rentStatus.hired ?? 0}
            pending={apiData?.rentStatus.pending ?? 0}
            cancelled={apiData?.rentStatus.cancelled ?? 0}
            period={earningsPeriod}
            onPeriodChange={setEarningsPeriod}
          />
        </div>

        {/* Bookings Overview + Reminders */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 sm:gap-4 mb-4 sm:mb-5">
          <BookingsBarChart data={(apiData?.monthlyBookings ?? []).map(b => ({ m: b.m, total: b.total }))} />
          <RemindersPanel />
        </div>

        {/* Bookings table */}
        <BookingsTable rawBookings={apiData?.recentBookings ?? []} loading={loading} />
      </div>

      {/* Fixed right panel */}
      <CarAvailabilityPanel
        tiers={apiData?.tierBreakdown ?? []}
        activityItems={apiData?.recentActivity ?? []}
        loading={loading}
      />
    </div>
  );
}
