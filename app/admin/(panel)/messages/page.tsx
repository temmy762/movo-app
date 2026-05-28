"use client";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
type Msg  = { id:number; from:"admin"|"user"; text?:string; time:string; };
type Conv = { id:string; name:string; lastMsg:string; time:string; unread:boolean; online:boolean; group:string; messages:Msg[]; phone?:string; type:"driver"|"client"; };
type Filter = "all"|"unread"|"drivers"|"clients";

// ── Helpers ───────────────────────────────────────────────────────────────────
const COLORS=["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#ec4899","#8b5cf6"];
const ac=(n:string)=>COLORS[n.charCodeAt(0)%COLORS.length];
const ini=(n:string)=>n.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
function nowTime(){return new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({name,size=8}:{name:string;size?:number}){
  return(
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{background:ac(name),fontSize:size<=8?"11px":"13px"}}>
      {ini(name)}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({msg,onDone}:{msg:string;onDone:()=>void}){
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[onDone]);
  return(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white text-[12px] font-medium px-4 py-2.5 rounded-xl shadow-lg pointer-events-none">
      {msg}
    </div>
  );
}

// ── New Conversation Modal ────────────────────────────────────────────────────
function NewConvModal({onClose,onSelect}:{onClose:()=>void;onSelect:(id:string,name:string,phone?:string)=>void}){
  const[drivers,setDrivers]=useState<{id:string;name:string;phone:string}[]>([]);
  const[q,setQ]=useState("");
  useEffect(()=>{
    fetch("/api/admin/drivers").then(r=>r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((data:any[])=>setDrivers(data.map(d=>({id:d.id,name:d.name,phone:d.phone??""}))));
  },[]);
  const list=drivers.filter(d=>d.name.toLowerCase().includes(q.toLowerCase()));
  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-5 z-10 max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-bold text-gray-900">New Conversation</p>
          <button onClick={onClose} className="no-hover-fx w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[16px]">×</button>
        </div>
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 mb-3">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search drivers..."
            className="flex-1 text-[12px] focus:outline-none bg-transparent text-gray-800 placeholder-gray-300" suppressHydrationWarning/>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1">
          {list.length===0&&<p className="text-center text-[12px] text-gray-400 py-6">No drivers found.</p>}
          {list.map(d=>(
            <button key={d.id} onClick={()=>{onSelect(d.id,d.name,d.phone||undefined);onClose();}}
              className="no-hover-fx flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left transition-colors w-full">
              <Avatar name={d.name} size={8}/>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{d.name}</p>
                {d.phone&&<p className="text-[10px] text-gray-400">{d.phone}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MessagesPage(){
  const params     = useSearchParams();
  const driverId   = params.get("driver");
  const driverName = params.get("name")??"Driver";

  const[convs,setConvs]       = useState<Conv[]>([]);
  const[activeId,setActiveId] = useState<string|null>(null);
  const[search,setSearch]     = useState("");
  const[filter,setFilter]     = useState<Filter>("all");
  const[filterOpen,setFilterOpen] = useState(false);
  const[newConvOpen,setNewConvOpen] = useState(false);
  const[moreOpen,setMoreOpen] = useState(false);
  const[toast,setToast]       = useState<string|null>(null);
  const[input,setInput]       = useState("");
  const[mobileView,setMobileView] = useState<"list"|"chat">("list");
  const endRef  = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    fetch("/api/admin/messages").then(r=>r.json())
      .then((data:Conv[])=>{
        if(driverId){
          const existing=data.find(c=>c.id===`driver_${driverId}`);
          if(!existing){
            const driverConv:Conv={id:`driver_${driverId}`,name:driverName,lastMsg:"Start a conversation",time:nowTime(),unread:false,online:false,group:"today",messages:[],type:"driver"};
            setConvs([driverConv,...data]);
            setActiveId(`driver_${driverId}`);
          } else {
            setConvs(data);
            setActiveId(`driver_${driverId}`);
          }
        } else {
          setConvs(data);
          if(data.length>0) setActiveId(data[0].id);
        }
      }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const active=convs.find(c=>c.id===activeId);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[activeId,active?.messages.length]);

  const filtered=convs.filter(c=>{
    const mS=c.name.toLowerCase().includes(search.toLowerCase())||c.lastMsg.toLowerCase().includes(search.toLowerCase());
    const mF=filter==="all"||(filter==="unread"&&c.unread)||(filter==="drivers"&&c.type==="driver")||(filter==="clients"&&c.type==="client");
    return mS&&mF;
  });
  const todayConvs   = filtered.filter(c=>c.group==="today");
  const yestConvs    = filtered.filter(c=>c.group==="yesterday");
  const earlierConvs = filtered.filter(c=>c.group!=="today"&&c.group!=="yesterday");

  const selectConv=(id:string)=>{
    setActiveId(id); setMobileView("chat"); setMoreOpen(false);
    setConvs(p=>p.map(c=>c.id===id?{...c,unread:false}:c));
  };

  const send=async()=>{
    if(!input.trim())return;
    const t=input.trim();
    setConvs(p=>p.map(c=>c.id===activeId?{...c,
      messages:[...c.messages,{id:c.messages.length+1,from:"admin",text:t,time:nowTime()}],
      lastMsg:t,time:nowTime()
    }:c));
    setInput("");
    if(activeId?.startsWith("driver_")){
      const tid=activeId.replace("driver_","");
      await fetch("/api/admin/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({driverId:tid,message:t})}).catch(console.error);
    }
  };

  const handleFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file)return;
    const label=file.name.length>30?file.name.slice(0,27)+"...":file.name;
    setConvs(p=>p.map(c=>c.id===activeId?{...c,
      messages:[...c.messages,{id:c.messages.length+1,from:"admin",text:`📎 ${label}`,time:nowTime()}],
      lastMsg:`📎 ${label}`,time:nowTime()
    }:c));
    e.target.value="";
  };

  const handleMarkResolved=async()=>{
    if(!activeId||activeId.startsWith("driver_"))return;
    await fetch(`/api/admin/messages/${activeId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({status:"RESOLVED"})}).catch(console.error);
    setConvs(p=>p.map(c=>c.id===activeId?{...c,unread:false}:c));
    setMoreOpen(false); setToast("Ticket marked as resolved ✓");
  };

  const handleDeleteConv=()=>{
    const next=convs.find(c=>c.id!==activeId);
    setConvs(p=>p.filter(c=>c.id!==activeId));
    setActiveId(next?.id??null);
    setMoreOpen(false);
  };

  const handleNewConv=(id:string,name:string,phone?:string)=>{
    if(!convs.find(c=>c.id===`driver_${id}`)){
      setConvs(p=>[{id:`driver_${id}`,name,lastMsg:"Start a conversation",time:nowTime(),unread:false,online:false,group:"today",messages:[],phone,type:"driver"},...p]);
    }
    setActiveId(`driver_${id}`); setMobileView("chat");
  };

  const FLABELS:Record<Filter,string>={all:"All",unread:"Unread",drivers:"Drivers",clients:"Clients"};
  const dateSep=active?.group==="today"?"Today":active?.group==="yesterday"?"Yesterday":new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});

  const ConvItem=({c}:{c:Conv})=>{
    const isSel=c.id===activeId;
    return(
      <button onClick={()=>selectConv(c.id)}
        className="no-hover-fx w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{background:isSel?"#eff6ff":"transparent"}}>
        <div className="relative shrink-0">
          <Avatar name={c.name}/>
          {c.online&&<span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white"/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[13px] font-semibold text-gray-900 truncate">{c.name}</p>
            <span className="text-[10px] shrink-0 ml-1" style={{color:c.unread?"#ef4444":"#9ca3af"}}>{c.time}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
              {c.type==="driver"&&<span className="text-[9px] bg-blue-100 text-blue-500 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Driver</span>}
              {c.lastMsg}
            </p>
            {c.unread&&<span className="w-2 h-2 rounded-full bg-red-500 shrink-0"/>}
          </div>
        </div>
      </button>
    );
  };

  return(
    <div className="flex h-full overflow-hidden" onClick={()=>{setFilterOpen(false);setMoreOpen(false);}}>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      {newConvOpen&&<NewConvModal onClose={()=>setNewConvOpen(false)} onSelect={handleNewConv}/>}

      {/* ── Left: Conversation List ── */}
      <div className={`${mobileView==="list"?"flex":"hidden"} md:flex flex-col w-full md:w-[295px] md:shrink-0 md:border-r border-gray-100 overflow-hidden bg-white`}>
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-xl px-3 py-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search for messages" value={search} onChange={e=>setSearch(e.target.value)}
                className="text-[12px] text-gray-800 flex-1 focus:outline-none bg-transparent placeholder-gray-300" suppressHydrationWarning/>
              {search&&<button onClick={()=>setSearch("")} className="no-hover-fx text-gray-300 text-[14px] leading-none">×</button>}
            </div>
            {/* Filter */}
            <div className="relative" onClick={e=>e.stopPropagation()}>
              <button onClick={()=>setFilterOpen(o=>!o)}
                className={`no-hover-fx w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${filterOpen||filter!=="all"?"border-red-300 bg-red-50 text-red-400":"border-gray-200 text-gray-400"}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              {filterOpen&&(
                <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl border border-gray-100 shadow-lg w-36 overflow-hidden z-20">
                  {(["all","unread","drivers","clients"] as Filter[]).map(f=>(
                    <button key={f} onClick={()=>{setFilter(f);setFilterOpen(false);}}
                      className={`no-hover-fx w-full px-3 py-2 text-left text-[12px] transition-colors ${filter===f?"bg-red-50 text-red-500 font-semibold":"text-gray-600 hover:bg-gray-50"}`}>
                      {FLABELS[f]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* New conversation */}
            <button onClick={()=>setNewConvOpen(true)}
              className="no-hover-fx w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0" style={{background:"#ef4444"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          {filter!=="all"&&(
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{FLABELS[filter]}</span>
              <button onClick={()=>setFilter("all")} className="no-hover-fx text-[10px] text-gray-400">✕ clear</button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {todayConvs.length>0&&(<>
            <p className="px-4 py-2 text-[10px] font-semibold text-gray-400">Today ({todayConvs.length})</p>
            {todayConvs.map(c=><ConvItem key={c.id} c={c}/>)}
          </>)}
          {yestConvs.length>0&&(<>
            <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 mt-1">Yesterday ({yestConvs.length})</p>
            {yestConvs.map(c=><ConvItem key={c.id} c={c}/>)}
          </>)}
          {earlierConvs.length>0&&(<>
            <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 mt-1">Earlier ({earlierConvs.length})</p>
            {earlierConvs.map(c=><ConvItem key={c.id} c={c}/>)}
          </>)}
          {filtered.length===0&&(
            <p className="px-4 py-8 text-center text-[12px] text-gray-400">No conversations found.</p>
          )}
        </div>
      </div>

      {/* ── Right: Chat Window ── */}
      {active?(
        <div className={`${mobileView==="chat"?"flex":"hidden"} md:flex flex-1 flex-col overflow-hidden min-w-0 bg-white`}>
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0">
            <button onClick={()=>setMobileView("list")} className="md:hidden no-hover-fx w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div className="relative">
              <Avatar name={active.name} size={10}/>
              {active.online&&<span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white"/>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-bold text-gray-900">{active.name}</p>
                {active.type==="driver"&&<span className="text-[9px] bg-blue-100 text-blue-500 px-1.5 py-0.5 rounded-full font-semibold">Driver</span>}
              </div>
              <p className="text-[11px]" style={{color:active.online?"#22c55e":"#9ca3af"}}>{active.online?"Online":"Offline"}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Phone */}
              <button title={active.phone?"Call "+active.phone:"No phone on record"}
                onClick={()=>active.phone?window.location.assign(`tel:${active.phone}`):setToast("No phone number on record")}
                className="no-hover-fx w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.38 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </button>
              {/* Video */}
              <button title="Video calling coming soon" onClick={()=>setToast("Video calling — coming soon")}
                className="no-hover-fx w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              </button>
              {/* More options */}
              <div className="relative" onClick={e=>e.stopPropagation()}>
                <button onClick={()=>setMoreOpen(o=>!o)}
                  className={`no-hover-fx w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${moreOpen?"bg-gray-100 text-gray-600":"bg-gray-50 text-gray-400"}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                </button>
                {moreOpen&&(
                  <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl border border-gray-100 shadow-lg w-48 overflow-hidden z-20">
                    {active.type==="client"&&(
                      <button onClick={handleMarkResolved}
                        className="no-hover-fx w-full px-4 py-2.5 text-left text-[12px] text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                        Mark as Resolved
                      </button>
                    )}
                    <button onClick={handleDeleteConv}
                      className="no-hover-fx w-full px-4 py-2.5 text-left text-[12px] text-red-500 hover:bg-red-50 flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      Delete Conversation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-center my-1">
              <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-3 py-1">{dateSep}</span>
            </div>
            {active.messages.length===0&&(
              <p className="text-center text-[12px] text-gray-400 mt-10">No messages yet. Start the conversation.</p>
            )}
            {active.messages.map(msg=>(
              <div key={msg.id} className={`flex items-end gap-2.5 ${msg.from==="admin"?"flex-row-reverse":""}`}>
                {msg.from==="user"&&<Avatar name={active.name} size={8}/>}
                <div className={`flex flex-col gap-0.5 max-w-[65%] ${msg.from==="admin"?"items-end":""}`}>
                  {msg.text&&(
                    <div className="rounded-2xl px-3.5 py-2.5"
                      style={{
                        background:msg.from==="admin"?"#1e2d45":"#f3f4f6",
                        color:msg.from==="admin"?"white":"#1f2937",
                        borderBottomRightRadius:msg.from==="admin"?4:undefined,
                        borderBottomLeftRadius:msg.from==="user"?4:undefined,
                      }}>
                      <p className="text-[13px] leading-relaxed">{msg.text}</p>
                    </div>
                  )}
                  <div className={`flex items-center gap-1 px-1 ${msg.from==="admin"?"flex-row-reverse":""}`}>
                    <span className="text-[9px] text-gray-400">{msg.time}</span>
                    {msg.from==="admin"&&(
                      <svg width="14" height="10" viewBox="0 0 20 12" fill="none">
                        <path d="M1 6l4 4 8-8" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 6l4 4 8-8" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef}/>
          </div>

          {/* Input area */}
          <div className="px-5 py-3.5 border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-3 border border-gray-200 rounded-2xl px-4 py-2.5">
              <input type="text" placeholder="Type a message..." value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                className="flex-1 text-[13px] text-gray-800 focus:outline-none bg-transparent placeholder-gray-300"
                suppressHydrationWarning/>
              <label className="no-hover-fx cursor-pointer text-gray-400 flex items-center justify-center shrink-0" title="Attach file">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFile}/>
              </label>
              <button onClick={send}
                className="no-hover-fx w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{background:input.trim()?"#ef4444":"#fca5a5"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      ):(
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p className="text-[13px]">Select a conversation or start a new one</p>
        </div>
      )}
    </div>
  );
}
