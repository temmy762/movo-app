import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** GET /api/admin/consent-records — date/time/IP accepted, per user or driver */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get("documentType");
    const q = searchParams.get("q")?.trim();

    const records = await prisma.consentRecord.findMany({
      where: {
        ...(documentType ? { documentType } : {}),
      },
      orderBy: { acceptedAt: "desc" },
      take: 500,
      include: {
        user:   { select: { firstName: true, lastName: true, email: true } },
        driver: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const filtered = q
      ? records.filter(r => {
          const name = r.user
            ? `${r.user.firstName} ${r.user.lastName} ${r.user.email ?? ""}`
            : r.driver
            ? `${r.driver.firstName} ${r.driver.lastName} ${r.driver.email}`
            : "";
          return name.toLowerCase().includes(q.toLowerCase());
        })
      : records;

    return NextResponse.json(filtered);
  } catch (e) {
    console.error("[admin/consent-records] GET error:", e);
    return NextResponse.json({ error: "Failed to fetch consent records" }, { status: 500 });
  }
}
