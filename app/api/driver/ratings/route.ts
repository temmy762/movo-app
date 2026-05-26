import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      driverId: session.driverId,
      rating: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientName: true,
      rating: true,
      review: true,
      createdAt: true,
    },
  });

  const ratings = bookings.filter((b) => b.rating !== null);
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((sum, b) => sum + (b.rating ?? 0), 0) / ratings.length
      : null;

  return NextResponse.json({
    avgRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
    totalReviews: ratings.length,
    reviews: ratings,
  });
}
