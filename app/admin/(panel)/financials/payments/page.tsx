"use client";
import React, { useState, useMemo, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type PayStatus = "Completed" | "Awaiting" | "Overdue" | "Refunded";
type Payment = { id:string; bookingId:string; client:string; car:string; ratePerDay:number; rentalDays:number; amount:number; dueDate:string; status:PayStatus; };
type SortCol = keyof Payment | null;
type SortDir = "asc" | "desc";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<PayStatus,{bg:string;color:string}> = {
  Completed: { bg:"#dcfce7", color:"#16a34a" },
  Awaiting:  { bg:"#dbeafe", color:"#1d4ed8" },
  Overdue:   { bg:"#fee2e2", color:"#dc2626" },
  Refunded:  { bg:"#f3f4f6", color:"#6b7280" },
};
const STATUS_LIST: PayStatus[] = ["Completed","Awaiting","Overdue","Refunded"];

function pgPages(cur:number,total:number):(number|"…")[]{
  if(total<=5)return Array.from({length:total},(_,i)=>i+1);
  if(cur<=3)return[1,2,3,"…",total];
  if(cur>=total-2)return[1,"…",total-2,total-1,total];
  return[1,"…",cur-1,cur,cur+1,"…",total];
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
function InvoiceModal({initial,onSave,onClose}:{initial?:Payment;onSave:(d:Omit<Payment,"id"|"bookingId">)=>void;onClose:()=>void;}){
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

// ── Payment Detail Modal ──────────────────────────────────────────────────────
function PaymentDetailModal({pay,onClose}:{pay:Payment;onClose:()=>void;}){
  const ss=STATUS_STYLE[pay.status];
  const rows:Array<[string,React.ReactElement]>=[
    ["Invoice ID",<span className="text-[12px] font-semibold text-gray-700">{pay.id}</span>],
    ["Client",<span className="text-[12px] font-medium text-gray-800">{pay.client}</span>],
    ["Car Model",<span className="text-[12px] text-gray-600">{pay.car}</span>],
    ["Rate / Day",<span className="text-[12px] text-gray-700">${pay.ratePerDay}</span>],
    ["Rental Period",<span className="text-[12px] text-gray-700">{pay.rentalDays} {pay.rentalDays===1?"Day":"Days"}</span>],
    ["Total Amount",<span className="text-[13px] font-bold text-gray-900">${pay.amount.toLocaleString()}</span>],
    ["Due Date",<span className="text-[12px] text-gray-500">{pay.dueDate}</span>],
    ["Status",<span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{background:ss.bg,color:ss.color}}>{pay.status}</span>],
  ];
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/40"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[15px] font-bold text-gray-900">Invoice Detail</p>
          <button onClick={onClose} className="no-hover-fx w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[18px] leading-none">×</button>
        </div>
        <div className="flex flex-col">
          {rows.map(([label,val],i)=>(
            <div key={label} className={`flex items-center justify-between py-2.5 ${i<rows.length-1?"border-b border-gray-50":""}`}>
              <span className="text-[11px] text-gray-400">{label}</span>
              {val}
            </div>
          ))}
        </div>
        <button onClick={onClose} className="no-hover-fx mt-5 w-full py-2.5 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-600">Close</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PaymentsPage(){
  const[payments,setPayments]=useState<Payment[]>([]);
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState("");
  const[statusFilt,setStatusFilt]=useState<PayStatus|"All">("All");
  const[showFilt,setShowFilt]=useState(false);
  const[dateFrom,setDateFrom]=useState("");
  const[dateTo,setDateTo]=useState("");
  const[showDatePicker,setShowDatePicker]=useState(false);
  const[sortCol,setSortCol]=useState<SortCol>(null);
  const[sortDir,setSortDir]=useState<SortDir>("asc");
  const[page,setPage]=useState(1);
  const[perPage,setPerPage]=useState(10);
  const[selected,setSelected]=useState<Set<string>>(new Set());
  const[createOpen,setCreateOpen]=useState(false);
  const[editPay,setEditPay]=useState<Payment|null>(null);
  const[delId,setDelId]=useState<string|null>(null);
  const[viewPay,setViewPay]=useState<Payment|null>(null);
  const[toast,setToast]=useState<string|null>(null);

  useEffect(()=>{
    fetch("/api/admin/financials/payments")
      .then(r=>r.json()).then((d:Payment[])=>setPayments(d)).catch(console.error).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    if(!toast)return;
    const t=setTimeout(()=>setToast(null),2500);
    return()=>clearTimeout(t);
  },[toast]);

  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    let r=payments.filter(p=>
      (p.id.toLowerCase().includes(q)||p.client.toLowerCase().includes(q)||p.car.toLowerCase().includes(q))&&
      (statusFilt==="All"||p.status===statusFilt)&&
      (!dateFrom||p.dueDate>=dateFrom)&&
      (!dateTo||p.dueDate<=dateTo)
    );
    if(sortCol){r=[...r].sort((a,b)=>{
      const av=a[sortCol],bv=b[sortCol];
      if(typeof av==="number"&&typeof bv==="number")return sortDir==="asc"?av-bv:bv-av;
      return sortDir==="asc"?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av));
    });}
    return r;
  },[payments,search,statusFilt,dateFrom,dateTo,sortCol,sortDir]);

  const totalPg=Math.max(1,Math.ceil(filtered.length/perPage));
  const pagePays=filtered.slice((page-1)*perPage,page*perPage);
  const allSel=pagePays.length>0&&pagePays.every(p=>selected.has(p.id));
  const someSel=!allSel&&pagePays.some(p=>selected.has(p.id));
  const toggleAll=()=>setSelected(prev=>{const n=new Set(prev);allSel?pagePays.forEach(p=>n.delete(p.id)):pagePays.forEach(p=>n.add(p.id));return n;});
  const toggleOne=(id:string)=>setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const hs=(c:SortCol)=>{if(sortCol===c)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(c);setSortDir("asc");}};
  const handleCreate=async(d:Omit<Payment,"id"|"bookingId">)=>{
    try{
      const res=await fetch("/api/admin/financials/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});
      const created=await res.json();
      setPayments(p=>[{...d,id:created.id,bookingId:created.bookingId,dueDate:created.dueDate??d.dueDate,rentalDays:created.rentalDays??d.rentalDays},...p]);
      setCreateOpen(false);setToast("Invoice created ✓");
    }catch{setToast("Failed to create invoice");}
  };
  const handleEdit=async(d:Omit<Payment,"id"|"bookingId">)=>{
    if(!editPay)return;
    try{
      await fetch(`/api/admin/financials/payments/${editPay.bookingId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});
      setPayments(p=>p.map(x=>x.id===editPay.id?{...x,...d}:x));setEditPay(null);setToast("Invoice updated ✓");
    }catch{setToast("Failed to update invoice");}
  };
  const handleDel=async(id:string)=>{
    const pay=payments.find(p=>p.id===id);
    try{
      if(pay?.bookingId)await fetch(`/api/admin/financials/payments/${pay.bookingId}`,{method:"DELETE"});
      setPayments(p=>p.filter(x=>x.id!==id));setDelId(null);setToast("Invoice deleted");
    }catch{setToast("Failed to delete invoice");}
  };
  const downloadCSV=()=>{
    const hdr=["Invoice ID","Client","Car","Rate/Day","Rental Days","Amount","Due Date","Status"];
    const rows=filtered.map(p=>[p.id,`"${p.client}"`,`"${p.car}"`,p.ratePerDay,p.rentalDays,p.amount,p.dueDate,p.status]);
    const csv=[hdr,...rows].map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="payments.csv";a.click();URL.revokeObjectURL(url);
  };
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
    <div className="h-full overflow-y-auto p-4 md:p-5 flex flex-col gap-4" onClick={()=>{setShowFilt(false);setShowDatePicker(false);}}>

      {toast&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white text-[12px] font-medium px-4 py-2.5 rounded-xl shadow-lg pointer-events-none">{toast}</div>}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label:"Completed Payment", value:completedTotal, cnt:completedCnt,
            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> },
          { label:"Awaiting Payment", value:awaitingTotal, cnt:awaitingCnt,
            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label:"Overdue", value:overdueTotal, cnt:overdueCnt,
            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:"#1e2d45"}}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
              <p className="text-[20px] font-bold text-gray-900">${s.value.toLocaleString()}</p>
              <span className="text-[9px] font-medium text-gray-500">{s.cnt} Invoice{s.cnt!==1?"s":""}</span>
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
          {/* Date range picker */}
          <div className="relative" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setShowDatePicker(v=>!v)}
              className={`no-hover-fx flex items-center gap-2 px-3 py-2 border rounded-xl text-[11px] whitespace-nowrap ${(dateFrom||dateTo)?"border-red-300 text-red-500 bg-red-50":"border-gray-200 text-gray-600"}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {dateFrom||dateTo?`${dateFrom||"…"} – ${dateTo||"…"}`:(filtered.length>0?`${filtered.reduce((m,p)=>p.dueDate<m?p.dueDate:m,filtered[0].dueDate)} – ${filtered.reduce((m,p)=>p.dueDate>m?p.dueDate:m,filtered[0].dueDate)}`:"All dates")}
              {(dateFrom||dateTo)&&<span onClick={e=>{e.stopPropagation();setDateFrom("");setDateTo("");}} className="ml-1 text-red-400">✕</span>}
            </button>
            {showDatePicker&&(
              <div className="absolute left-0 top-full mt-1.5 bg-white border border-gray-100 rounded-xl shadow-lg p-3 z-20 flex flex-col gap-2 w-52">
                <div><p className="text-[10px] text-gray-400 mb-1">From</p>
                  <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(1);}} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none"/></div>
                <div><p className="text-[10px] text-gray-400 mb-1">To</p>
                  <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(1);}} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none"/></div>
              </div>
            )}
          </div>
          {/* Status filter */}
          <div className="relative" onClick={e=>e.stopPropagation()}>
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
          <button onClick={downloadCSV}
            className="no-hover-fx flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-[11px] text-gray-600 whitespace-nowrap">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            CSV
          </button>
          <button onClick={()=>setCreateOpen(true)}
            className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-semibold whitespace-nowrap"
            style={{background:"#ef4444"}}>
            + Create Invoice
          </button>
        </div>

        {/* Loading / Table */}
        {loading?(
          <div className="py-16 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-red-400 border-t-transparent animate-spin"/>
          </div>
        ):(<>
        <div className="hidden lg:block overflow-x-auto">
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
                          <button onClick={()=>setViewPay(p)} className="no-hover-fx px-2.5 py-1 rounded-lg text-[10px] font-medium text-blue-500 border border-blue-100">View</button>
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

        {/* ── Mobile invoice cards ── */}
        <div className="lg:hidden divide-y divide-gray-50">
          {pagePays.map(p=>{
            const isSel=selected.has(p.id);
            const ss=STATUS_STYLE[p.status];
            const isCompleted=p.status==="Completed";
            return(
              <div key={p.id} className="p-4" style={{background:isSel?"#eff6ff":"white"}}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input type="checkbox" checked={isSel} onChange={()=>toggleOne(p.id)} className="w-3.5 h-3.5 accent-red-500 shrink-0 mt-0.5"/>
                    <p className="text-[12px] font-semibold text-gray-700">{p.id}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0" style={{background:ss.bg,color:ss.color}}>{p.status}</span>
                </div>
                <div className="pl-5 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-gray-800">{p.client}</p>
                    <p className="text-[13px] font-bold text-gray-800">${p.amount.toLocaleString()}</p>
                  </div>
                  <p className="text-[11px] text-gray-500">{p.car}</p>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    <span className="text-[11px] text-gray-400">${p.ratePerDay}/day × {p.rentalDays} {p.rentalDays===1?"day":"days"}</span>
                    <span className="text-[11px] text-gray-400">Due: {p.dueDate}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {isCompleted?(
                      <button onClick={()=>setViewPay(p)} className="no-hover-fx px-3 py-1.5 rounded-lg text-[11px] font-medium text-blue-500 border border-blue-100">View</button>
                    ):(
                      <button onClick={()=>setEditPay(p)} className="no-hover-fx px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 border border-gray-200">Edit</button>
                    )}
                    <button onClick={()=>setDelId(p.id)} className="no-hover-fx px-3 py-1.5 rounded-lg text-[11px] font-medium text-red-400 border border-red-100">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
          {pagePays.length===0&&<p className="px-4 py-10 text-center text-[13px] text-gray-400">No invoices found.</p>}
        </div>
        </>)}

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
      {viewPay&&<PaymentDetailModal pay={viewPay} onClose={()=>setViewPay(null)}/>}
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
