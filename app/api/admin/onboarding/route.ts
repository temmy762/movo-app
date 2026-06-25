import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  // CRITICAL: Authorization check
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const type   = searchParams.get("type")   ?? undefined;

  const onboardings = await prisma.driverOnboarding.findMany({
    where: {
      ...(status ? { adminStatus: status as never } : {}),
      ...(type   ? { type:        type   as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, country: true, city: true, status: true } },
    },
  });

  return NextResponse.json(onboardings);
}
