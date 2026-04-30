"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// ── Stat Cards ─────────────────────────────────────────────────────────────
const stats = [
  { label: "Total Revenue",   value: "$8,450",   pct: "+2.86%", up: true,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { label: "New Bookings",    value: "386",      pct: "+1.73%", up: true,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { label: "Rented Cars",     value: "214 Unit", pct: "-2.86%", up: false,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14l4 4v4a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg> },
  { label: "Available Cars",  value: "89 Unit",  pct: "+3.45%", up: true,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
];

function StatCard({ stat }: { stat: typeof stats[0] }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "#f3f0ff" }}>
        {stat.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 font-medium mb-0.5">{stat.label}</p>
        <p className="text-[22px] font-bold text-gray-900 leading-tight">{stat.value}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: stat.up ? "#dcfce7" : "#fee2e2", color: stat.up ? "#16a34a" : "#dc2626" }}>
            {stat.up ? "↑" : "↓"} {stat.pct}
          </span>
          <span className="text-[11px] text-gray-400">from last week</span>
        </div>
      </div>
    </div>
  );
}

// ── Earnings Summary (SVG Area Chart) ─────────────────────────────────────
const earningsData = [
  { month: "Jan", v: 12000 }, { month: "Feb", v: 9500 },  { month: "Mar", v: 15000 },
  { month: "Apr", v: 18450 }, { month: "May", v: 10000 }, { month: "Jun", v: 7500 },
  { month: "Jul", v: 11000 }, { month: "Aug", v: 9000 },
];
const E_MAX = 24000;
const E_W = 340; const E_H = 100; const E_PAD = 8;
const yLabels = ["$24K","$18K","$12K","$6K","$0"];

function smoothPath(pts: {x:number;y:number}[]) {
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i-1].x + pts[i].x) / 2;
    d += ` C ${mx},${pts[i-1].y} ${mx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  return d;
}

function EarningsChart() {
  const pts = earningsData.map((d, i) => ({
    x: E_PAD + (i / (earningsData.length - 1)) * (E_W - E_PAD * 2),
    y: E_PAD + (1 - d.v / E_MAX) * (E_H - E_PAD * 2),
  }));
  const peakIdx = earningsData.findIndex(d => d.v === Math.max(...earningsData.map(d => d.v)));
  const linePath = smoothPath(pts);
  const areaPath = linePath + ` L ${pts[pts.length-1].x},${E_H} L ${pts[0].x},${E_H} Z`;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold text-gray-900">Earnings Summary</p>
        <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option>Last 8 Month</option><option>Last 6 Months</option><option>This Year</option>
        </select>
      </div>
      <div className="flex gap-2">
        {/* Y-axis */}
        <div className="flex flex-col justify-between text-right shrink-0" style={{ height: `${E_H}px` }}>
          {yLabels.map((l,i) => <span key={i} className="text-[9px] text-gray-400 leading-none">{l}</span>)}
        </div>
        {/* SVG */}
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
            {/* Tooltip at peak */}
            <g>
              <rect x={pts[peakIdx].x - 38} y={pts[peakIdx].y - 36} width="76" height="30" rx="6"
                fill="white" stroke="#e5e7eb" strokeWidth="1"/>
              <text x={pts[peakIdx].x} y={pts[peakIdx].y - 22} textAnchor="middle" fontSize="8" fill="#9ca3af">April 2028</text>
              <text x={pts[peakIdx].x} y={pts[peakIdx].y - 12} textAnchor="middle" fontSize="10" fontWeight="700" fill="#111827">$18,450</text>
              <line x1={pts[peakIdx].x} y1={pts[peakIdx].y - 6} x2={pts[peakIdx].x} y2={pts[peakIdx].y - 4}
                stroke="#e5e7eb" strokeWidth="1"/>
            </g>
          </svg>
          {/* X-axis labels */}
          <div className="flex justify-between mt-1 px-[8px]">
            {earningsData.map(d => <span key={d.month} className="text-[9px] text-gray-400">{d.month}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rent Status (SVG Donut) ────────────────────────────────────────────────
function RentStatusChart() {
  const r = 46; const cx = 65; const cy = 68;
  const c = 2 * Math.PI * r;
  const hired = 0.58 * c; const pending = 0.24 * c; const cancelled = 0.18 * c;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold text-gray-900">Rent Status</p>
        <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option>This Week</option><option>This Month</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <svg width="136" height="136" viewBox="0 0 136 136">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="22" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d45" strokeWidth="22"
            strokeDasharray={`${hired} ${c - hired}`} strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="22"
            strokeDasharray={`${pending} ${c - pending}`} strokeDashoffset={-hired}
            transform={`rotate(-90 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#d1d5db" strokeWidth="22"
            strokeDasharray={`${cancelled} ${c - cancelled}`} strokeDashoffset={-(hired + pending)}
            transform={`rotate(-90 ${cx} ${cy})`} />
        </svg>
        <div className="flex flex-col gap-2.5">
          {[
            { label: "Hired",     pct: "58%", up: true,  color: "#1e2d45" },
            { label: "Pending",   pct: "24%", up: false, color: "#ef4444" },
            { label: "Cancelled", pct: "18%", up: true,  color: "#d1d5db" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
              <span className="text-[12px] text-gray-600 w-16">{l.label}</span>
              <span className="text-[12px] font-bold text-gray-800">{l.pct}</span>
              <span className="text-[11px]" style={{ color: l.up ? "#16a34a" : "#dc2626" }}>{l.up ? "↑" : "↓"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bookings Overview (Bar Chart) ──────────────────────────────────────────
const barData = [
  { m: "Jan", v: 450 }, { m: "Feb", v: 520 }, { m: "Mar", v: 640 }, { m: "Apr", v: 985 },
  { m: "May", v: 580 }, { m: "Jun", v: 510 }, { m: "Jul", v: 560 }, { m: "Aug", v: 490 },
  { m: "Sep", v: 620 }, { m: "Oct", v: 670 }, { m: "Nov", v: 540 }, { m: "Dec", v: 480 },
];
const BAR_Y_MAX = 1000;
const BAR_H = 120;

function BookingsBarChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold text-gray-900">Bookings Overview</p>
        <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option>This Year</option><option>Last Year</option>
        </select>
      </div>
      <div className="flex gap-2">
        {/* Y-axis */}
        <div className="flex flex-col justify-between text-right shrink-0 pr-1" style={{ height: `${BAR_H}px` }}>
          {["900","600","300","0"].map((l,i) => <span key={i} className="text-[9px] text-gray-400 leading-none">{l}</span>)}
        </div>
        {/* Chart area */}
        <div className="flex-1 relative">
          {[0,1/3,2/3,1].map((f,i) => (
            <div key={i} className="absolute left-0 right-0 border-t border-dashed border-gray-100"
              style={{ top: `${f * BAR_H}px` }} />
          ))}
          <div className="flex items-end gap-1 relative" style={{ height: `${BAR_H}px` }}>
            {barData.map((d, i) => {
              const hi = d.v === Math.max(...barData.map(x => x.v));
              const h  = Math.round((d.v / BAR_Y_MAX) * BAR_H);
              return (
                <div key={d.m} className="flex-1 flex items-end cursor-pointer relative"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}>
                  {hovered === i && (
                    <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 bg-white border border-gray-100 rounded-xl px-3 py-1.5 text-center shadow-lg whitespace-nowrap">
                      <p className="text-[9px] text-gray-400">Apr 2028</p>
                      <p className="text-[14px] font-bold text-gray-900">{d.v}</p>
                    </div>
                  )}
                  <div className="w-full rounded-t" style={{ height: `${h}px`, background: hi ? "#ef4444" : "#1e2d45" }} />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-1">
            {barData.map(d => <div key={d.m} className="flex-1 text-center"><span className="text-[9px] text-gray-400">{d.m}</span></div>)}
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
type DBooking = { id: string; date: string; client: string; car: string; carType: string; plan: string; from: string; to: string; amount: string; paid: boolean; status: DBStatus; };
const dbBookings: DBooking[] = [
  { id:"BK-WZ1001", date:"Aug 1, 2028",  client:"Alice Johnson",   car:"Toyota Corolla",   carType:"Sedan",     plan:"2 Days",  from:"Aug 1, 2028",  to:"Aug 2, 2028",  amount:"$50",   paid:true,  status:"Returned" },
  { id:"BK-WZ1002", date:"Aug 1, 2028",  client:"Bob Smith",       car:"Honda Civic",      carType:"Sedan",     plan:"7 Days",  from:"Aug 1, 2028",  to:"Aug 8, 2028",  amount:"$350",  paid:false, status:"Ongoing"  },
  { id:"BK-WZ1003", date:"Aug 2, 2028",  client:"Charlie Davis",   car:"Ford Focus",       carType:"Hatchback", plan:"31 Days", from:"Aug 2, 2028",  to:"Sep 2, 2028",  amount:"$1000", paid:true,  status:"Ongoing"  },
  { id:"BK-WZ1004", date:"Aug 2, 2028",  client:"Diana White",     car:"Chevrolet Malibu", carType:"Sedan",     plan:"1 Day",   from:"Aug 2, 2028",  to:"Aug 3, 2028",  amount:"$50",   paid:true,  status:"Returned" },
  { id:"BK-WZ1005", date:"Aug 3, 2028",  client:"Edward Green",    car:"Nissan Altima",    carType:"Sedan",     plan:"8 Days",  from:"Aug 3, 2028",  to:"Aug 10, 2028", amount:"$350",  paid:false, status:"Pending"  },
];
const dbStatusCfg: Record<DBStatus, { bg: string; color: string }> = {
  Returned: { bg: "#1e2d45", color: "white"   },
  Ongoing:  { bg: "#e0f2fe", color: "#0284c7" },
  Pending:  { bg: "#fef3c7", color: "#d97706" },
};
const ctBg: Record<string,string>  = { Sedan:"#f1f5f9", SUV:"#f0fdf4", Hatchback:"#fef9c3" };
const ctCol: Record<string,string> = { Sedan:"#64748b", SUV:"#16a34a", Hatchback:"#ca8a04" };

function BookingsTable() {
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showFilter, setShowFilter]   = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
    };
    if (showFilter) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showFilter]);

  const filtered = dbBookings.filter(b =>
    (filterStatus === "All" || b.status === filterStatus) &&
    (b.client.toLowerCase().includes(search.toLowerCase()) ||
     b.id.toLowerCase().includes(search.toLowerCase()) ||
     b.car.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <p className="text-[14px] font-bold text-gray-900">Car Bookings</p>
        <div className="flex items-center gap-2">
          {/* Live search */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search client name, car, etc"
              value={search} onChange={e => setSearch(e.target.value)}
              className="text-[12px] text-gray-600 focus:outline-none w-40 placeholder-gray-300"
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
      <div className="overflow-x-auto">
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
    </div>
  );
}

// ── Car Availability Panel (right sidebar) ─────────────────────────────────
const carTypes = [
  { name: "Sedan",       avail: 30, img: "/images/movo classic.png",  barColor: "#1e2d45" },
  { name: "SUV",         avail: 25, img: "/images/movo premium.png",  barColor: "#ef4444" },
  { name: "Hatchback",   avail: 20, img: "/images/prive black.png",   barColor: "#1e2d45" },
  { name: "Convertible", avail: 10, img: "/images/movo classic.png",  barColor: "#1e2d45" },
  { name: "Truck",       avail: 10, img: "/images/movo premium.png",  barColor: "#1e2d45" },
  { name: "Minivan",     avail:  5, img: "/images/prive black.png",   barColor: "#1e2d45" },
];
const activity = [
  { when: "Today", items: [
    { text: "Alex Johnson completed a booking for Toyota Corolla (TX8340)", initials: "AJ", color: "#3b82f6" },
    { text: "Bob Smith's booking for Honda Civic (H6518) is pending payment", initials: "BS", color: "#8b5cf6" },
  ]},
  { when: "Yesterday", items: [
    { text: "Charlie Davis started a monthly rental for Ford Focus (GH8081)", initials: "CD", color: "#10b981" },
    { text: "Ethan White returned the Chevrolet Malibu (CH5050)", initials: "EW", color: "#f59e0b" },
    { text: "Edward Green's booking for Nissan Altima (NS3030) is pending payment", initials: "EG", color: "#ef4444" },
  ]},
];
function CarAvailabilityPanel() {
  const [carType, setCarType] = useState("");
  const [date, setDate] = useState("2028-08-17");
  const [time, setTime] = useState("10:00");
  return (
    <aside className="w-[270px] h-full flex flex-col shrink-0 bg-white border-l border-gray-100 overflow-y-auto">
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-[13px] font-bold text-gray-900 mb-3">Car Availability</p>
        <div className="flex flex-col gap-2 mb-3">
          <select value={carType} onChange={e => setCarType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-600 focus:outline-none" suppressHydrationWarning>
            <option value="">Car Type</option>
            {carTypes.map(c => <option key={c.name}>{c.name}</option>)}
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
        <button className="no-hover-fx w-full py-2 rounded-lg text-white font-semibold text-[13px]"
          style={{ background: "#ef4444" }}>
          Check
        </button>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-bold text-gray-700">Car Types</p>
          <span className="text-gray-400 text-[16px] leading-none cursor-pointer">···</span>
        </div>
        <div className="flex flex-col gap-3">
          {carTypes.map(c => (
            <div key={c.name} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2">
              <div className="relative w-16 h-10 shrink-0 rounded-lg overflow-hidden bg-white">
                <Image src={c.img} alt={c.name} fill className="object-contain p-1" sizes="64px" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-gray-700">{c.name}</span>
                  <span className="text-[11px] font-bold text-gray-700">{c.avail}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full">
                  <div className="h-1.5 rounded-full" style={{ width: `${c.avail}%`, background: c.barColor }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-[12px] font-bold text-gray-700 mb-3">Recent Activity</p>
        {activity.map(group => (
          <div key={group.when} className="mb-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{group.when}</p>
            <div className="flex flex-col gap-3">
              {group.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5"
                    style={{ background: item.color }}>{item.initials}</div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  return (
    <div className="flex h-full overflow-hidden">

      {/* Scrollable main content */}
      <div className="flex-1 overflow-y-auto p-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {stats.map(s => <StatCard key={s.label} stat={s} />)}
        </div>

        {/* Earnings + Rent Status */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 mb-5">
          <EarningsChart />
          <RentStatusChart />
        </div>

        {/* Bookings Overview + Reminders */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 mb-5">
          <BookingsBarChart />
          <RemindersPanel />
        </div>

        {/* Bookings table */}
        <BookingsTable />
      </div>

      {/* Fixed right panel */}
      <CarAvailabilityPanel />
    </div>
  );
}
