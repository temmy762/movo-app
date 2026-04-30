"use client";

import Image from "next/image";
import { useState } from "react";

// ── Mock data ────────────────────────────────────────────────────────────────
const unit = {
  id: 1,
  category: "Sedan",
  brand: "Audi",
  model: "A6",
  status: "Available" as const,
  units: 12,
  price: 50,
  about:
    "Audi A6 is a luxurious and sophisticated sedan, ideal for both daily commutes and extended journeys. Renowned for its powerful performance and advanced technology features, the A6 provides a refined driving experience with exceptional comfort.",
  images: [
    "/images/movo classic.png",
    "/images/movo premium.png",
    "/images/prive black.png",
    "/images/movo classic.png",
  ],
  specs: [
    { icon: "transmission", label: "Transmission", value: "Automatic" },
    { icon: "seats",        label: "Capacity",     value: "5 seats"   },
    { icon: "range",        label: "Range",         value: "400 miles on a full tank" },
    { icon: "fuel",         label: "Fuel",          value: "Gasoline"  },
    { icon: "speed",        label: "Top Speed",     value: "120 mph"   },
    { icon: "accel",        label: "Acceleration",  value: "8.0 seconds (0–60 mph)" },
  ],
  features: [
    "Air Conditioning",
    "AM/FM Radio with CD Player",
    "Bluetooth Connectivity",
    "USB Charging Ports",
    "Backup Camera",
    "Spacious Trunk",
    "Cruise Control",
    "Advanced Safety Features (e.g., Lane Departure Warning, Automatic Emergency Braking)",
    "Keyless Entry",
    "Power Windows and Locks",
  ],
};

const activityData = [
  { m: "Jan", km: 35 }, { m: "Feb", km: 42 }, { m: "Mar", km: 65 },
  { m: "Apr", km: 55 }, { m: "May", km: 47 }, { m: "Jun", km: 38 },
  { m: "Jul", km: 30 }, { m: "Aug", km: 25 },
];
const totalKm = 489;

const reminders = [
  { title: "Scheduled Maintenance for Toyota Corolla", date: "2028-08-10", time: "10:00 AM" },
  { title: "Unit Return for Honda Civic",              date: "2028-08-12", time: "02:00 PM" },
  { title: "Tire Replacement for BMW X5",             date: "2028-08-15", time: "03:00 AM" },
  { title: "Oil Change for Audi Q7",                  date: "2028-08-18", time: "11:30 AM" },
];

// ── Icons ─────────────────────────────────────────────────────────────────────
function SpecIcon({ type }: { type: string }) {
  const cls = "w-4 h-4 text-gray-400";
  if (type === "transmission") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="5" cy="5" r="2.5" fill="#e5e7eb"/><circle cx="19" cy="5" r="2.5" fill="#e5e7eb"/>
      <circle cx="5" cy="19" r="2.5" fill="#e5e7eb"/><circle cx="19" cy="19" r="2.5" fill="#e5e7eb"/>
      <line x1="5" y1="7.5" x2="5" y2="16.5" stroke="#9ca3af" strokeWidth="1.5"/>
      <line x1="19" y1="7.5" x2="19" y2="16.5" stroke="#9ca3af" strokeWidth="1.5"/>
      <line x1="7.5" y1="5" x2="16.5" y2="5" stroke="#9ca3af" strokeWidth="1.5"/>
    </svg>
  );
  if (type === "seats") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
      <circle cx="12" cy="7" r="3"/><path d="M5 21c0-4 3.1-7 7-7s7 3 7 7"/>
    </svg>
  );
  if (type === "range") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
      <path d="M3 12h18M15 6l6 6-6 6"/>
    </svg>
  );
  if (type === "fuel") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
      <path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M3 22h12"/>
      <path d="M15 8h2a2 2 0 0 1 2 2v5a1 1 0 0 0 2 0V9l-2-2"/>
    </svg>
  );
  if (type === "speed") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
      <path d="M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0" strokeDasharray="50 80"/>
      <path d="M12 12l3-5"/>
    </svg>
  );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
  );
}

// ── Activity Chart ────────────────────────────────────────────────────────────
function ActivityChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 280; const H = 110; const pad = { t: 10, r: 10, b: 20, l: 28 };
  const maxKm = 80;
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const pts = activityData.map((d, i) => ({
    x: pad.l + (i / (activityData.length - 1)) * cw,
    y: pad.t + ch - (d.km / maxKm) * ch,
    ...d,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `M${pts[0].x},${pts[0].y} ` + pts.slice(1).map(p => `L${p.x},${p.y}`).join(" ") +
    ` L${pts[pts.length-1].x},${pad.t+ch} L${pts[0].x},${pad.t+ch} Z`;
  const yLabels = [0, 20, 40, 60, 80];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {yLabels.map(v => {
        const y = pad.t + ch - (v / maxKm) * ch;
        return (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#f3f4f6" strokeWidth="1"/>
            <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize="7" fill="#9ca3af">{v}</text>
          </g>
        );
      })}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="7" fill="#9ca3af">{p.m}</text>
      ))}
      <path d={area} fill="url(#actGrad)"/>
      <polyline points={polyline} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="10" fill="transparent"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}/>
          {hovered === i && (
            <>
              <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#ef4444" strokeWidth="2"/>
              <g transform={`translate(${Math.min(Math.max(p.x - 44, 0), W - 88)},${p.y - 46})`}>
                <rect width="88" height="34" rx="8" fill="#1e2d45"/>
                <text x="44" y="12" textAnchor="middle" fontSize="7" fill="#9ca3af">Traveled on {p.m} 2028</text>
                <text x="44" y="26" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">{p.km} Km</text>
              </g>
            </>
          )}
          {hovered !== i && (
            <circle cx={p.x} cy={p.y} r="3" fill={i === 2 ? "#ef4444" : "transparent"}
              stroke={i === 2 ? "white" : "transparent"} strokeWidth="1.5"/>
          )}
        </g>
      ))}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UnitDetailsPage() {
  const [activeImg, setActiveImg] = useState(0);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ════════════════════════════════════════
            LEFT COLUMN
        ════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Hero image */}
          <div className="relative w-full h-56 md:h-72 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
            <Image src={unit.images[activeImg]} alt={unit.model}
              fill className="object-contain p-4" sizes="700px"/>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {unit.images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className="no-hover-fx shrink-0 relative w-28 h-20 rounded-xl overflow-hidden border-2 transition-colors"
                style={{ borderColor: i === activeImg ? "#ef4444" : "#e5e7eb", background: "#f9fafb" }}>
                <Image src={img} alt="" fill className="object-contain p-2" sizes="112px"/>
              </button>
            ))}
          </div>

          {/* Car info row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] text-gray-400 font-medium mb-0.5">{unit.category}</p>
              <h1 className="text-[28px] font-bold text-gray-900 leading-tight">
                {unit.brand} {unit.model}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"/>Available
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                  {unit.units} Unit
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right mr-2">
                <p className="text-[26px] font-bold text-gray-900 leading-none">${unit.price}</p>
                <p className="text-[11px] text-gray-400">/days</p>
              </div>
              <button className="no-hover-fx flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-gray-600 border border-gray-200 bg-white">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
              <button className="no-hover-fx w-9 h-9 rounded-xl flex items-center justify-center border border-red-100 bg-red-50 text-red-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          </div>

          {/* About */}
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 mb-2">About</h2>
            <p className="text-[13px] text-gray-500 leading-relaxed">{unit.about}</p>
          </div>

          {/* Specifications */}
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 mb-3">Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {unit.specs.map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 px-3.5 py-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <SpecIcon type={s.icon}/>
                    <span className="text-[10px] text-gray-400 font-medium">{s.label}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-gray-800 leading-snug">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT COLUMN
        ════════════════════════════════════════ */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-5">

          {/* Activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">Activity</p>
              <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none" suppressHydrationWarning>
                <option>Last 8 Months</option>
                <option>Last 6 Months</option>
                <option>This Year</option>
              </select>
            </div>
            <p className="text-[10px] text-gray-400 mb-0.5">Total traveled this year</p>
            <p className="text-[26px] font-bold text-gray-900 mb-3">{totalKm} Km</p>
            <ActivityChart/>
          </div>

          {/* Car Features */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[14px] font-bold text-gray-900 mb-3">Car Features</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {unit.features.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" className="shrink-0 mt-0.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-[11px] text-gray-600 leading-snug">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reminders */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">Reminders</p>
              <button className="no-hover-fx text-[11px] text-gray-400 hover:text-gray-600">View All</button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {reminders.map((r, i) => (
                <div key={i} className="shrink-0 w-[130px] rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="w-6 h-6 rounded-full bg-white border border-gray-100 flex items-center justify-center mb-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <p className="text-[10px] font-semibold text-gray-700 leading-tight mb-1.5">{r.title}</p>
                  <p className="text-[9px] text-gray-400">{r.date}</p>
                  <p className="text-[9px] text-gray-400">{r.time}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
