import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lng = typeof body.lng === "number" ? body.lng : null;
  const isOnline = typeof body.isOnline === "boolean" ? body.isOnline : true;

  if (lat === null || lng === null) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  await prisma.driver.update({
    where: { id: session.driverId },
    data: { lat, lng, isOnline },
  });

  return NextResponse.json({ ok: true });
}
