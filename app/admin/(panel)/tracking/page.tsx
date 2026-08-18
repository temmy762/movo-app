"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSocket, SOCKET_EVENTS } from "@/context/SocketContext";

const TrackingMap = dynamic(() => import("./TrackingMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full" style={{ background: "#e8dcd0" }}/>,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type TripStatus = "On Way" | "Active Trip" | "Returned";
type Vehicle = {
  id:string; client:string; car:string; carType:string; carNumber:string;
  status:TripStatus; startDate:string; endDate:string; tripTime:string; distance:string;
  pos:[number,number]; route:[number,number][]; heading?:number;
  driverName?:string; vehiclePhoto?:string|null;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const ST: Record<TripStatus,{bg:string;color:string}> = {
  "On Way":      {bg:"#dbeafe",color:"#1d4ed8"},
  "Active Trip": {bg:"#dcfce7",color:"#16a34a"},
  "Returned":    {bg:"#fce7f3",color:"#db2777"},
};
const AVATAR_COLS=["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#ec4899","#8b5cf6"];
const ac=(n:string)=>AVATAR_COLS[n.charCodeAt(0)%AVATAR_COLS.length];
const ini=(n:string)=>n.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();


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
function AddCarModal({ onSave, onClose, drivers=[] }: { onSave:(v:Omit<Vehicle,"id"|"pos"|"route">,driverId?:string)=>void; onClose:()=>void; drivers?:any[] }) {
  const[f,setF]=useState({client:"",car:"",carType:"SUV",carNumber:"",status:"On Trip" as TripStatus,startDate:"",endDate:"",tripTime:"",distance:"",driverId:""});
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
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Driver *</p>
              <select value={f.driverId} onChange={e=>s("driverId",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] focus:outline-none" suppressHydrationWarning>
                <option value="">Select driver...</option>
                {drivers.map(d=><option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
              </select></div>
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
          <button onClick={()=>f.car.trim()&&f.carNumber.trim()&&f.driverId&&onSave({...f},f.driverId)}
            disabled={!f.car.trim()||!f.carNumber.trim()||!f.driverId}
            className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{background:f.car.trim()&&f.carNumber.trim()&&f.driverId?"#ef4444":"#fca5a5"}}>
            Add Car
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const[vehicles,setVehicles]=useState<Vehicle[]>([]);
  const[drivers,setDrivers]=useState<any[]>([]);
  const[activeId,setActiveId]=useState<string|null>(null);
  const[search,setSearch]=useState("");
  const[addOpen,setAddOpen]=useState(false);
  const[mobileView,setMobileView]=useState<"list"|"map">("map");
  const[lastUpdated,setLastUpdated]=useState<Date|null>(null);
  const[isRefreshing,setIsRefreshing]=useState(false);
  const[showHistory,setShowHistory]=useState(false);
  const cancelledRef=useRef(false);
  const{join,on,connected}=useSocket();

  /* Roster load. Live positions arrive over the socket, so this runs on mount
     and on scope change — not on a timer. */
  const load=useCallback(()=>{
    setIsRefreshing(true);
    fetch(`/api/admin/tracking?scope=${showHistory?"all":"live"}`)
      .then(r=>{
        if(!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then((data)=>{
        if(cancelledRef.current) return;
        if(Array.isArray(data)){
          setVehicles(data);
          setLastUpdated(new Date());
          setActiveId(prev=>prev??(data.length>0?data[0].id:null));
        }else{
          setVehicles([]);
        }
      })
      .catch(()=>{
        if(cancelledRef.current) return;
        setVehicles([]);
      })
      .finally(()=>setIsRefreshing(false));
  },[showHistory]);

  // Fetch available drivers for the Add Car modal
  useEffect(()=>{
    fetch("/api/admin/drivers?simple=true")
      .then(r=>r.json())
      .then(data=>{
        if(Array.isArray(data)) setDrivers(data);
      })
      .catch(err=>console.error("Failed to fetch drivers:", err));
  },[]);

  useEffect(()=>{
    cancelledRef.current=false;
    load();
    return()=>{ cancelledRef.current=true; };
  },[load]);

  /* Join the admin room so DRIVER_LOCATION and booking lifecycle events reach
     this board. */
  useEffect(()=>{ join({ role:"admin" }); },[join,connected]);

  /* Live marker movement — replaces the old 5s poll entirely. */
  useEffect(()=>{
    const unsubLoc=on(SOCKET_EVENTS.DRIVER_LOCATION,(data)=>{
      const d=data as {bookingId:string;lat:number;lng:number;heading?:number};
      setVehicles(prev=>{
        let changed=false;
        const next:Vehicle[]=prev.map(v=>{
          if(v.id!==d.bookingId) return v;
          changed=true;
          return {
            ...v,
            pos:[d.lat,d.lng] as [number,number],
            heading:d.heading??v.heading,
            /* Extend the drawn trail so the selected vehicle's path grows live */
            route:[...(v.route??[]),[d.lat,d.lng] as [number,number]].slice(-150),
            status:(v.status==="Returned"?"Returned":"Active Trip") as TripStatus,
          };
        });
        if(!changed) return prev;
        return next;
      });
      setLastUpdated(new Date());
    });

    /* Roster changes: a trip starting or ending should appear/disappear without
       a manual refresh. These are low-frequency, so a targeted reload is fine. */
    const reload=()=>load();
    const unsubCreated=on(SOCKET_EVENTS.BOOKING_CREATED,reload);
    const unsubAccepted=on(SOCKET_EVENTS.BOOKING_ACCEPTED,reload);
    const unsubCompleted=on(SOCKET_EVENTS.BOOKING_COMPLETED,reload);
    const unsubCancelled=on(SOCKET_EVENTS.BOOKING_CANCELLED,reload);

    return()=>{
      unsubLoc(); unsubCreated(); unsubAccepted(); unsubCompleted(); unsubCancelled();
    };
  },[on,load]);

  /* Load the real GPS trail only for the vehicle actually being viewed. */
  useEffect(()=>{
    if(!activeId) return;
    let cancelled=false;
    fetch(`/api/admin/tracking/${activeId}/trail`)
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(cancelled||!d||!Array.isArray(d.route)||d.route.length===0) return;
        setVehicles(prev=>prev.map(v=>v.id===activeId
          ?{...v,route:d.route,distance:d.distance??v.distance,heading:d.heading??v.heading}
          :v));
      })
      .catch(()=>{});
    return()=>{ cancelled=true; };
  },[activeId]);

  const filtered=vehicles.filter(v=>
    v.client.toLowerCase().includes(search.toLowerCase())||
    v.car.toLowerCase().includes(search.toLowerCase())
  );
  // Always get the latest active vehicle data
  const active=vehicles.find(v=>v.id===activeId);
  
  const handleAdd=async(d:Omit<Vehicle,"id"|"pos"|"route">,driverId?:string)=>{
    try {
      if (!driverId) {
        alert("Please select a driver");
        return;
      }

      // Parse car model to extract make and model
      const carParts = d.car.split(" ");
      const carMake = carParts[0] || "Unknown";
      const carModel = carParts.slice(1).join(" ") || "Unknown";

      const response = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: d.client,
          carMake,
          carModel,
          carType: d.carType,
          carPlate: d.carNumber,
          driverId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to create vehicle"}`);
        return;
      }

      // Vehicle created successfully, refresh the list
      setAddOpen(false);
      load(); // Refresh tracking data
    } catch (err) {
      console.error("Failed to add vehicle:", err);
      alert("Failed to add vehicle. Please try again.");
    }
  };

  return(
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ── */}
      <div className={`${mobileView==="list"?"flex":"hidden"} lg:flex flex-col w-full lg:w-[270px] lg:shrink-0 border-r border-gray-100 bg-white overflow-hidden`}>
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

        {/* Refresh Status */}
        <div className="px-3 pb-2 shrink-0 border-t border-gray-100 pt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-400'}`}></span>
              <span>{connected ? 'Live' : 'Reconnecting…'}</span>
              {lastUpdated && (
                <span className="text-gray-300">
                  • {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            {isRefreshing && <span className="text-blue-400">Loading…</span>}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={()=>setShowHistory(v=>!v)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
              {showHistory ? 'Live only' : 'Show completed'}
            </button>
            <button
              onClick={load}
              disabled={isRefreshing}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              Reload list
            </button>
          </div>
        </div>

        {/* Add Car */}
        <div className="px-3 pb-3 shrink-0 flex flex-col gap-2">
          <button onClick={()=>setAddOpen(true)}
            className="no-hover-fx w-full py-2.5 rounded-xl text-white text-[13px] font-semibold"
            style={{background:"#ef4444"}}>
            + Add Car
          </button>
          <button onClick={()=>setMobileView("map")}
            className="no-hover-fx lg:hidden w-full py-2.5 rounded-xl text-[13px] font-semibold border border-gray-200 text-gray-600">
            View Map
          </button>
        </div>
      </div>

      {/* ── Right panel ── */}
      {active?(
        <div className={`${mobileView==="map"?"flex":"hidden"} lg:flex flex-1 flex-col overflow-hidden min-w-0`}>
          {/* Mobile: back to list button */}
          <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white shrink-0">
            <button onClick={()=>setMobileView("list")} className="no-hover-fx flex items-center gap-2 text-[12px] text-gray-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Vehicles
            </button>
          </div>
          {/* Info bar */}
          <div className="shrink-0 border-b border-gray-100 bg-white overflow-x-auto">
          <div className="px-5 py-3 flex items-stretch gap-5 min-w-max">
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
                {active.vehiclePhoto
                  ? <img src={active.vehiclePhoto} alt={active.car} className="w-full h-full object-cover"/>
                  : <CarThumb color="#ef4444"/>}
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
                  {icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>, label:"Driver",    val:active.driverName||active.client},
                  {icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label:"Start Date", val:active.startDate},
                  {icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label:"End Date",   val:active.endDate},
                  {icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label:"Trip Time",  val:active.tripTime},
                  {icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><polyline points="16 6 22 12 16 18"/></svg>, label:"Total Distance",val:active.distance},
                ].map(r=>(
                  <div key={r.label} className="flex items-center gap-1.5">
                    <span className="shrink-0">{r.icon}</span>
                    <span className="text-[9px] text-gray-400 shrink-0">{r.label}</span>
                    <span className="text-[9px] font-medium text-gray-700 truncate">{r.val && r.val !== "—" ? `— ${r.val}` : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>

          {/* Route Statistics */}
          <div className="shrink-0 border-b border-gray-100 bg-white px-5 py-3 text-[11px]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-6">
                <div>
                  <p className="text-gray-400">Total Waypoints</p>
                  <p className="font-bold text-gray-900 text-[13px]">{active.route?.length || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400">Current Position</p>
                  <p className="font-mono text-gray-700 text-[10px]">{active.pos[0].toFixed(4)}, {active.pos[1].toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className="font-bold text-gray-900">{active.status}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const coords = active.route?.map(p => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('\n');
                  navigator.clipboard.writeText(coords || '');
                  alert('Route coordinates copied to clipboard!');
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-[10px] font-medium">
                Copy Route
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 overflow-hidden">
            {active && (
              <TrackingMap 
                key={active.id}
                lat={active.pos[0]} 
                lng={active.pos[1]} 
                route={active.route} 
                heading={active.heading}
              />
            )}
          </div>
        </div>
      ):(
        <div className="flex-1 flex items-center justify-center text-gray-400 text-[13px]">
          Select a vehicle to view tracking details
        </div>
      )}

      {addOpen&&<AddCarModal onSave={handleAdd} onClose={()=>setAddOpen(false)} drivers={drivers}/>}
    </div>
  );
}
