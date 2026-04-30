"use client";

import { useState } from "react";

// ── Stat Cards ─────────────────────────────────────────────────────────────
const stats = [
  { label: "Total Earnings", value: "$8,450", change: "+12%", up: true, color: "#2D0A53",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { label: "Total Bookings", value: "386", change: "+8%", up: true, color: "#8B7500",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { label: "Available Units", value: "214", change: "-3%", up: false, color: "#1a1a2e",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="10" width="20" height="9" rx="2"/><path d="M5 10V8a7 7 0 0 1 14 0v2"/></svg> },
  { label: "Active Rides", value: "89", change: "+5%", up: true, color: "#059669",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/></svg> },
];

function StatCard({ stat }: { stat: typeof stats[0] }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: stat.color }}>
        {stat.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 font-medium">{stat.label}</p>
        <p className="text-[20px] font-bold text-gray-900 leading-tight">{stat.value}</p>
      </div>
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stat.up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
        {stat.change}
      </span>
    </div>
  );
}

// ── Earnings Summary (SVG Area Chart) ─────────────────────────────────────
const earningsData = [
  { month: "Jan", v: 4200 }, { month: "Feb", v: 6800 }, { month: "Mar", v: 18450 },
  { month: "Apr", v: 8200 }, { month: "May", v: 5900 },
];
function EarningsChart() {
  const W = 400; const H = 110; const PAD = 10;
  const max = Math.max(...earningsData.map(d => d.v));
  const pts = earningsData.map((d, i) => ({
    x: PAD + (i / (earningsData.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - d.v / max) * (H - PAD * 2),
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = linePath + ` L ${pts[pts.length-1].x} ${H} L ${pts[0].x} ${H} Z`;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[14px] font-bold text-gray-900">Earnings Summary</p>
          <p className="text-[11px] text-gray-400">Peak: <span className="font-semibold text-[#2D0A53]">$18,450</span></p>
        </div>
        <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option>Last 3 Months</option><option>Last 6 Months</option><option>This Year</option>
        </select>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
        <defs>
          <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D0A53" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2D0A53" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.2, 0.4, 0.6, 0.8].map(f => (
          <line key={f} x1={PAD} y1={PAD + f*(H-PAD*2)} x2={W-PAD} y2={PAD + f*(H-PAD*2)} stroke="#f3f4f6" strokeWidth="1" />
        ))}
        <path d={areaPath} fill="url(#earningsGrad)" />
        <path d={linePath} fill="none" stroke="#2D0A53" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#2D0A53" />
        ))}
      </svg>
      <div className="flex justify-between mt-1 px-[10px]">
        {earningsData.map(d => (
          <span key={d.month} className="text-[10px] text-gray-400">{d.month}</span>
        ))}
      </div>
    </div>
  );
}

// ── Rent Status (SVG Donut) ────────────────────────────────────────────────
function RentStatusChart() {
  const r = 48; const cx = 65; const cy = 65;
  const c = 2 * Math.PI * r;
  const hired = 0.26 * c; const parking = 0.38 * c; const cancelled = 0.09 * c;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold text-gray-900">Rent Status</p>
        <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option>This Week</option><option>This Month</option>
        </select>
      </div>
      <div className="flex items-center gap-4">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="20" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a2e" strokeWidth="20"
            strokeDasharray={`${hired} ${c - hired}`} strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#8B7500" strokeWidth="20"
            strokeDasharray={`${parking} ${c - parking}`} strokeDashoffset={-hired}
            transform={`rotate(-90 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="20"
            strokeDasharray={`${cancelled} ${c - cancelled}`} strokeDashoffset={-(hired + parking)}
            transform={`rotate(-90 ${cx} ${cy})`} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#1f2937">73%</text>
        </svg>
        <div className="flex flex-col gap-2">
          {[
            { label: "Hired", pct: "26%", color: "#1a1a2e" },
            { label: "Parking", pct: "38%", color: "#8B7500" },
            { label: "Cancelled", pct: "9%", color: "#ef4444" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: l.color }} />
              <span className="text-[12px] text-gray-600">{l.label}</span>
              <span className="text-[12px] font-bold text-gray-800 ml-auto pl-3">{l.pct}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bookings Overview (Bar Chart) ──────────────────────────────────────────
const barData = [
  { m: "Jan", v: 120 }, { m: "Feb", v: 160 }, { m: "Mar", v: 200 }, { m: "Apr", v: 155 },
  { m: "May", v: 230 }, { m: "Jun", v: 190 }, { m: "Jul", v: 260 }, { m: "Aug", v: 301 },
  { m: "Sep", v: 200 }, { m: "Oct", v: 170 }, { m: "Nov", v: 195 }, { m: "Dec", v: 140 },
];
function BookingsBarChart() {
  const max = Math.max(...barData.map(d => d.v));
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px] font-bold text-gray-900">Bookings Overview</p>
        <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none" suppressHydrationWarning>
          <option>This Year</option><option>Last Year</option>
        </select>
      </div>
      <div className="flex items-end gap-1.5 h-28 w-full">
        {barData.map((d) => {
          const highlight = d.m === "Aug";
          const pct = (d.v / max) * 100;
          return (
            <div key={d.m} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md transition-all"
                style={{ height: `${pct}%`, background: highlight ? "#ef4444" : "#e8d5ff" }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {barData.map(d => (
          <div key={d.m} className="flex-1 text-center">
            <span className="text-[9px] text-gray-400">{d.m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Reminders ──────────────────────────────────────────────────────────────
const reminders = [
  "Inspect and service the fleet vehicles before next dispatch cycle.",
  "Update the car rental pricing plan for the upcoming season.",
  "Review customer feedback and improvement suggestions.",
];
function RemindersPanel() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-[14px] font-bold text-gray-900 mb-4">Reminders</p>
      <div className="flex flex-col gap-3">
        {reminders.map((r, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
            </span>
            <p className="text-[12px] text-gray-600 leading-relaxed">{r}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bookings Table ─────────────────────────────────────────────────────────
type Booking = { id: string; date: string; client: string; car: string; stay: string; from: string; to: string; amount: string; status: "Pending" | "Ongoing" | "Confirmed" | "Cancelled"; };
const bookings: Booking[] = [
  { id: "BK-40350", date: "Aug 1, 2025", client: "Alex Johnson", car: "Toyota Camry (TX8000)", stay: "3 Days", from: "Aug 1, 2025", to: "Aug 3, 2025", amount: "$90", status: "Pending" },
  { id: "BK-40351", date: "Aug 1, 2025", client: "Ben Smith", car: "Honda Civic (DAM8001)", stay: "7 Days", from: "Aug 1, 2025", to: "Aug 8, 2025", amount: "$180", status: "Ongoing" },
  { id: "BK-40352", date: "Aug 3, 2025", client: "Charlotte Book", car: "Toyota Corolla (TX9020)", stay: "9 Days", from: "Aug 3, 2025", to: "Aug 12, 2025", amount: "$148", status: "Confirmed" },
  { id: "BK-40353", date: "Aug 5, 2025", client: "Ethan White", car: "Chevrolet Malibu (CH5050)", stay: "5 Days", from: "Aug 5, 2025", to: "Aug 10, 2025", amount: "$140", status: "Confirmed" },
  { id: "BK-40354", date: "Aug 5, 2025", client: "Amuel Hosen", car: "Nissan Altima (NS3030)", stay: "9 Days", from: "Aug 5, 2025", to: "Aug 14, 2025", amount: "$101", status: "Ongoing" },
];

const statusStyle: Record<Booking["status"], { bg: string; text: string }> = {
  Pending: { bg: "#fef3c7", text: "#d97706" },
  Ongoing: { bg: "#dbeafe", text: "#2563eb" },
  Confirmed: { bg: "#dcfce7", text: "#16a34a" },
  Cancelled: { bg: "#fee2e2", text: "#dc2626" },
};

function BookingsTable() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const filtered = bookings.filter(b =>
    (filter === "All" || b.status === filter) &&
    (b.client.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <p className="text-[14px] font-bold text-gray-900">Car Bookings</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text" placeholder="Search bookings..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="text-[12px] text-gray-600 focus:outline-none w-36 placeholder-gray-300"
              suppressHydrationWarning
            />
          </div>
          <select
            value={filter} onChange={e => setFilter(e.target.value)}
            className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none"
            suppressHydrationWarning
          >
            {["All", "Pending", "Ongoing", "Confirmed", "Cancelled"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-gray-100">
              {["Booking #", "Date", "Client", "Vehicle", "Stay", "Pick-up", "Drop-off", "Amount", "Status"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const s = statusStyle[b.status];
              return (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-700">{b.id}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{b.client}</td>
                  <td className="px-4 py-3 text-gray-500">{b.car}</td>
                  <td className="px-4 py-3 text-gray-500">{b.stay}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.from}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{b.to}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{b.amount}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
                      style={{ background: s.bg, color: s.text }}>
                      {b.status}
                    </span>
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
  { name: "Toyota Camry", avail: 30 },
  { name: "Honda Civic", avail: 3 },
  { name: "Chevrolet Malibu", avail: 30 },
  { name: "BMW 5 Series", avail: 63 },
  { name: "Nissan Altima", avail: 30 },
];
const activity = [
  { when: "Today", items: [
    "Alex Johnson cancelled a booking for Toyota Corolla (TX8000)",
    "Bob Smith is booking Honda Civic (DAM8001) — pending payment.",
  ]},
  { when: "Yesterday", items: [
    "Felicia Davis started a booking for Ford Focus (GH9801)",
    "Ethan White returned the Chevrolet Malibu (CH5050).",
    "Amuel Hosen's booking for Nissan Altima (NS3030) is pending payment.",
  ]},
];
function CarAvailabilityPanel() {
  const [carType, setCarType] = useState("");
  const [date, setDate] = useState("2025-08-11");
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
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-600 focus:outline-none"
            suppressHydrationWarning />
        </div>
        <button className="no-hover-fx w-full py-2 rounded-lg text-white font-semibold text-[13px]"
          style={{ background: "#ef4444" }}>
          Check
        </button>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[12px] font-bold text-gray-700 mb-3">Car Types</p>
        <div className="flex flex-col gap-3">
          {carTypes.map(c => (
            <div key={c.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-gray-600">{c.name}</span>
                <span className="text-[11px] font-semibold text-gray-700">{c.avail}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full">
                <div className="h-1.5 rounded-full"
                  style={{ width: `${c.avail}%`, background: "linear-gradient(90deg,#2D0A53,#8B7500)" }} />
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
            <div className="flex flex-col gap-2">
              {group.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D0A53] shrink-0 mt-1.5" />
                  <p className="text-[11px] text-gray-500 leading-relaxed">{item}</p>
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
