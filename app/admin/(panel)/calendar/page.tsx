"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_H  = 62;
const S_HOUR  = 8;
const E_HOUR  = 18;
const HOURS   = Array.from({ length: E_HOUR - S_HOUR }, (_, i) => S_HOUR + i);
const WEEK_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const BASE_DATE = new Date(2028, 7, 14); // Aug 14, 2028 — anchor for mock data

// ── Date helpers ──────────────────────────────────────────────────────────────
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getMonday(d: Date) {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}
function monthGridDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const pad = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const start = addDays(first, -pad);
  const days: Date[] = [];
  for (let i = 0; days.length < 42; i++) days.push(addDays(start, i));
  return days;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Filter  = "all" | "pickup" | "return";
type ViewMode = "week" | "day" | "month";
type EvtType = "pickup" | "return";
interface Evt {
  id: number; date: Date; h: number; m: number; dur: number;
  car: string; client: string; type: EvtType;
  driver: string; startDate: string; endDate: string;
  notes?: string; carType: string; carNum: string; trans: string;
  carImg: string; agenda: string;
  ow?: 0 | 1;
}

// ── Events data (dates tied to Aug 14-19 2028 mock week) ─────────────────────
const D = (d: number) => new Date(2028, 7, d); // Aug 2028 shorthand
const EVENTS: Evt[] = [
  { id:1,  date:D(14), h:8,  m:0,  dur:55, car:"Ford Focus",       client:"Michael Brown",  type:"pickup", driver:"None", startDate:"Mon, 14 Aug 2028", endDate:"Tue, 15 Aug 2028", carType:"Sedan",     carNum:"AB1234", trans:"Manual",    carImg:"/images/movo premium.png",  agenda:"Car Pickup at 8:00 AM" },
  { id:2,  date:D(14), h:13, m:5,  dur:55, car:"Hyundai Elantra",  client:"Jane Wilson",    type:"pickup", driver:"None", startDate:"Mon, 14 Aug 2028", endDate:"Tue, 15 Aug 2028", carType:"Sedan",     carNum:"DE5678", trans:"Automatic", carImg:"/images/movo premium.png",  agenda:"Car Pickup at 1:05 PM" },
  { id:3,  date:D(15), h:9,  m:0,  dur:55, car:"Toyota Corolla",   client:"Alice Johnson",  type:"pickup", driver:"None", startDate:"Tue, 15 Aug 2028", endDate:"Wed, 16 Aug 2028", carType:"Sedan",     carNum:"GH9012", trans:"Automatic", carImg:"/images/movo premium.png",  agenda:"Car Pickup at 9:00 AM" },
  { id:4,  date:D(15), h:12, m:0,  dur:55, car:"Chevrolet Malibu", client:"Helen Martinez", type:"return", driver:"None", startDate:"Mon, 14 Aug 2028", endDate:"Tue, 15 Aug 2028", carType:"Sedan",     carNum:"IJ3456", trans:"Automatic", carImg:"/images/movo classic.png",  agenda:"Car Return at 12:00 PM" },
  { id:5,  date:D(15), h:15, m:0,  dur:55, car:"Ford Focus",       client:"Kyle Thompson",  type:"pickup", driver:"None", startDate:"Tue, 15 Aug 2028", endDate:"Wed, 16 Aug 2028", carType:"Sedan",     carNum:"KL7890", trans:"Manual",    carImg:"/images/movo premium.png",  agenda:"Car Pickup at 3:00 PM" },
  { id:6,  date:D(16), h:8,  m:0,  dur:55, car:"Kia Soul",         client:"Oliver Scott",   type:"pickup", driver:"None", startDate:"Wed, 16 Aug 2028", endDate:"Thu, 17 Aug 2028", carType:"Hatchback", carNum:"MN1234", trans:"Automatic", carImg:"/images/movo premium.png",  agenda:"Car Pickup at 8:00 AM" },
  { id:7,  date:D(16), h:13, m:30, dur:55, car:"Mercedes C-Class", client:"Fiona Brown",    type:"return", driver:"None", startDate:"Mon, 14 Aug 2028", endDate:"Wed, 16 Aug 2028", carType:"Sedan",     carNum:"OP5678", trans:"Automatic", carImg:"/images/prive black.png",   agenda:"Car Return at 1:30 PM", ow:0 },
  { id:8,  date:D(16), h:13, m:30, dur:55, car:"Hyundai Elantra",  client:"George Clark",   type:"return", driver:"None", startDate:"Mon, 14 Aug 2028", endDate:"Wed, 16 Aug 2028", carType:"Sedan",     carNum:"QR9012", trans:"Automatic", carImg:"/images/movo premium.png",  agenda:"Car Return at 1:30 PM", ow:1 },
  { id:9,  date:D(17), h:9,  m:30, dur:55, car:"Toyota Corolla",   client:"Alice Johnson",  type:"pickup", driver:"None", startDate:"Thu, 17 Aug 2028", endDate:"Fri, 18 Aug 2028", carType:"Sedan",     carNum:"ST3456", trans:"Automatic", carImg:"/images/movo premium.png",  agenda:"Car Pickup at 9:30 AM", ow:0 },
  { id:10, date:D(17), h:9,  m:30, dur:55, car:"Nissan Altima",    client:"Oliver Scott",   type:"pickup", driver:"None", startDate:"Thu, 17 Aug 2028", endDate:"Fri, 18 Aug 2028", carType:"Sedan",     carNum:"UV7890", trans:"Automatic", carImg:"/images/movo premium.png",  agenda:"Car Pickup at 9:30 AM", ow:1 },
  { id:11, date:D(17), h:12, m:30, dur:55, car:"Audi Q7",          client:"Kyle Thompson",  type:"pickup", driver:"None", startDate:"Thu, 17 Aug 2028", endDate:"Fri, 18 Aug 2028", notes:"Client requested a child safety seat.", carType:"SUV", carNum:"CX2345", trans:"Automatic", carImg:"/images/movo classic.png", agenda:"Car Pickup at 12:30 PM" },
  { id:12, date:D(18), h:8,  m:0,  dur:55, car:"Chevrolet Malibu", client:"Nancy Davis",    type:"pickup", driver:"None", startDate:"Fri, 18 Aug 2028", endDate:"Sat, 19 Aug 2028", carType:"Sedan",     carNum:"WX1234", trans:"Automatic", carImg:"/images/movo classic.png",  agenda:"Car Pickup at 8:00 AM" },
  { id:13, date:D(18), h:9,  m:0,  dur:55, car:"BMW X5",           client:"Charlie Davis",  type:"pickup", driver:"None", startDate:"Fri, 18 Aug 2028", endDate:"Sat, 19 Aug 2028", carType:"SUV",       carNum:"YZ5678", trans:"Automatic", carImg:"/images/prive black.png",   agenda:"Car Pickup at 9:00 AM" },
  { id:14, date:D(18), h:11, m:0,  dur:55, car:"Honda Civic",      client:"Bob Smith",      type:"return", driver:"None", startDate:"Wed, 16 Aug 2028", endDate:"Fri, 18 Aug 2028", carType:"Sedan",     carNum:"AB9012", trans:"Manual",    carImg:"/images/movo premium.png",  agenda:"Car Return at 11:00 AM" },
  { id:15, date:D(18), h:13, m:0,  dur:55, car:"Toyota Corolla",   client:"Michael Brown",  type:"return", driver:"None", startDate:"Wed, 16 Aug 2028", endDate:"Fri, 18 Aug 2028", carType:"Sedan",     carNum:"CD3456", trans:"Automatic", carImg:"/images/movo premium.png",  agenda:"Car Return at 1:00 PM" },
  { id:16, date:D(19), h:13, m:0,  dur:55, car:"Toyota Corolla",   client:"Michael Brown",  type:"return", driver:"None", startDate:"Fri, 18 Aug 2028", endDate:"Sat, 19 Aug 2028", carType:"Sedan",     carNum:"EF7890", trans:"Automatic", carImg:"/images/movo premium.png",  agenda:"Car Return at 1:00 PM" },
  { id:17, date:D(19), h:15, m:30, dur:55, car:"Kia Soul",         client:"Elona White",    type:"pickup", driver:"None", startDate:"Sat, 19 Aug 2028", endDate:"Sun, 20 Aug 2028", carType:"Hatchback", carNum:"GH1234", trans:"Automatic", carImg:"/images/movo premium.png",  agenda:"Car Pickup at 3:30 PM" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtHour(h: number) {
  if (h === 0 || h === 12) return `12:00 ${h === 0 ? "AM" : "PM"}`;
  return h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
}
function fmtTime(h: number, m: number) {
  const hd = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ap = h >= 12 ? "PM" : "AM";
  return `${hd}:${m.toString().padStart(2, "0")} ${ap}`;
}

// ── Event block ───────────────────────────────────────────────────────────────
function EvtBlock({ evt, sel, onClick }: { evt: Evt; sel: boolean; onClick: () => void }) {
  const top    = (evt.h - S_HOUR + evt.m / 60) * HOUR_H;
  const height = Math.max((evt.dur / 60) * HOUR_H, 46);
  const pickup = evt.type === "pickup";
  const bg     = pickup ? (sel ? "#bfdbfe" : "#dbeafe") : (sel ? "#fbcfe8" : "#fce7f3");
  const tx     = pickup ? "#1e40af" : "#9d174d";
  const bdr    = sel ? `1.5px solid ${pickup ? "#3b82f6" : "#ec4899"}` : "1px solid transparent";
  const left   = evt.ow === undefined ? "3px" : evt.ow === 0 ? "2px" : "50%";
  const width  = evt.ow === undefined ? "calc(100% - 6px)" : "calc(50% - 4px)";

  return (
    <div onClick={onClick} className="rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden"
      style={{ position: "absolute", top, height, left, width, background: bg, border: bdr, zIndex: sel ? 2 : 1 }}>
      <p className="text-[9px] font-semibold leading-tight" style={{ color: tx }}>
        {fmtTime(evt.h, evt.m)}
      </p>
      <p className="text-[10px] font-bold leading-tight truncate" style={{ color: tx }}>{evt.car}</p>
      <div className="flex items-center gap-0.5 mt-0.5">
        <svg width="8" height="8" viewBox="0 0 24 24" fill={tx}>
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
        <p className="text-[9px] truncate" style={{ color: tx }}>{evt.client}</p>
      </div>
    </div>
  );
}

// ── Schedule Detail panel ─────────────────────────────────────────────────────
function ScheduleDetail({ evt, onClose }: { evt: Evt; onClose: () => void }) {
  return (
    <div className="w-[272px] shrink-0 border-l border-gray-100 bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
        <p className="text-[14px] font-bold text-gray-900">Schedule Detail</p>
        <button onClick={onClose}
          className="no-hover-fx w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-[16px] leading-none">×</button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Agenda */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Agenda</p>
          <p className="text-[13px] font-bold text-gray-900">{evt.agenda}</p>
        </div>

        {/* Client Info */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Client Info</p>
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-2 mb-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center">
              <svg width="40" height="46" viewBox="0 0 40 48" fill="none">
                <circle cx="20" cy="13" r="9" fill="#c4b5fd"/>
                <path d="M12 11 Q20 4 28 11 Q28 6 20 4 Q12 6 12 11z" fill="#1a1a2e"/>
                <path d="M8 48 Q8 30 20 26 Q32 30 32 48Z" fill="#6366f1"/>
                <path d="M19 26 L20 34 L21 26" fill="white"/>
              </svg>
            </div>
            <p className="text-[13px] font-bold text-gray-900">{evt.client}</p>
          </div>
          {[
            { label: "Driver",     val: evt.driver    },
            { label: "Start Date", val: evt.startDate },
            { label: "End Date",   val: evt.endDate   },
            ...(evt.notes ? [{ label: "Notes", val: evt.notes }] : []),
          ].map(({ label, val }) => (
            <div key={label} className="flex items-start justify-between py-1.5 border-b border-gray-50 gap-3">
              <p className="text-[11px] text-gray-400 shrink-0">{label}</p>
              <p className="text-[11px] text-gray-700 font-medium text-right leading-snug">{val}</p>
            </div>
          ))}
        </div>

        {/* Car Info */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Car Info</p>
          <div className="bg-gray-50 rounded-xl overflow-hidden mb-3">
            <div className="relative w-full h-28">
              <Image src={evt.carImg} alt={evt.car} fill className="object-contain p-3" sizes="272px"/>
            </div>
          </div>
          <p className="text-[14px] font-bold text-gray-900 mb-2">{evt.car}</p>
          {[
            { label: "Car Type",    val: evt.carType },
            { label: "Car Number",  val: evt.carNum  },
            { label: "Transmission",val: evt.trans   },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50">
              <p className="text-[11px] text-gray-400">{label}</p>
              <p className="text-[11px] text-gray-700 font-medium">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Time-grid (shared by week + day views) ───────────────────────────────────
function TimeGrid({ days, eventsForDay, selected, onEvt }: {
  days: Date[]; eventsForDay: (d: Date) => Evt[];
  selected: Evt | null; onEvt: (e: Evt) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto">
      <div className="flex" style={{ minWidth: days.length === 1 ? 320 : 480 }}>
        <div className="w-16 shrink-0">
          {HOURS.map(h => (
            <div key={h} className="flex items-start justify-end pr-2 pt-1" style={{ height: HOUR_H }}>
              <span className="text-[9px] text-gray-400">{fmtHour(h)}</span>
            </div>
          ))}
        </div>
        {days.map((day, di) => (
          <div key={di} className="flex-1 border-l border-gray-100"
            style={{ height: HOUR_H * (E_HOUR - S_HOUR), position: "relative", overflow: "visible" }}>
            {HOURS.map(h => (
              <div key={h} className="border-b border-gray-50" style={{ height: HOUR_H }}/>
            ))}
            {eventsForDay(day).map(evt => (
              <EvtBlock key={evt.id} evt={evt} sel={selected?.id === evt.id} onClick={() => onEvt(evt)}/>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────
function MonthView({ anchor, eventsFor, filter, selected, onEvt }: {
  anchor: Date; eventsFor: (d: Date) => Evt[]; filter: Filter;
  selected: Evt | null; onEvt: (e: Evt) => void;
}) {
  const gridDays = useMemo(() => monthGridDays(anchor.getFullYear(), anchor.getMonth()), [anchor]);
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEK_DAYS.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-gray-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {gridDays.map((day, i) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const dayEvts = eventsFor(day).filter(e => filter === "all" || e.type === filter);
          return (
            <div key={i} className="border-b border-r border-gray-50 min-h-[80px] p-1.5"
              style={{ opacity: inMonth ? 1 : 0.3 }}>
              <p className="text-[11px] font-semibold text-gray-700 mb-1">{day.getDate()}</p>
              {dayEvts.slice(0, 2).map(evt => (
                <div key={evt.id} onClick={() => onEvt(evt)}
                  className="text-[9px] px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer font-medium"
                  style={{
                    background: evt.type === "pickup" ? "#dbeafe" : "#fce7f3",
                    color:      evt.type === "pickup" ? "#1e40af" : "#9d174d",
                    border: selected?.id === evt.id ? `1px solid ${evt.type === "pickup" ? "#3b82f6" : "#ec4899"}` : "none",
                  }}>
                  {evt.car}
                </div>
              ))}
              {dayEvts.length > 2 && (
                <p className="text-[8px] text-gray-400 pl-1">+{dayEvts.length - 2} more</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [filter,   setFilter]   = useState<Filter>("all");
  const [view,     setView]     = useState<ViewMode>("week");
  const [anchor,   setAnchor]   = useState<Date>(BASE_DATE);
  const [selected, setSelected] = useState<Evt | null>(EVENTS.find(e => e.id === 11) ?? null);

  // ── Derived dates ──────────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const mon = getMonday(anchor);
    return Array.from({ length: 6 }, (_, i) => addDays(mon, i));
  }, [anchor]);

  const monthLabel = useMemo(() => {
    if (view === "week") {
      const mon = getMonday(anchor);
      const sat = addDays(mon, 5);
      const opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
      if (mon.getMonth() === sat.getMonth()) return mon.toLocaleDateString("en-US", opts);
      return `${mon.toLocaleDateString("en-US",{month:"long"})} – ${sat.toLocaleDateString("en-US",opts)}`;
    }
    return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [anchor, view]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const delta = view === "day" ? 1 : view === "week" ? 7 : 28;
  const goBack    = () => setAnchor(d => addDays(d, -delta));
  const goForward = () => setAnchor(d => addDays(d, +delta));
  const goToday   = () => setAnchor(BASE_DATE);

  // ── Event helpers ──────────────────────────────────────────────────────────
  const eventsForDay = (day: Date) =>
    EVENTS.filter(e => sameDay(e.date, day) && (filter === "all" || e.type === filter));

  const handleEvt = (evt: Evt) => setSelected(prev => prev?.id === evt.id ? null : evt);

  // ── Header columns ─────────────────────────────────────────────────────────
  const headerDays = view === "day" ? [anchor] : weekDays;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0 flex-wrap">
          <button onClick={goToday}
            className="no-hover-fx px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-600 border border-gray-200">
            Today
          </button>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={goBack}
              className="no-hover-fx w-7 h-7 flex items-center justify-center text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button onClick={goForward}
              className="no-hover-fx w-7 h-7 flex items-center justify-center text-gray-400 border-l border-gray-200">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <p className="text-[14px] font-bold text-gray-900">{monthLabel}</p>
          <div className="flex-1"/>
          <div className="flex items-center gap-1.5">
            {(["all","pickup","return"] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="no-hover-fx px-3 py-1 rounded-full text-[11px] font-semibold capitalize"
                style={{ background: filter===f?"#ef4444":"#f3f4f6", color: filter===f?"white":"#6b7280" }}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          <select value={view} onChange={e => setView(e.target.value as ViewMode)}
            className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none" suppressHydrationWarning>
            <option value="week">Week</option>
            <option value="day">Day</option>
            <option value="month">Month</option>
          </select>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-50 shrink-0">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400"/><span className="text-[11px] text-gray-500">Pickup</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-400"/><span className="text-[11px] text-gray-500">Return</span></div>
        </div>

        {/* ── Day header (week + day views only) ── */}
        {view !== "month" && (
          <div className="flex border-b border-gray-100 shrink-0 bg-white">
            <div className="w-16 shrink-0 py-2 text-center">
              <span className="text-[9px] text-gray-400">UTC+1</span>
            </div>
            {headerDays.map((day, i) => (
              <div key={i} className="flex-1 border-l border-gray-100 py-2 text-center">
                <p className="text-[15px] font-bold text-gray-900 leading-none">{day.getDate()}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Grid / Month body ── */}
        {view === "month"
          ? <MonthView anchor={anchor} eventsFor={d => EVENTS.filter(e => sameDay(e.date,d))}
              filter={filter} selected={selected} onEvt={handleEvt}/>
          : <TimeGrid days={headerDays} eventsForDay={eventsForDay}
              selected={selected} onEvt={handleEvt}/>
        }
      </div>

      {selected && <ScheduleDetail evt={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
}
