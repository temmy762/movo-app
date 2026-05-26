import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [bookings, walletTxs] = await Promise.all([
    prisma.booking.findMany({
      where: { driverId: session.driverId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: { id: true, clientName: true, fare: true, paymentStatus: true, createdAt: true },
    }),
    prisma.walletTransaction.findMany({
      where: { driverId: session.driverId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalEarned = bookings
    .filter((b) => b.paymentStatus === "PAID")
    .reduce((sum, b) => sum + b.fare, 0);

  const totalTopups = walletTxs
    .filter((t) => t.type === "TOPUP" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayouts = walletTxs
    .filter((t) => t.type === "PAYOUT" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.amount, 0);

  const availableBalance = totalEarned + totalTopups - totalPayouts;

  const rideEntries = bookings.map((b) => ({
    id: b.id,
    label: `Ride — ${b.clientName}`,
    date: b.createdAt.toISOString(),
    amount: b.fare,
    type: "in" as const,
    status: b.paymentStatus === "PAID" ? "COMPLETED" : "PENDING",
  }));

  const walletEntries = walletTxs.map((t) => ({
    id: t.id,
    label: t.note ?? (t.type === "PAYOUT" ? "Send to bank" : "Add money"),
    date: t.createdAt.toISOString(),
    amount: t.amount,
    type: t.type === "PAYOUT" ? ("out" as const) : ("in" as const),
    status: t.status,
  }));

  const transactions = [...rideEntries, ...walletEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return NextResponse.json({ availableBalance, totalEarned, transactions });
}
