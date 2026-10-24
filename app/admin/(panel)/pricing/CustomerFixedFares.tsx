"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Customer = { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };

type FixedFare = {
  id: string; userId: string; label: string;
  pickup: string; dropoff: string; tier: string;
  fare: number; weekdays: number[]; active: boolean;
  pickupTime: string | null; timeWindowMin: number;
  user: Customer;
};

type Client = { id: string; name: string; email: string; phone: string };

type Draft = {
  id?: string; userId: string; label: string;
  pickup: string; dropoff: string; tier: string;
  fare: string; weekdays: number[];
  pickupTime: string; timeWindowMin: string;
};

const TIER_NAMES: Record<string, string> = { classic: "Standard", premium: "Executive", black: "Concierge" };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BLANK: Draft = { userId: "", label: "", pickup: "", dropoff: "", tier: "classic", fare: "", weekdays: [1, 2, 3, 4, 5], pickupTime: "", timeWindowMin: "30" };

const money = (n: number) => `$${n.toFixed(2)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

/* "06:30" → "6:30 AM" */
function clock(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function timeLabel(pickupTime: string | null, windowMin: number) {
  if (!pickupTime) return "any time";
  return windowMin ? `${clock(pickupTime)} ±${windowMin} min` : clock(pickupTime);
}

function daysLabel(days: number[]) {
  const key = [...days].sort().join(",");
  if (key === "1,2,3,4,5") return "Mon – Fri";
  if (key === "0,1,2,3,4,5,6") return "Every day";
  return [...days].sort().map(d => DAYS[d]).join(", ");
}

/* Admin calls time out so a slow server can't hang the page */
async function adminFetch(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  } catch (e) {
    if (controller.signal.aborted) throw new Error("The server took too long to respond. Please try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 focus:outline-none focus:border-[#131936]";
const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1";

export default function CustomerFixedFares({ gstRate }: { gstRate: number }) {
  const [fares,   setFares]   = useState<FixedFare[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [draft,   setDraft]   = useState<Draft | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [busyId,  setBusyId]  = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await adminFetch("/api/admin/fixed-fares");
      setFares(d.fares ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fixed fares.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Customer list is only needed once the form opens */
  useEffect(() => {
    if (!draft || draft.id || clients.length) return;
    adminFetch("/api/admin/clients").then(d => { if (Array.isArray(d)) setClients(d); }).catch(() => {});
  }, [draft, clients.length]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    const body = {
      label: draft.label, pickup: draft.pickup, dropoff: draft.dropoff,
      tier: draft.tier, fare: parseFloat(draft.fare), weekdays: draft.weekdays,
      pickupTime: draft.pickupTime, timeWindowMin: parseInt(draft.timeWindowMin || "0", 10),
      ...(draft.id ? {} : { userId: draft.userId }),
    };
    try {
      await adminFetch(draft.id ? `/api/admin/fixed-fares/${draft.id}` : "/api/admin/fixed-fares", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the fixed fare.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (f: FixedFare) => {
    setBusyId(f.id);
    setError(null);
    try {
      await adminFetch(`/api/admin/fixed-fares/${f.id}`, { method: "PATCH", body: JSON.stringify({ active: !f.active }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the fixed fare.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (f: FixedFare) => {
    if (!confirm(`Delete "${f.label}" for ${f.user.firstName} ${f.user.lastName}? Their bookings already made keep their price.`)) return;
    setBusyId(f.id);
    setError(null);
    try {
      await adminFetch(`/api/admin/fixed-fares/${f.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete the fixed fare.");
    } finally {
      setBusyId(null);
    }
  };

  /* Group routes under each customer */
  const byCustomer = useMemo(() => {
    const groups = new Map<string, { customer: Customer; fares: FixedFare[] }>();
    for (const f of fares) {
      const g = groups.get(f.userId) ?? { customer: f.user, fares: [] };
      g.fares.push(f);
      groups.set(f.userId, g);
    }
    return [...groups.values()];
  }, [fares]);

  return (
    <>
      <div className="flex items-end justify-between mt-8 mb-3 gap-4">
        <div>
          <h2 className="text-[14px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Customer Fixed Fares</h2>
          <p className="text-[12px] text-gray-400">
            Agreed prices for a customer&apos;s regular routes. Applied automatically when that customer books the route while signed in
            (pickup and drop-off within 200 m, on the chosen days, no extra stops). Fare is before GST; no service fee is added.
          </p>
        </div>
        {!draft && (
          <button onClick={() => { setError(null); setDraft({ ...BLANK }); }}
            className="no-hover-fx shrink-0 px-4 py-2 rounded-xl text-white text-[12px] font-bold"
            style={{ background: "#131936" }}>
            + Add fixed fare
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600">{error}</div>
      )}

      {draft && (
        <FixedFareForm
          key={draft.id ?? "new"}
          draft={draft} setDraft={setDraft} clients={clients} gstRate={gstRate}
          saving={saving} onSave={save} onCancel={() => { setDraft(null); setError(null); }}
          customerName={draft.id ? fares.find(f => f.id === draft.id)?.user : undefined}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="px-6 py-5 text-[13px] text-gray-400">Loading…</p>
        ) : byCustomer.length === 0 ? (
          <p className="px-6 py-5 text-[13px] text-gray-400">No fixed fares yet.</p>
        ) : byCustomer.map(({ customer, fares: rows }) => {
          const daily = rows.filter(r => r.active).reduce((s, r) => s + r.fare + round2(r.fare * gstRate), 0);
          return (
            <div key={customer.id} className="border-b border-gray-100 last:border-b-0">
              <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
                <p className="text-[13px] font-bold text-gray-800">
                  {customer.firstName} {customer.lastName}
                  <span className="font-normal text-gray-400 ml-2">{customer.email ?? customer.phone ?? ""}</span>
                </p>
                <p className="text-[12px] text-gray-500">All active routes: {money(daily)} incl. GST</p>
              </div>
              {rows.map(f => {
                const gst = round2(f.fare * gstRate);
                return (
                  <div key={f.id} className={`px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 ${f.active ? "" : "opacity-50"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800">
                        {f.label}
                        {!f.active && <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Paused</span>}
                      </p>
                      <p className="text-[12px] text-gray-500 truncate">{f.pickup} → {f.dropoff}</p>
                      <p className="text-[11px] text-gray-400">{TIER_NAMES[f.tier] ?? f.tier} · {daysLabel(f.weekdays)} · {timeLabel(f.pickupTime, f.timeWindowMin)}</p>
                    </div>
                    <div className="text-[12px] text-right shrink-0">
                      <p className="text-gray-500">{money(f.fare)} + GST {money(gst)}</p>
                      <p className="font-bold text-gray-900">{money(f.fare + gst)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button disabled={busyId === f.id} onClick={() => {
                        setError(null);
                        setDraft({ id: f.id, userId: f.userId, label: f.label, pickup: f.pickup, dropoff: f.dropoff, tier: f.tier, fare: f.fare.toFixed(2), weekdays: f.weekdays, pickupTime: f.pickupTime ?? "", timeWindowMin: String(f.timeWindowMin) });
                      }}
                        className="no-hover-fx px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700">Edit</button>
                      <button disabled={busyId === f.id} onClick={() => toggleActive(f)}
                        className="no-hover-fx px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700">
                        {f.active ? "Pause" : "Resume"}
                      </button>
                      <button disabled={busyId === f.id} onClick={() => remove(f)}
                        className="no-hover-fx px-3 py-1.5 rounded-lg border border-red-200 text-[12px] font-semibold text-red-600">Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

function FixedFareForm({ draft, setDraft, clients, gstRate, saving, onSave, onCancel, customerName }: {
  draft: Draft; setDraft: (d: Draft) => void; clients: Client[]; gstRate: number;
  saving: boolean; onSave: () => void; onCancel: () => void; customerName?: Customer;
}) {
  const [search, setSearch] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });

  const fare  = parseFloat(draft.fare);
  const valid = Number.isFinite(fare) && fare > 0;
  const gst   = valid ? round2(fare * gstRate) : 0;
  const total = valid ? round2(fare + gst) : 0;
  const [totalInput, setTotalInput] = useState(valid ? total.toFixed(2) : "");

  /* Entering the total incl. GST works the fare back out */
  const onTotal = (v: string) => {
    setTotalInput(v);
    const t = parseFloat(v);
    if (Number.isFinite(t) && t > 0) set("fare", round2(t / (1 + gstRate)).toFixed(2));
  };
  const onFare = (v: string) => {
    set("fare", v);
    const f = parseFloat(v);
    setTotalInput(Number.isFinite(f) && f > 0 ? round2(f + round2(f * gstRate)).toFixed(2) : "");
  };

  const selected = clients.find(c => c.id === draft.userId);
  const matches = search.trim()
    ? clients.filter(c => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  const canSave = !!draft.userId && !!draft.label.trim() && !!draft.pickup.trim() && !!draft.dropoff.trim() && valid && draft.weekdays.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#131936]/20 px-6 py-5 mb-4 flex flex-col gap-4">
      <p className="text-[13px] font-bold text-gray-800">{draft.id ? "Edit fixed fare" : "New fixed fare"}</p>

      <div>
        <label className={labelCls}>Customer</label>
        {draft.id ? (
          <p className="text-[13px] text-gray-800">{customerName ? `${customerName.firstName} ${customerName.lastName}` : ""}</p>
        ) : selected ? (
          <div className="flex items-center gap-3">
            <p className="text-[13px] text-gray-800">{selected.name} <span className="text-gray-400">{selected.email || selected.phone}</span></p>
            <button onClick={() => set("userId", "")} className="no-hover-fx text-[12px] text-[#131936] underline">Change</button>
          </div>
        ) : (
          <div className="relative">
            <input className={inputCls} placeholder="Search by name, email or phone" value={search} onChange={e => setSearch(e.target.value)} />
            {matches.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {matches.map(c => (
                  <button key={c.id} onClick={() => { set("userId", c.id); setSearch(""); }}
                    className="no-hover-fx w-full text-left px-3 py-2 text-[13px] hover:bg-gray-50">
                    {c.name} <span className="text-gray-400">{c.email || c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {search.trim() && !matches.length && <p className="text-[11px] text-gray-400 mt-1">No customer found. They need a Movo account first.</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Route name</label>
          <input className={inputCls} placeholder="Morning — Home to Work" value={draft.label} onChange={e => set("label", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Pickup</label>
          <input className={inputCls} placeholder="15 Berwick Court, Winnipeg, MB" value={draft.pickup} onChange={e => set("pickup", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Drop-off</label>
          <input className={inputCls} placeholder="97 Nicola Drive, Headingley, MB" value={draft.dropoff} onChange={e => set("dropoff", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Service</label>
          <select className={inputCls} value={draft.tier} onChange={e => set("tier", e.target.value)}>
            {Object.entries(TIER_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Fare before GST</label>
          <input className={inputCls} type="number" step="0.01" min={0} placeholder="27.86" value={draft.fare} onChange={e => onFare(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>…or total incl. GST</label>
          <input className={inputCls} type="number" step="0.01" min={0} placeholder="29.25" value={totalInput} onChange={e => onTotal(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Days</label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => {
            const on = draft.weekdays.includes(i);
            return (
              <button key={d} onClick={() => set("weekdays", on ? draft.weekdays.filter(x => x !== i) : [...draft.weekdays, i])}
                className="no-hover-fx px-3 py-1.5 rounded-lg text-[12px] font-semibold border"
                style={on ? { background: "#131936", color: "white", borderColor: "#131936" } : { color: "#374151", borderColor: "#e5e7eb" }}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Pickup time</label>
          <input className={inputCls} type="time" value={draft.pickupTime} onChange={e => set("pickupTime", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Allowed early / late</label>
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-[#131936]">
            <span className="text-[13px] text-gray-400">±</span>
            <input type="number" step="5" min={0} max={180} value={draft.timeWindowMin} disabled={!draft.pickupTime}
              onChange={e => set("timeWindowMin", e.target.value)}
              className="flex-1 text-[13px] text-gray-800 font-medium focus:outline-none bg-transparent w-full" />
            <span className="text-[13px] text-gray-400">min</span>
          </div>
        </div>
        <p className="col-span-2 md:col-span-1 self-end text-[11px] text-gray-400 pb-2">
          {draft.pickupTime
            ? `Agreed fare applies to pickups ${timeLabel(draft.pickupTime, parseInt(draft.timeWindowMin || "0", 10))} (Winnipeg time). Outside that, normal pricing.`
            : "No pickup time: the agreed fare applies at any time on the chosen days."}
        </p>
      </div>

      {valid && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-[12px] max-w-sm">
          <div className="flex justify-between"><span className="text-gray-500">Fare</span><span className="font-medium">{money(fare)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">GST ({+(gstRate * 100).toFixed(2)}%)</span><span className="font-medium">{money(gst)}</span></div>
          <div className="h-px bg-gray-200 my-1" />
          <div className="flex justify-between font-bold"><span>Customer pays</span><span>{money(total)}</span></div>
        </div>
      )}

      <div className="flex gap-2">
        <button disabled={!canSave || saving} onClick={onSave}
          className="no-hover-fx px-5 py-2.5 rounded-xl text-white text-[13px] font-bold"
          style={{ background: !canSave || saving ? "#9ca3af" : "linear-gradient(90deg, #1a1a2e, #131936, #C6BFB2)" }}>
          {saving ? "Saving…" : "Save fixed fare"}
        </button>
        <button onClick={onCancel} className="no-hover-fx px-5 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700">Cancel</button>
      </div>
    </div>
  );
}
