"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Banking = {
  bankAccountName: string | null;
  bankInstitution: string | null;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
};

type StripeStatus = { connected: boolean; status: string | null; chargesEnabled?: boolean; payoutsEnabled?: boolean } | null;

function BankingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [banking, setBanking] = useState<Banking | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>(null);
  const [connecting, setConnecting] = useState(false);

  const [form, setForm] = useState({
    bankAccountName: "",
    bankInstitution: "",
    bankAccountNumber: "",
    bankRoutingNumber: "",
  });

  useEffect(() => {
    const connectParam = searchParams.get("connect");
    if (connectParam === "success") showToast("Bank account connected successfully!", true);
    if (connectParam === "refresh")  showToast("Please complete your bank onboarding.", false);

    Promise.all([
      fetch("/api/driver/profile/banking").then((r) => r.json()),
      fetch("/api/driver/stripe-connect").then((r) => r.json()),
    ]).then(([bankData, stripeData]) => {
      if (bankData.banking) setBanking(bankData.banking);
      setStripeStatus(stripeData);
    }).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res  = await fetch("/api/driver/stripe-connect", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showToast(data.error ?? "Could not start bank onboarding.", false);
    } catch {
      showToast("Connection failed. Please try again.", false);
    }
    setConnecting(false);
  };

  const startEdit = () => {
    setForm({
      bankAccountName: "",
      bankInstitution: banking?.bankInstitution ?? "",
      bankAccountNumber: "",
      bankRoutingNumber: "",
    });
    setEditing(true);
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, string> = {};
    if (form.bankAccountName.trim())   payload.bankAccountName   = form.bankAccountName.trim();
    if (form.bankInstitution.trim())   payload.bankInstitution   = form.bankInstitution.trim();
    if (form.bankAccountNumber.trim()) payload.bankAccountNumber = form.bankAccountNumber.trim();
    if (form.bankRoutingNumber.trim()) payload.bankRoutingNumber = form.bankRoutingNumber.trim();

    const res = await fetch("/api/driver/profile/banking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      showToast("Banking details updated!", true);
      setEditing(false);
      /* Re-fetch masked view */
      const fresh = await fetch("/api/driver/profile/banking").then((r) => r.json()).catch(() => ({}));
      if (fresh.banking) setBanking(fresh.banking);
    } else {
      showToast("Failed to save. Please try again.", false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "var(--font-body)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 bg-white border-b border-gray-100">
        <button type="button" onClick={() => router.back()} className="no-hover-fx w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-[17px] font-bold text-gray-900">Banking Details</h1>
          <p className="text-[11px] text-gray-400">Payout account for your earnings</p>
        </div>
      </div>

      <div className="px-4 py-5 max-w-md mx-auto">

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[13px] text-gray-400">
            <span className="w-5 h-5 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin" />
            Loading…
          </div>
        ) : !editing ? (
          /* View Mode */
          <div className="space-y-4">

          {/* Stripe Connect card */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-[14px] font-bold text-gray-800 mb-3">Automatic Payouts</p>
            {stripeStatus?.connected && stripeStatus.status === "active" ? (
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">Connected to Stripe</p>
                  <p className="text-[11px] text-gray-400">Payouts are sent directly to your bank</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[12px] text-gray-400 mb-3">
                  Connect your bank account via Stripe to receive automatic payouts when you request a withdrawal.
                </p>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2"
                  style={{ background: connecting ? "#9ca3af" : "linear-gradient(90deg,#635bff,#0570de)" }}
                >
                  {connecting ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Redirecting…</>
                  ) : (
                    <>{stripeStatus?.connected ? "Resume Onboarding" : "Connect Bank via Stripe"}</>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[14px] font-bold text-gray-800">Linked Bank Account</p>
              <button type="button" onClick={startEdit}
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white"
                style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
                {banking ? "Update" : "Add Account"}
              </button>
            </div>

            {banking ? (
              <div className="space-y-4">
                {[
                  { label: "Account Name",    val: banking.bankAccountName },
                  { label: "Bank / Institution", val: banking.bankInstitution },
                  { label: "Account Number", val: banking.bankAccountNumber },
                  { label: "Routing Number", val: banking.bankRoutingNumber },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
                    <p className="text-[13px] font-semibold text-gray-800 font-mono">
                      {val ?? <span className="text-gray-300 font-sans font-normal">Not set</span>}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mx-auto mb-3">
                  <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <p className="text-[13px] text-gray-400">No banking details on file.</p>
                <p className="text-[11px] text-gray-300 mt-1">Add your bank account to receive payouts.</p>
              </div>
            )}

            {/* Security note */}
            <div className="mt-5 flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="shrink-0 mt-0.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <p className="text-[11px] text-gray-400">Account numbers are masked for security. To update, enter new values in the edit form.</p>
            </div>
          </div>

          </div>
        ) : (
          /* Edit Mode */
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[14px] font-bold text-gray-800">Update Banking Details</p>
              <button type="button" onClick={() => setEditing(false)}
                className="text-[12px] font-semibold text-gray-400">Cancel</button>
            </div>

            <div className="space-y-4">
              {([
                { key: "bankAccountName",   label: "Account Holder Name",   placeholder: "e.g. John Smith",            type: "text" },
                { key: "bankInstitution",   label: "Bank / Institution",     placeholder: "e.g. Barclays Bank",         type: "text" },
                { key: "bankAccountNumber", label: "Account Number",         placeholder: "Enter full account number",   type: "password" },
                { key: "bankRoutingNumber", label: "Sort Code / Routing No.", placeholder: "Enter sort code or routing", type: "password" },
              ] as const).map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="text-[12px] font-semibold text-gray-600 block mb-1">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#131936]"
                  />
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-400 mt-3 mb-5">Only fields you fill in will be updated. Leave blank to keep existing value.</p>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl text-white font-bold text-[14px]"
              style={{ background: saving ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}
            >
              {saving ? "Saving…" : "Save Banking Details"}
            </button>
          </div>
        )}
      </div>

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

export default function BankingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><span className="w-6 h-6 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin" /></div>}>
      <BankingInner />
    </Suspense>
  );
}
