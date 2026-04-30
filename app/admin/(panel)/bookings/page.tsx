"use client";

import React, { useState } from "react";

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
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Icon + Label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "#e0f2fe" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <p className="text-[12px] text-gray-500 font-medium">{s.label}</p>
      </div>
      {/* Number + Wave */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[28px] font-bold text-gray-900 leading-none">{s.value}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: s.up ? "#dcfce7" : "#fee2e2", color: s.up ? "#16a34a" : "#dc2626" }}>
              {s.up ? "↑" : "↓"} {s.pct}
            </span>
            <span className="text-[11px] text-gray-400">from last week</span>
          </div>
        </div>
        {s.up ? <UpWave /> : <DownWave />}
      </div>
    </div>
  );
}

// ── Bookings Bar Chart (bidirectional) ────────────────────────────────────
const overviewData = [
  { m: "Jan", done: 300, cancelled: 350 },
  { m: "Feb", done: 320, cancelled: 400 },
  { m: "Mar", done: 380, cancelled: 430 },
  { m: "Apr", done: 350, cancelled: 430 },
  { m: "May", done: 310, cancelled: 370 },
  { m: "Jun", done: 586, cancelled: 450 },
  { m: "Jul", done: 330, cancelled: 370 },
  { m: "Aug", done: 280, cancelled: 330 },
  { m: "Sep", done: 300, cancelled: 360 },
  { m: "Oct", done: 360, cancelled: 410 },
  { m: "Nov", done: 340, cancelled: 430 },
  { m: "Dec", done: 380, cancelled: 480 },
];
const MAX_VAL = 600;
const HALF_H = 110;

function BookingsBarChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
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
        <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option>Last 8 Month</option><option>Last 6 Months</option><option>This Year</option>
        </select>
      </div>

      {/* Chart body */}
      <div className="flex gap-2">
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
            {overviewData.map((d, i) => {
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
      <div className="flex gap-1 mt-1 pl-8">
        {overviewData.map(d => (
          <div key={d.m} className="flex-1 text-center">
            <span className="text-[9px] text-gray-400">{d.m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bookings Table ─────────────────────────────────────────────────────────
type BStatus = "Returned" | "Ongoing" | "Cancelled";
type Booking = {
  id: string; date: string; client: string;
  car: string; carType: "Sedan" | "SUV" | "Hatchback";
  plan: string; from: string; to: string;
  amount: string; paid: boolean; driver: boolean;
  status: BStatus;
};

const allBookings: Booking[] = [
  { id:"BK-WZ1001", date:"Aug 1, 2028",  client:"Alice Johnson",   car:"Toyota Corolla",   carType:"Sedan",     plan:"2 Days",  from:"Aug 1, 2028",  to:"Aug 2, 2028",  amount:"$50",   paid:true,  driver:false, status:"Returned"  },
  { id:"BK-WZ1002", date:"Aug 1, 2028",  client:"Bob Smith",       car:"Honda Civic",      carType:"Sedan",     plan:"7 Days",  from:"Aug 1, 2028",  to:"Aug 8, 2028",  amount:"$350",  paid:false, driver:true,  status:"Ongoing"   },
  { id:"BK-WZ1003", date:"Aug 2, 2028",  client:"Charlie Davis",   car:"Ford Focus",       carType:"Hatchback", plan:"31 Days", from:"Aug 2, 2028",  to:"Sep 2, 2028",  amount:"$1000", paid:true,  driver:false, status:"Ongoing"   },
  { id:"BK-WZ1004", date:"Aug 2, 2028",  client:"Diana White",     car:"Chevrolet Malibu", carType:"Sedan",     plan:"1 Day",   from:"Aug 2, 2028",  to:"Aug 3, 2028",  amount:"$50",   paid:true,  driver:true,  status:"Returned"  },
  { id:"BK-WZ1005", date:"Aug 3, 2028",  client:"Edward Green",    car:"Nissan Altima",    carType:"Sedan",     plan:"8 Days",  from:"Aug 3, 2028",  to:"Aug 10, 2028", amount:"$350",  paid:false, driver:false, status:"Cancelled" },
  { id:"BK-WZ1006", date:"Aug 3, 2028",  client:"Fiona Brown",     car:"BMW X5",           carType:"SUV",       plan:"32 Days", from:"Aug 3, 2028",  to:"Sep 3, 2028",  amount:"$1500", paid:true,  driver:true,  status:"Ongoing"   },
  { id:"BK-WZ1007", date:"Aug 4, 2028",  client:"George Clark",    car:"Audi Q7",          carType:"SUV",       plan:"2 Days",  from:"Aug 4, 2028",  to:"Aug 5, 2028",  amount:"$70",   paid:true,  driver:false, status:"Returned"  },
  { id:"BK-WZ1008", date:"Aug 4, 2028",  client:"Hannah Lee",      car:"Mercedes C-Class", carType:"Sedan",     plan:"5 Days",  from:"Aug 4, 2028",  to:"Aug 9, 2028",  amount:"$600",  paid:true,  driver:true,  status:"Ongoing"   },
  { id:"BK-WZ1009", date:"Aug 5, 2028",  client:"Ivan Torres",     car:"Mazda CX-5",       carType:"SUV",       plan:"3 Days",  from:"Aug 5, 2028",  to:"Aug 8, 2028",  amount:"$210",  paid:false, driver:false, status:"Cancelled" },
  { id:"BK-WZ1010", date:"Aug 5, 2028",  client:"Julia Kim",       car:"Toyota Prado",     carType:"SUV",       plan:"10 Days", from:"Aug 5, 2028",  to:"Aug 15, 2028", amount:"$900",  paid:true,  driver:true,  status:"Returned"  },
];

const statusConfig: Record<BStatus, { bg: string; color: string; icon: React.ReactNode }> = {
  Returned: {
    bg: "#1e2d45", color: "white",
    icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>,
  },
  Ongoing: {
    bg: "#e0f2fe", color: "#0284c7",
    icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  },
  Cancelled: {
    bg: "#fee2e2", color: "#dc2626",
    icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>,
  },
};

const carTypeBg: Record<string, string> = {
  Sedan: "#f1f5f9", SUV: "#f0fdf4", Hatchback: "#fef9c3",
};
const carTypeColor: Record<string, string> = {
  Sedan: "#64748b", SUV: "#16a34a", Hatchback: "#ca8a04",
};

const COLS = ["Booking ID","Booking Date","Client Name","Car Model","Plan","Date","Driver","Payment","Status"];

function SortIcon() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="inline ml-1 opacity-40">
      <path d="M4 0L7 4H1L4 0Z" fill="currentColor"/>
      <path d="M4 12L1 8H7L4 12Z" fill="currentColor"/>
    </svg>
  );
}

function FullBookingsTable() {
  const [search, setSearch]   = useState("");
  const [carType, setCarType] = useState("All");
  const [status, setStatus]   = useState("All");
  const [page, setPage]       = useState(1);
  const PER_PAGE = 10;

  const filtered = allBookings.filter(b =>
    (carType === "All" || b.carType === carType) &&
    (status  === "All" || b.status  === status)  &&
    (b.client.toLowerCase().includes(search.toLowerCase()) ||
     b.id.toLowerCase().includes(search.toLowerCase()) ||
     b.car.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <p className="text-[15px] font-bold text-gray-900">Car Bookings</p>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search client name, car, etc"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="text-[12px] w-44 focus:outline-none placeholder-gray-300"
              suppressHydrationWarning />
          </div>
          {/* Car Type filter */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <select value={carType} onChange={e => setCarType(e.target.value)}
              className="text-[12px] text-gray-600 focus:outline-none bg-transparent cursor-pointer" suppressHydrationWarning>
              <option value="All">Car Type</option>
              {["Sedan","SUV","Hatchback"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="text-[12px] text-gray-600 focus:outline-none bg-transparent cursor-pointer" suppressHydrationWarning>
              <option value="All">Status</option>
              {["Returned","Ongoing","Cancelled"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-semibold"
            style={{ background: "#ef4444" }}>
            Add Booking
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
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
            {paged.map(b => {
              const sc = statusConfig[b.status];
              return (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  {/* Booking ID */}
                  <td className="px-4 py-3.5 font-semibold text-gray-700 whitespace-nowrap">{b.id}</td>
                  {/* Booking Date */}
                  <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{b.date}</td>
                  {/* Client Name */}
                  <td className="px-4 py-3.5 font-medium text-gray-800 whitespace-nowrap">{b.client}</td>
                  {/* Car Model + type badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="text-gray-800 font-medium mr-1.5">{b.car}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{ background: carTypeBg[b.carType], color: carTypeColor[b.carType] }}>
                      {b.carType}
                    </span>
                  </td>
                  {/* Plan */}
                  <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{b.plan}</td>
                  {/* Date range */}
                  <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                    {b.from} <span className="text-gray-300 mx-1">to</span> {b.to}
                  </td>
                  {/* Driver icon */}
                  <td className="px-4 py-3.5">
                    {b.driver
                      ? <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#dbeafe" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      : <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#fee2e2" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </span>
                    }
                  </td>
                  {/* Payment: amount + paid/pending */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="font-bold text-gray-800 mr-1.5">{b.amount}</span>
                    {b.paid
                      ? <span className="text-[11px] text-gray-400 font-medium">Paid</span>
                      : <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#fef3c7", color: "#d97706" }}>Pending</span>
                    }
                  </td>
                  {/* Status badge */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
                      style={{ background: sc.bg, color: sc.color }}>
                      {sc.icon}
                      {b.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
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

// ── Page ───────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  return (
    <div className="p-5 flex flex-col gap-5">
      {/* Top: mini stats + bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
        <div className="grid grid-cols-2 gap-3 min-w-[340px]">
          {bookingStats.map(s => <BookingStatCard key={s.label} s={s} />)}
        </div>
        <BookingsBarChart />
      </div>

      {/* Full bookings table */}
      <FullBookingsTable />
    </div>
  );
}
