import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* Total earned = the chauffeur's actual credited payouts (EARNING wallet
     transactions, already net of commission + fleet split), NOT the raw
     customer fare — matches the wallet and what they're actually paid. */
  const [earnings, preBooked] = await Promise.all([
    prisma.walletTransaction.aggregate({
      where: { driverId: session.driverId, type: "EARNING", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: {
        driverId: session.driverId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
  ]);

  return NextResponse.json({
    totalEarned: parseFloat((earnings._sum.amount ?? 0).toFixed(2)),
    preBooked,
  });
}
