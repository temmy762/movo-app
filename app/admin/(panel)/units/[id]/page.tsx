"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
type UnitStatus = "Available" | "Maintenance" | "Unavailable";
type VehicleDetail = {
  id: string; brand: string; model: string; year: number;
  plate: string; tier: string; image: string; photoUrl: string | null;
  price: number; status: UnitStatus; transmission: string; seats: number;
  driverId: string; driverName: string; driverPhone: string | null; driverOnline: boolean;
};

const STATUS_CFG: Record<UnitStatus, { bg: string; color: string }> = {
  Available:   { bg: "#dcfce7", color: "#16a34a" },
  Maintenance: { bg: "#fef3c7", color: "#d97706" },
  Unavailable: { bg: "#fee2e2", color: "#dc2626" },
};

const TIER_FEATURES: Record<string, string[]> = {
  classic: ["Air Conditioning","Bluetooth Connectivity","USB Charging Ports","Backup Camera","Cruise Control","Power Windows and Locks"],
  premium: ["Air Conditioning","Bluetooth Connectivity","USB Charging Ports","Backup Camera","Cruise Control","Leather Seats","Sunroof","Premium Audio System"],
  black:   ["Air Conditioning","Bluetooth Connectivity","USB Charging Ports","Backup Camera","Cruise Control","Leather Seats","Sunroof","Premium Audio System","Privacy Glass","Executive Interior"],
};

const activityData = [
  { m: "Jan", km: 35 }, { m: "Feb", km: 42 }, { m: "Mar", km: 65 },
  { m: "Apr", km: 55 }, { m: "May", km: 47 }, { m: "Jun", km: 38 },
  { m: "Jul", km: 30 }, { m: "Aug", km: 25 },
];
const totalKm = 489;

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
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/units/${id}`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then(d => { if (d) setVehicle(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-red-400 border-t-transparent animate-spin"/>
    </div>
  );

  if (notFound || !vehicle) return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p className="text-[14px] font-medium">Vehicle not found</p>
      <button onClick={() => router.back()} className="no-hover-fx text-[12px] text-red-500 underline">Go back</button>
    </div>
  );

  const sc = STATUS_CFG[vehicle.status];
  const features = TIER_FEATURES[vehicle.tier.toLowerCase()] ?? TIER_FEATURES.classic;
  const specs = [
    { icon: "transmission", label: "Transmission", value: vehicle.transmission },
    { icon: "seats",        label: "Capacity",     value: `${vehicle.seats} seats` },
    { icon: "fuel",         label: "Fuel",          value: "Gasoline" },
    { icon: "speed",        label: "Tier",          value: vehicle.tier.charAt(0).toUpperCase() + vehicle.tier.slice(1) },
    { icon: "range",        label: "Year",          value: String(vehicle.year) },
    { icon: "accel",        label: "Plate",         value: vehicle.plate },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      {/* Back button */}
      <button onClick={() => router.back()} className="no-hover-fx flex items-center gap-1.5 text-[12px] text-gray-500 mb-4 hover:text-gray-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Units
      </button>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ════════════════════════════════════════
            LEFT COLUMN
        ════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Hero image */}
          <div className="relative w-full h-56 md:h-72 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
            <Image src={vehicle.image} alt={vehicle.model}
              fill className="object-contain p-6" sizes="700px"/>
          </div>

          {/* Car info row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] text-gray-400 font-medium mb-0.5 uppercase tracking-wide">{vehicle.tier} · {vehicle.year}</p>
              <h1 className="text-[28px] font-bold text-gray-900 leading-tight">
                {vehicle.brand} {vehicle.model}
              </h1>
              <p className="text-[12px] text-gray-400 mt-0.5">Plate: <span className="font-semibold text-gray-600">{vehicle.plate}</span></p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: sc.bg, color: sc.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }}/>
                  {vehicle.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right mr-2">
                <p className="text-[26px] font-bold text-gray-900 leading-none">${vehicle.price}</p>
                <p className="text-[11px] text-gray-400">/day</p>
              </div>
            </div>
          </div>

          {/* Driver info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-[14px] font-bold"
              style={{ background: "#131936" }}>
              {vehicle.driverName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-medium">Assigned Driver</p>
              <p className="text-[14px] font-bold text-gray-900">{vehicle.driverName}</p>
              {vehicle.driverPhone && <p className="text-[11px] text-gray-500">{vehicle.driverPhone}</p>}
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
              style={{ background: vehicle.driverOnline ? "#dcfce7" : "#f3f4f6", color: vehicle.driverOnline ? "#16a34a" : "#6b7280" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: vehicle.driverOnline ? "#16a34a" : "#9ca3af" }}/>
              {vehicle.driverOnline ? "Online" : "Offline"}
            </span>
          </div>

          {/* Specifications */}
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 mb-3">Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {specs.map((s, i) => (
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
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" className="shrink-0 mt-0.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-[11px] text-gray-600 leading-snug">{f}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
