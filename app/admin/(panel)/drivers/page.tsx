"use client";

import { useState, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type DriverStatus = "On Duty" | "Sick Leave" | "Half-Day Leave";
type Driver = { id: number; name: string; email: string; phone: string; address: string; status: DriverStatus; workHours: number; performance: number; perfLabel: string; };
type ScheduleEntry = { driverId: number; date: Date; dateLabel: string; client: string; car: string; time: string; };
type SortCol = "name" | "email" | "phone" | "status" | null;
type SortDir = "asc" | "desc";

// ── Data ──────────────────────────────────────────────────────────────────────
const DRIVERS: Driver[] = [
  { id:1,  name:"John Adams",      email:"john.adams@example.com",      phone:"111-222-3333", address:"100 Oak Street",     status:"On Duty",        workHours:220, performance:4.2, perfLabel:"Good"      },
  { id:2,  name:"Emily Brown",     email:"emily.brown@example.com",     phone:"222-333-4444", address:"200 Pine Avenue",    status:"Sick Leave",     workHours:180, performance:3.8, perfLabel:"Average"   },
  { id:3,  name:"Michael Clark",   email:"michael.clark@example.com",   phone:"333-444-5555", address:"300 Maple Road",     status:"On Duty",        workHours:260, performance:4.6, perfLabel:"Excellent" },
  { id:4,  name:"Sarah Davis",     email:"sarah.davis@example.com",     phone:"444-555-6666", address:"400 Birch Lane",     status:"Half-Day Leave", workHours:200, performance:4.0, perfLabel:"Good"      },
  { id:5,  name:"James Evans",     email:"james.evans@example.com",     phone:"555-666-7777", address:"500 Cedar Street",   status:"On Duty",        workHours:240, performance:4.4, perfLabel:"Good"      },
  { id:6,  name:"Laura Fisher",    email:"laura.fisher@example.com",    phone:"666-777-8888", address:"600 Elm Avenue",     status:"On Duty",        workHours:210, performance:4.1, perfLabel:"Good"      },
  { id:7,  name:"Robert Gray",     email:"robert.gray@example.com",     phone:"777-888-9999", address:"700 Spruce Road",    status:"Sick Leave",     workHours:170, performance:3.5, perfLabel:"Average"   },
  { id:8,  name:"Jessica Harris",  email:"jessica.harris@example.com",  phone:"888-999-0000", address:"800 Willow Lane",    status:"On Duty",        workHours:235, performance:4.3, perfLabel:"Good"      },
  { id:9,  name:"Daniel Jackson",  email:"daniel.jackson@example.com",  phone:"999-000-1111", address:"133 Elm Street",     status:"On Duty",        workHours:248, performance:4.5, perfLabel:"Excellent" },
  { id:10, name:"Olivia King",     email:"olivia.king@example.com",     phone:"000-111-2222", address:"900 Cherry Road",    status:"On Duty",        workHours:225, performance:4.2, perfLabel:"Good"      },
  { id:11, name:"David Lee",       email:"david.lee@example.com",       phone:"111-222-3334", address:"010 Chestnut Lane",  status:"Half-Day Leave", workHours:190, performance:3.9, perfLabel:"Average"   },
  { id:12, name:"Mia Martinez",    email:"mia.martinez@example.com",    phone:"222-333-4445", address:"111 Walnut Drive",   status:"On Duty",        workHours:215, performance:4.0, perfLabel:"Good"      },
];

const D = (d: number) => new Date(2028, 7, d);
const SCHEDULES: ScheduleEntry[] = [
  { driverId:9, date:D(1),  dateLabel:"Tue, 1 Aug",  client:"Alice Johnson",  car:"Toyota Corolla",   time:"10:10 AM" },
  { driverId:9, date:D(3),  dateLabel:"Thu, 3 Aug",  client:"Bob Smith",      car:"Honda Civic",      time:"11:00 AM" },
  { driverId:9, date:D(7),  dateLabel:"Mon, 7 Aug",  client:"Charlie Davis",  car:"Ford Focus",       time:"3:00 PM"  },
  { driverId:9, date:D(10), dateLabel:"Thu, 10 Aug", client:"Diana White",    car:"Chevrolet Malibu", time:"1:00 PM"  },
  { driverId:1, date:D(2),  dateLabel:"Wed, 2 Aug",  client:"Edward Green",   car:"Kia Soul",         time:"9:00 AM"  },
  { driverId:1, date:D(5),  dateLabel:"Sat, 5 Aug",  client:"Fiona Brown",    car:"Audi Q7",          time:"2:00 PM"  },
  { driverId:3, date:D(4),  dateLabel:"Fri, 4 Aug",  client:"George Clark",   car:"BMW X5",           time:"10:00 AM" },
  { driverId:3, date:D(8),  dateLabel:"Tue, 8 Aug",  client:"Helen Martinez", car:"Ford Focus",       time:"1:30 PM"  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#ec4899","#8b5cf6"];
const avatarColor = (n: string) => AVATAR_COLORS[n.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (n: string) => n.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();

const STATUS_STYLE: Record<DriverStatus, { bg: string; color: string; dot: string }> = {
  "On Duty":       { bg:"#eff6ff", color:"#1d4ed8", dot:"#3b82f6" },
  "Sick Leave":    { bg:"#fef2f2", color:"#dc2626", dot:"#ef4444" },
  "Half-Day Leave":{ bg:"#1e2d45", color:"white",   dot:"rgba(255,255,255,0.5)" },
};

function StatusBadge({ status }: { status: DriverStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }}/>
      {status}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={active?"#1e2d45":"#9ca3af"} strokeWidth="2.5" className="shrink-0">
      {(!active||dir==="asc")  && <path d="M7 15l5 5 5-5"/>}
      {(!active||dir==="desc") && <path d="M7 9l5-5 5 5"/>}
    </svg>
  );
}

function paginationPages(cur: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 3) return [1,2,3,"…",total];
  if (cur >= total-2) return [1,"…",total-2,total-1,total];
  return [1,"…",cur-1,cur,cur+1,"…",total];
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_H  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function MiniCalendar({ scheduledDays }: { scheduledDays: number[] }) {
  const [cm, setCm] = useState(7);
  const [cy, setCy] = useState(2028);
  const firstDow   = new Date(cy, cm, 1).getDay();
  const daysInMon  = new Date(cy, cm+1, 0).getDate();
  const daysInPrev = new Date(cy, cm, 0).getDate();
  const cells: { day: number; cur: boolean }[] = [];
  for (let i = firstDow-1; i >= 0; i--) cells.push({ day: daysInPrev-i, cur: false });
  for (let d = 1; d <= daysInMon; d++) cells.push({ day: d, cur: true });
  let nd = 1;
  while (cells.length % 7 !== 0) cells.push({ day: nd++, cur: false });
  const prevM = () => cm===0?(setCm(11),setCy(y=>y-1)):setCm(m=>m-1);
  const nextM = () => cm===11?(setCm(0),setCy(y=>y+1)):setCm(m=>m+1);
  const todayDay = cy===2028&&cm===7 ? 14 : -1;
  const isSchedMonth = cy===2028&&cm===7;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-bold text-gray-900">{MONTHS[cm]} {cy}</p>
        <div className="flex gap-1">
          <button onClick={prevM} className="no-hover-fx w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={nextM} className="no-hover-fx w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_H.map(d => <div key={d} className="text-center text-[8px] font-semibold text-gray-400">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c, i) => {
          const isToday    = c.cur && c.day === todayDay;
          const isSched    = c.cur && isSchedMonth && scheduledDays.includes(c.day);
          const bg = isToday ? "#1e2d45" : isSched ? "#ef4444" : "transparent";
          const tx = isToday||isSched ? "white" : c.cur ? "#374151" : "#d1d5db";
          return (
            <div key={i} className="flex items-center justify-center h-6">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: bg }}>
                <span className="text-[9px] font-medium" style={{ color: tx }}>{c.day}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Driver Detail Panel ───────────────────────────────────────────────────────
function DriverDetailPanel({ driver, onEdit }: { driver: Driver; onEdit: () => void }) {
  const schedules    = SCHEDULES.filter(s => s.driverId === driver.id);
  const scheduledDays = schedules.map(s => s.date.getDate());
  const perfColor = driver.performance>=4.5?"#22c55e":driver.performance>=4.0?"#3b82f6":"#f97316";

  return (
    <div className="w-[290px] shrink-0 border-l border-gray-100 bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
            style={{ background: avatarColor(driver.name) }}>
            {initials(driver.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-gray-900 truncate">{driver.name}</p>
            <StatusBadge status={driver.status}/>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button className="no-hover-fx w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button onClick={onEdit} className="no-hover-fx px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-600 border border-gray-200">
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-2">
        {[
          { icon:"mail", val: driver.email },
          { icon:"phone", val: driver.phone },
          { icon:"pin", val: driver.address },
        ].map(({ icon, val }) => (
          <div key={icon} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
              {icon==="mail"  && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
              {icon==="phone" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.38 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
              {icon==="pin"   && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
            </div>
            <span className="text-[11px] text-gray-600 truncate">{val}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-xl p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className="text-[9px] text-gray-400">Work Hours</span>
          </div>
          <p className="text-[12px] font-bold text-gray-900">{driver.workHours}<span className="text-[9px] font-normal text-gray-400 ml-0.5">hrs</span></p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span className="text-[9px] text-gray-400">Performance</span>
          </div>
          <div className="flex items-center gap-1">
            <p className="text-[12px] font-bold text-gray-900">{driver.performance}</p>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full text-white font-semibold" style={{ background: perfColor }}>{driver.perfLabel}</span>
          </div>
        </div>
      </div>

      {/* Mini Calendar */}
      <div className="px-4 py-3 border-b border-gray-100">
        <MiniCalendar scheduledDays={scheduledDays}/>
      </div>

      {/* Schedule */}
      <div className="px-4 py-3 flex-1">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[12px] font-bold text-gray-900">Schedule</p>
          <button className="no-hover-fx text-gray-400"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>
        </div>
        {schedules.length === 0
          ? <p className="text-[11px] text-gray-400 text-center py-4">No upcoming schedule.</p>
          : (
            <div className="flex flex-col gap-3">
              {schedules.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="shrink-0 text-right w-[68px]">
                    <p className="text-[9px] text-gray-400 leading-tight">{s.dateLabel}</p>
                    <p className="text-[9px] text-gray-300">{s.time}</p>
                  </div>
                  <div className="w-px self-stretch bg-gray-100 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-900 truncate">{s.client}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14l4 4v4a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
                      <span className="text-[10px] text-gray-400">{s.car}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

// ── Driver Modal ──────────────────────────────────────────────────────────────
type DriverForm = { name:string; email:string; phone:string; address:string; status:DriverStatus; };
function DriverModal({ initial, onSave, onClose }: { initial?: Driver; onSave:(d:DriverForm)=>void; onClose:()=>void; }) {
  const [form, setForm] = useState<DriverForm>({
    name: initial?.name??"", email: initial?.email??"",
    phone: initial?.phone??"", address: initial?.address??"",
    status: initial?.status??"On Duty",
  });
  const set = (k: keyof DriverForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/40"/>
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md mx-0 sm:mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-bold text-gray-900">{initial?"Edit Driver":"Add New Driver"}</p>
          <button onClick={onClose} className="no-hover-fx w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[18px] leading-none">×</button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Full Name <span className="text-red-400">*</span></p>
              <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="John Doe"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Email</p>
              <input value={form.email} onChange={e=>set("email",e.target.value)} placeholder="john@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Phone</p>
              <input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="111-222-3333"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Status</p>
              <select value={form.status} onChange={e=>set("status",e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none" suppressHydrationWarning>
                <option>On Duty</option><option>Sick Leave</option><option>Half-Day Leave</option>
              </select></div>
          </div>
          <div><p className="text-[11px] text-gray-500 font-medium mb-1">Address</p>
            <input value={form.address} onChange={e=>set("address",e.target.value)} placeholder="123 Main Street"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/></div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200">Cancel</button>
          <button onClick={()=>form.name.trim()&&onSave(form)} disabled={!form.name.trim()}
            className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: form.name.trim()?"#ef4444":"#fca5a5" }}>
            {initial?"Save Changes":"Add Driver"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DriversPage() {
  const [drivers,    setDrivers]    = useState<Driver[]>(DRIVERS);
  const [search,     setSearch]     = useState("");
  const [statusFilt, setStatusFilt] = useState<DriverStatus | "All">("All");
  const [showFilt,   setShowFilt]   = useState(false);
  const [sortCol,    setSortCol]    = useState<SortCol>(null);
  const [sortDir,    setSortDir]    = useState<SortDir>("asc");
  const [page,       setPage]       = useState(1);
  const [perPage,    setPerPage]    = useState(11);
  const [selected,   setSelected]   = useState<Driver | null>(DRIVERS.find(d=>d.id===9)??null);
  const [addOpen,    setAddOpen]    = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let r = drivers.filter(d =>
      (d.name.toLowerCase().includes(q)||d.email.toLowerCase().includes(q)||d.phone.includes(q)) &&
      (statusFilt==="All" || d.status===statusFilt)
    );
    if (sortCol) {
      r = [...r].sort((a,b) => {
        const av=a[sortCol as keyof Driver], bv=b[sortCol as keyof Driver];
        return sortDir==="asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return r;
  }, [drivers, search, statusFilt, sortCol, sortDir]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageDrivers = filtered.slice((page-1)*perPage, page*perPage);
  const pages       = paginationPages(page, totalPages);

  const handleSort = (col: SortCol) => {
    if (sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortCol(col); setSortDir("asc"); }
  };
  const handleAdd  = (f: DriverForm) => { setDrivers(p=>[...p,{...f,id:Math.max(...p.map(d=>d.id))+1,workHours:0,performance:0,perfLabel:"New"}]); setAddOpen(false); };
  const handleEdit = (f: DriverForm) => { setDrivers(p=>p.map(d=>d.id===editDriver!.id?{...d,...f}:d)); if(selected?.id===editDriver!.id) setSelected(s=>s?{...s,...f}:s); setEditDriver(null); };

  const thCls = "px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 select-none";

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left table panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-white shrink-0 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white flex-1 min-w-[160px] max-w-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search for driver" value={search}
              onChange={e=>{setSearch(e.target.value);setPage(1);}}
              className="text-[12px] text-gray-900 flex-1 focus:outline-none bg-transparent placeholder-gray-300" suppressHydrationWarning/>
            {search&&<button onClick={()=>setSearch("")} className="no-hover-fx text-gray-300 text-[14px] leading-none">×</button>}
          </div>
          {/* Status filter */}
          <div className="relative">
            <button onClick={()=>setShowFilt(v=>!v)}
              className="no-hover-fx flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-[12px] text-gray-600 bg-white"
              style={{ borderColor: statusFilt!=="All"?"#ef4444":"", color: statusFilt!=="All"?"#ef4444":"" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {statusFilt==="All"?"Status":statusFilt}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showFilt&&(
              <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-10">
                {(["All","On Duty","Sick Leave","Half-Day Leave"] as const).map(s=>(
                  <button key={s} onClick={()=>{setStatusFilt(s);setShowFilt(false);setPage(1);}}
                    className="no-hover-fx w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 flex items-center justify-between"
                    style={{ color: statusFilt===s?"#ef4444":"#374151" }}>
                    {s}{statusFilt===s&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1"/>
          <button onClick={()=>setAddOpen(true)}
            className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-semibold"
            style={{ background:"#ef4444" }}>
            + Add Driver
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full min-w-[500px]">
            <thead className="sticky top-0 z-10">
              <tr style={{ background:"#f8fafc" }} className="border-b border-gray-100">
                <th className={thCls}><button onClick={()=>handleSort("name")} className="no-hover-fx flex items-center gap-1">Name <SortIcon active={sortCol==="name"} dir={sortDir}/></button></th>
                <th className={thCls + " hidden md:table-cell"}><button onClick={()=>handleSort("email")} className="no-hover-fx flex items-center gap-1">Email <SortIcon active={sortCol==="email"} dir={sortDir}/></button></th>
                <th className={thCls + " hidden sm:table-cell"}><button onClick={()=>handleSort("phone")} className="no-hover-fx flex items-center gap-1">Phone No. <SortIcon active={sortCol==="phone"} dir={sortDir}/></button></th>
                <th className={thCls}><button onClick={()=>handleSort("status")} className="no-hover-fx flex items-center gap-1">Status <SortIcon active={sortCol==="status"} dir={sortDir}/></button></th>
              </tr>
            </thead>
            <tbody>
              {pageDrivers.map(driver => {
                const isSel = selected?.id===driver.id;
                return (
                  <tr key={driver.id} onClick={()=>setSelected(isSel?null:driver)}
                    className="border-b border-gray-50 cursor-pointer transition-colors"
                    style={{ background: isSel?"#eff6ff":"white" }}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                          style={{ background: avatarColor(driver.name) }}>
                          {initials(driver.name)}
                        </div>
                        <p className="text-[13px] font-medium text-gray-900">{driver.name}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-500 hidden md:table-cell">{driver.email}</td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-500 hidden sm:table-cell whitespace-nowrap">{driver.phone}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={driver.status}/></td>
                  </tr>
                );
              })}
              {pageDrivers.length===0&&(
                <tr><td colSpan={4} className="px-3 py-10 text-center text-[13px] text-gray-400">No drivers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Results per page</span>
            <select value={perPage} onChange={e=>{setPerPage(Number(e.target.value));setPage(1);}}
              className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" suppressHydrationWarning>
              {[10,11,15,20].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 border border-gray-200 disabled:opacity-40">&lsaquo; Prev</button>
            {pages.map((p,i)=>p==="…"
              ?<span key={`e${i}`} className="px-1.5 text-[11px] text-gray-400">…</span>
              :<button key={p} onClick={()=>setPage(p as number)}
                className="no-hover-fx w-7 h-7 rounded-lg text-[11px] font-medium"
                style={{ background:page===p?"#ef4444":"transparent", color:page===p?"white":"#374151" }}>{p}</button>
            )}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 border border-gray-200 disabled:opacity-40">Next &rsaquo;</button>
          </div>
        </div>
      </div>

      {/* ── Right detail panel ── */}
      {selected&&<DriverDetailPanel driver={selected} onEdit={()=>setEditDriver(selected)}/>}

      {/* ── Modals ── */}
      {addOpen    &&<DriverModal onSave={handleAdd}  onClose={()=>setAddOpen(false)}/>}
      {editDriver &&<DriverModal initial={editDriver} onSave={handleEdit} onClose={()=>setEditDriver(null)}/>}
    </div>
  );
}
