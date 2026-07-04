"use client";
import { useEffect, useState, useCallback } from "react";

type Log = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorType: string;
  actorId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

const ACTOR_COLOR: Record<string, string> = {
  ADMIN: "#7c3aed", USER: "#2563eb", DRIVER: "#16a34a", SYSTEM: "#6b7280",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/audit-log${actorFilter ? `?actorType=${actorFilter}` : ""}`)
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [actorFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6" style={{ fontFamily: "var(--font-body)" }}>
      <h1 className="text-[20px] font-bold text-gray-900 mb-1">Audit Log</h1>
      <p className="text-[12px] text-gray-400 mb-5">Booking updates, complaint actions, chauffeur approvals, and admin actions.</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {["", "ADMIN", "USER", "DRIVER", "SYSTEM"].map(a => (
          <button key={a} onClick={() => setActorFilter(a)}
            className="px-4 py-1.5 rounded-full text-[12px] font-semibold border"
            style={actorFilter === a ? { background: "#1e2d45", color: "white", borderColor: "#1e2d45" } : { background: "white", color: "#374151", borderColor: "#e5e7eb" }}>
            {a === "" ? "All" : a.charAt(0) + a.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[13px] text-gray-400">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-gray-400">No audit log entries yet</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {logs.map(l => (
            <div key={l.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-start gap-3">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 text-white" style={{ background: ACTOR_COLOR[l.actorType] ?? "#6b7280" }}>
                {l.actorType}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-gray-800 font-mono">{l.action}</p>
                {(l.entityType || l.entityId) && (
                  <p className="text-[11px] text-gray-400">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 12)}` : ""}</p>
                )}
                {l.detail && Object.keys(l.detail).length > 0 && (
                  <p className="text-[11px] text-gray-400 truncate">{JSON.stringify(l.detail)}</p>
                )}
              </div>
              <span className="text-[11px] text-gray-400 shrink-0">{new Date(l.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
