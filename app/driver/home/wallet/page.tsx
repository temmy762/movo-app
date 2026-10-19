"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Transaction = {
  id: string;
  kind: "EARNING" | "PAYOUT" | "TOPUP";
  reference: string | null;
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

const money = (n: number | undefined) => `$${(Number.isFinite(n) ? (n as number) : 0).toFixed(2)}`;

/* "Today, 3:50 PM" / "Oct 14, 3:50 PM" — Winnipeg time */
function formatDateTime(iso: string) {
  const tz = "America/Winnipeg";
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: tz });
  const time = d.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const date = day(d) === day(new Date())
    ? "Today"
    : d.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" });
  return `${date}, ${time}`;
}

function txTitle(tx: Transaction) {
  if (tx.kind === "EARNING") return "Trip earnings";
  if (tx.kind === "PAYOUT") return "Withdrawal to bank";
  return "Top-up";
}

/* Status pill: what the chauffeur needs to know about this money */
function txStatus(tx: Transaction): { label: string; bg: string; color: string } {
  if (tx.status === "PENDING_SETTLEMENT") return { label: "Pending", bg: "#e0ecff", color: "#1d4ed8" };
  if (tx.status === "PENDING")            return { label: "Processing", bg: "#fef3c7", color: "#b45309" };
  if (tx.status === "FAILED")             return { label: "Failed", bg: "#fee2e2", color: "#dc2626" };
  return tx.kind === "PAYOUT"
    ? { label: "Paid out", bg: "#f1f5f9", color: "#475569" }
    : { label: "Available", bg: "#dcfce7", color: "#15803d" };
}

function TransactionCard({ tx }: { tx: Transaction }) {
  const isIn = tx.type === "in";
  const pill = txStatus(tx);
  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        style={{ background: isIn ? "#e8f8ee" : "#fdecef" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={isIn ? "#16a34a" : "#e11d48"} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          {isIn
            ? <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>
            : <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-bold text-gray-900 leading-tight">{txTitle(tx)}</p>
        {tx.reference && <p className="text-[13px] text-gray-500 mt-0.5">{tx.reference}</p>}
        <p className="text-[13px] text-gray-400 mt-0.5">{formatDateTime(tx.date)}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p className="text-[17px] font-bold" style={{ color: isIn ? "#16a34a" : "#e11d48" }}>
          {isIn ? "+" : "−"}{money(tx.amount)}
        </p>
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: pill.bg, color: pill.color }}>
          {pill.label}
        </span>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchWallet = () => {
    setLoading(true);
    fetch("/api/driver/wallet", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) { router.push("/driver/onboarding/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setWallet(d); })
      .catch(() => setWallet(null))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchWallet(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const available = wallet?.availableBalance ?? 0;
  const canWithdraw = !loading && available > 0;

  const handleWithdraw = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    if (num > available) { showToast(`Insufficient balance. Available: ${money(available)}`); return; }
    setSubmitting(true);
    const res = await fetch("/api/driver/wallet/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: num }),
    }).catch(() => null);
    setSubmitting(false);
    if (res?.status === 401) { router.push("/driver/onboarding/login"); return; }
    const body = await res?.json().catch(() => ({}));
    if (res?.ok) {
      setWithdrawing(false);
      setAmount("");
      showToast(body?.automated ? "Sent to your bank account." : "Withdrawal requested — Movo will process it shortly.");
      fetchWallet();
    } else {
      showToast(body?.error ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-full bg-[#f6f7fb] flex flex-col" style={{ fontFamily: "var(--font-body)" }}>

      {/* Header */}
      <header className="flex items-center gap-4 px-5 pt-6 pb-4 bg-white border-b border-gray-100">
        <button type="button" className="no-hover-fx w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          onClick={() => router.back()} aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-[24px] font-bold text-gray-900">Wallet</h1>
      </header>

      <div className="px-4 pt-4 pb-28 w-full max-w-lg mx-auto md:max-w-2xl">

        {/* Balance card */}
        <div className="rounded-3xl px-6 py-6 mb-4 text-white"
          style={{ background: "linear-gradient(120deg, #131936 0%, #1a2048 55%, #6b6f85 85%, #C6BFB2 110%)" }}>
          <p className="text-[15px] text-white/80">Available Balance</p>
          {loading
            ? <div className="h-12 w-40 bg-white/15 rounded-lg animate-pulse mt-2" />
            : <p className="text-[44px] font-bold leading-tight mt-1">{money(available)}</p>}
          <div className="flex items-stretch mt-4">
            <div className="flex-1">
              <p className="text-[13px] text-white/75">Total Earned</p>
              <p className="text-[22px] font-bold mt-0.5">{loading ? "—" : money(wallet?.totalEarned)}</p>
            </div>
            <div className="w-px bg-white/30 mx-5" />
            <div className="flex-1">
              <p className="text-[13px] text-white/75">Pending Earnings</p>
              <p className="text-[22px] font-bold mt-0.5">{loading ? "—" : money(wallet?.pendingEarnings)}</p>
            </div>
          </div>
        </div>

        {/* Withdraw */}
        <button type="button" disabled={!canWithdraw}
          onClick={() => { setWithdrawing(true); setAmount(available > 0 ? available.toFixed(2) : ""); }}
          className="no-hover-fx w-full py-4 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-3 transition-colors"
          style={canWithdraw
            ? { background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)", color: "white" }
            : { background: "#e5e7eb", color: "#4b5563" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2 2 7v2h20V7L12 2zM4 11v7h3v-7H4zm6.5 0v7h3v-7h-3zM17 11v7h3v-7h-3zM2 20v2h20v-2H2z" />
          </svg>
          Withdraw to Bank
        </button>
        <p className="text-[13px] text-gray-500 mt-2.5 mb-7">
          Funds become available after processing{wallet?.settlementHours ? ` (${wallet.settlementHours} hours after each trip)` : ""}.
        </p>

        {/* Transactions */}
        <p className="text-[18px] font-bold text-gray-900 mb-3">Recent Transactions</p>

        {loading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-4 shadow-sm flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
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
            <p className="text-[14px] font-semibold text-gray-700">No transactions yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Your trip earnings will appear here.</p>
          </div>
        )}

        {!loading && (wallet?.transactions?.length ?? 0) > 0 && (
          <div className="flex flex-col gap-3">
            {wallet!.transactions.map((tx) => <TransactionCard key={tx.id} tx={tx} />)}
          </div>
        )}
      </div>

      {/* Withdraw sheet */}
      {withdrawing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setWithdrawing(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <p className="text-[17px] font-bold text-gray-900 mb-1">Withdraw to Bank</p>
            <p className="text-[12px] text-gray-400 mb-4">Available: {money(available)}</p>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input type="number" min="1" step="0.01" placeholder="0.00" inputMode="decimal"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-4 py-3 rounded-xl border border-gray-200 text-[15px] font-semibold focus:outline-none focus:border-[#131936]" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setWithdrawing(false)}
                className="no-hover-fx flex-1 py-3 rounded-xl font-semibold text-[14px] border border-gray-300 text-gray-700">
                Cancel
              </button>
              <button type="button" onClick={handleWithdraw} disabled={submitting || !amount}
                className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[14px]"
                style={{ background: submitting || !amount ? "#9ca3af" : "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
                {submitting ? "…" : "Withdraw"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-lg max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
