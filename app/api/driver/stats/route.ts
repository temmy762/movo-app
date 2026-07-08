import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* Start of "today" in the platform's timezone (America/Toronto) for the
     dashboard's daily figures. */
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const driverId = session.driverId;

  /* Earnings = the chauffeur's actual credited payouts (EARNING wallet
     transactions, already net of commission + fleet split), NOT the raw
     customer fare — matches the wallet and what they're actually paid. */
  const [earnings, todayEarnings, preBooked, tripsCompleted, tripsToday] = await Promise.all([
    prisma.walletTransaction.aggregate({
      where: { driverId, type: "EARNING", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { driverId, type: "EARNING", status: "COMPLETED", createdAt: { gte: startOfToday } },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: { driverId, status: { in: ["PENDING", "CONFIRMED"] } },
    }),
    prisma.booking.count({
      where: { driverId, status: "COMPLETED" },
    }),
    prisma.booking.count({
      where: { driverId, status: "COMPLETED", completedAt: { gte: startOfToday } },
    }),
  ]);

  return NextResponse.json({
    totalEarned:   parseFloat((earnings._sum.amount ?? 0).toFixed(2)),
    todayEarned:   parseFloat((todayEarnings._sum.amount ?? 0).toFixed(2)),
    preBooked,
    tripsCompleted,
    tripsToday,
  });
}
