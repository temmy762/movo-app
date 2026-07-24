"use client";

import { useState, useEffect, useCallback } from "react";

type RentalVehicleRow = {
  id: string; make: string; model: string; year: number; plate: string; color: string | null; tier: string;
  dailyRate: number; weeklyRate: number; monthlyRate: number;
  status: "AVAILABLE" | "RENTED" | "MAINTENANCE" | "OUT_OF_SERVICE";
  notes: string | null; photoCount: number; createdAt: string;
  openRental: { id: string; status: string; driver: { firstName: string; lastName: string } | null } | null;
};

type Rental = {
  id: string; plan: "DAILY" | "WEEKLY" | "MONTHLY"; amount: number;
  status: "REQUESTED" | "APPROVED" | "DECLINED" | "COMPLETED" | "CANCELLED";
  startDate: string | null; endDate: string | null; adminNote: string | null;
  returnCharge: number | null; returnChargeNote: string | null; returnRequestedAt: string | null; createdAt: string;
  driver: { id: string; firstName: string; lastName: string; email: string; phone: string | null } | null;
  vehicle: { id: string; make: string; model: string; year: number; plate: string; color: string | null; tier: string };
};

const PLAN_LABELS: Record<string, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly" };
const TIER_LABELS: Record<string, string> = { classic: "Standard", premium: "Executive", black: "Concierge" };

const VEHICLE_STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  AVAILABLE:      { bg: "#dcfce7", color: "#16a34a", label: "Available" },
  RENTED:         { bg: "#dbeafe", color: "#1d4ed8", label: "Rented" },
  MAINTENANCE:    { bg: "#fef3c7", color: "#d97706", label: "Maintenance" },
  OUT_OF_SERVICE: { bg: "#fee2e2", color: "#dc2626", label: "Out of Service" },
};

const RENTAL_STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  REQUESTED: { bg: "#fef9c3", color: "#854d0e", label: "Requested" },
  APPROVED:  { bg: "#dcfce7", color: "#16a34a", label: "Active" },
  DECLINED:  { bg: "#fee2e2", color: "#dc2626", label: "Declined" },
  COMPLETED: { bg: "#e5e7eb", color: "#374151", label: "Completed" },
  CANCELLED: { bg: "#e5e7eb", color: "#6b7280", label: "Cancelled" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Add / Edit Vehicle modal ── */
function VehicleForm({ vehicle, onClose, onSaved }: {
  vehicle: RentalVehicleRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [make, setMake] = useState(vehicle?.make ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [year, setYear] = useState(vehicle ? String(vehicle.year) : String(new Date().getFullYear()));
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [color, setColor] = useState(vehicle?.color ?? "");
  const [tier, setTier] = useState(vehicle?.tier ?? "classic");
  const [dailyRate, setDailyRate] = useState(vehicle ? String(vehicle.dailyRate) : "89");
  const [weeklyRate, setWeeklyRate] = useState(vehicle ? String(vehicle.weeklyRate) : "575");
  const [monthlyRate, setMonthlyRate] = useState(vehicle ? String(vehicle.monthlyRate) : "2150");
  const [notes, setNotes] = useState(vehicle?.notes ?? "");
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 6 - photos.length);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) continue;
      const dataUrl = await readFileAsDataUrl(file).catch(() => null);
      if (dataUrl) setPhotos((p) => [...p, dataUrl].slice(0, 6));
    }
    e.target.value = "";
  };

  const save = async () => {
    if (!make.trim() || !model.trim() || !plate.trim()) {
      setError("Make, model, and plate are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        make: make.trim(), model: model.trim(), year, plate: plate.trim(),
        color: color.trim(), tier, dailyRate, weeklyRate, monthlyRate, notes: notes.trim(),
      };
      if (!vehicle || photos.length > 0) body.photos = photos;
      const res = await fetch(vehicle ? `/api/admin/rentals/vehicles/${vehicle.id}` : "/api/admin/rentals/vehicles", {
        method: vehicle ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d?.error ?? "Failed to save vehicle.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("Network error — please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <p className="text-[15px] font-bold text-gray-900 mb-4">{vehicle ? "Edit Rental Vehicle" : "Add Rental Vehicle"}</p>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Make"
            className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:border-[#131936]" />
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model"
            className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:border-[#131936]" />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" type="number"
            className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:border-[#131936]" />
          <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Plate"
            className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:border-[#131936]" />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color (optional)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:border-[#131936]" />
          <select value={tier} onChange={(e) => setTier(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:border-[#131936] bg-white">
            <option value="classic">Standard</option>
            <option value="premium">Executive</option>
            <option value="black">Concierge</option>
          </select>
        </div>

        <p className="text-[11px] font-semibold text-gray-500 mt-3 mb-1.5">Rental pricing (CAD)</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="text-[10px] text-gray-400">Daily</label>
            <input value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} type="number"
              className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] focus:outline-none focus:border-[#131936]" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400">Weekly</label>
            <input value={weeklyRate} onChange={(e) => setWeeklyRate(e.target.value)} type="number"
              className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] focus:outline-none focus:border-[#131936]" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400">Monthly</label>
            <input value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} type="number"
              className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] focus:outline-none focus:border-[#131936]" />
          </div>
        </div>

        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (optional)" rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] resize-none focus:outline-none focus:border-[#131936] mb-3" />

        <p className="text-[11px] font-semibold text-gray-500 mb-1.5">
          Photos {vehicle ? "(leave empty to keep existing)" : ""}
        </p>
        <input type="file" accept="image/*" multiple onChange={handlePhotoChange}
          className="text-[11px] mb-2" disabled={photos.length >= 6} />
        {photos.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
            ))}
          </div>
        )}

        {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} disabled={saving}
            className="no-hover-fx flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="no-hover-fx flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50"
            style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
            {saving ? "Saving…" : "Save Vehicle"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Decline reason modal ── */
function DeclineModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <p className="text-[15px] font-bold text-gray-900 mb-1">Decline Request</p>
        <p className="text-[12px] text-gray-500 mb-3">The chauffeur will be refunded in full.</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="Reason (shown to the chauffeur)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] resize-none focus:outline-none focus:border-[#131936] mb-3" />
        <div className="flex gap-2">
          <button onClick={onClose} className="no-hover-fx flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600">Cancel</button>
          <button onClick={() => onConfirm(reason)} className="no-hover-fx flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold bg-red-500">
            Decline &amp; Refund
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Return vehicle modal ── */
function ReturnModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (fuelCost: number, note: string) => void }) {
  const [fuelCost, setFuelCost] = useState("0");
  const [note, setNote] = useState("");
  const fee = parseFloat(fuelCost) > 0 ? 20 : 0;
  const total = (parseFloat(fuelCost) || 0) + fee;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <p className="text-[15px] font-bold text-gray-900 mb-1">Return Vehicle</p>
        <p className="text-[12px] text-gray-500 mb-3">
          If the vehicle wasn&apos;t returned with a full tank, enter the fuel cost — a $20 refueling service fee is added automatically and charged to the chauffeur&apos;s card on file.
        </p>
        <label className="text-[10px] text-gray-400">Fuel cost (CAD, 0 if full tank)</label>
        <input value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} type="number"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:border-[#131936] mb-2" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note (e.g. cleaning, damage — optional)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] resize-none focus:outline-none focus:border-[#131936] mb-3" />
        {total > 0 && (
          <p className="text-[12px] font-semibold mb-3" style={{ color: "#131936" }}>
            Total charge: ${total.toFixed(2)} (fuel ${(parseFloat(fuelCost) || 0).toFixed(2)} + $20 service fee)
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="no-hover-fx flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600">Cancel</button>
          <button onClick={() => onConfirm(parseFloat(fuelCost) || 0, note)}
            className="no-hover-fx flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold"
            style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
            Confirm Return
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRentalsPage() {
  const [tab, setTab] = useState<"requests" | "active" | "history" | "fleet">("requests");
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [vehicles, setVehicles] = useState<RentalVehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<Rental | null>(null);
  const [returnTarget, setReturnTarget] = useState<Rental | null>(null);
  const [vehicleForm, setVehicleForm] = useState<"new" | RentalVehicleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RentalVehicleRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/rentals").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/rentals/vehicles").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([r, v]) => {
        setRentals(Array.isArray(r) ? r : []);
        setVehicles(Array.isArray(v) ? v : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /* First-run UX: with an empty fleet, "Requests" (the default tab) just
     shows "No pending rental requests" and gives no clue that vehicles are
     added under Fleet. Land on Fleet automatically until at least one
     vehicle exists — after that, Requests (the actionable queue) is the
     more useful default. Runs once, after the first successful load. */
  const [didSteer, setDidSteer] = useState(false);
  useEffect(() => {
    if (!loading && !didSteer) {
      setDidSteer(true);
      if (vehicles.length === 0) setTab("fleet");
    }
  }, [loading, didSteer, vehicles.length, setDidSteer]);

  const requests = rentals.filter((r) => r.status === "REQUESTED");
  const active   = rentals.filter((r) => r.status === "APPROVED");
  const history  = rentals.filter((r) => r.status === "DECLINED" || r.status === "COMPLETED" || r.status === "CANCELLED");

  const approve = async (rental: Rental) => {
    setBusyId(rental.id);
    try {
      const res = await fetch(`/api/admin/rentals/${rental.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d?.error ?? "Failed to approve.");
      }
      load();
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (reason: string) => {
    if (!declineTarget) return;
    setBusyId(declineTarget.id);
    try {
      await fetch(`/api/admin/rentals/${declineTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline", reason }),
      });
      setDeclineTarget(null);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const returnVehicle = async (fuelCost: number, note: string) => {
    if (!returnTarget) return;
    setBusyId(returnTarget.id);
    try {
      const res = await fetch(`/api/admin/rentals/${returnTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "return", fuelCost, note }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.returnCharge > 0 && d.chargeSucceeded === false) {
        alert(`Vehicle returned, but the $${d.returnCharge.toFixed(2)} charge failed — collect manually.`);
      }
      setReturnTarget(null);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const deleteVehicle = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/rentals/vehicles/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d?.error ?? "Failed to delete vehicle.");
      }
      setDeleteTarget(null);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const setVehicleStatus = async (v: RentalVehicleRow, status: string) => {
    setBusyId(v.id);
    try {
      const res = await fetch(`/api/admin/rentals/vehicles/${v.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d?.error ?? "Failed to update status.");
      }
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-full p-4 md:p-6 flex flex-col gap-4" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-[18px] font-extrabold text-gray-900">Vehicle Rentals</p>
        {/* Always visible — not just on the Fleet tab — so admins can add a
            car from wherever they land, including an empty Requests tab. */}
        <button onClick={() => setVehicleForm("new")}
          className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-bold"
          style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
          + Add Vehicle
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-full w-fit">
        {([
          { key: "requests", label: `Requests${requests.length ? ` (${requests.length})` : ""}` },
          { key: "active", label: `Active (${active.length})` },
          { key: "history", label: "History" },
          { key: "fleet", label: `Fleet (${vehicles.length})` },
        ] as { key: typeof tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-1.5 text-[12px] font-semibold rounded-full transition-all"
            style={tab === t.key ? { background: "linear-gradient(90deg,#131936,#C6BFB2)", color: "white" } : { color: "#6b7280" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-[13px] text-gray-400 py-16">Loading…</p>
      ) : tab === "requests" ? (
        requests.length === 0 ? (
          vehicles.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2">
              <p className="text-[13px] text-gray-400">No rental vehicles yet — add one to get started.</p>
              <button onClick={() => setTab("fleet")}
                className="no-hover-fx text-[12px] font-semibold" style={{ color: "#131936" }}>
                Go to Fleet →
              </button>
            </div>
          ) : (
            <p className="text-center text-[13px] text-gray-400 py-16">No pending rental requests.</p>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div>
                  <p className="text-[14px] font-bold text-gray-900">{r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : "Unknown chauffeur"}</p>
                  <p className="text-[11px] text-gray-400">{r.driver?.email} {r.driver?.phone ? `· ${r.driver.phone}` : ""}</p>
                  <p className="text-[12px] text-gray-700 mt-1">{r.vehicle.year} {r.vehicle.make} {r.vehicle.model} · {TIER_LABELS[r.vehicle.tier] ?? r.vehicle.tier}</p>
                  <p className="text-[12px] font-semibold mt-0.5" style={{ color: "#131936" }}>{PLAN_LABELS[r.plan]} — ${r.amount.toFixed(2)} paid</p>
                  {(r.startDate || r.endDate) && (
                    <p className="text-[11px] text-gray-400 mt-0.5">Requested: {fmtDateTime(r.startDate)} → {fmtDateTime(r.endDate)}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setDeclineTarget(r)} disabled={busyId === r.id}
                    className="no-hover-fx px-4 py-2 rounded-xl text-[12px] font-semibold border border-red-200 text-red-600 disabled:opacity-50">
                    Decline
                  </button>
                  <button onClick={() => approve(r)} disabled={busyId === r.id}
                    className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-50"
                    style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
                    {busyId === r.id ? "…" : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === "active" ? (
        active.length === 0 ? (
          <p className="text-center text-[13px] text-gray-400 py-16">No active rentals.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between"
                style={{ borderColor: r.returnRequestedAt ? "#c7d2fe" : "#f3f4f6" }}>
                <div>
                  <p className="text-[14px] font-bold text-gray-900">{r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : "Unknown chauffeur"}</p>
                  <p className="text-[12px] text-gray-700 mt-1">{r.vehicle.year} {r.vehicle.make} {r.vehicle.model} · {r.vehicle.plate}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{PLAN_LABELS[r.plan]} · {fmtDateTime(r.startDate)} → {fmtDateTime(r.endDate)}</p>
                  {r.returnRequestedAt && (
                    <p className="text-[11px] font-semibold mt-1" style={{ color: "#4338ca" }}>
                      ↩ Chauffeur requested return · {timeAgo(r.returnRequestedAt)}
                    </p>
                  )}
                </div>
                <button onClick={() => setReturnTarget(r)} disabled={busyId === r.id}
                  className="no-hover-fx px-4 py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-50 shrink-0"
                  style={{ background: r.returnRequestedAt ? "linear-gradient(90deg,#4338ca,#6366f1)" : "linear-gradient(90deg,#131936,#C6BFB2)" }}>
                  Return Vehicle
                </button>
              </div>
            ))}
          </div>
        )
      ) : tab === "history" ? (
        history.length === 0 ? (
          <p className="text-center text-[13px] text-gray-400 py-16">No completed or declined rentals yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((r) => {
              const sc = RENTAL_STATUS_CFG[r.status];
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : "Unknown chauffeur"}</p>
                    <p className="text-[11px] text-gray-400">{r.vehicle.year} {r.vehicle.make} {r.vehicle.model} · {PLAN_LABELS[r.plan]} · {fmtDate(r.createdAt)}</p>
                    {r.returnCharge != null && r.returnCharge > 0 && (
                      <p className="text-[11px] text-amber-600">Return charge: ${r.returnCharge.toFixed(2)}</p>
                    )}
                    {r.adminNote && <p className="text-[11px] text-gray-400 italic">&quot;{r.adminNote}&quot;</p>}
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: sc.bg, color: sc.color }}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Fleet */
        vehicles.length === 0 ? (
          <p className="text-center text-[13px] text-gray-400 py-16">No rental vehicles yet — add your first one.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => {
              const sc = VEHICLE_STATUS_CFG[v.status];
              return (
                <div key={v.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {v.photoCount > 0 && (
                    <div className="w-full h-36 bg-gray-100 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/rentals/vehicles/${v.id}/photo?i=0`} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[14px] font-bold text-gray-900">{v.year} {v.make} {v.model}</p>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-2">{v.plate} · {v.color ?? "—"} · {TIER_LABELS[v.tier] ?? v.tier}</p>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2" style={{ background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    {v.openRental?.driver && (
                      <p className="text-[11px] text-gray-500 mb-2">
                        {v.status === "RENTED" ? "Rented by" : "Requested by"} {v.openRental.driver.firstName} {v.openRental.driver.lastName}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-gray-600 mb-3">
                      <span>${v.dailyRate.toFixed(0)}/day</span><span className="text-gray-300">·</span>
                      <span>${v.weeklyRate.toFixed(0)}/wk</span><span className="text-gray-300">·</span>
                      <span>${v.monthlyRate.toFixed(0)}/mo</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <select value={v.status} onChange={(e) => setVehicleStatus(v, e.target.value)}
                        disabled={busyId === v.id}
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] bg-white focus:outline-none">
                        <option value="AVAILABLE">Available</option>
                        <option value="RENTED">Rented</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="OUT_OF_SERVICE">Out of Service</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setVehicleForm(v)}
                        className="no-hover-fx flex-1 py-2 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-700">
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(v)}
                        className="no-hover-fx flex-1 py-2 rounded-lg border border-red-200 text-[11px] font-semibold text-red-600">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {vehicleForm && (
        <VehicleForm
          vehicle={vehicleForm === "new" ? null : vehicleForm}
          onClose={() => setVehicleForm(null)}
          onSaved={() => { setVehicleForm(null); load(); }}
        />
      )}
      {declineTarget && (
        <DeclineModal onClose={() => setDeclineTarget(null)} onConfirm={decline} />
      )}
      {returnTarget && (
        <ReturnModal onClose={() => setReturnTarget(null)} onConfirm={returnVehicle} />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <p className="text-[15px] font-bold text-gray-900 mb-1">Remove this vehicle?</p>
            <p className="text-[12px] text-gray-500 mb-4">{deleteTarget.year} {deleteTarget.make} {deleteTarget.model} will be removed from the rental fleet. This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="no-hover-fx flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600">Cancel</button>
              <button onClick={deleteVehicle} disabled={busyId === deleteTarget.id}
                className="no-hover-fx flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold bg-red-500 disabled:opacity-50">
                {busyId === deleteTarget.id ? "…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
