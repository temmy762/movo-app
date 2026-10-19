import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { walletTotals } from "@/lib/wallet";

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

  /* Same definition the payout request enforces (lib/wallet.ts): pending
     payout requests are reserved, not still withdrawable */
  const availableBalance = walletTotals(walletTxs).available;
  const totalEarned      = parseFloat((settledEarnings + pendingEarnings).toFixed(2));

  /* Booking reference (MOVO-B-…) for each earning — the note carries the
     booking id ("… booking <id> …") */
  const bookingIdOf = (note: string | null) => note?.match(/booking (c[a-z0-9]{20,})/i)?.[1] ?? null;
  const ids = [...new Set(walletTxs.map((t) => bookingIdOf(t.note)).filter((x): x is string => !!x))];
  const refs = new Map(
    (ids.length
      ? await prisma.booking.findMany({ where: { id: { in: ids } }, select: { id: true, bookingNumber: true } })
      : []
    ).map((b) => [b.id, b.bookingNumber]),
  );

  const walletEntries = walletTxs.map((t) => {
    const isPendingEarning = t.type === "EARNING" && t.createdAt > settlementCutoff;
    const bookingId = bookingIdOf(t.note);
    return {
      id: t.id,
      kind: t.type,
      reference: bookingId ? (refs.get(bookingId) ?? null) : null,
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
