"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const TrackingMap = dynamic(() => import("./TrackingMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full" style={{ background: "#e8dcd0" }}/>,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type TripStatus = "On Trip" | "Returned";
type Vehicle = {
  id:number; client:string; car:string; carType:string; carNumber:string;
  status:TripStatus; startDate:string; endDate:string; tripTime:string; distance:string;
  pos:[number,number]; route:[number,number][];
};

// ── Constants ─────────────────────────────────────────────────────────────────
const ST: Record<TripStatus,{bg:string;color:string}> = {
  "On Trip":  {bg:"#dbeafe",color:"#1d4ed8"},
  "Returned": {bg:"#fce7f3",color:"#db2777"},
};
const AVATAR_COLS=["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#ec4899","#8b5cf6"];
const ac=(n:string)=>AVATAR_COLS[n.charCodeAt(0)%AVATAR_COLS.length];
const ini=(n:string)=>n.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();

const VEHICLES: Vehicle[] = [
  {id:1,client:"Helen Martinez",car:"Aston Martin",   carType:"Sedan", carNumber:"A01234",status:"Returned",startDate:"Mon, 1 Aug 2028", endDate:"Tue, 2 Aug 2028", tripTime:"8 hrs 20 min",  distance:"140 miles",pos:[34.0620,-118.2420],route:[[34.0720,-118.2300],[34.0680,-118.2350],[34.0620,-118.2420]]},
  {id:2,client:"Bob Smith",     car:"Hyundai Sonata", carType:"Sedan", carNumber:"B05678",status:"On Trip", startDate:"Tue, 2 Aug 2028", endDate:"Thu, 4 Aug 2028", tripTime:"6 hrs 15 min",  distance:"95 miles", pos:[34.0520,-118.2480],route:[[34.0680,-118.2350],[34.0610,-118.2410],[34.0520,-118.2480]]},
  {id:3,client:"Diana White",   car:"Chevrolet Bolt", carType:"SUV",   carNumber:"C02345",status:"On Trip", startDate:"Wed, 2 Aug 2028", endDate:"Thu, 3 Aug 2028", tripTime:"12 hrs 39 min", distance:"180 miles",pos:[34.0445,-118.2630],route:[[34.0680,-118.2360],[34.0620,-118.2420],[34.0570,-118.2480],[34.0510,-118.2550],[34.0445,-118.2630]]},
  {id:4,client:"Edward Green",  car:"VW Amarok",      carType:"Pickup",carNumber:"D09012",status:"Returned",startDate:"Sun, 31 Jul 2028",endDate:"Tue, 2 Aug 2028", tripTime:"10 hrs 5 min",  distance:"160 miles",pos:[34.0380,-118.2620],route:[[34.0680,-118.2380],[34.0530,-118.2510],[34.0380,-118.2620]]},
  {id:5,client:"Fiona Brown",   car:"BMW iX3",        carType:"SUV",   carNumber:"E03456",status:"On Trip", startDate:"Wed, 2 Aug 2028", endDate:"Fri, 4 Aug 2028", tripTime:"5 hrs 50 min",  distance:"75 miles", pos:[34.0560,-118.2450],route:[[34.0730,-118.2310],[34.0650,-118.2380],[34.0560,-118.2450]]},
  {id:6,client:"George Clark",  car:"Audi Q7",        carType:"SUV",   carNumber:"F07890",status:"On Trip", startDate:"Tue, 2 Aug 2028", endDate:"Thu, 4 Aug 2028", tripTime:"9 hrs 10 min",  distance:"130 miles",pos:[34.0490,-118.2510],route:[[34.0670,-118.2390],[34.0590,-118.2450],[34.0490,-118.2510]]},
  {id:7,client:"Helen Martinez",car:"Nissan Ariya",   carType:"SUV",   carNumber:"G01234",status:"Returned",startDate:"Mon, 1 Aug 2028", endDate:"Wed, 3 Aug 2028", tripTime:"7 hrs 45 min",  distance:"110 miles",pos:[34.0400,-118.2570],route:[[34.0640,-118.2430],[34.0510,-118.2490],[34.0400,-118.2570]]},
  {id:8,client:"Laura King",    car:"Kia EV6",        carType:"SUV",   carNumber:"H05678",status:"On Trip", startDate:"Wed, 2 Aug 2028", endDate:"Fri, 4 Aug 2028", tripTime:"4 hrs 30 min",  distance:"60 miles", pos:[34.0460,-118.2680],route:[[34.0640,-118.2500],[34.0570,-118.2590],[34.0460,-118.2680]]},
  {id:9,client:"Ivan Rodriguez",car:"Range Rover Velar",carType:"SUV", carNumber:"I09012",status:"On Trip", startDate:"Tue, 2 Aug 2028", endDate:"Fri, 5 Aug 2028", tripTime:"15 hrs 20 min", distance:"210 miles",pos:[34.0350,-118.2650],route:[[34.0700,-118.2370],[34.0540,-118.2490],[34.0350,-118.2650]]},
];

// ── Car silhouette icon ───────────────────────────────────────────────────────
function CarThumb({color="#94a3b8"}:{color?:string}){
  return(
    <svg viewBox="0 0 64 32" fill="none" className="w-full h-full">
      <path d="M10 22 L16 10 L48 10 L54 22 Z" fill={color} opacity="0.15"/>
      <rect x="9" y="20" width="46" height="10" rx="3" fill={color} opacity="0.25"/>
      <path d="M14 20 L20 10 L44 10 L50 20" fill={color} opacity="0.3"/>
      <circle cx="19" cy="30" r="4" fill={color} opacity="0.4"/>
      <circle cx="45" cy="30" r="4" fill={color} opacity="0.4"/>
    </svg>
  );
}

// ── Add Car Modal ─────────────────────────────────────────────────────────────
function AddCarModal({ onSave, onClose }: { onSave:(v:Omit<Vehicle,"id"|"pos"|"route">)=>void; onClose:()=>void; }) {
  const[f,setF]=useState({client:"",car:"",carType:"SUV",carNumber:"",status:"On Trip" as TripStatus,startDate:"",endDate:"",tripTime:"",distance:""});
  const s=(k:string,v:string)=>setF(p=>({...p,[k]:v}));
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/40"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-bold text-gray-900">Add Car</p>
          <button onClick={onClose} className="no-hover-fx w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[18px] leading-none">×</button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Client Name *</p>
              <input value={f.client} onChange={e=>s("client",e.target.value)} placeholder="e.g. Diana White"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] focus:outline-none focus:border-red-300 placeholder-gray-300"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Car Model *</p>
              <input value={f.car} onChange={e=>s("car",e.target.value)} placeholder="e.g. Chevrolet Bolt"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] focus:outline-none focus:border-red-300 placeholder-gray-300"/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Type</p>
              <select value={f.carType} onChange={e=>s("carType",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] focus:outline-none" suppressHydrationWarning>
                {["SUV","Sedan","Pickup","Hatchback","Coupe"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Car Number *</p>
              <input value={f.carNumber} onChange={e=>s("carNumber",e.target.value)} placeholder="e.g. C02345"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] focus:outline-none placeholder-gray-300"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Status</p>
              <select value={f.status} onChange={e=>s("status",e.target.value as TripStatus)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] focus:outline-none" suppressHydrationWarning>
                <option>On Trip</option><option>Returned</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Start Date</p>
              <input type="date" value={f.startDate} onChange={e=>s("startDate",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] focus:outline-none"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">End Date</p>
              <input type="date" value={f.endDate} onChange={e=>s("endDate",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] focus:outline-none"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Trip Time</p>
              <input value={f.tripTime} onChange={e=>s("tripTime",e.target.value)} placeholder="e.g. 12 hrs 39 min"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] focus:outline-none placeholder-gray-300"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Distance</p>
              <input value={f.distance} onChange={e=>s("distance",e.target.value)} placeholder="e.g. 180 miles"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] focus:outline-none placeholder-gray-300"/></div>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200">Cancel</button>
          <button onClick={()=>f.client.trim()&&f.car.trim()&&onSave({...f})}
            disabled={!f.client.trim()||!f.car.trim()}
            className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{background:f.client.trim()&&f.car.trim()?"#ef4444":"#fca5a5"}}>
            Add Car
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const[vehicles,setVehicles]=useState<Vehicle[]>(VEHICLES);
  const[activeId,setActiveId]=useState(3);
  const[search,setSearch]=useState("");
  const[addOpen,setAddOpen]=useState(false);

  const filtered=vehicles.filter(v=>
    v.client.toLowerCase().includes(search.toLowerCase())||
    v.car.toLowerCase().includes(search.toLowerCase())
  );
  const active=vehicles.find(v=>v.id===activeId);

  const handleAdd=(d:Omit<Vehicle,"id"|"pos"|"route">)=>{
    const id=Math.max(...vehicles.map(v=>v.id))+1;
    const pos:[number,number]=[34.0430+( Math.random()-0.5)*0.04, -118.2500+(Math.random()-0.5)*0.04];
    setVehicles(p=>[...p,{...d,id,pos,route:[pos]}]);
    setAddOpen(false);
  };

  return(
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ── */}
      <div className="w-[270px] shrink-0 border-r border-gray-100 flex flex-col bg-white overflow-hidden">
        {/* Search */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search for client or car" value={search}
              onChange={e=>setSearch(e.target.value)}
              className="flex-1 text-[12px] text-gray-900 focus:outline-none bg-transparent placeholder-gray-300" suppressHydrationWarning/>
            <button className="no-hover-fx text-gray-300">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
          {filtered.map(v=>{
            const isSel=v.id===activeId;
            const ss=ST[v.status];
            return(
              <button key={v.id} onClick={()=>setActiveId(v.id)}
                className="no-hover-fx w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                style={{background:"white",border:isSel?"1.5px solid #e2e8f0":"1.5px solid transparent",boxShadow:isSel?"0 1px 6px rgba(0,0,0,0.07)":"none"}}>
                <div className="w-16 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                  <CarThumb color={isSel?"#ef4444":"#94a3b8"}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-900 truncate">{v.client}</p>
                  <p className="text-[10px] text-gray-400 truncate"># {v.car}</p>
                </div>
                <span className="shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{background:ss.bg,color:ss.color}}>
                  {v.status}
                </span>
              </button>
            );
          })}
          {filtered.length===0&&<p className="text-center text-[12px] text-gray-400 py-8">No vehicles found.</p>}
        </div>

        {/* Add Car */}
        <div className="px-3 pb-3 shrink-0">
          <button onClick={()=>setAddOpen(true)}
            className="no-hover-fx w-full py-2.5 rounded-xl text-white text-[13px] font-semibold"
            style={{background:"#ef4444"}}>
            + Add Car
          </button>
        </div>
      </div>

      {/* ── Right panel ── */}
      {active?(
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Info bar */}
          <div className="shrink-0 border-b border-gray-100 bg-white px-5 py-3 flex items-stretch gap-5">
            {/* Driver */}
            <div className="flex items-center gap-3 pr-5 border-r border-gray-100">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold shrink-0"
                style={{background:ac(active.client)}}>
                {ini(active.client)}
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-900">{active.client}</p>
                <span className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full mt-0.5"
                  style={{background:ST[active.status].bg,color:ST[active.status].color}}>
                  {active.status}
                </span>
                <p className="text-[10px] text-blue-500 mt-1 cursor-pointer">Send a Message</p>
              </div>
            </div>

            {/* Car info */}
            <div className="flex items-center gap-3 pr-5 border-r border-gray-100">
              <div className="w-20 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                <CarThumb color="#ef4444"/>
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-900">{active.car}</p>
                <div className="flex gap-3 mt-1">
                  <div><p className="text-[9px] text-gray-400">Car Type</p><p className="text-[11px] font-medium text-gray-700">{active.carType}</p></div>
                  <div><p className="text-[9px] text-gray-400">Car Number</p><p className="text-[11px] font-medium text-gray-700">{active.carNumber}</p></div>
                </div>
              </div>
            </div>

            {/* Rent info */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-gray-900 mb-2">Rent Info</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  {icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>, label:"Driver",    val:active.client},
                  {icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label:"Start Date", val:active.startDate},
                  {icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label:"End Date",   val:active.endDate},
                  {icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label:"Trip Time",  val:active.tripTime},
                  {icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><polyline points="16 6 22 12 16 18"/></svg>, label:"Total Distance",val:active.distance},
                ].map(r=>(
                  <div key={r.label} className="flex items-center gap-1.5">
                    <span className="shrink-0">{r.icon}</span>
                    <span className="text-[9px] text-gray-400 shrink-0">{r.label}</span>
                    <span className="text-[9px] font-medium text-gray-700 truncate">— {r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 overflow-hidden">
            <TrackingMap lat={active.pos[0]} lng={active.pos[1]} route={active.route}/>
          </div>
        </div>
      ):(
        <div className="flex-1 flex items-center justify-center text-gray-400 text-[13px]">
          Select a vehicle to view tracking details
        </div>
      )}

      {addOpen&&<AddCarModal onSave={handleAdd} onClose={()=>setAddOpen(false)}/>}
    </div>
  );
}
