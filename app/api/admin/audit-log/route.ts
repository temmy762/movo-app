import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** GET /api/admin/audit-log — recent system/admin actions */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const actorType = searchParams.get("actorType");
    const entityType = searchParams.get("entityType");

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(actorType ? { actorType } : {}),
        ...(entityType ? { entityType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(logs);
  } catch (e) {
    console.error("[admin/audit-log] GET error:", e);
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
