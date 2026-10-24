import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isActiveDriver } from "@/lib/driverAccess";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* Web sends one point; the mobile app's background task may send a
       batch `{ points: [{ lat, lng, timestamp }] }` — only the newest counts */
    const body = await req.json();
    const point = Array.isArray(body?.points)
      ? [...body.points].sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0)).pop()
      : body;
    const { lat, lng } = point ?? {};
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    await prisma.driver.update({
      where: { id: session.driverId },
      /* A ping only marks an ACTIVE chauffeur online */
      data: { lat, lng, isOnline: await isActiveDriver(session.driverId) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[driver/location]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
