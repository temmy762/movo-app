"use client";

import { useRouter } from "next/navigation";

type Transaction = {
  id: number;
  label: string;
  date: string;
  amount: string;
  type: "in" | "out";
};

const transactions: Transaction[] = [
  { id: 1, label: "Send to bank", date: "Today, 10:30 AM", amount: "$24.00", type: "out" },
  { id: 2, label: "Send to wallet", date: "23 Jan 2025, 10:30 AM", amount: "$40.00", type: "out" },
  { id: 3, label: "Received for ride", date: "23 Jan 2025, 10:30 AM", amount: "$30.00", type: "in" },
  { id: 4, label: "Received for ride", date: "24 Dec 2025, 10:30 AM", amount: "$20.00", type: "in" },
  { id: 5, label: "Send to bank", date: "4 Dec 2025, 10:30 AM", amount: "$50.00", type: "out" },
  { id: 6, label: "Send to wallet", date: "1 Dec 2025, 10:30 AM", amount: "$25.00", type: "out" },
  { id: 7, label: "Added to wallet", date: "15 Nov 2025, 10:30 AM", amount: "$20.00", type: "in" },
];

function TransactionRow({ tx }: { tx: Transaction }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: tx.type === "in" ? "#f0fdf4" : "#fff1f2" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={tx.type === "in" ? "#16a34a" : "#e11d48"} strokeWidth="2.5">
            {tx.type === "in"
              ? <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>
              : <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>
            }
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-medium text-gray-800">{tx.label}</p>
          <p className="text-[11px] text-gray-400">{tx.date}</p>
        </div>
      </div>
      <span className="text-[13px] font-bold" style={{ color: tx.type === "in" ? "#16a34a" : "#e11d48" }}>
        {tx.type === "out" ? "-" : "+"}{tx.amount}
      </span>
    </div>
  );
}

export default function WalletPage() {
  const router = useRouter();

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>

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
        <div
          className="rounded-2xl px-6 py-5 mb-5 text-white"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2D0A53 55%, #8B7500 100%)" }}
        >
          <p className="text-[13px] opacity-75 mb-1">Total Amount</p>
          <p className="text-[32px] font-bold">$200.00</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            className="no-hover-fx flex-1 py-2.5 rounded-xl font-bold text-[14px] border-2"
            style={{ borderColor: "#2D0A53", background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Send To Bank
          </button>
          <button
            type="button"
            className="no-hover-fx flex-1 py-2.5 rounded-xl font-bold text-[14px] border-2"
            style={{ borderColor: "#8B7500", background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Add Money
          </button>
        </div>

        {/* Transactions */}
        <p className="text-[14px] font-bold text-gray-900 mb-2">Recent Transaction</p>
        <div className="bg-white rounded-2xl px-4 shadow-sm">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>

      </div>
    </div>
  );
}
