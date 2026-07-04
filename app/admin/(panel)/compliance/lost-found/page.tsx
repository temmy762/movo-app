"use client";
import { useEffect, useState, useCallback } from "react";

type Item = {
  id: string;
  status: "REPORTED" | "MATCHED" | "RETURNED" | "CLOSED";
  itemDescription: string;
  reportedBy: string;
  contactInfo: string | null;
  collectionNotes: string | null;
  returnedAt: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string | null; phone: string | null } | null;
  driver: { firstName: string; lastName: string; email: string; phone: string | null } | null;
  booking: { id: string; pickup: string; dropoff: string } | null;
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  REPORTED: { bg: "#fef3c7", color: "#d97706" },
  MATCHED:  { bg: "#dbeafe", color: "#2563eb" },
  RETURNED: { bg: "#dcfce7", color: "#16a34a" },
  CLOSED:   { bg: "#f3f4f6", color: "#6b7280" },
};

export default function LostFoundPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/lost-found${statusFilter ? `?status=${statusFilter}` : ""}`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (i: Item) => { setSelected(i); setNotes(i.collectionNotes ?? ""); };

  const save = async (status?: string) => {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/lost-found/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(status ? { status } : {}), collectionNotes: notes }),
    });
    setSaving(false);
    setSelected(null);
    load();
  };

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">Lost &amp; Found</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">{items.length} total</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {["", "REPORTED", "MATCHED", "RETURNED", "CLOSED"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="px-4 py-1.5 rounded-full text-[12px] font-semibold border"
            style={statusFilter === s ? { background: "#1e2d45", color: "white", borderColor: "#1e2d45" } : { background: "white", color: "#374151", borderColor: "#e5e7eb" }}>
            {s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[13px] text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-gray-400">No lost &amp; found reports yet</div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(i => (
            <button key={i.id} onClick={() => openDetail(i)}
              className="text-left bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono text-gray-400">#{i.id.slice(0, 8)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{i.reportedBy === "DRIVER" ? "Found by chauffeur" : "Reported by customer"}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLE[i.status].bg, color: STATUS_STYLE[i.status].color }}>{i.status}</span>
                  </div>
                  <p className="text-[13px] text-gray-800 truncate">{i.itemDescription}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{new Date(i.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <p className="text-[13px] text-gray-800 mb-3">{selected.itemDescription}</p>
            {selected.booking && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3 text-[11px] text-gray-500">
                <p>Pickup: {selected.booking.pickup}</p>
                <p>Dropoff: {selected.booking.dropoff}</p>
              </div>
            )}
            <div className="text-[12px] text-gray-500 mb-3">
              <p><strong>Customer:</strong> {selected.user ? `${selected.user.firstName} ${selected.user.lastName} · ${selected.user.email ?? "—"} · ${selected.user.phone ?? "—"}` : "—"}</p>
              <p><strong>Chauffeur:</strong> {selected.driver ? `${selected.driver.firstName} ${selected.driver.lastName} · ${selected.driver.email} · ${selected.driver.phone ?? "—"}` : "—"}</p>
              {selected.contactInfo && <p><strong>Contact provided:</strong> {selected.contactInfo}</p>}
            </div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Collection Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[12px] mb-4 focus:outline-none focus:border-[#131936] resize-none" />
            <div className="grid grid-cols-2 gap-2 mb-2">
              {["REPORTED", "MATCHED", "RETURNED", "CLOSED"].map(s => (
                <button key={s} disabled={saving} onClick={() => save(s)}
                  className="py-2 rounded-lg text-[12px] font-semibold border"
                  style={selected.status === s ? { background: "#131936", color: "white", borderColor: "#131936" } : { background: "white", color: "#374151", borderColor: "#e5e7eb" }}>
                  Mark {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelected(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600">Close</button>
              <button disabled={saving} onClick={() => save()} className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold" style={{ background: "#131936" }}>
                {saving ? "Saving…" : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
