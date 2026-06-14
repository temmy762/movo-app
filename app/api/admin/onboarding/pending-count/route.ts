import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }

  const count = await prisma.driverOnboarding.count({
    where: { adminStatus: "PENDING" },
  });

  return NextResponse.json({ count });
}
