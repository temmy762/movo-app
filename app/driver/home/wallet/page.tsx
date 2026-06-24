"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Transaction = {
  id: string;
  label: string;
  date: string;
  amount: number;
  type: "in" | "out";
  status: string;
  settlesAt: string | null;
};

type WalletData = {
  availableBalance: number;
  totalEarned: number;
  pendingEarnings: number;
  settlementHours: number;
  transactions: Transaction[];
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const date = isToday
    ? "Today"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${date}, ${time}`;
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isIn = tx.type === "in";
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: isIn ? "#f0fdf4" : "#fff1f2" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={isIn ? "#16a34a" : "#e11d48"} strokeWidth="2.5">
            {isIn
              ? <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>
              : <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>}
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-medium text-gray-800">{tx.label}</p>
          <p className="text-[11px] text-gray-400">{formatDateTime(tx.date)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-bold" style={{ color: isIn ? "#16a34a" : "#e11d48" }}>
          {isIn ? "+" : "-"}${tx.amount.toFixed(2)}
        </p>
        {tx.status === "PENDING_SETTLEMENT" && tx.settlesAt ? (
          <p className="text-[10px]" style={{ color: "#0284c7" }}>
            Settling {new Date(tx.settlesAt) > new Date()
              ? `in ~${Math.ceil((new Date(tx.settlesAt).getTime() - Date.now()) / 3600000)}h`
              : "soon"}
          </p>
        ) : (
          <p className="text-[10px]" style={{ color: tx.status === "COMPLETED" ? "#16a34a" : "#d97706" }}>
            {tx.status === "COMPLETED" ? "Completed" : "Pending"}
          </p>
        )}
      </div>
    </div>
  );
}

type ModalType = "payout" | "topup" | null;

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchWallet = () => {
    setLoading(true);
    fetch("/api/driver/wallet")
      .then((r) => {
        if (r.status === 401) { router.push("/driver/onboarding/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setWallet(d); })
      .catch(() => setWallet(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchWallet(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;

    if (modal === "payout") {
      const avail = wallet?.availableBalance ?? 0;
      if (num > avail) {
        showToast(`Insufficient balance. Available: $${avail.toFixed(2)}`);
        return;
      }
    }

    setSubmitting(true);
    const endpoint = modal === "payout" ? "/api/driver/wallet/payout" : "/api/driver/wallet/topup";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: num }),
    });

    setSubmitting(false);
    setModal(null);
    setAmount("");

    if (res.status === 401) {
      router.push("/driver/onboarding/login");
      return;
    }
    if (res.ok) {
      showToast(modal === "payout" ? "Payout request submitted!" : "Top-up request submitted!");
      fetchWallet();
    } else {
      const body = await res.json().catch(() => ({}));
      showToast(body?.error ?? "Something went wrong. Try again.");
    }
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-body)" }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
            <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-gray-900">Wallet</h1>
      </header>

      <div className="px-4 pt-5 pb-8 w-full max-w-lg mx-auto md:max-w-2xl">

        {/* Balance card */}
        <div className="rounded-2xl px-6 py-5 mb-5 text-white"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #131936 55%, #C6BFB2 100%)" }}>
          <p className="text-[13px] opacity-75 mb-1">Available Balance</p>
          {loading ? (
            <div className="h-9 w-32 bg-white/20 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-[32px] font-bold">${(wallet?.availableBalance ?? 0).toFixed(2)}</p>
          )}
          {!loading && (
            <div className="flex items-center gap-4 mt-2">
              <div>
                <p className="text-[10px] opacity-50">Total Earned</p>
                <p className="text-[13px] font-semibold opacity-90">${(wallet?.totalEarned ?? 0).toFixed(2)}</p>
              </div>
              {(wallet?.pendingEarnings ?? 0) > 0 && (
                <div className="border-l border-white/20 pl-4">
                  <p className="text-[10px] opacity-50">Pending Settlement</p>
                  <p className="text-[13px] font-semibold" style={{ color: "#93c5fd" }}>
                    ${(wallet.pendingEarnings).toFixed(2)}
                    <span className="text-[10px] opacity-60 ml-1">({wallet.settlementHours}h hold)</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button type="button" onClick={() => { setModal("payout"); setAmount(""); }}
            className="no-hover-fx flex-1 py-2.5 rounded-xl font-bold text-[14px] border-2"
            style={{ borderColor: "#131936", background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Send To Bank
          </button>
          <button type="button" onClick={() => { setModal("topup"); setAmount(""); }}
            className="no-hover-fx flex-1 py-2.5 rounded-xl font-bold text-[14px] border-2"
            style={{ borderColor: "#C6BFB2", background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Add Money
          </button>
        </div>

        {/* Transactions */}
        <p className="text-[14px] font-bold text-gray-900 mb-2">Recent Transactions</p>

        {loading && (
          <div className="bg-white rounded-2xl px-4 shadow-sm divide-y divide-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-32" />
                    <div className="h-2.5 bg-gray-200 rounded w-24" />
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-14" />
              </div>
            ))}
          </div>
        )}

        {!loading && !wallet?.transactions?.length && (
          <div className="bg-white rounded-2xl px-4 py-10 shadow-sm flex flex-col items-center text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-3">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <p className="text-[13px] font-semibold text-gray-700">No transactions yet</p>
            <p className="text-[11px] text-gray-400 mt-1">Completed rides will appear here.</p>
          </div>
        )}

        {!loading && (wallet?.transactions?.length ?? 0) > 0 && (
          <div className="bg-white rounded-2xl px-4 shadow-sm">
            {wallet!.transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
          </div>
        )}

      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <p className="text-[17px] font-bold text-gray-900 mb-1">
              {modal === "payout" ? "Send To Bank" : "Add Money"}
            </p>
            <p className="text-[12px] text-gray-400 mb-4">
              {modal === "payout"
                ? `Available: $${(wallet?.availableBalance ?? 0).toFixed(2)}`
                : "Enter the amount you want to add"}
            </p>

            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-4 py-3 rounded-xl border border-gray-200 text-[15px] font-semibold focus:outline-none focus:border-[#131936]"
              />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setModal(null)}
                className="no-hover-fx flex-1 py-3 rounded-xl font-semibold text-[14px] border border-gray-300 text-gray-700">
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting || !amount}
                className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[14px]"
                style={{ background: submitting || !amount ? "#9ca3af" : "linear-gradient(90deg,#131936,#C6BFB2)" }}>
                {submitting ? "…" : modal === "payout" ? "Send" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

    </div>
  );
}
