import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const SETTLEMENT_HOURS = 48;
  const settlementCutoff = new Date(Date.now() - SETTLEMENT_HOURS * 60 * 60 * 1000);

  const walletTxs = await prisma.walletTransaction.findMany({
    where: { driverId: session.driverId },
    orderBy: { createdAt: "desc" },
  });

  /* Earnings settled (>= 48 h old) vs pending (< 48 h) */
  const settledEarnings = walletTxs
    .filter((t) => t.type === "EARNING" && t.status === "COMPLETED" && t.createdAt <= settlementCutoff)
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingEarnings = walletTxs
    .filter((t) => t.type === "EARNING" && t.status === "COMPLETED" && t.createdAt > settlementCutoff)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTopups = walletTxs
    .filter((t) => t.type === "TOPUP" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayouts = walletTxs
    .filter((t) => t.type === "PAYOUT" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingPayouts = walletTxs
    .filter((t) => t.type === "PAYOUT" && t.status === "PENDING")
    .reduce((sum, t) => sum + t.amount, 0);

  /* Available = only settled earnings + topups - completed payouts */
  const availableBalance = parseFloat((settledEarnings + totalTopups - totalPayouts).toFixed(2));
  const totalEarned      = parseFloat((settledEarnings + pendingEarnings).toFixed(2));

  const walletEntries = walletTxs.map((t) => {
    const isPendingEarning = t.type === "EARNING" && t.createdAt > settlementCutoff;
    return {
      id: t.id,
      label: t.note ?? (t.type === "PAYOUT" ? "Send to bank" : t.type === "EARNING" ? "Trip earning" : "Add money"),
      date: t.createdAt.toISOString(),
      amount: t.amount,
      type: t.type === "PAYOUT" ? ("out" as const) : ("in" as const),
      status: isPendingEarning ? "PENDING_SETTLEMENT" : t.status,
      settlesAt: isPendingEarning
        ? new Date(t.createdAt.getTime() + SETTLEMENT_HOURS * 60 * 60 * 1000).toISOString()
        : null,
    };
  });

  const transactions = walletEntries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return NextResponse.json({
    availableBalance,
    totalEarned,
    pendingEarnings: parseFloat(pendingEarnings.toFixed(2)),
    pendingPayouts,
    settlementHours: SETTLEMENT_HOURS,
    transactions,
  });
}
