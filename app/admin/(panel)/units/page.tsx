"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────
type UnitStatus = "Available" | "Maintenance" | "Unavailable";
type Unit = {
  id: number; brand: string; model: string;
  transmission: "Automatic" | "Manual";
  seats: number; status: UnitStatus; units: number;
  price: number; image: string;
};

const allUnits: Unit[] = [
  { id:1, brand:"Aston",       model:"Martin",  transmission:"Automatic", seats:2, status:"Available",   units:1, price:130, image:"/images/movo classic.png" },
  { id:2, brand:"Hyundai",     model:"Sonata",  transmission:"Manual",    seats:5, status:"Available",   units:1, price:45,  image:"/images/movo premium.png" },
  { id:3, brand:"Nissan",      model:"Ariya",   transmission:"Automatic", seats:5, status:"Available",   units:1, price:55,  image:"/images/prive black.png"  },
  { id:4, brand:"Range Rover", model:"Velar",   transmission:"Automatic", seats:5, status:"Maintenance", units:0, price:60,  image:"/images/movo classic.png" },
  { id:5, brand:"BMW",         model:"LX3",     transmission:"Automatic", seats:7, status:"Available",   units:4, price:120, image:"/images/movo premium.png" },
  { id:6, brand:"Audi",        model:"Q7",      transmission:"Automatic", seats:7, status:"Unavailable", units:0, price:130, image:"/images/prive black.png"  },
  { id:7, brand:"Mercedes",    model:"S-Class", transmission:"Automatic", seats:5, status:"Available",   units:1, price:100, image:"/images/movo classic.png" },
  { id:8, brand:"KIA",         model:"EV6",     transmission:"Manual",    seats:5, status:"Available",   units:1, price:40,  image:"/images/movo premium.png" },
];

// ── Status config ────────────────────────────────────────────────────────────
const statusCfg: Record<UnitStatus, { bg: string; color: string }> = {
  Available:   { bg: "#dcfce7", color: "#16a34a" },
  Maintenance: { bg: "#fef3c7", color: "#d97706" },
  Unavailable: { bg: "#fee2e2", color: "#dc2626" },
};

// ── Icons ─────────────────────────────────────────────────────────────────────
function TransmissionIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="5"  cy="5"  r="2.5" fill="#e5e7eb"/>
      <circle cx="19" cy="5"  r="2.5" fill="#e5e7eb"/>
      <circle cx="5"  cy="19" r="2.5" fill="#e5e7eb"/>
      <circle cx="19" cy="19" r="2.5" fill="#e5e7eb"/>
      <line x1="5"   y1="7.5" x2="5"   y2="16.5" stroke="#9ca3af" strokeWidth="1.5"/>
      <line x1="19"  y1="7.5" x2="19"  y2="16.5" stroke="#9ca3af" strokeWidth="1.5"/>
      <line x1="7.5" y1="5"   x2="16.5" y2="5"   stroke="#9ca3af" strokeWidth="1.5"/>
    </svg>
  );
}
function SeatsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
      <circle cx="12" cy="7" r="3"/>
      <path d="M5 21c0-4 3.1-7 7-7s7 3 7 7"/>
    </svg>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, units }: { status: UnitStatus; units: number }) {
  const sc = statusCfg[status];
  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
        style={{ background: sc.bg, color: sc.color }}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc.color }}/>
        {status}
      </span>
      {units > 0 && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
          {units} Unit
        </span>
      )}
    </div>
  );
}

// ── Inline delete confirmation strip ─────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 bg-red-50 border-t border-red-100 rounded-b-2xl">
      <p className="text-[12px] text-red-600 font-medium">Remove this unit?</p>
      <div className="flex items-center gap-2">
        <button onClick={onCancel}
          className="no-hover-fx px-3 py-1 rounded-lg text-[11px] font-medium text-gray-600 border border-gray-200 bg-white">
          Cancel
        </button>
        <button onClick={onConfirm}
          className="no-hover-fx px-3 py-1 rounded-lg text-[11px] font-semibold text-white"
          style={{ background: "#ef4444" }}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Unit Row (list view) ──────────────────────────────────────────────────────
function UnitRow({ unit, onEdit, onDelete, deletePending, onDeleteConfirm, onDeleteCancel }: {
  unit: Unit;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-4 px-5 py-3.5">
        <div className="relative w-36 h-[72px] shrink-0 rounded-xl overflow-hidden bg-gray-50">
          <Image src={unit.image} alt={unit.model} fill className="object-contain p-2" sizes="144px"/>
        </div>
        <div className="w-[170px] shrink-0">
          <p className="text-[10px] text-gray-400 font-medium leading-none">{unit.brand}</p>
          <p className="text-[18px] font-bold text-gray-900 leading-tight">{unit.model}</p>
          <StatusBadge status={unit.status} units={unit.units}/>
        </div>
        <div className="w-[115px] shrink-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TransmissionIcon/>
            <span className="text-[10px] text-gray-400">Transmission</span>
          </div>
          <p className="text-[12px] font-medium text-gray-700 pl-[22px]">{unit.transmission}</p>
        </div>
        <div className="w-[95px] shrink-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <SeatsIcon/>
            <span className="text-[10px] text-gray-400">Capacity</span>
          </div>
          <p className="text-[12px] font-medium text-gray-700 pl-[22px]">{unit.seats} seats</p>
        </div>
        <div className="flex-1"/>
        <div className="shrink-0 mr-3 text-right">
          <p className="text-[10px] text-gray-400 mb-0.5">Price</p>
          <p className="text-[16px] font-bold text-gray-900 leading-none">
            ${unit.price}<span className="text-[10px] font-normal text-gray-400">/days</span>
          </p>
        </div>
        <Link href={`/admin/units/${unit.id}`}
          className="no-hover-fx px-5 py-2 rounded-xl text-white text-[13px] font-semibold shrink-0"
          style={{ background: "#ef4444" }}>Select</Link>
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={onEdit}
            className="no-hover-fx px-3 py-1 rounded-lg text-[11px] font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
            Edit
          </button>
          <button onClick={onDelete}
            className="no-hover-fx px-3 py-1 rounded-lg text-[11px] font-medium border transition-colors"
            style={{ color: deletePending ? "#dc2626" : "#9ca3af", borderColor: deletePending ? "#fca5a5" : "#e5e7eb", background: deletePending ? "#fef2f2" : "transparent" }}>
            Delete
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden p-3">
        <div className="flex gap-3">
          <div className="relative w-24 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-50">
            <Image src={unit.image} alt={unit.model} fill className="object-contain p-1.5" sizes="96px"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-gray-400 leading-none">{unit.brand}</p>
            <p className="text-[15px] font-bold text-gray-900">{unit.model}</p>
            <StatusBadge status={unit.status} units={unit.units}/>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] text-gray-400">Price</p>
            <p className="text-[15px] font-bold text-gray-900">
              ${unit.price}<span className="text-[9px] text-gray-400">/day</span>
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1"><TransmissionIcon/><span className="text-[11px] text-gray-500">{unit.transmission}</span></div>
            <div className="flex items-center gap-1"><SeatsIcon/><span className="text-[11px] text-gray-500">{unit.seats} seats</span></div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onEdit} className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 border border-gray-200">Edit</button>
            <button onClick={onDelete} className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 border border-gray-200">Delete</button>
            <Link href={`/admin/units/${unit.id}`} className="no-hover-fx px-4 py-1.5 rounded-xl text-white text-[12px] font-semibold" style={{ background: "#ef4444" }}>Select</Link>
          </div>
        </div>
      </div>

      {/* Inline delete confirm */}
      {deletePending && <DeleteConfirm onConfirm={onDeleteConfirm} onCancel={onDeleteCancel}/>}
    </div>
  );
}

// ── Unit Grid Card (grid view) ────────────────────────────────────────────────
function UnitGridCard({ unit, onEdit, onDelete }: { unit: Unit; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
      <div className="relative w-full h-32 rounded-xl overflow-hidden bg-gray-50">
        <Image src={unit.image} alt={unit.model} fill className="object-contain p-3" sizes="300px"/>
      </div>
      <div>
        <p className="text-[10px] text-gray-400">{unit.brand}</p>
        <p className="text-[16px] font-bold text-gray-900">{unit.model}</p>
        <StatusBadge status={unit.status} units={unit.units}/>
      </div>
      <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-gray-50">
        <div>
          <div className="flex items-center gap-1 mb-0.5"><TransmissionIcon/><span className="text-[9px] text-gray-400">Transmission</span></div>
          <p className="text-[11px] font-medium text-gray-700">{unit.transmission}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5"><SeatsIcon/><span className="text-[9px] text-gray-400">Capacity</span></div>
          <p className="text-[11px] font-medium text-gray-700">{unit.seats} seats</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] text-gray-400">Price</p>
          <p className="text-[16px] font-bold text-gray-900">${unit.price}<span className="text-[10px] text-gray-400">/day</span></p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onEdit} className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 border border-gray-200">Edit</button>
          <button onClick={onDelete} className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-400 border border-red-100">Delete</button>
          <Link href={`/admin/units/${unit.id}`} className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-semibold" style={{ background: "#ef4444" }}>Select</Link>
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
type UnitForm = { brand: string; model: string; transmission: "Automatic" | "Manual"; seats: number; status: UnitStatus; units: number; price: number; image: string; };
const IMAGES = ["/images/movo classic.png", "/images/movo premium.png", "/images/prive black.png"];
const IMG_LABELS: Record<string, string> = { "/images/movo classic.png": "Movo Classic", "/images/movo premium.png": "Movo Premium", "/images/prive black.png": "Prive Black" };

function UnitModal({ initial, onSave, onClose }: {
  initial?: Unit | null;
  onSave: (data: UnitForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UnitForm>(initial ?? {
    brand: "", model: "", transmission: "Automatic", seats: 5,
    status: "Available", units: 1, price: 50, image: IMAGES[0],
  });

  const set = (k: keyof UnitForm, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.model.trim()) return;
    onSave({ ...form, seats: Number(form.seats), units: Number(form.units), price: Number(form.price) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6 z-10 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[16px] font-bold text-gray-900">{initial ? "Edit Unit" : "Add New Unit"}</p>
          <button onClick={onClose}
            className="no-hover-fx w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-[18px] leading-none">×</button>
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Brand</p>
              <input value={form.brand} onChange={e => set("brand", e.target.value)}
                placeholder="e.g. Toyota"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Model <span className="text-red-400">*</span></p>
              <input value={form.model} onChange={e => set("model", e.target.value)}
                placeholder="e.g. Corolla"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Transmission</p>
              <select value={form.transmission} onChange={e => set("transmission", e.target.value as "Automatic" | "Manual")}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none" suppressHydrationWarning>
                <option>Automatic</option><option>Manual</option>
              </select>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Seats</p>
              <input type="number" min={1} max={12} value={form.seats}
                onChange={e => set("seats", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none" suppressHydrationWarning/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Status</p>
              <select value={form.status} onChange={e => set("status", e.target.value as UnitStatus)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none" suppressHydrationWarning>
                <option>Available</option><option>Maintenance</option><option>Unavailable</option>
              </select>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Units Available</p>
              <input type="number" min={0} value={form.units}
                onChange={e => set("units", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none" suppressHydrationWarning/>
            </div>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium mb-1">Price per day ($)</p>
            <input type="number" min={1} value={form.price}
              onChange={e => set("price", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none" suppressHydrationWarning/>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium mb-1">Car Image</p>
            <select value={form.image} onChange={e => set("image", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none" suppressHydrationWarning>
              {IMAGES.map(img => <option key={img} value={img}>{IMG_LABELS[img]}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose}
            className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200">
            Cancel
          </button>
          <button onClick={handleSubmit}
            disabled={!form.model.trim()}
            className="no-hover-fx flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-40"
            style={{ background: "#ef4444" }}>
            {initial ? "Save Changes" : "Add Unit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UnitsPage() {
  const [units, setUnits]     = useState<Unit[]>(allUnits);
  const [search, setSearch]   = useState("");
  const [carType, setCarType] = useState("All");
  const [status, setStatus]   = useState("All");
  const [page, setPage]       = useState(1);
  const [view, setView]       = useState<"list" | "grid">("list");
  const [perPage, setPerPage] = useState(8);
  const [showAdd, setShowAdd] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const brands = Array.from(new Set(units.map(u => u.brand).filter(Boolean)));

  const filtered = units.filter(u =>
    (carType === "All" || u.brand === carType) &&
    (status  === "All" || u.status === status) &&
    (`${u.brand} ${u.model}`.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const handleAdd = (data: UnitForm) => {
    setUnits(prev => [...prev, { id: Date.now(), ...data }]);
    setShowAdd(false);
  };
  const handleEdit = (data: UnitForm) => {
    setUnits(prev => prev.map(u => u.id === editUnit!.id ? { ...u, ...data } : u));
    setEditUnit(null);
  };
  const handleDelete = (id: number) => {
    setUnits(prev => prev.filter(u => u.id !== id));
    setDeleteId(null);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white flex-1 min-w-[160px] max-w-xs">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search client name, car, etc."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="text-[12px] text-gray-900 flex-1 focus:outline-none placeholder-gray-300 bg-transparent"
            suppressHydrationWarning/>
          {search && (
            <button onClick={() => setSearch("")} className="no-hover-fx text-gray-300 text-[15px] leading-none">×</button>
          )}
        </div>

        <select value={carType} onChange={e => { setCarType(e.target.value); setPage(1); }}
          className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 text-gray-900 bg-white focus:outline-none" suppressHydrationWarning>
          <option value="All">Car Type ▾</option>
          {brands.map(t => <option key={t}>{t}</option>)}
        </select>

        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 text-gray-900 bg-white focus:outline-none" suppressHydrationWarning>
          <option value="All">Status ▾</option>
          <option>Available</option><option>Maintenance</option><option>Unavailable</option>
        </select>

        <div className="flex-1 hidden md:block"/>

        <div className="flex items-center gap-0.5 border border-gray-200 rounded-xl bg-white p-1">
          <button onClick={() => setView("list")}
            className="no-hover-fx w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: view === "list" ? "#1e2d45" : "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={view === "list" ? "white" : "#9ca3af"} strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <button onClick={() => setView("grid")}
            className="no-hover-fx w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: view === "grid" ? "#1e2d45" : "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={view === "grid" ? "white" : "#9ca3af"} strokeWidth="2">
              <rect x="3"  y="3"  width="7" height="7"/>
              <rect x="14" y="3"  width="7" height="7"/>
              <rect x="3"  y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
        </div>

        <button onClick={() => setShowAdd(true)}
          className="no-hover-fx flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-bold tracking-wide"
          style={{ background: "#ef4444" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          ADD UNIT
        </button>
      </div>

      {/* ── Units ── */}
      {view === "list" ? (
        <div className="flex flex-col gap-3">
          {paged.map(u => (
            <UnitRow key={u.id} unit={u}
              onEdit={() => setEditUnit(u)}
              onDelete={() => setDeleteId(u.id)}
              deletePending={deleteId === u.id}
              onDeleteConfirm={() => handleDelete(u.id)}
              onDeleteCancel={() => setDeleteId(null)}/>
          ))}
          {paged.length === 0 && (
            <div className="bg-white rounded-2xl py-16 flex flex-col items-center gap-2 shadow-sm">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              <p className="text-[13px] text-gray-400">No units match your filters.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {paged.map(u => (
            <UnitGridCard key={u.id} unit={u}
              onEdit={() => setEditUnit(u)}
              onDelete={() => handleDelete(u.id)}/>
          ))}
          {paged.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl py-16 flex items-center justify-center shadow-sm">
              <p className="text-[13px] text-gray-400">No units match your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      <div className="flex flex-wrap items-center justify-between bg-white rounded-2xl px-5 py-3 shadow-sm gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">Results per page:</span>
          <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none"
            suppressHydrationWarning>
            <option value={8}>8</option><option value={16}>16</option><option value={32}>32</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button className="no-hover-fx px-2 py-1 rounded text-[11px] text-gray-500 hover:bg-gray-50 disabled:opacity-30"
            disabled={page === 1} onClick={() => setPage(1)}>First</button>
          <button className="no-hover-fx w-7 h-7 rounded flex items-center justify-center text-gray-400 text-[13px] disabled:opacity-30"
            disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map(n => (
            <button key={n}
              className="no-hover-fx w-7 h-7 rounded-lg text-[11px] font-medium"
              style={{ background: n === page ? "#ef4444" : "transparent", color: n === page ? "white" : "#6b7280" }}
              onClick={() => setPage(n)}>{n}</button>
          ))}
          <button className="no-hover-fx w-7 h-7 rounded flex items-center justify-center text-gray-400 text-[13px] disabled:opacity-30"
            disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          <button className="no-hover-fx px-2 py-1 rounded text-[11px] text-gray-500 hover:bg-gray-50 disabled:opacity-30"
            disabled={page === totalPages} onClick={() => setPage(totalPages)}>Next</button>
        </div>
      </div>

      {/* ── Add Modal ── */}
      {showAdd && <UnitModal onSave={handleAdd} onClose={() => setShowAdd(false)}/>}

      {/* ── Edit Modal ── */}
      {editUnit && <UnitModal initial={editUnit} onSave={handleEdit} onClose={() => setEditUnit(null)}/>}

    </div>
  );
}
