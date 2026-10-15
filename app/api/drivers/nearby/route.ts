import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/* Online chauffeurs for the rider's pickup map. Logged-in riders only, and
   positions are rounded (~100 m): this was public and returned every active
   chauffeur's exact last GPS fix — offline ones included, i.e. often their
   home. Payload stays minimal (no names, plates or photos). */
const round3 = (n: number | null) => (n == null ? null : Math.round(n * 1000) / 1000);

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return NextResponse.json([], { status: 401 });

  const drivers = await prisma.driver.findMany({
    where: {
      status: "ACTIVE",
      isOnline: true,
      lat: { not: null },
      lng: { not: null },
      vehicle: { isNot: null },
    },
    select: { id: true, isOnline: true, lat: true, lng: true, vehicle: { select: { tier: true } } },
  });

  return NextResponse.json(
    drivers.map((d) => ({ ...d, lat: round3(d.lat), lng: round3(d.lng) })),
    { headers: { "Cache-Control": "private, max-age=20" } },
  );
}
