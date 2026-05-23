import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.role === "USER" || session.role === "ADMIN") {
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ role: session.role, user });
  }

  if (session.role === "DRIVER") {
    if (!session.driverId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const driver = await prisma.driver.findUnique({
      where: { id: session.driverId },
      select: { id: true, firstName: true, lastName: true, email: true, status: true },
    });
    if (!driver) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ role: session.role, driver });
  }

  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}
