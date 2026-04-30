"use client";

import { useState } from "react";

// ── Sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ up }: { up: boolean }) {
  const pts = up
    ? "0,18 8,14 16,10 24,7 32,4 40,1"
    : "0,1 8,4 16,7 24,11 32,14 40,18";
  return (
    <svg width="42" height="20" viewBox="0 0 42 20">
      <polyline points={pts} fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Booking Stat Mini-Cards ────────────────────────────────────────────────
const bookingStats = [
  { label: "Upcoming Bookings", value: 145, pct: "-5.14%", up: false },
  { label: "Pending Bookings",  value: 106, pct: "-2.30%", up: false },
  { label: "Confirmed Bookings", value: 86, pct: "+8.20%", up: true  },
  { label: "Completed Bookings", value: 298, pct: "+12.5%", up: true  },
];

function BookingStatCard({ s }: { s: typeof bookingStats[0] }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] text-gray-400 font-medium leading-tight">{s.label}</p>
        <Sparkline up={s.up} />
      </div>
      <div>
        <p className="text-[22px] font-bold text-gray-900 leading-none">{s.value}</p>
        <p className={`text-[11px] font-semibold mt-0.5 ${s.up ? "text-green-500" : "text-red-500"}`}>{s.pct}</p>
      </div>
    </div>
  );
}

// ── Bookings Bar Chart ─────────────────────────────────────────────────────
const barMonths = [
  { m: "Feb", v: 80 }, { m: "Mar", v: 120 }, { m: "Apr", v: 160 }, { m: "May", v: 140 },
  { m: "Jun", v: 200 }, { m: "Jul", v: 180 }, { m: "Aug", v: 301 }, { m: "Sep", v: 220 },
];
function BookingsBarChart() {
  const max = Math.max(...barMonths.map(d => d.v));
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-bold text-gray-900">Bookings Overview</p>
        <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option>Last 3 Months</option><option>Last 6 Months</option><option>This Year</option>
        </select>
      </div>
      <div className="flex items-end gap-1.5 flex-1">
        {barMonths.map(d => {
          const h = (d.v / max) * 100;
          const hi = d.m === "Aug";
          return (
            <div key={d.m} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t" style={{ height: `${h}%`, background: hi ? "#ef4444" : "#ddd0f5" }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {barMonths.map(d => (
          <div key={d.m} className="flex-1 text-center">
            <span className="text-[9px] text-gray-400">{d.m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bookings Table ─────────────────────────────────────────────────────────
type BStatus = "Pending" | "Ongoing" | "Confirmed" | "Cancelled";
type Booking = { id: string; date: string; client: string; car: string; stay: string; from: string; to: string; amount: string; status: BStatus; };

const allBookings: Booking[] = [
  { id:"BK-40200", date:"Aug 1, 2025",  client:"Alex Johnson",    car:"Toyota Prado (TX000)",      stay:"3 Days",  from:"Aug 1, 2025",  to:"Aug 3, 2025",  amount:"$90",   status:"Pending"   },
  { id:"BK-40201", date:"Aug 2, 2025",  client:"Ben Smith",       car:"Honda Civic (DS001)",       stay:"7 Days",  from:"Aug 2, 2025",  to:"Aug 8, 2025",  amount:"$182",  status:"Ongoing"   },
  { id:"BK-40202", date:"Aug 2, 2025",  client:"Charlie Book",    car:"Ford Fiesta (FF202)",       stay:"8 Days",  from:"Aug 2, 2025",  to:"Aug 9, 2025",  amount:"$320",  status:"Confirmed" },
  { id:"BK-40203", date:"Aug 3, 2025",  client:"Ethan White",     car:"Chevrolet Malibu (CH050)",  stay:"1 Day",   from:"Aug 3, 2025",  to:"Aug 4, 2025",  amount:"$848",  status:"Cancelled" },
  { id:"BK-40204", date:"Aug 3, 2025",  client:"Colward Green",   car:"Nissan Altima (NS101)",     stay:"8 Days",  from:"Aug 3, 2025",  to:"Aug 10, 2025", amount:"$620",  status:"Confirmed" },
  { id:"BK-40205", date:"Aug 4, 2025",  client:"Panda Brown",     car:"BMW X5 (BW5G1)",            stay:"10 Days", from:"Aug 4, 2025",  to:"Aug 14, 2025", amount:"$1200", status:"Ongoing"   },
  { id:"BK-40206", date:"Aug 4, 2025",  client:"George Dark",     car:"Audi Q7 (AQ700)",           stay:"2 Days",  from:"Aug 4, 2025",  to:"Aug 6, 2025",  amount:"$576",  status:"Cancelled" },
  { id:"BK-40207", date:"Aug 4, 2025",  client:"Alyson Manning",  car:"Honda Accord (HA8990)",     stay:"7 Days",  from:"Aug 4, 2025",  to:"Aug 11, 2025", amount:"$490",  status:"Pending"   },
  { id:"BK-40208", date:"Aug 5, 2025",  client:"Ivan Rodriguez",  car:"Mazda CX-5 (MC500)",        stay:"9 Days",  from:"Aug 5, 2025",  to:"Aug 14, 2025", amount:"$101",  status:"Ongoing"   },
  { id:"BK-40209", date:"Aug 5, 2025",  client:"Luna Wilson",     car:"Mercedes C-Class (MC01)",   stay:"2 Days",  from:"Aug 5, 2025",  to:"Aug 7, 2025",  amount:"$188",  status:"Pending"   },
];

const statusStyle: Record<BStatus, { bg: string; color: string }> = {
  Pending:   { bg: "#fef3c7", color: "#d97706" },
  Ongoing:   { bg: "#dbeafe", color: "#2563eb" },
  Confirmed: { bg: "#dcfce7", color: "#16a34a" },
  Cancelled: { bg: "#fee2e2", color: "#dc2626" },
};

function FullBookingsTable() {
  const [search, setSearch]   = useState("");
  const [carType, setCarType] = useState("All");
  const [status, setStatus]   = useState("All");
  const [page, setPage]       = useState(1);
  const PER_PAGE = 10;

  const filtered = allBookings.filter(b =>
    (status === "All" || b.status === status) &&
    (b.client.toLowerCase().includes(search.toLowerCase()) ||
     b.id.toLowerCase().includes(search.toLowerCase()) ||
     b.car.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Table toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search client, unit…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="text-[12px] w-44 focus:outline-none placeholder-gray-300"
            suppressHydrationWarning />
        </div>
        <div className="flex items-center gap-2">
          <select value={carType} onChange={e => setCarType(e.target.value)}
            className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none" suppressHydrationWarning>
            <option value="All">Car Type ▾</option>
            {["Toyota","Honda","BMW","Mercedes","Nissan","Chevrolet","Audi","Mazda","Ford"].map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none" suppressHydrationWarning>
            {["All","Pending","Ongoing","Confirmed","Cancelled"].map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-semibold"
            style={{ background: "#ef4444" }}>
            + Add Booking
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-gray-100">
              {["Booking #","Booking Date","Client Name","Vehicle","Stay","Date Out","Date In","Payment","Status"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(b => {
              const s = statusStyle[b.status];
              return (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{b.id}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{b.client}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.car}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.stay}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.from}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.to}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{b.amount}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap"
                      style={{ background: s.bg, color: s.color }}>
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
