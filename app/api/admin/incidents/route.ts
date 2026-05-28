import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status")   ?? undefined;
  const type     = searchParams.get("type")     ?? undefined;
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;

  const incidents = await prisma.incidentReport.findMany({
    where: {
      ...(status ? { reviewStatus: status as never } : {}),
      ...(type   ? { type:         type   as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip:  (page - 1) * pageSize,
    take:  pageSize,
    select: {
      id:             true,
      reportedByRole: true,
      type:           true,
      reviewStatus:   true,
      aiRiskLevel:    true,
      createdAt:      true,
      booking: { select: { id: true, clientName: true, pickup: true, dropoff: true } },
      user:    { select: { id: true, firstName: true, lastName: true } },
      driver:  { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const total = await prisma.incidentReport.count({
    where: {
      ...(status ? { reviewStatus: status as never } : {}),
      ...(type   ? { type:         type   as never } : {}),
    },
  });

  return NextResponse.json({ incidents, total, page, pageSize });
}
