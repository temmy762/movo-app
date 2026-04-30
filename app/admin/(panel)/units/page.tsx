"use client";

import Image from "next/image";
import { useState } from "react";

// ── Car Data ───────────────────────────────────────────────────────────────
type UnitStatus = "Available" | "Unavailable";
type Unit = {
  id: number; brand: string; model: string;
  transmission: "Automatic" | "Manual";
  seats: number; status: UnitStatus; units: number;
  price: number; image: string;
};

const allUnits: Unit[] = [
  { id:1, brand:"",            model:"Martin",   transmission:"Automatic", seats:2, status:"Available",   units:1, price:130, image:"/images/movo classic.png"  },
  { id:2, brand:"Hyundai",     model:"Sonata",   transmission:"Manual",    seats:5, status:"Available",   units:1, price:45,  image:"/images/movo premium.png"  },
  { id:3, brand:"Nissan",      model:"Ariya",    transmission:"Automatic", seats:6, status:"Available",   units:0, price:55,  image:"/images/prive black.png"   },
  { id:4, brand:"Range Rover", model:"Velar",    transmission:"Automatic", seats:5, status:"Unavailable", units:0, price:60,  image:"/images/movo classic.png"  },
  { id:5, brand:"BMW",         model:"LX3",      transmission:"Automatic", seats:7, status:"Available",   units:4, price:120, image:"/images/movo premium.png"  },
  { id:6, brand:"",            model:"Q7",       transmission:"Automatic", seats:7, status:"Available",   units:2, price:130, image:"/images/prive black.png"   },
  { id:7, brand:"Mercedes",    model:"S-Class",  transmission:"Automatic", seats:5, status:"Available",   units:3, price:100, image:"/images/movo classic.png"  },
  { id:8, brand:"",            model:"EV6",      transmission:"Manual",    seats:5, status:"Available",   units:1, price:40,  image:"/images/movo premium.png"  },
];

// ── Icons ──────────────────────────────────────────────────────────────────
function TransmissionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
      <circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="12" cy="12" r="2"/>
      <circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
      <line x1="5" y1="7" x2="5" y2="17"/><line x1="19" y1="7" x2="19" y2="17"/>
      <line x1="7" y1="5" x2="17" y2="5"/>
    </svg>
  );
}
function SeatsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
      <circle cx="12" cy="7" r="3"/><path d="M5 21c0-4 3.1-7 7-7s7 3 7 7"/>
    </svg>
  );
}

// ── Unit Row ───────────────────────────────────────────────────────────────
function UnitRow({ unit }: { unit: Unit }) {
  const available = unit.status === "Available";
  return (
    <div className="bg-white rounded-2xl shadow-sm flex items-center gap-4 px-4 py-3">
      {/* Car image */}
      <div className="relative w-28 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-50">
        <Image src={unit.image} alt={unit.model} fill className="object-contain p-1" sizes="112px" />
      </div>

      {/* Name */}
      <div className="w-28 shrink-0">
        {unit.brand && <p className="text-[10px] text-gray-400 font-medium">{unit.brand}</p>}
        <p className="text-[15px] font-bold text-gray-900 leading-tight">{unit.model}</p>
      </div>

      {/* Transmission */}
      <div className="hidden sm:flex flex-col gap-0.5 w-24 shrink-0">
        <div className="flex items-center gap-1.5">
          <TransmissionIcon />
          <span className="text-[11px] text-gray-500">{unit.transmission}</span>
        </div>
      </div>

      {/* Seats */}
      <div className="hidden sm:flex flex-col gap-0.5 w-16 shrink-0">
        <div className="flex items-center gap-1.5">
          <SeatsIcon />
          <span className="text-[11px] text-gray-500">{unit.seats} seats</span>
        </div>
      </div>

      {/* Availability badge */}
      <div className="w-28 shrink-0">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: available ? "#dcfce7" : "#fee2e2", color: available ? "#16a34a" : "#dc2626" }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: available ? "#16a34a" : "#dc2626" }} />
          {available ? `Available ${unit.units > 0 ? `• ${unit.units} unit` : ""}` : "Unavailable"}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Price */}
      <div className="text-right shrink-0 mr-2">
        <p className="text-[15px] font-bold text-gray-900">${unit.price}</p>
        <p className="text-[10px] text-gray-400">/day</p>
      </div>

      {/* Actions */}
      <button
        className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-semibold shrink-0"
        style={{ background: "#ef4444" }}
      >
        Select
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <button className="no-hover-fx px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 border border-gray-200">
          Edit
        </button>
        <button className="no-hover-fx px-3 py-1.5 rounded-lg text-[11px] font-medium text-red-400 border border-red-100">
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function UnitsPage() {
  const [search, setSearch]   = useState("");
  const [carType, setCarType] = useState("All");
  const [status, setStatus]   = useState("All");
  const [page, setPage]       = useState(1);
  const PER_PAGE = 8;

  const filtered = allUnits.filter(u =>
    (carType === "All" || u.brand === carType || u.model === carType) &&
    (status === "All" || u.status === status) &&
    (`${u.brand} ${u.model}`.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="p-5 flex flex-col gap-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search items, car, status…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="text-[12px] w-44 focus:outline-none placeholder-gray-300"
            suppressHydrationWarning />
        </div>
        <div className="flex items-center gap-2">
          <select value={carType} onChange={e => setCarType(e.target.value)}
            className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-white focus:outline-none" suppressHydrationWarning>
            <option value="All">Car Type ▾</option>
            {["Hyundai","Nissan","Range Rover","BMW","Mercedes"].map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-white focus:outline-none" suppressHydrationWarning>
            <option value="All">Status ▾</option>
            <option>Available</option><option>Unavailable</option>
          </select>
          <button className="no-hover-fx px-3 py-2 rounded-xl text-[12px] font-medium text-gray-600 border border-gray-200 bg-white">
            Edit
          </button>
          <button className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-semibold"
            style={{ background: "#ef4444" }}>
            + Add Unit
          </button>
        </div>
      </div>

      {/* Unit rows */}
      <div className="flex flex-col gap-3">
        {paged.map(u => <UnitRow key={u.id} unit={u} />)}
        {paged.length === 0 && (
          <div className="bg-white rounded-2xl py-16 flex flex-col items-center gap-2 shadow-sm">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="#e5e7eb" />
            </svg>
            <p className="text-[13px] text-gray-400">No units match your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">Rows per page:</span>
          <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none" suppressHydrationWarning>
            <option>8</option><option>16</option><option>32</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button className="no-hover-fx w-7 h-7 rounded text-gray-400 text-[12px] disabled:opacity-30"
            disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n}
              className="no-hover-fx w-7 h-7 rounded text-[11px] font-medium"
              style={{ background: n === page ? "linear-gradient(90deg,#2D0A53,#8B7500)" : "transparent", color: n === page ? "white" : "#6b7280" }}
              onClick={() => setPage(n)}>{n}</button>
          ))}
          <button className="no-hover-fx w-7 h-7 rounded text-gray-400 text-[12px] disabled:opacity-30"
            disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          <span className="text-[11px] text-gray-400 ml-1">Next</span>
        </div>
      </div>

    </div>
  );
}
