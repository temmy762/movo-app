import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [earned, preBooked] = await Promise.all([
    prisma.booking.aggregate({
      where: { driverId: session.driverId, status: "COMPLETED", paymentStatus: "PAID" },
      _sum: { fare: true },
    }),
    prisma.booking.count({
      where: {
        driverId: session.driverId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
  ]);

  return NextResponse.json({
    totalEarned: earned._sum.fare ?? 0,
    preBooked,
  });
}
