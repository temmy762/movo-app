import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isActiveDriver, INACTIVE_DRIVER_ERROR } from "@/lib/driverAccess";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isOnline } = await req.json();
    if (isOnline && !(await isActiveDriver(session.driverId))) {
      return NextResponse.json({ error: INACTIVE_DRIVER_ERROR }, { status: 403 });
    }

    await prisma.driver.update({
      where: { id: session.driverId },
      data: { isOnline: Boolean(isOnline) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[driver/status]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
