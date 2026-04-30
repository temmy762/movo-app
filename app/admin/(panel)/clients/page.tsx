"use client";

import { useState, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Client = { id: number; name: string; email: string; phone: string; address: string; points: number; };
type SortCol = "name" | "phone" | "address" | "points" | null;
type SortDir = "asc" | "desc";
type ClientForm = Omit<Client, "id">;

// ── Data ──────────────────────────────────────────────────────────────────────
const SEED: Client[] = [
  { id:1,  name:"Alice Johnson",   email:"alice.johnson@example.com",   phone:"123-456-7890", address:"123 Maple Street",   points:120 },
  { id:2,  name:"Bob Smith",       email:"bob.smith@example.com",       phone:"234-567-8901", address:"455 Oak Avenue",     points:150 },
  { id:3,  name:"Charlie Davis",   email:"charlie.davis@example.com",   phone:"345-678-9012", address:"788 Pine Road",      points:200 },
  { id:4,  name:"Diana White",     email:"diana.white@example.com",     phone:"456-789-0123", address:"101 Birch Lane",     points:180 },
  { id:5,  name:"Edward Green",    email:"edward.green@example.com",    phone:"567-890-1234", address:"202 Cedar Street",   points:140 },
  { id:6,  name:"Fiona Brown",     email:"fiona.brown@example.com",     phone:"678-901-2345", address:"303 Elm Avenue",     points:160 },
  { id:7,  name:"George Clark",    email:"george.clark@example.com",    phone:"789-012-3456", address:"404 Spruce Road",    points:110 },
  { id:8,  name:"Helen Martinez",  email:"helen.martinez@example.com",  phone:"800-123-4567", address:"505 Willow Lane",    points:170 },
  { id:9,  name:"Ivan Rodriguez",  email:"ivan.rodriguez@example.com",  phone:"901-234-5678", address:"606 Walnut Street",  points:150 },
  { id:10, name:"Jane Wilson",     email:"jane.wilson@example.com",     phone:"012-345-6789", address:"707 Ash Avenue",     points:180 },
  { id:11, name:"Kyle Thompson",   email:"kyle.thompson@example.com",   phone:"123-456-7899", address:"808 Cherry Road",    points:175 },
  { id:12, name:"Laura King",      email:"laura.king@example.com",      phone:"234-567-8902", address:"909 Chestnut Lane",  points:155 },
  { id:13, name:"Michael Brown",   email:"michael.brown@example.com",   phone:"345-678-9013", address:"010 Walnut Drive",   points:130 },
  { id:14, name:"Nancy Davis",     email:"nancy.davis@example.com",     phone:"456-789-0124", address:"111 Cedar Court",    points:195 },
  { id:15, name:"Oliver Scott",    email:"oliver.scott@example.com",    phone:"567-890-1235", address:"222 Maple Avenue",   points:165 },
  { id:16, name:"Patricia Lee",    email:"patricia.lee@example.com",    phone:"678-901-2346", address:"333 Oak Lane",       points:145 },
  { id:17, name:"Quinn Taylor",    email:"quinn.taylor@example.com",    phone:"789-012-3457", address:"444 Pine Court",     points:115 },
  { id:18, name:"Rachel Adams",    email:"rachel.adams@example.com",    phone:"890-123-4568", address:"555 Elm Drive",      points:185 },
  { id:19, name:"Sam Wilson",      email:"sam.wilson@example.com",      phone:"901-234-5679", address:"666 Cedar Avenue",   points:125 },
  { id:20, name:"Tina Harris",     email:"tina.harris@example.com",     phone:"012-345-6780", address:"777 Birch Road",     points:190 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#ec4899","#8b5cf6"];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase(); }
function firstName(name: string) { return name.split(" ")[0]; }
function paginationPages(cur: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 3)   return [1, 2, 3, "…", total];
  if (cur >= total - 2) return [1, "…", total - 2, total - 1, total];
  return [1, "…", cur - 1, cur, cur + 1, "…", total];
}

// ── Small components ──────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#1e2d45" : "#9ca3af"} strokeWidth="2.5" className="shrink-0">
      {(!active || dir === "asc")  && <path d="M7 15l5 5 5-5"/>}
      {(!active || dir === "desc") && <path d="M7 9l5-5 5 5"/>}
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="shrink-0">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
    </svg>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function ClientModal({ initial, onSave, onClose }: {
  initial?: Client; onSave: (d: ClientForm) => void; onClose: () => void;
}) {
  const blank: ClientForm = { name:"", email:"", phone:"", address:"", points:0 };
  const [form, setForm] = useState<ClientForm>(initial ? { name:initial.name, email:initial.email, phone:initial.phone, address:initial.address, points:initial.points } : blank);
  const set = (k: keyof ClientForm, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/40"/>
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md mx-0 sm:mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[16px] font-bold text-gray-900">{initial ? "Edit Client" : "Add New Client"}</p>
          <button onClick={onClose} className="no-hover-fx w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-[18px] leading-none">×</button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Full Name <span className="text-red-400">*</span></p>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="John Doe"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Email</p>
              <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="john@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Phone</p>
              <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="123-456-7890"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Points</p>
              <input type="number" min={0} value={form.points} onChange={e => set("points", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none"/>
            </div>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium mb-1">Address</p>
            <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main Street"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-900 focus:outline-none focus:border-red-300 placeholder-gray-300"/>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200">Cancel</button>
          <button onClick={() => form.name.trim() && onSave({ ...form, points: Number(form.points) })}
            disabled={!form.name.trim()}
            className="no-hover-fx flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: form.name.trim() ? "#ef4444" : "#fca5a5" }}>
            {initial ? "Save Changes" : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onCancel} className="absolute inset-0 bg-black/40"/>
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>
        <p className="text-[15px] font-bold text-gray-900 mb-1">Delete Client?</p>
        <p className="text-[12px] text-gray-500 mb-5">Remove <strong>{name}</strong> from the system. This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="no-hover-fx flex-1 py-2 border border-gray-200 rounded-xl text-[13px] text-gray-600">Cancel</button>
          <button onClick={onConfirm} className="no-hover-fx flex-1 py-2 bg-red-500 rounded-xl text-[13px] font-semibold text-white">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [clients,    setClients]    = useState<Client[]>(SEED);
  const [search,     setSearch]     = useState("");
  const [sortCol,    setSortCol]    = useState<SortCol>(null);
  const [sortDir,    setSortDir]    = useState<SortDir>("asc");
  const [selected,   setSelected]   = useState<Set<number>>(new Set([3, 4]));
  const [page,       setPage]       = useState(1);
  const [perPage,    setPerPage]    = useState(12);
  const [addOpen,    setAddOpen]    = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  // ── Filter + sort ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let r = clients.filter(c =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) || c.address.toLowerCase().includes(q)
    );
    if (sortCol) {
      r = [...r].sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
        return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return r;
  }, [clients, search, sortCol, sortDir]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageClients = filtered.slice((page - 1) * perPage, page * perPage);
  const allSel      = pageClients.length > 0 && pageClients.every(c => selected.has(c.id));
  const someSel     = !allSel && pageClients.some(c => selected.has(c.id));

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const toggleAll = () => setSelected(prev => {
    const n = new Set(prev);
    allSel ? pageClients.forEach(c => n.delete(c.id)) : pageClients.forEach(c => n.add(c.id));
    return n;
  });
  const toggleOne = (id: number) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const handleAdd  = (d: ClientForm) => { setClients(p => [...p, { ...d, id: Math.max(...p.map(c=>c.id))+1 }]); setAddOpen(false); };
  const handleEdit = (d: ClientForm) => { setClients(p => p.map(c => c.id === editClient!.id ? { ...c, ...d } : c)); setEditClient(null); };
  const handleDel  = (id: number)    => { setClients(p => p.filter(c => c.id !== id)); setDeleteId(null); setSelected(s => { const n=new Set(s); n.delete(id); return n; }); };

  const delClient = clients.find(c => c.id === deleteId);
  const pages = paginationPages(page, totalPages);

  const thCls = "px-4 py-3 text-left text-[11px] font-semibold text-gray-500 select-none";

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white flex-1 min-w-[180px] max-w-xs">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search for client" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="text-[12px] text-gray-900 flex-1 focus:outline-none bg-transparent placeholder-gray-300"
            suppressHydrationWarning/>
          {search && <button onClick={() => setSearch("")} className="no-hover-fx text-gray-300 text-[15px] leading-none">×</button>}
        </div>
        <div className="flex-1"/>
        <button onClick={() => setAddOpen(true)}
          className="no-hover-fx px-4 py-2 rounded-xl text-white text-[13px] font-semibold"
          style={{ background: "#ef4444" }}>
          + Add Client
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100" style={{ background: "#f8fafc" }}>
                <th className={thCls}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={allSel} ref={el => { if (el) el.indeterminate = someSel; }}
                      onChange={toggleAll} className="w-3.5 h-3.5 accent-red-500"/>
                    <button onClick={() => handleSort("name")} className="no-hover-fx flex items-center gap-1">
                      Client <SortIcon active={sortCol==="name"} dir={sortDir}/>
                    </button>
                  </div>
                </th>
                <th className={thCls}>
                  <button onClick={() => handleSort("phone")} className="no-hover-fx flex items-center gap-1">
                    Phone <SortIcon active={sortCol==="phone"} dir={sortDir}/>
                  </button>
                </th>
                <th className={thCls}>
                  <button onClick={() => handleSort("address")} className="no-hover-fx flex items-center gap-1">
                    Address <SortIcon active={sortCol==="address"} dir={sortDir}/>
                  </button>
                </th>
                <th className={thCls}>Documents</th>
                <th className={thCls}>
                  <button onClick={() => handleSort("points")} className="no-hover-fx flex items-center gap-1">
                    Points <SortIcon active={sortCol==="points"} dir={sortDir}/>
                  </button>
                </th>
                <th className={thCls}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageClients.map(client => {
                const isSel = selected.has(client.id);
                const fn = firstName(client.name);
                return (
                  <tr key={client.id} className="border-b border-gray-50 transition-colors"
                    style={{ background: isSel ? "#eff6ff" : "white" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={isSel} onChange={() => toggleOne(client.id)}
                          className="w-3.5 h-3.5 accent-red-500 shrink-0"/>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                          style={{ background: avatarColor(client.name) }}>
                          {initials(client.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-gray-900 leading-tight truncate">{client.name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600 whitespace-nowrap">{client.phone}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">{client.address}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <DocIcon/>
                          <span className="text-[11px] text-gray-500">{fn}&apos;s Residence Card</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DocIcon/>
                          <span className="text-[11px] text-gray-500">{fn}&apos;s License</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-gray-800 whitespace-nowrap">{client.points}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditClient(client)}
                          className="no-hover-fx px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 border border-gray-200">
                          Edit
                        </button>
                        <button onClick={() => setDeleteId(client.id)}
                          className="no-hover-fx px-3 py-1.5 rounded-lg text-[11px] font-medium text-red-400 border border-red-100">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageClients.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px] text-gray-400">No clients found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Results per page</span>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" suppressHydrationWarning>
              {[10, 12, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 border border-gray-200 disabled:opacity-40">
              &lsaquo; Prev
            </button>
            {pages.map((p, i) =>
              p === "…"
                ? <span key={`e${i}`} className="px-1.5 text-[11px] text-gray-400">…</span>
                : <button key={p} onClick={() => setPage(p as number)}
                    className="no-hover-fx w-7 h-7 rounded-lg text-[11px] font-medium"
                    style={{ background: page===p?"#ef4444":"transparent", color: page===p?"white":"#374151" }}>
                    {p}
                  </button>
            )}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="no-hover-fx px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 border border-gray-200 disabled:opacity-40">
              Next &rsaquo;
            </button>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {addOpen    && <ClientModal onSave={handleAdd}  onClose={() => setAddOpen(false)}/>}
      {editClient && <ClientModal initial={editClient} onSave={handleEdit} onClose={() => setEditClient(null)}/>}
      {deleteId   && delClient && <DeleteConfirm name={delClient.name} onConfirm={() => handleDel(deleteId)} onCancel={() => setDeleteId(null)}/>}
    </div>
  );
}
