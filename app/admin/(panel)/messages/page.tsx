"use client";
import { useState, useRef, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Msg  = { id:number; from:"admin"|"user"; text?:string; img?:boolean; time:string; };
type Conv = { id:number; name:string; lastMsg:string; time:string; unread:boolean; online:boolean; group:"today"|"yesterday"; messages:Msg[]; };

// ── Helpers ───────────────────────────────────────────────────────────────────
const COLORS=["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#ec4899","#8b5cf6"];
const ac=(n:string)=>COLORS[n.charCodeAt(0)%COLORS.length];
const ini=(n:string)=>n.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
function nowTime(){return new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});}

// ── Data ──────────────────────────────────────────────────────────────────────
const INIT_CONVS:Conv[]=[
  { id:1,name:"Helen Martinez", group:"today",    time:"04:01 PM",unread:true, online:false,
    lastMsg:"Just confirming my booking for the Mazda 3 next week.",
    messages:[{id:1,from:"user",text:"Just confirming my booking for the Mazda 3 next week.",time:"04:01 PM"}]},
  { id:2,name:"Alice Johnson",  group:"today",    time:"10:10 AM",unread:true, online:false,
    lastMsg:"I just returned the Toyota Corolla. Can you confirm the drop-off?",
    messages:[{id:1,from:"user",text:"I just returned the Toyota Corolla. Can you confirm the drop-off?",time:"10:10 AM"}]},
  { id:3,name:"George Clark",   group:"today",    time:"09:37 AM",unread:false,online:true,
    lastMsg:"No, that's all for now. Thanks for the quick response! I really appreciate it!",
    messages:[
      {id:1,from:"user", text:"Hi, I noticed a small scratch on the Audi Q7. Can you note it down?",time:"09:00 AM"},
      {id:2,from:"admin",text:"Hello George, thank you for informing us. Can you please send a picture of the scratch?",time:"09:26 AM"},
      {id:3,from:"user", text:"Sure, give me a moment.",time:"09:27 AM"},
      {id:4,from:"user", img:true,time:"09:32 AM"},
      {id:5,from:"user", text:"Here is the picture.",time:"09:32 AM"},
      {id:6,from:"admin",text:"Got it. We'll note it down and make sure it's documented. Is there anything else you need assistance with?",time:"09:35 AM"},
      {id:7,from:"user", text:"No, that's all for now. Thanks for the quick response! I really appreciate it!",time:"09:37 AM"},
    ]},
  { id:4,name:"Bob Smith",      group:"today",    time:"09:15 AM",unread:true, online:false,
    lastMsg:"Can I extend my rental for the Honda Civic for another day?",
    messages:[{id:1,from:"user",text:"Can I extend my rental for the Honda Civic for another day?",time:"09:15 AM"}]},
  { id:5,name:"Charlie Davis",  group:"today",    time:"08:45 AM",unread:false,online:false,
    lastMsg:"The Ford Focus needs maintenance. The engine light is on.",
    messages:[{id:1,from:"user",text:"The Ford Focus needs maintenance. The engine light is on.",time:"08:45 AM"}]},
  { id:6,name:"Fiona Brown",    group:"yesterday",time:"05:53 PM",unread:false,online:false,
    lastMsg:"The BMW X5 is fantastic! What are the rates for a longer rental?",
    messages:[{id:1,from:"user",text:"The BMW X5 is fantastic! What are the rates for a longer rental?",time:"05:53 PM"}]},
  { id:7,name:"Diana White",    group:"yesterday",time:"03:00 PM",unread:false,online:false,
    lastMsg:"Thank you for the smooth rental process. I will rent again soon!",
    messages:[{id:1,from:"user",text:"Thank you for the smooth rental process. I will rent again soon!",time:"03:00 PM"}]},
  { id:8,name:"Edward Green",   group:"yesterday",time:"10:00 AM",unread:false,online:false,
    lastMsg:"I left my sunglasses in the Nissan Altima. Can you check?",
    messages:[{id:1,from:"user",text:"I left my sunglasses in the Nissan Altima. Can you check?",time:"10:00 AM"}]},
  { id:9,name:"Ivan Rodriguez", group:"yesterday",time:"09:20 AM",unread:false,online:false,
    lastMsg:"I appreciate the quick response and excellent service. Looking forward to my next rental!",
    messages:[{id:1,from:"user",text:"I appreciate the quick response and excellent service. Looking forward to my next rental!",time:"09:20 AM"}]},
];

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({name,size=8}:{name:string;size?:number}){
  return(
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{background:ac(name),fontSize:size<=8?"11px":"13px"}}>
      {ini(name)}
    </div>
  );
}

// ── Chat image placeholder ────────────────────────────────────────────────────
function ChatImg(){
  return(
    <div className="w-48 h-32 rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MessagesPage(){
  const[convs,setConvs]=useState<Conv[]>(INIT_CONVS);
  const[activeId,setActiveId]=useState(3);
  const[search,setSearch]=useState("");
  const[input,setInput]=useState("");
  const endRef=useRef<HTMLDivElement>(null);

  const active=convs.find(c=>c.id===activeId)!;

  const filtered=convs.filter(c=>
    c.name.toLowerCase().includes(search.toLowerCase())||
    c.lastMsg.toLowerCase().includes(search.toLowerCase())
  );
  const todayConvs=filtered.filter(c=>c.group==="today");
  const yestConvs =filtered.filter(c=>c.group==="yesterday");

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[activeId,active?.messages.length]);

  const selectConv=(id:number)=>{
    setActiveId(id);
    setConvs(p=>p.map(c=>c.id===id?{...c,unread:false}:c));
  };

  const send=()=>{
    if(!input.trim())return;
    const t=input.trim();
    setConvs(p=>p.map(c=>c.id===activeId?{...c,
      messages:[...c.messages,{id:c.messages.length+1,from:"admin",text:t,time:nowTime()}],
      lastMsg:t,time:nowTime()
    }:c));
    setInput("");
  };

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
            <p className="text-[11px] text-gray-400 truncate">{c.lastMsg}</p>
            {c.unread&&<span className="w-2 h-2 rounded-full bg-red-500 shrink-0"/>}
          </div>
        </div>
      </button>
    );
  };

  return(
    <div className="flex h-full overflow-hidden">

      {/* ── Left: Conversation List ── */}
      <div className="w-[295px] shrink-0 border-r border-gray-100 flex flex-col overflow-hidden bg-white">
        {/* Toolbar */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-xl px-3 py-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search for messages" value={search} onChange={e=>setSearch(e.target.value)}
                className="text-[12px] text-gray-800 flex-1 focus:outline-none bg-transparent placeholder-gray-300" suppressHydrationWarning/>
              {search&&<button onClick={()=>setSearch("")} className="no-hover-fx text-gray-300 text-[14px] leading-none">×</button>}
            </div>
            <button className="no-hover-fx w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button className="no-hover-fx w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0" style={{background:"#ef4444"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {todayConvs.length>0&&(
            <>
              <p className="px-4 py-2 text-[10px] font-semibold text-gray-400">Today ({todayConvs.length})</p>
              {todayConvs.map(c=><ConvItem key={c.id} c={c}/>)}
            </>
          )}
          {yestConvs.length>0&&(
            <>
              <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 mt-1">Yesterday ({yestConvs.length})</p>
              {yestConvs.map(c=><ConvItem key={c.id} c={c}/>)}
            </>
          )}
          {filtered.length===0&&(
            <p className="px-4 py-8 text-center text-[12px] text-gray-400">No conversations found.</p>
          )}
        </div>
      </div>

      {/* ── Right: Chat Window ── */}
      {active?(
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Avatar name={active.name} size={10}/>
              {active.online&&<span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white"/>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-gray-900">{active.name}</p>
              <p className="text-[11px]" style={{color:active.online?"#22c55e":"#9ca3af"}}>{active.online?"Online":"Offline"}</p>
            </div>
            <div className="flex items-center gap-2">
              {[
                <svg key="ph" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.38 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
                <svg key="vi" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
                <svg key="gr" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
                <svg key="mo" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
              ].map((icon,i)=>(
                <button key={i} className="no-hover-fx w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {/* Date separator */}
            <div className="flex items-center justify-center my-1">
              <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-3 py-1">Today</span>
            </div>

            {active.messages.map(msg=>(
              <div key={msg.id} className={`flex items-end gap-2.5 ${msg.from==="admin"?"flex-row-reverse":""}`}>
                {msg.from==="user"&&<Avatar name={active.name} size={8}/>}
                <div className={`flex flex-col gap-0.5 max-w-[65%] ${msg.from==="admin"?"items-end":""}`}>
                  {msg.img?(
                    <ChatImg/>
                  ):(
                    msg.text&&(
                      <div className="rounded-2xl px-3.5 py-2.5"
                        style={{
                          background: msg.from==="admin" ? "#1e2d45" : "#f3f4f6",
                          color: msg.from==="admin" ? "white" : "#1f2937",
                          borderBottomRightRadius: msg.from==="admin" ? 4 : undefined,
                          borderBottomLeftRadius:  msg.from==="user"  ? 4 : undefined,
                        }}>
                        <p className="text-[13px] leading-relaxed">{msg.text}</p>
                      </div>
                    )
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
              <input
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                className="flex-1 text-[13px] text-gray-800 focus:outline-none bg-transparent placeholder-gray-300"
                suppressHydrationWarning
              />
              <label className="no-hover-fx cursor-pointer text-gray-400 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                <input type="file" className="hidden"/>
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
        <div className="flex-1 flex items-center justify-center text-gray-400 text-[13px]">
          Select a conversation
        </div>
      )}
    </div>
  );
}
