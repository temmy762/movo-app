"use client";

import { useEffect, useState } from "react";

type DocStatus = "PENDING" | "APPROVED" | "REJECTED";
type AdminStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

interface Document {
  id: string; type: string; fileName: string; status: DocStatus; uploadedAt: string;
}

interface Onboarding {
  id: string;
  type: "INDIVIDUAL" | "FLEET";
  currentStep: number;
  adminStatus: AdminStatus;
  adminNote: string | null;
  submittedAt: string | null;
  createdAt: string;
  reviewedAt: string | null;
  signature: string | null;
  gpsConsentAt: string | null;
  privacyPolicyAt: string | null;
  legalNoticeAt: string | null;
  termsAcceptedAt: string | null;
  contractSignedAt: string | null;
  vehicleMake: string | null; vehicleModel: string | null; vehicleYear: string | null;
  vehiclePlate: string | null; vehicleTier: string | null;
  dob: string | null; licenseNumber: string | null;
  bankAccountName: string | null; bankInstitution: string | null;
  documents: Document[];
  driver: {
    id: string; firstName: string; lastName: string;
    email: string; phone: string | null; country: string; city: string; status: string;
  };
}

const STATUS_STYLE: Record<AdminStatus, { bg: string; color: string; label: string }> = {
  PENDING:      { bg: "#fef9c3", color: "#854d0e", label: "Pending" },
  UNDER_REVIEW: { bg: "#dbeafe", color: "#1e40af", label: "Under Review" },
  APPROVED:     { bg: "#dcfce7", color: "#166534", label: "Approved" },
  REJECTED:     { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
};

const DOC_LABELS: Record<string, string> = {
  PROFILE_PHOTO: "Profile Photo", DRIVERS_LICENSE: "Driver's License",
  BACKGROUND_CHECK: "Background Check", DRIVERS_ABSTRACT: "Driver's Abstract",
  WORK_ELIGIBILITY: "Work Eligibility", VEHICLE_REGISTRATION: "Vehicle Registration",
  VEHICLE_INSURANCE: "Vehicle Insurance", VEHICLE_PHOTO: "Vehicle Photos",
  BANKING_INFO: "Banking Info", OTHER: "Other",
};

const ini = (n: string) => n.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
const COLS = ["#ef4444","#f97316","#22c55e","#06b6d4","#6366f1","#ec4899","#8b5cf6"];
const ac = (n: string) => COLS[n.charCodeAt(0) % COLS.length];
const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function AdminOnboardingPage() {
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Onboarding | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterType   !== "all") params.set("type",   filterType);
    fetch(`/api/admin/onboarding?${params}`)
      .then(r => r.json())
      .then(data => { setOnboardings(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus, filterType]);

  const handleAction = async (status: AdminStatus) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/onboarding/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminStatus: status, adminNote: note || null, activateDriver: status === "APPROVED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Admin action failed:", data.error || "Unknown error");
        alert(`Error: ${data.error || "Failed to update onboarding status"}`);
        setSaving(false);
        return;
      }
      if (data.success) {
        setSelected(prev => prev ? { ...prev, adminStatus: status, adminNote: note, reviewedAt: new Date().toISOString() } : null);
        setOnboardings(prev => prev.map(o => o.id === selected.id ? { ...o, adminStatus: status } : o));
      }
    } catch (err) {
      console.error("Admin action error:", err);
      alert("Network error: Failed to update onboarding status");
    } finally {
      setSaving(false);
    }
  };

  const consentItems = selected ? [
    { label: "GPS Tracking Consent",   ok: !!selected.gpsConsentAt,    date: selected.gpsConsentAt },
    { label: "Privacy Policy",          ok: !!selected.privacyPolicyAt,  date: selected.privacyPolicyAt },
    { label: "Legal Notice",            ok: !!selected.legalNoticeAt,    date: selected.legalNoticeAt },
    { label: "Terms & Conditions",      ok: !!selected.termsAcceptedAt,  date: selected.termsAcceptedAt },
    { label: "Contract Signed",         ok: !!selected.contractSignedAt, date: selected.contractSignedAt },
  ] : [];

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* ── Left panel ── */}
      <div className={`${selected ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[300px] lg:shrink-0 border-r border-gray-100 bg-white overflow-hidden`}>

        {/* Header + filters */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <p className="text-[15px] font-extrabold text-gray-900 mb-3">Chauffeur Onboarding</p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 focus:outline-none appearance-none bg-gray-50" suppressHydrationWarning>
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div className="flex-1 relative">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 focus:outline-none appearance-none bg-gray-50" suppressHydrationWarning>
                <option value="all">All Types</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="FLEET">Fleet</option>
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
          {loading ? (
            <p className="text-center text-[12px] text-gray-400 py-10">Loading…</p>
          ) : onboardings.length === 0 ? (
            <p className="text-center text-[12px] text-gray-400 py-10">No applications found.</p>
          ) : onboardings.map(o => {
            const ss = STATUS_STYLE[o.adminStatus];
            const name = `${o.driver.firstName} ${o.driver.lastName}`;
            const isSel = selected?.id === o.id;
            return (
              <button key={o.id} type="button" onClick={() => { setSelected(o); setNote(o.adminNote ?? ""); }}
                className="no-hover-fx w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{ background: "white", border: isSel ? "1.5px solid #2D0A53" : "1.5px solid transparent", boxShadow: isSel ? "0 1px 8px rgba(45,10,83,0.1)" : "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                  style={{ background: ac(name) }}>
                  {ini(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{name}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {o.type === "INDIVIDUAL" ? "Individual Chauffeur" : "Fleet Partner"} · Step {o.currentStep}/9
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
                  {o.submittedAt && <span className="text-[9px] text-gray-300">{fmt(o.submittedAt)}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          {/* Mobile back */}
          <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white shrink-0">
            <button type="button" onClick={() => setSelected(null)} className="no-hover-fx flex items-center gap-2 text-[12px] text-gray-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Applications
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">

              {/* Driver header card */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[16px] font-bold shrink-0"
                      style={{ background: ac(`${selected.driver.firstName} ${selected.driver.lastName}`) }}>
                      {ini(`${selected.driver.firstName} ${selected.driver.lastName}`)}
                    </div>
                    <div>
                      <p className="text-[15px] font-extrabold text-gray-900">
                        {selected.driver.firstName} {selected.driver.lastName}
                      </p>
                      <p className="text-[12px] text-gray-400">{selected.driver.email}</p>
                      <p className="text-[11px] text-gray-400">{selected.driver.city}, {selected.driver.country}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: STATUS_STYLE[selected.adminStatus].bg, color: STATUS_STYLE[selected.adminStatus].color }}>
                    {STATUS_STYLE[selected.adminStatus].label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                  {[
                    { label: "Type",     val: selected.type === "INDIVIDUAL" ? "Individual" : "Fleet Partner" },
                    { label: "Progress", val: `${selected.currentStep}/9 steps` },
                    { label: "Submitted", val: fmt(selected.submittedAt) },
                  ].map(r => (
                    <div key={r.label}>
                      <p className="text-[10px] text-gray-400">{r.label}</p>
                      <p className="text-[12px] font-semibold text-gray-800">{r.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vehicle info */}
              {(selected.vehicleMake || selected.vehiclePlate) && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100">
                  <p className="text-[12px] font-bold text-gray-700 mb-3">Vehicle Information</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      ["Make / Model", `${selected.vehicleMake ?? "—"} ${selected.vehicleModel ?? ""}`],
                      ["Year",         selected.vehicleYear ?? "—"],
                      ["Plate",        selected.vehiclePlate ?? "—"],
                      ["Class",        selected.vehicleTier ?? "—"],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p className="text-[10px] text-gray-400">{label}</p>
                        <p className="text-[12px] font-semibold text-gray-800">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-[12px] font-bold text-gray-700 mb-3">
                  Documents ({selected.documents.length} uploaded)
                </p>
                {selected.documents.length === 0 ? (
                  <p className="text-[12px] text-gray-400">No documents uploaded yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selected.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-gray-800 truncate">
                              {DOC_LABELS[doc.type] ?? doc.type}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">{doc.fileName}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2"
                          style={{
                            background: doc.status === "APPROVED" ? "#dcfce7" : doc.status === "REJECTED" ? "#fee2e2" : "#f3f4f6",
                            color:      doc.status === "APPROVED" ? "#166534" : doc.status === "REJECTED" ? "#991b1b" : "#6b7280",
                          }}>
                          {doc.status.charAt(0) + doc.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Consents */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-[12px] font-bold text-gray-700 mb-3">Agreements & Consents</p>
                <div className="flex flex-col gap-2">
                  {consentItems.map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: item.ok ? "#22c55e" : "#e5e7eb" }}>
                          {item.ok && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <span className="text-[12px] text-gray-700">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{item.ok ? fmt(item.date) : "Not signed"}</span>
                    </div>
                  ))}
                  {selected.signature && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-1">Digital Signature</p>
                      <p className="text-[13px] text-gray-700" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                        {selected.signature}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin review */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-[12px] font-bold text-gray-700 mb-3">Admin Review</p>
                {selected.reviewedAt && (
                  <p className="text-[11px] text-gray-400 mb-3">Last reviewed: {fmt(selected.reviewedAt)}</p>
                )}
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a review note (optional)…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[12px] text-gray-700 focus:outline-none resize-none mb-3 bg-gray-50"
                  suppressHydrationWarning
                />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleAction("UNDER_REVIEW")} disabled={saving}
                    className="no-hover-fx py-2.5 rounded-xl text-[12px] font-bold border border-blue-200 text-blue-700 bg-blue-50 disabled:opacity-50">
                    Mark Under Review
                  </button>
                  <button type="button" onClick={() => handleAction("APPROVED")} disabled={saving}
                    className="no-hover-fx py-2.5 rounded-xl text-[12px] font-bold text-white disabled:opacity-50"
                    style={{ background: saving ? "#d1d5db" : "linear-gradient(90deg,#16a34a,#15803d)" }}>
                    {saving ? "Saving…" : "Approve & Activate"}
                  </button>
                  <button type="button" onClick={() => handleAction("REJECTED")} disabled={saving}
                    className="no-hover-fx py-2.5 rounded-xl text-[12px] font-bold border border-red-200 text-red-600 bg-red-50 disabled:opacity-50 col-span-2">
                    Reject Application
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden lg:flex items-center justify-center text-gray-300 text-[13px]">
          Select an application to review
        </div>
      )}
    </div>
  );
}
