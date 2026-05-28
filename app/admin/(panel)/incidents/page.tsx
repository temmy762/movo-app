"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
type RiskLevel   = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ReviewStatus = "PENDING" | "AI_REVIEWED" | "MANUALLY_REVIEWED" | "RESOLVED" | "DISMISSED";
type IncidentType = "ACCIDENT" | "UNSAFE_DRIVING" | "HARASSMENT" | "VEHICLE_ISSUE" | "ROUTE_DEVIATION" | "OTHER";

interface IncidentSummary {
  id: string;
  reportedByRole: string;
  type: IncidentType;
  reviewStatus: ReviewStatus;
  aiRiskLevel: RiskLevel | null;
  createdAt: string;
  booking: { id: string; clientName: string; pickup: string; dropoff: string } | null;
  user:    { id: string; firstName: string; lastName: string } | null;
  driver:  { id: string; firstName: string; lastName: string } | null;
}

interface IncidentDetail extends IncidentSummary {
  description: string;
  aiSummary: string | null;
  aiClassification: string | null;
  aiSuggestedAction: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  locationCount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const RISK_STYLE: Record<RiskLevel, { bg: string; color: string }> = {
  LOW:      { bg: "#dcfce7", color: "#16a34a" },
  MEDIUM:   { bg: "#fef9c3", color: "#ca8a04" },
  HIGH:     { bg: "#fee2e2", color: "#dc2626" },
  CRITICAL: { bg: "#fce7f3", color: "#9d174d" },
};
const STATUS_STYLE: Record<ReviewStatus, { bg: string; color: string }> = {
  PENDING:           { bg: "#f3f4f6", color: "#6b7280" },
  AI_REVIEWED:       { bg: "#ede9fe", color: "#7c3aed" },
  MANUALLY_REVIEWED: { bg: "#dbeafe", color: "#1d4ed8" },
  RESOLVED:          { bg: "#dcfce7", color: "#16a34a" },
  DISMISSED:         { bg: "#f9fafb", color: "#9ca3af" },
};
const TYPE_LABELS: Record<IncidentType, string> = {
  ACCIDENT:        "Accident",
  UNSAFE_DRIVING:  "Unsafe Driving",
  HARASSMENT:      "Harassment",
  VEHICLE_ISSUE:   "Vehicle Issue",
  ROUTE_DEVIATION: "Route Deviation",
  OTHER:           "Other",
};
const STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING:           "Pending",
  AI_REVIEWED:       "AI Reviewed",
  MANUALLY_REVIEWED: "Manual Review",
  RESOLVED:          "Resolved",
  DISMISSED:         "Dismissed",
};

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}>
      {label}
    </span>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────────────
function IncidentDetailPanel({
  incident,
  onClose,
  onRefresh,
}: {
  incident: IncidentDetail;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [note,        setNote]        = useState(incident.reviewNote ?? "");
  const [status,      setStatus]      = useState<ReviewStatus>(incident.reviewStatus);
  const [saving,      setSaving]      = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiResult,    setAiResult]    = useState<{
    aiSummary: string | null;
    aiClassification: string | null;
    aiRiskLevel: RiskLevel | null;
    aiSuggestedAction: string | null;
  }>({
    aiSummary:         incident.aiSummary,
    aiClassification:  incident.aiClassification,
    aiRiskLevel:       incident.aiRiskLevel as RiskLevel | null,
    aiSuggestedAction: incident.aiSuggestedAction,
  });

  async function handleAiReview() {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/admin/incidents/${incident.id}/ai-review`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAiResult({
          aiSummary:         data.aiSummary,
          aiClassification:  data.aiClassification,
          aiRiskLevel:       data.aiRiskLevel,
          aiSuggestedAction: data.aiSuggestedAction,
        });
        setStatus("AI_REVIEWED");
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/admin/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: status, reviewNote: note }),
      });
      onRefresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const riskStyle = aiResult.aiRiskLevel ? RISK_STYLE[aiResult.aiRiskLevel] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <p className="text-[15px] font-bold text-gray-900">Incident #{incident.id.slice(0, 8)}</p>
            <Badge label={TYPE_LABELS[incident.type]} bg="#f3f4f6" color="#374151" />
            <Badge label={STATUS_LABELS[status]} {...STATUS_STYLE[status]} />
          </div>
          <button onClick={onClose} className="no-hover-fx w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[18px]">×</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">

          {/* Reporter + Booking */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Reported By</p>
              <p className="text-[13px] font-semibold text-gray-800">
                {incident.reportedByRole === "RIDER"
                  ? (incident.user ? `${incident.user.firstName} ${incident.user.lastName}` : "Rider")
                  : (incident.driver ? `${incident.driver.firstName} ${incident.driver.lastName}` : "Driver")}
              </p>
              <p className="text-[11px] text-gray-500">{incident.reportedByRole}</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {new Date(incident.createdAt).toLocaleString()}
              </p>
            </div>

            {incident.booking && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Linked Booking</p>
                <p className="text-[12px] font-semibold text-gray-800">{incident.booking.clientName}</p>
                <p className="text-[11px] text-gray-500 truncate">{incident.booking.pickup}</p>
                <p className="text-[11px] text-gray-500 truncate">→ {incident.booking.dropoff}</p>
                <p className="text-[10px] text-purple-600 mt-1">{incident.locationCount} GPS points recorded</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2">Incident Description</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[13px] text-gray-700 leading-relaxed">{incident.description}</p>
            </div>
          </div>

          {/* AI Review section */}
          <div className="border border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <p className="text-[13px] font-bold text-gray-800">AI Review</p>
                {aiResult.aiRiskLevel && riskStyle && (
                  <Badge label={aiResult.aiRiskLevel} {...riskStyle} />
                )}
              </div>
              <button
                onClick={handleAiReview}
                disabled={aiLoading}
                className="no-hover-fx px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white"
                style={{ background: aiLoading ? "#9ca3af" : "#7c3aed" }}
              >
                {aiLoading ? "Running…" : aiResult.aiSummary ? "Re-run AI" : "Run AI Review"}
              </button>
            </div>

            {aiResult.aiSummary ? (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Summary</p>
                  <p className="text-[12px] text-gray-700">{aiResult.aiSummary}</p>
                </div>
                {aiResult.aiClassification && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">AI Classification</p>
                    <p className="text-[12px] text-gray-700">{aiResult.aiClassification}</p>
                  </div>
                )}
                {aiResult.aiSuggestedAction && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Suggested Action</p>
                    <p className="text-[12px] text-purple-700 font-medium">{aiResult.aiSuggestedAction}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-gray-400">
                Click &quot;Run AI Review&quot; to analyse this incident using GPT-4o. The AI will summarise the report, assess risk level, and suggest next steps.
              </p>
            )}
          </div>

          {/* Manual review */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2">Manual Review</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {(["MANUALLY_REVIEWED", "RESOLVED", "DISMISSED"] as ReviewStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="no-hover-fx px-3 py-1.5 rounded-lg text-[11px] font-semibold border"
                  style={status === s
                    ? { ...STATUS_STYLE[s], borderColor: STATUS_STYLE[s].color }
                    : { background: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add an internal review note (visible to admins only)…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-300 resize-none"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="no-hover-fx w-full py-3 rounded-xl text-white font-bold text-[14px]"
            style={{ background: saving ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#2D0A53 50%,#8B7500 100%)" }}
          >
            {saving ? "Saving…" : "Save Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function IncidentsPage() {
  const [incidents,   setIncidents]   = useState<IncidentSummary[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [statusFilter,setStatusFilter]= useState("");
  const [typeFilter,  setTypeFilter]  = useState("");
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<IncidentDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (typeFilter)   qs.set("type",   typeFilter);
      qs.set("page", String(page));
      const res  = await fetch(`/api/admin/incidents?${qs}`);
      const data = await res.json();
      setIncidents(data.incidents ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(id: string) {
    const res  = await fetch(`/api/admin/incidents/${id}`);
    const data = await res.json();
    setSelected(data);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[20px] font-bold text-gray-900">Incident Reports</p>
          <p className="text-[12px] text-gray-500">{total} total reports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 focus:outline-none"
          suppressHydrationWarning
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="AI_REVIEWED">AI Reviewed</option>
          <option value="MANUALLY_REVIEWED">Manual Review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 focus:outline-none"
          suppressHydrationWarning
        >
          <option value="">All Types</option>
          <option value="ACCIDENT">Accident</option>
          <option value="UNSAFE_DRIVING">Unsafe Driving</option>
          <option value="HARASSMENT">Harassment</option>
          <option value="VEHICLE_ISSUE">Vehicle Issue</option>
          <option value="ROUTE_DEVIATION">Route Deviation</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
          <p className="text-[14px]">No incidents found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {["ID", "Type", "Reported By", "Booking", "Risk", "Status", "Date", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">#{inc.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{TYPE_LABELS[inc.type]}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {inc.reportedByRole === "RIDER"
                        ? (inc.user ? `${inc.user.firstName} ${inc.user.lastName}` : "Rider")
                        : (inc.driver ? `${inc.driver.firstName} ${inc.driver.lastName}` : "Driver")}
                      <span className="ml-1 text-[10px] text-gray-400">({inc.reportedByRole})</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {inc.booking ? inc.booking.clientName : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {inc.aiRiskLevel
                        ? <Badge label={inc.aiRiskLevel} {...RISK_STYLE[inc.aiRiskLevel]} />
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={STATUS_LABELS[inc.reviewStatus]} {...STATUS_STYLE[inc.reviewStatus]} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(inc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(inc.id)}
                        className="no-hover-fx px-3 py-1 rounded-lg text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="no-hover-fx px-3 py-1 rounded-lg text-[11px] font-medium border border-gray-200 disabled:opacity-40">
                  Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="no-hover-fx px-3 py-1 rounded-lg text-[11px] font-medium border border-gray-200 disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <IncidentDetailPanel
          incident={selected}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
