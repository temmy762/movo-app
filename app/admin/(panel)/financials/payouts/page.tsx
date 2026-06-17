"use client";
import { useEffect, useState } from "react";

type Banking = {
  accountName: string | null;
  institution: string | null;
  accountNumber: string | null;
  routingNumber: string | null;
} | null;

type Payout = {
  id: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  amount: number;
  note: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
  banking: Banking;
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: "#fef3c7", color: "#d97706", label: "Pending" },
  COMPLETED: { bg: "#dcfce7", color: "#16a34a", label: "Approved" },
  FAILED:    { bg: "#fee2e2", color: "#dc2626", label: "Rejected" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"" | "PENDING" | "COMPLETED" | "FAILED">("");
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchPayouts = () => {
    setLoading(true);
    fetch(`/api/admin/financials/payouts${filter ? `?status=${filter}` : ""}`)
      .then((r) => r.json())
      .then((d) => setPayouts(Array.isArray(d) ? d : []))
      .catch(() => setPayouts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayouts(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActing(id + action);
    const res = await fetch("/api/admin/financials/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setActing(null);
    if (res.ok) {
      showToast(action === "approve" ? "Payout approved!" : "Payout rejected.", action === "approve");
      fetchPayouts();
    } else {
      const body = await res.json().catch(() => ({}));
      showToast(body?.error ?? "Action failed.", false);
    }
  };

  const filtered = payouts;
  const pending   = payouts.filter((p) => p.status === "PENDING").length;

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-bold text-gray-900">Payout Requests</h1>
            {pending > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white bg-red-500">
                {pending}
              </span>
            )}
          </div>
          <p className="text-[12px] text-gray-400 mt-0.5">
            {pending > 0 ? `${pending} pending approval` : "All caught up"}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["", "PENDING", "COMPLETED", "FAILED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className="px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
            style={
              filter === s
                ? { background: "#1e2d45", color: "white", borderColor: "#1e2d45" }
                : { background: "white", color: "#374151", borderColor: "#e5e7eb" }
            }
          >
            {s === "" ? "All" : STATUS_STYLE[s].label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-[13px] text-gray-400">
          <span className="w-5 h-5 border-2 border-gray-300 border-t-[#2D0A53] rounded-full animate-spin mr-2" />
          Loading…
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-3">
            <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" />
          </svg>
          <p className="text-[13px] font-semibold text-gray-500">No payout requests found</p>
        </div>
      )}

      {/* Desktop table */}
      {!loading && filtered.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-[11px] uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-semibold">Driver</th>
                <th className="text-left px-5 py-3 font-semibold">Amount</th>
                <th className="text-left px-5 py-3 font-semibold">Banking</th>
                <th className="text-left px-5 py-3 font-semibold">Date</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const st = STATUS_STYLE[p.status];
                const approving = acting === p.id + "approve";
                const rejecting = acting === p.id + "reject";
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900">{p.driverName}</p>
                      <p className="text-[11px] text-gray-400">{p.driverEmail}</p>
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-900">${p.amount.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      {p.banking ? (
                        <div className="text-[11px] text-gray-500 leading-relaxed">
                          <p>{p.banking.institution ?? "—"}</p>
                          <p className="font-mono">{p.banking.accountNumber ?? "No account"}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400">No banking info</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(p.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {p.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAction(p.id, "approve")}
                            disabled={!!acting}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white"
                            style={{ background: approving ? "#9ca3af" : "#16a34a" }}
                          >
                            {approving ? "…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(p.id, "reject")}
                            disabled={!!acting}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-600"
                            style={{ background: rejecting ? "#fee2e2" : "white" }}
                          >
                            {rejecting ? "…" : "Reject"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {!loading && filtered.length > 0 && (
        <div className="md:hidden flex flex-col gap-3">
          {filtered.map((p) => {
            const st = STATUS_STYLE[p.status];
            const approving = acting === p.id + "approve";
            const rejecting = acting === p.id + "reject";
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[13px] font-bold text-gray-900">{p.driverName}</p>
                    <p className="text-[11px] text-gray-400">{p.driverEmail}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>

                <p className="text-[20px] font-bold text-gray-900 mb-1">${p.amount.toFixed(2)}</p>
                <p className="text-[11px] text-gray-400 mb-3">{formatDate(p.createdAt)}</p>

                {p.banking && (
                  <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3 text-[11px] text-gray-500">
                    <p>{p.banking.institution ?? "Unknown bank"}</p>
                    <p className="font-mono">{p.banking.accountNumber ?? "No account on file"}</p>
                  </div>
                )}

                {p.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(p.id, "approve")}
                      disabled={!!acting}
                      className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white"
                      style={{ background: approving ? "#9ca3af" : "#16a34a" }}
                    >
                      {approving ? "…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(p.id, "reject")}
                      disabled={!!acting}
                      className="flex-1 py-2 rounded-xl text-[12px] font-bold border border-red-200 text-red-600"
                      style={{ background: rejecting ? "#fee2e2" : "white" }}
                    >
                      {rejecting ? "…" : "Reject"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-[13px] font-medium text-white"
          style={{ background: toast.ok ? "#16a34a" : "#dc2626" }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
