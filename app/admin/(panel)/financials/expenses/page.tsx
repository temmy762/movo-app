"use client";
import { useState, useMemo } from "react";

function pol(cx:number,cy:number,r:number,deg:number):[number,number]{const rad=((deg-90)*Math.PI)/180;return[cx+r*Math.cos(rad),cy+r*Math.sin(rad)];}
function arcSlice(cx:number,cy:number,r:number,ir:number,s:number,e:number){
  const[ox1,oy1]=pol(cx,cy,r,s),[ox2,oy2]=pol(cx,cy,r,e),[ix2,iy2]=pol(cx,cy,ir,e),[ix1,iy1]=pol(cx,cy,ir,s);
  const lg=e-s>180?"1":"0";
  return`M${ox1} ${oy1} A${r} ${r} 0 ${lg} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${ir} ${ir} 0 ${lg} 0 ${ix1} ${iy1}Z`;
}
function pgPages(cur:number,total:number):(number|"…")[]{
  if(total<=5)return Array.from({length:total},(_,i)=>i+1);
  if(cur<=3)return[1,2,3,"…",total];
  if(cur>=total-2)return[1,"…",total-2,total-1,total];
  return[1,"…",cur-1,cur,cur+1,"…",total];
}

type TxStatus="Completed"|"Pending";
type Tx={id:number;expense:string;category:string;qty:number;amount:number;date:string;status:TxStatus;};
type SortCol="expense"|"category"|"qty"|"amount"|"date"|"status"|null;

const MO=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const INC=[28000,32000,30000,38000,50400,45000,40000,42000,36000,41000,39000,46000];
const EXP=[20000,23000,19000,27000,34200,29000,24000,27000,21000,25000,23000,28000];
const CATS=[
  {name:"Vehicle Maintenance",amount:3000,color:"#ef4444"},
  {name:"Staff Salaries",amount:2500,color:"#1e2d45"},
  {name:"Fuel",amount:2000,color:"#f97316"},
  {name:"Insurance",amount:1000,color:"#06b6d4"},
  {name:"Office Supplies",amount:1000,color:"#8b5cf6"},
  {name:"Marketing",amount:500,color:"#6b7280"},
];
const CC:Record<string,string>=Object.fromEntries(CATS.map(c=>[c.name,c.color]));
const INIT:Tx[]=[
  {id:1,expense:"Oil Change",category:"Vehicle Maintenance",qty:1,amount:100,date:"2024-08-01",status:"Completed"},
  {id:2,expense:"Fuel Purchase",category:"Fuel",qty:40,amount:2080,date:"2024-08-03",status:"Pending"},
  {id:3,expense:"Insurance Payment",category:"Insurance",qty:1,amount:800,date:"2024-08-05",status:"Completed"},
  {id:4,expense:"Office Supplies Purchase",category:"Office Supplies",qty:20,amount:200,date:"2024-08-06",status:"Completed"},
  {id:5,expense:"Marketing Campaign",category:"Marketing",qty:1,amount:500,date:"2024-08-07",status:"Completed"},
  {id:6,expense:"Tire Replacement",category:"Vehicle Maintenance",qty:4,amount:400,date:"2024-08-09",status:"Pending"},
  {id:7,expense:"Fuel Purchase",category:"Fuel",qty:80,amount:2400,date:"2024-08-11",status:"Completed"},
  {id:8,expense:"Staff Salary",category:"Staff Salaries",qty:5,amount:2500,date:"2024-08-15",status:"Pending"},
  {id:9,expense:"Software Subscription",category:"Office Supplies",qty:1,amount:300,date:"2024-08-14",status:"Completed"},
  {id:10,expense:"Vehicle Maintenance",category:"Vehicle Maintenance",qty:3,amount:1000,date:"2024-08-15",status:"Completed"},
  {id:11,expense:"GPS Service",category:"Office Supplies",qty:2,amount:150,date:"2024-08-16",status:"Completed"},
  {id:12,expense:"Staff Salary",category:"Staff Salaries",qty:3,amount:1500,date:"2024-08-18",status:"Pending"},
  {id:13,expense:"Oil Change",category:"Vehicle Maintenance",qty:1,amount:120,date:"2024-08-19",status:"Completed"},
  {id:14,expense:"Fuel Purchase",category:"Fuel",qty:50,amount:2600,date:"2024-08-20",status:"Completed"},
  {id:15,expense:"Office Rent",category:"Office Supplies",qty:1,amount:1200,date:"2024-08-21",status:"Pending"},
];

function DonutChart(){
  const total=CATS.reduce((s,c)=>s+c.amount,0);let deg=0;
  return(<svg width="140" height="140" viewBox="0 0 140 140">
    {CATS.map((c,i)=>{const a=(c.amount/total)*360,s=deg;deg+=a;return<path key={i} d={arcSlice(70,70,62,42,s,deg-0.5)} fill={c.color} stroke="white" strokeWidth="2"/>;})
    }<text x="70" y="64" textAnchor="middle" fontSize="9" fill="#9ca3af">Total expenses</text>
    <text x="70" y="80" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e293b">$10,000</text>
  </svg>);
}

function CashflowChart(){
  const[hov,setHov]=useState<number|null>(null);
  const W=560,H=160,PL=44,PB=22,PT=8,cW=W-PL,cH=H-PB-PT;
  const all=[...INC,...EXP],maxV=Math.max(...all),minV=Math.min(...all)-3000,rng=maxV-minV;
  const tx=(i:number)=>PL+(i/(MO.length-1))*cW;
  const ty=(v:number)=>PT+cH-((v-minV)/rng)*cH;
  const ln=(d:number[])=>d.map((v,i)=>`${i===0?"M":"L"}${tx(i)},${ty(v)}`).join(" ");
  const ar=(d:number[])=>`${ln(d)} L${tx(d.length-1)},${PT+cH} L${PL},${PT+cH}Z`;
  return(
    <div className="relative" onMouseLeave={()=>setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:160}}>
        <defs>
          <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/></linearGradient>
          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"/><stop offset="100%" stopColor="#ef4444" stopOpacity="0"/></linearGradient>
        </defs>
        {[0,0.25,0.5,0.75,1].map(f=><line key={f} x1={PL} y1={PT+cH*(1-f)} x2={W} y2={PT+cH*(1-f)} stroke="#f1f5f9" strokeWidth="1"/>)}
        <path d={ar(INC)} fill="url(#ig)"/><path d={ar(EXP)} fill="url(#eg)"/>
        <path d={ln(INC)} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={ln(EXP)} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {MO.map((m,i)=><text key={m} x={tx(i)} y={H-5} textAnchor="middle" fontSize="9" fill="#9ca3af">{m}</text>)}
        {hov!==null&&<><line x1={tx(hov)} y1={PT} x2={tx(hov)} y2={PT+cH} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4"/>
          <circle cx={tx(hov)} cy={ty(INC[hov])} r="4" fill="white" stroke="#3b82f6" strokeWidth="2"/>
          <circle cx={tx(hov)} cy={ty(EXP[hov])} r="4" fill="white" stroke="#ef4444" strokeWidth="2"/></>}
        {MO.map((_,i)=><rect key={i} x={tx(i)-26} y={PT} width={52} height={cH} fill="transparent" style={{cursor:"crosshair"}} onMouseEnter={()=>setHov(i)}/>)}
      </svg>
      {hov!==null&&(
        <div className="absolute top-0 pointer-events-none z-10" style={{left:`max(4px,calc(${(tx(hov)/W)*100}% - 64px))`}}>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2">
            <p className="text-[10px] font-bold text-gray-700 mb-1">{MO[hov]} 2028</p>
            <p className="text-[10px] text-blue-500">Income: ${INC[hov].toLocaleString()}</p>
            <p className="text-[10px] text-red-500">Expenses: ${EXP[hov].toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TxModal({initial,onSave,onClose}:{initial?:Tx;onSave:(d:Omit<Tx,"id">)=>void;onClose:()=>void;}){
  const[f,setF]=useState({expense:initial?.expense??"",category:initial?.category??CATS[0].name,qty:String(initial?.qty??1),amount:String(initial?.amount??0),date:initial?.date??"",status:(initial?.status??"Completed") as TxStatus});
  const s=(k:string,v:string)=>setF(p=>({...p,[k]:v}));
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/40"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-bold text-gray-900">{initial?"Edit Expense":"Add Expense"}</p>
          <button onClick={onClose} className="no-hover-fx w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[18px] leading-none">×</button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Expense Name *</p>
              <input value={f.expense} onChange={e=>s("expense",e.target.value)} placeholder="e.g. Oil Change" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none placeholder-gray-300"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Category</p>
              <select value={f.category} onChange={e=>s("category",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none" suppressHydrationWarning>
                {CATS.map(c=><option key={c.name}>{c.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Qty</p>
              <input type="number" min={1} value={f.qty} onChange={e=>s("qty",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Amount ($)</p>
              <input type="number" min={0} value={f.amount} onChange={e=>s("amount",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none"/></div>
            <div><p className="text-[11px] text-gray-500 font-medium mb-1">Status</p>
              <select value={f.status} onChange={e=>s("status",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none" suppressHydrationWarning>
                <option>Completed</option><option>Pending</option></select></div>
          </div>
          <div><p className="text-[11px] text-gray-500 font-medium mb-1">Date</p>
            <input type="date" value={f.date} onChange={e=>s("date",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none"/></div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200">Cancel</button>
          <button onClick={()=>f.expense.trim()&&onSave({expense:f.expense,category:f.category,qty:Number(f.qty)||1,amount:Number(f.amount)||0,date:f.date,status:f.status})}
            disabled={!f.expense.trim()} className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{background:f.expense.trim()?"#ef4444":"#fca5a5"}}>{initial?"Save Changes":"Add Expense"}</button>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage(){
  const[txs,setTxs]=useState<Tx[]>(INIT);
  const[search,setSearch]=useState("");
  const[catFilt,setCatFilt]=useState("All");
  const[showCatDd,setShowCatDd]=useState(false);
  const[sortCol,setSortCol]=useState<SortCol>(null);
  const[sortDir,setSortDir]=useState<"asc"|"desc">("asc");
  const[page,setPage]=useState(1);
  const[perPage,setPerPage]=useState(10);
  const[selected,setSelected]=useState<Set<number>>(new Set());
  const[addOpen,setAddOpen]=useState(false);
  const[editTx,setEditTx]=useState<Tx|null>(null);
  const[delId,setDelId]=useState<number|null>(null);

  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    let r=txs.filter(t=>(t.expense.toLowerCase().includes(q)||t.category.toLowerCase().includes(q))&&(catFilt==="All"||t.category===catFilt));
    if(sortCol){r=[...r].sort((a,b)=>{const av=a[sortCol as keyof Tx],bv=b[sortCol as keyof Tx];
      if(typeof av==="number"&&typeof bv==="number")return sortDir==="asc"?av-bv:bv-av;
      return sortDir==="asc"?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av));});}
    return r;
  },[txs,search,catFilt,sortCol,sortDir]);

  const totalPg=Math.max(1,Math.ceil(filtered.length/perPage));
  const pageTxs=filtered.slice((page-1)*perPage,page*perPage);
  const allSel=pageTxs.length>0&&pageTxs.every(t=>selected.has(t.id));
  const someSel=!allSel&&pageTxs.some(t=>selected.has(t.id));
  const toggleAll=()=>setSelected(p=>{const n=new Set(p);allSel?pageTxs.forEach(t=>n.delete(t.id)):pageTxs.forEach(t=>n.add(t.id));return n;});
  const toggleOne=(id:number)=>setSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const hs=(c:SortCol)=>{if(sortCol===c)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(c);setSortDir("asc");}};
  const SortIco=({c}:{c:SortCol})=><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={sortCol===c?"#1e2d45":"#9ca3af"} strokeWidth="2.5" className="shrink-0">{(!( sortCol===c)|| sortDir==="asc")&&<path d="M7 15l5 5 5-5"/>}{(!(sortCol===c)||sortDir==="desc")&&<path d="M7 9l5-5 5 5"/>}</svg>;
  const handleAdd=(d:Omit<Tx,"id">)=>{setTxs(p=>[...p,{...d,id:Math.max(...p.map(t=>t.id))+1}]);setAddOpen(false);};
  const handleEdit=(d:Omit<Tx,"id">)=>{setTxs(p=>p.map(t=>t.id===editTx!.id?{...t,...d}:t));setEditTx(null);};
  const handleDel=(id:number)=>{setTxs(p=>p.filter(t=>t.id!==id));setDelId(null);};
  const thC="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 select-none";
  const pages=pgPages(page,totalPg);

  return(
    <div className="h-full overflow-y-auto p-4 md:p-5 flex flex-col gap-4">
      {/* ── Top row ── */}
      <div className="flex gap-4 items-start flex-wrap xl:flex-nowrap">
        {/* Left: stat cards + cashflow */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {[{label:"Balance",value:"$155,820",change:"+$7,000",up:true},{label:"Income",value:"$25,700",change:"+$12,000",up:true},{label:"Expenses",value:"$14,575",change:"-$6,300",up:false}].map(s=>(
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"#1e2d45"}}>
                    {s.label==="Balance"&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                    {s.label==="Income"&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                    {s.label==="Expenses"&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>}
                  </div>
                  <button className="no-hover-fx text-gray-300 text-[16px]">⋯</button>
                </div>
                <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
                <p className="text-[20px] font-bold text-gray-900">{s.value}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{background:s.up?"#dcfce7":"#fee2e2",color:s.up?"#16a34a":"#dc2626"}}>{s.change}</span>
                  <span className="text-[9px] text-gray-400">from last week</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-4 mb-3">
              <p className="text-[13px] font-bold text-gray-900">Cashflow</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-blue-400 inline-block rounded"/><span className="text-[10px] text-gray-400">Income</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-red-400 inline-block rounded"/><span className="text-[10px] text-gray-400">Expenses</span></div>
              </div>
            </div>
            <CashflowChart/>
          </div>
        </div>
        {/* Right: Expense Breakdown */}
        <div className="w-full xl:w-[230px] shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-gray-900">Expense Breakdown</p>
            <button className="no-hover-fx text-[10px] text-gray-400 border border-gray-200 rounded-lg px-2 py-1">This Year ▾</button>
          </div>
          <div className="flex justify-center mb-3"><DonutChart/></div>
          <div className="flex flex-col gap-1.5">
            {CATS.map(c=>(
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{background:c.color}}/>
                  <span className="text-[10px] text-gray-500">{c.name}</span>
                </div>
                <span className="text-[10px] font-semibold text-gray-700">${c.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 flex-wrap">
          <p className="text-[13px] font-bold text-gray-900 mr-1">Recent Transactions</p>
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 bg-white flex-1 min-w-[160px] max-w-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search receipt name, etc." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              className="text-[11px] text-gray-900 flex-1 focus:outline-none bg-transparent placeholder-gray-300" suppressHydrationWarning/>
            {search&&<button onClick={()=>setSearch("")} className="no-hover-fx text-gray-300 text-[14px] leading-none">×</button>}
          </div>
          {/* Category filter */}
          <div className="relative">
            <button onClick={()=>setShowCatDd(v=>!v)}
              className="no-hover-fx flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-[11px] text-gray-600">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {catFilt==="All"?"Modal":catFilt}
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showCatDd&&(
              <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-10">
                {["All",...CATS.map(c=>c.name)].map(n=>(
                  <button key={n} onClick={()=>{setCatFilt(n);setShowCatDd(false);setPage(1);}}
                    className="no-hover-fx w-full px-3 py-1.5 text-left text-[11px] hover:bg-gray-50 flex items-center justify-between"
                    style={{color:catFilt===n?"#ef4444":"#374151"}}>
                    <div className="flex items-center gap-1.5">
                      {n!=="All"&&<span className="w-2 h-2 rounded-sm" style={{background:CC[n]??""}}/>}
                      {n}
                    </div>
                    {catFilt===n&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1"/>
          <button onClick={()=>setAddOpen(true)} className="no-hover-fx flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-semibold" style={{background:"#ef4444"}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Expense
          </button>
          <button className="no-hover-fx flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-[11px] text-gray-600">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead><tr style={{background:"#f8fafc"}} className="border-b border-gray-100">
              <th className={thC}><div className="flex items-center gap-2.5"><input type="checkbox" checked={allSel} ref={el=>{if(el)el.indeterminate=someSel;}} onChange={toggleAll} className="w-3.5 h-3.5 accent-red-500"/>
                <button onClick={()=>hs("expense")} className="no-hover-fx flex items-center gap-1">Expense <SortIco c="expense"/></button></div></th>
              <th className={thC}><button onClick={()=>hs("category")} className="no-hover-fx flex items-center gap-1">Category <SortIco c="category"/></button></th>
              <th className={thC}><button onClick={()=>hs("qty")} className="no-hover-fx flex items-center gap-1">Quantity <SortIco c="qty"/></button></th>
              <th className={thC}><button onClick={()=>hs("amount")} className="no-hover-fx flex items-center gap-1">Amount <SortIco c="amount"/></button></th>
              <th className={thC}><button onClick={()=>hs("date")} className="no-hover-fx flex items-center gap-1">Date <SortIco c="date"/></button></th>
              <th className={thC}><button onClick={()=>hs("status")} className="no-hover-fx flex items-center gap-1">Status <SortIco c="status"/></button></th>
              <th className={thC}>Action</th>
            </tr></thead>
            <tbody>
              {pageTxs.map(t=>(
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5"><div className="flex items-center gap-2.5">
                    <input type="checkbox" checked={selected.has(t.id)} onChange={()=>toggleOne(t.id)} className="w-3.5 h-3.5 accent-red-500"/>
                    <span className="text-[12px] text-gray-800 font-medium">{t.expense}</span>
                  </div></td>
                  <td className="px-3 py-2.5"><div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{background:CC[t.category]??"#9ca3af"}}/>
                    <span className="text-[11px] text-gray-600">{t.category}</span>
                  </div></td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600">{t.qty}</td>
                  <td className="px-3 py-2.5 text-[12px] font-medium text-gray-800">${t.amount.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-[11px] text-gray-500 whitespace-nowrap">{t.date}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{background:t.status==="Completed"?"#dcfce7":"#fee2e2",color:t.status==="Completed"?"#16a34a":"#dc2626"}}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{background:t.status==="Completed"?"#22c55e":"#ef4444"}}/>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5"><div className="flex items-center gap-1.5">
                    <button onClick={()=>setEditTx(t)} className="no-hover-fx px-2.5 py-1 rounded-lg text-[10px] font-medium text-gray-500 border border-gray-200">Edit</button>
                    <button onClick={()=>setDelId(t.id)} className="no-hover-fx px-2.5 py-1 rounded-lg text-[10px] font-medium text-red-400 border border-red-100">Delete</button>
                  </div></td>
                </tr>
              ))}
              {pageTxs.length===0&&<tr><td colSpan={7} className="px-3 py-10 text-center text-[13px] text-gray-400">No transactions found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 flex-wrap gap-2">
          <div className="flex items-center gap-2"><span className="text-[11px] text-gray-400">Results per page</span>
            <select value={perPage} onChange={e=>{setPerPage(Number(e.target.value));setPage(1);}} className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" suppressHydrationWarning>
              {[10,15,20].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
          <div className="flex items-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 border border-gray-200 disabled:opacity-40">&lsaquo; Prev</button>
            {pages.map((p,i)=>p==="…"?<span key={`e${i}`} className="px-1.5 text-[11px] text-gray-400">…</span>
              :<button key={p} onClick={()=>setPage(p as number)} className="no-hover-fx w-7 h-7 rounded-lg text-[11px] font-medium" style={{background:page===p?"#ef4444":"transparent",color:page===p?"white":"#374151"}}>{p}</button>)}
            <button onClick={()=>setPage(p=>Math.min(totalPg,p+1))} disabled={page===totalPg} className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 border border-gray-200 disabled:opacity-40">Next &rsaquo;</button>
          </div>
        </div>
      </div>

      {addOpen&&<TxModal onSave={handleAdd} onClose={()=>setAddOpen(false)}/>}
      {editTx&&<TxModal initial={editTx} onSave={handleEdit} onClose={()=>setEditTx(null)}/>}
      {delId&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={()=>setDelId(null)} className="absolute inset-0 bg-black/40"/>
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4 text-center">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </div>
            <p className="text-[14px] font-bold text-gray-900 mb-1">Delete Expense?</p>
            <p className="text-[11px] text-gray-400 mb-5">This action cannot be undone.</p>
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
