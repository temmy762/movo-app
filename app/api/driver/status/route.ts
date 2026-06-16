import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isOnline } = await req.json();

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
