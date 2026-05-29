import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
      driver:    { select: { id: true, firstName: true, lastName: true, email: true, phone: true, country: true, city: true, status: true } },
      documents: { orderBy: { uploadedAt: "asc" } },
    },
  });

  return NextResponse.json(onboardings);
}
