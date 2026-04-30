"use client";
import { useState, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type PayStatus = "Completed" | "Awaiting" | "Overdue";
type Payment = { id:string; client:string; car:string; ratePerDay:number; rentalDays:number; amount:number; dueDate:string; status:PayStatus; };
type SortCol = keyof Payment | null;
type SortDir = "asc" | "desc";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<PayStatus,{bg:string;color:string}> = {
  Completed: { bg:"#dcfce7", color:"#16a34a" },
  Awaiting:  { bg:"#dbeafe", color:"#1d4ed8" },
  Overdue:   { bg:"#fee2e2", color:"#dc2626" },
};
const STATUS_LIST: PayStatus[] = ["Completed","Awaiting","Overdue"];

const INIT: Payment[] = [
  {id:"INV-WZ001",client:"Alice Johnson",   car:"Toyota Corolla",   ratePerDay:50, rentalDays:3,amount:150, dueDate:"2024-08-05",status:"Completed"},
  {id:"INV-WZ002",client:"Bob Smith",       car:"Honda Civic",      ratePerDay:45, rentalDays:5,amount:225, dueDate:"2024-08-06",status:"Awaiting"},
  {id:"INV-WZ003",client:"Charlie Davis",   car:"Ford Focus",       ratePerDay:55, rentalDays:2,amount:110, dueDate:"2024-08-07",status:"Overdue"},
  {id:"INV-WZ004",client:"Diana White",     car:"Chevrolet Malibu", ratePerDay:60, rentalDays:1,amount:60,  dueDate:"2024-08-08",status:"Completed"},
  {id:"INV-WZ005",client:"Edward Green",    car:"Nissan Altima",    ratePerDay:50, rentalDays:4,amount:200, dueDate:"2024-08-09",status:"Awaiting"},
  {id:"INV-WZ006",client:"Fiona Brown",     car:"BMW X5",           ratePerDay:120,rentalDays:3,amount:360, dueDate:"2024-08-10",status:"Overdue"},
  {id:"INV-WZ007",client:"George Clark",    car:"Audi Q7",          ratePerDay:130,rentalDays:2,amount:260, dueDate:"2024-08-11",status:"Completed"},
  {id:"INV-WZ008",client:"Helen Martinez",  car:"Mazda 3",          ratePerDay:40, rentalDays:6,amount:240, dueDate:"2024-08-12",status:"Awaiting"},
  {id:"INV-WZ009",client:"Ivan Rodriguez",  car:"Hyundai Elantra",  ratePerDay:45, rentalDays:3,amount:135, dueDate:"2024-08-13",status:"Overdue"},
  {id:"INV-WZ010",client:"Jane Wilson",     car:"Mercedes C-Class", ratePerDay:100,rentalDays:1,amount:100, dueDate:"2024-08-14",status:"Completed"},
  {id:"INV-WZ011",client:"Kyle Thompson",   car:"Toyota Camry",     ratePerDay:55, rentalDays:4,amount:220, dueDate:"2024-08-15",status:"Completed"},
  {id:"INV-WZ012",client:"Laura King",      car:"Honda Accord",     ratePerDay:60, rentalDays:2,amount:120, dueDate:"2024-08-16",status:"Awaiting"},
  {id:"INV-WZ013",client:"Michael Brown",   car:"Ford Mustang",     ratePerDay:90, rentalDays:3,amount:270, dueDate:"2024-08-17",status:"Overdue"},
  {id:"INV-WZ014",client:"Nancy Davis",     car:"BMW 3 Series",     ratePerDay:85, rentalDays:5,amount:425, dueDate:"2024-08-18",status:"Completed"},
  {id:"INV-WZ015",client:"Oliver Scott",    car:"Audi A4",          ratePerDay:95, rentalDays:2,amount:190, dueDate:"2024-08-19",status:"Awaiting"},
  {id:"INV-WZ016",client:"Patricia Lee",    car:"Kia Optima",       ratePerDay:40, rentalDays:7,amount:280, dueDate:"2024-08-20",status:"Completed"},
];

function pgPages(cur:number,total:number):(number|"…")[]{
  if(total<=5)return Array.from({length:total},(_,i)=>i+1);
  if(cur<=3)return[1,2,3,"…",total];
  if(cur>=total-2)return[1,"…",total-2,total-1,total];
  return[1,"…",cur-1,cur,cur+1,"…",total];
}
function nextId(payments:Payment[]){
  const nums=payments.map(p=>parseInt(p.id.replace("INV-WZ","")));
  return`INV-WZ${String(Math.max(...nums)+1).padStart(3,"0")}`;
}

// ── Sort icon ─────────────────────────────────────────────────────────────────
function SortIcon({active,dir}:{active:boolean;dir:SortDir}){
  return(
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={active?"#1e2d45":"#9ca3af"} strokeWidth="2.5" className="shrink-0">
      {(!active||dir==="asc")&&<path d="M7 15l5 5 5-5"/>}
      {(!active||dir==="desc")&&<path d="M7 9l5-5 5 5"/>}
    </svg>
  );
}

// ── Invoice Modal ─────────────────────────────────────────────────────────────
type InvForm = {client:string;car:string;ratePerDay:string;rentalDays:string;dueDate:string;status:PayStatus;};
function InvoiceModal({initial,onSave,onClose}:{initial?:Payment;onSave:(d:Omit<Payment,"id">)=>void;onClose:()=>void;}){
  const[f,setF]=useState<InvForm>({
    client:initial?.client??"",car:initial?.car??"",
    ratePerDay:String(initial?.ratePerDay??""),rentalDays:String(initial?.rentalDays??""),
    dueDate:initial?.dueDate??"",status:initial?.status??"Awaiting",
  });
  const s=(k:keyof InvForm,v:string)=>setF(p=>({...p,[k]:v}));
  const rate=Number(f.ratePerDay)||0, days=Number(f.rentalDays)||0, total=rate*days;
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/40"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-bold text-gray-900">{initial?"Edit Invoice":"Create Invoice"}</p>
          <button onClick={onClose} className="no-hover-fx w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[18px] leading-none">×</button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Client Name *</p>
              <input value={f.client} onChange={e=>s("client",e.target.value)} placeholder="e.g. Alice Johnson"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Car Model *</p>
              <input value={f.car} onChange={e=>s("car",e.target.value)} placeholder="e.g. Toyota Corolla"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Rate / Day ($)</p>
              <input type="number" min={0} value={f.ratePerDay} onChange={e=>s("ratePerDay",e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Rental Days</p>
              <input type="number" min={1} value={f.rentalDays} onChange={e=>s("rentalDays",e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Total Amount</p>
              <div className="w-full border border-gray-100 rounded-xl px-3 py-2 text-[12px] font-semibold text-gray-700 bg-gray-50">${total.toLocaleString()}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Due Date</p>
              <input type="date" value={f.dueDate} onChange={e=>s("dueDate",e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Status</p>
              <select value={f.status} onChange={e=>s("status",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none" suppressHydrationWarning>
                {STATUS_LIST.map(st=><option key={st}>{st}</option>)}</select></div>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200">Cancel</button>
          <button onClick={()=>f.client.trim()&&f.car.trim()&&onSave({client:f.client,car:f.car,ratePerDay:rate,rentalDays:days,amount:total,dueDate:f.dueDate,status:f.status})}
            disabled={!f.client.trim()||!f.car.trim()}
            className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{background:f.client.trim()&&f.car.trim()?"#ef4444":"#fca5a5"}}>
            {initial?"Save Changes":"Create Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PaymentsPage(){
  const[payments,setPayments]=useState<Payment[]>(INIT);
  const[search,setSearch]=useState("");
  const[statusFilt,setStatusFilt]=useState<PayStatus|"All">("All");
  const[showFilt,setShowFilt]=useState(false);
  const[sortCol,setSortCol]=useState<SortCol>(null);
  const[sortDir,setSortDir]=useState<SortDir>("asc");
  const[page,setPage]=useState(1);
  const[perPage,setPerPage]=useState(10);
  const[selected,setSelected]=useState<Set<string>>(new Set(["INV-WZ004"]));
  const[createOpen,setCreateOpen]=useState(false);
  const[editPay,setEditPay]=useState<Payment|null>(null);
  const[delId,setDelId]=useState<string|null>(null);

  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    let r=payments.filter(p=>
      (p.id.toLowerCase().includes(q)||p.client.toLowerCase().includes(q)||p.car.toLowerCase().includes(q))&&
      (statusFilt==="All"||p.status===statusFilt)
    );
    if(sortCol){r=[...r].sort((a,b)=>{
      const av=a[sortCol],bv=b[sortCol];
      if(typeof av==="number"&&typeof bv==="number")return sortDir==="asc"?av-bv:bv-av;
      return sortDir==="asc"?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av));
    });}
    return r;
  },[payments,search,statusFilt,sortCol,sortDir]);

  const totalPg=Math.max(1,Math.ceil(filtered.length/perPage));
  const pagePays=filtered.slice((page-1)*perPage,page*perPage);
  const allSel=pagePays.length>0&&pagePays.every(p=>selected.has(p.id));
  const someSel=!allSel&&pagePays.some(p=>selected.has(p.id));
  const toggleAll=()=>setSelected(prev=>{const n=new Set(prev);allSel?pagePays.forEach(p=>n.delete(p.id)):pagePays.forEach(p=>n.add(p.id));return n;});
  const toggleOne=(id:string)=>setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const hs=(c:SortCol)=>{if(sortCol===c)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(c);setSortDir("asc");}};
  const handleCreate=(d:Omit<Payment,"id">)=>{setPayments(p=>[{...d,id:nextId(p)},...p]);setCreateOpen(false);};
  const handleEdit=(d:Omit<Payment,"id">)=>{setPayments(p=>p.map(x=>x.id===editPay!.id?{...x,...d}:x));setEditPay(null);};
  const handleDel=(id:string)=>{setPayments(p=>p.filter(x=>x.id!==id));setDelId(null);};
  const pages=pgPages(page,totalPg);
  const thC="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 select-none whitespace-nowrap";

  // Stats
  const completedTotal=payments.filter(p=>p.status==="Completed").reduce((s,p)=>s+p.amount,0);
  const awaitingTotal =payments.filter(p=>p.status==="Awaiting").reduce((s,p)=>s+p.amount,0);
  const overdueTotal  =payments.filter(p=>p.status==="Overdue").reduce((s,p)=>s+p.amount,0);
  const completedCnt  =payments.filter(p=>p.status==="Completed").length;
  const awaitingCnt   =payments.filter(p=>p.status==="Awaiting").length;
  const overdueCnt    =payments.filter(p=>p.status==="Overdue").length;

  return(
    <div className="h-full overflow-y-auto p-4 md:p-5 flex flex-col gap-4">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label:"Completed Payment", value:completedTotal, cnt:completedCnt, pct:"+2.77%", up:true,
            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> },
          { label:"Awaiting Payment", value:awaitingTotal, cnt:awaitingCnt, pct:"-1.00%", up:false,
            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label:"Overdue", value:overdueTotal, cnt:overdueCnt, pct:"+3.45%", up:false,
            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:"#1e2d45"}}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
              <p className="text-[20px] font-bold text-gray-900">${s.value.toLocaleString()}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[9px] font-medium text-gray-500">{s.cnt} Invoices</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{background:s.up?"#dcfce7":"#fee2e2",color:s.up?"#16a34a":"#dc2626"}}>{s.pct}</span>
                <span className="text-[9px] text-gray-400">from last week</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white flex-1 min-w-[180px] max-w-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search Invoice, client name, etc." value={search}
              onChange={e=>{setSearch(e.target.value);setPage(1);}}
              className="text-[12px] text-gray-900 flex-1 focus:outline-none bg-transparent placeholder-gray-300" suppressHydrationWarning/>
            {search&&<button onClick={()=>setSearch("")} className="no-hover-fx text-gray-300 text-[14px] leading-none">×</button>}
          </div>
          {/* Date range display */}
          <button className="no-hover-fx flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-[11px] text-gray-600 whitespace-nowrap">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            1 Aug – 28 August 2028
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {/* Status filter */}
          <div className="relative">
            <button onClick={()=>setShowFilt(v=>!v)}
              className="no-hover-fx flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-[11px] text-gray-600"
              style={{borderColor:statusFilt!=="All"?"#ef4444":"",color:statusFilt!=="All"?"#ef4444":""}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {statusFilt==="All"?"Status":statusFilt}
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showFilt&&(
              <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-10">
                {(["All",...STATUS_LIST] as const).map(st=>(
                  <button key={st} onClick={()=>{setStatusFilt(st as PayStatus|"All");setShowFilt(false);setPage(1);}}
                    className="no-hover-fx w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 flex items-center justify-between"
                    style={{color:statusFilt===st?"#ef4444":"#374151"}}>
                    {st}
                    {statusFilt===st&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1"/>
          <button onClick={()=>setCreateOpen(true)}
            className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-semibold whitespace-nowrap"
            style={{background:"#ef4444"}}>
            + Create Invoice
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr style={{background:"#f8fafc"}} className="border-b border-gray-100">
                <th className={thC}>
                  <div className="flex items-center gap-2.5">
                    <input type="checkbox" checked={allSel} ref={el=>{if(el)el.indeterminate=someSel;}} onChange={toggleAll} className="w-3.5 h-3.5 accent-red-500"/>
                    <button onClick={()=>hs("id")} className="no-hover-fx flex items-center gap-1">Invoice ID <SortIcon active={sortCol==="id"} dir={sortDir}/></button>
                  </div>
                </th>
                <th className={thC}><button onClick={()=>hs("client")} className="no-hover-fx flex items-center gap-1">Client Name <SortIcon active={sortCol==="client"} dir={sortDir}/></button></th>
                <th className={thC}><button onClick={()=>hs("car")} className="no-hover-fx flex items-center gap-1">Car Model <SortIcon active={sortCol==="car"} dir={sortDir}/></button></th>
                <th className={thC}><button onClick={()=>hs("ratePerDay")} className="no-hover-fx flex items-center gap-1">Rate per Day <SortIcon active={sortCol==="ratePerDay"} dir={sortDir}/></button></th>
                <th className={thC}><button onClick={()=>hs("rentalDays")} className="no-hover-fx flex items-center gap-1">Rental Period <SortIcon active={sortCol==="rentalDays"} dir={sortDir}/></button></th>
                <th className={thC}><button onClick={()=>hs("amount")} className="no-hover-fx flex items-center gap-1">Amount <SortIcon active={sortCol==="amount"} dir={sortDir}/></button></th>
                <th className={thC}><button onClick={()=>hs("dueDate")} className="no-hover-fx flex items-center gap-1">Due Date <SortIcon active={sortCol==="dueDate"} dir={sortDir}/></button></th>
                <th className={thC}><button onClick={()=>hs("status")} className="no-hover-fx flex items-center gap-1">Status <SortIcon active={sortCol==="status"} dir={sortDir}/></button></th>
                <th className={thC}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagePays.map(p=>{
                const isSel=selected.has(p.id);
                const ss=STATUS_STYLE[p.status];
                const isCompleted=p.status==="Completed";
                return(
                  <tr key={p.id} className="border-b border-gray-50 transition-colors"
                    style={{background:isSel?"#eff6ff":"white"}}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <input type="checkbox" checked={isSel} onChange={()=>toggleOne(p.id)} className="w-3.5 h-3.5 accent-red-500"/>
                        <span className="text-[12px] font-medium text-gray-700 whitespace-nowrap">{p.id}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-800 font-medium whitespace-nowrap">{p.client}</td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-600 whitespace-nowrap">{p.car}</td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-700 font-medium">${p.ratePerDay}</td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-600 whitespace-nowrap">{p.rentalDays} {p.rentalDays===1?"Day":"Days"}</td>
                    <td className="px-3 py-2.5 text-[12px] font-semibold text-gray-800">${p.amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-[11px] text-gray-500 whitespace-nowrap">{p.dueDate}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{background:ss.bg,color:ss.color}}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {isCompleted?(
                          <button className="no-hover-fx px-2.5 py-1 rounded-lg text-[10px] font-medium text-blue-500 border border-blue-100">View</button>
                        ):(
                          <button onClick={()=>setEditPay(p)} className="no-hover-fx px-2.5 py-1 rounded-lg text-[10px] font-medium text-gray-500 border border-gray-200">Edit</button>
                        )}
                        <button onClick={()=>setDelId(p.id)} className="no-hover-fx px-2.5 py-1 rounded-lg text-[10px] font-medium text-red-400 border border-red-100">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pagePays.length===0&&<tr><td colSpan={9} className="px-3 py-10 text-center text-[13px] text-gray-400">No invoices found.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Results per page</span>
            <select value={perPage} onChange={e=>{setPerPage(Number(e.target.value));setPage(1);}} className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" suppressHydrationWarning>
              {[10,15,20].map(n=><option key={n} value={n}>{n}</option>)}</select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 border border-gray-200 disabled:opacity-40">&lsaquo; Prev</button>
            {pages.map((p,i)=>p==="…"
              ?<span key={`e${i}`} className="px-1.5 text-[11px] text-gray-400">…</span>
              :<button key={p} onClick={()=>setPage(p as number)} className="no-hover-fx w-7 h-7 rounded-lg text-[11px] font-medium" style={{background:page===p?"#ef4444":"transparent",color:page===p?"white":"#374151"}}>{p}</button>)}
            <button onClick={()=>setPage(p=>Math.min(totalPg,p+1))} disabled={page===totalPg} className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 border border-gray-200 disabled:opacity-40">Next &rsaquo;</button>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {createOpen&&<InvoiceModal onSave={handleCreate} onClose={()=>setCreateOpen(false)}/>}
      {editPay&&<InvoiceModal initial={editPay} onSave={handleEdit} onClose={()=>setEditPay(null)}/>}
      {delId&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={()=>setDelId(null)} className="absolute inset-0 bg-black/40"/>
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4 text-center">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </div>
            <p className="text-[14px] font-bold text-gray-900 mb-1">Delete Invoice?</p>
            <p className="text-[11px] text-gray-400 mb-5">Invoice <strong>{delId}</strong> will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDelId(null)} className="no-hover-fx flex-1 py-2 border border-gray-200 rounded-xl text-[12px] text-gray-600">Cancel</button>
              <button onClick={()=>handleDel(delId)} className="no-hover-fx flex-1 py-2 bg-red-500 rounded-xl text-[12px] font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
