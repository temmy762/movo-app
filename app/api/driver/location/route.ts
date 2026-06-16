import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lat, lng, heading } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    await prisma.driver.update({
      where: { id: session.driverId },
      data: { lat, lng, isOnline: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[driver/location]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
