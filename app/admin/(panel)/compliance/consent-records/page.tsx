"use client";
import { useEffect, useState, useCallback } from "react";

type Record_ = {
  id: string;
  documentType: string;
  version: string;
  acceptedAt: string;
  ipAddress: string | null;
  user: { firstName: string; lastName: string; email: string | null } | null;
  driver: { firstName: string; lastName: string; email: string } | null;
};

const DOC_LABELS: Record<string, string> = {
  PRIVACY_POLICY: "Privacy Policy",
  TERMS: "Terms & Conditions",
  CHAUFFEUR_AGREEMENT: "Chauffeur Agreement",
};

export default function ConsentRecordsPage() {
  const [records, setRecords] = useState<Record_[]>([]);
  const [loading, setLoading] = useState(true);
  const [docFilter, setDocFilter] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (docFilter) p.set("documentType", docFilter);
    if (q) p.set("q", q);
    fetch(`/api/admin/consent-records?${p.toString()}`)
      .then(r => r.json())
      .then(d => setRecords(Array.isArray(d) ? d : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [docFilter, q]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6" style={{ fontFamily: "var(--font-body)" }}>
      <h1 className="text-[20px] font-bold text-gray-900 mb-1">Consent &amp; Acceptance Records</h1>
      <p className="text-[12px] text-gray-400 mb-5">Who accepted which policy, when, and from what IP address.</p>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {["", "PRIVACY_POLICY", "TERMS", "CHAUFFEUR_AGREEMENT"].map(d => (
          <button key={d} onClick={() => setDocFilter(d)}
            className="px-4 py-1.5 rounded-full text-[12px] font-semibold border"
            style={docFilter === d ? { background: "#1e2d45", color: "white", borderColor: "#1e2d45" } : { background: "white", color: "#374151", borderColor: "#e5e7eb" }}>
            {d === "" ? "All Documents" : DOC_LABELS[d]}
          </button>
        ))}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email…"
          className="ml-auto px-3 py-1.5 rounded-full border border-gray-200 text-[12px] focus:outline-none focus:border-[#131936]" />
      </div>

      {loading ? (
        <div className="py-16 text-center text-[13px] text-gray-400">Loading…</div>
      ) : records.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-gray-400">No consent records found</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-[11px] uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Person</th>
                <th className="text-left px-4 py-3 font-semibold">Document</th>
                <th className="text-left px-4 py-3 font-semibold">Version</th>
                <th className="text-left px-4 py-3 font-semibold">Accepted</th>
                <th className="text-left px-4 py-3 font-semibold">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    {r.user ? `${r.user.firstName} ${r.user.lastName}` : r.driver ? `${r.driver.firstName} ${r.driver.lastName} (chauffeur)` : "—"}
                    <p className="text-[11px] text-gray-400">{r.user?.email ?? r.driver?.email ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">{DOC_LABELS[r.documentType] ?? r.documentType}</td>
                  <td className="px-4 py-3 text-gray-500">{r.version}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(r.acceptedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{r.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
