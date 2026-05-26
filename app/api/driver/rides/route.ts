import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tab = new URL(req.url).searchParams.get("tab") ?? "past";

  const statusFilter =
    tab === "upcoming"
      ? { in: ["PENDING", "CONFIRMED"] as const }
      : { equals: "COMPLETED" as const };

  const rides = await prisma.booking.findMany({
    where: {
      driverId: session.driverId,
      status: statusFilter,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientName: true,
      pickup: true,
      dropoff: true,
      carName: true,
      fare: true,
      total: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
    },
  });

  return NextResponse.json(rides);
}
