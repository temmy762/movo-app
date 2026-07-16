import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/admin/units/[id]/photo
 * Streams a vehicle's photo. Photos are stored as base64 data URIs in the DB —
 * serving them per-image (with caching) keeps the units LIST endpoint fast
 * instead of inlining multi-MB strings for every row.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: { photoUrl: true },
  });

  if (!vehicle?.photoUrl) {
    return NextResponse.json({ error: "No photo" }, { status: 404 });
  }

  const dataUrlMatch = vehicle.photoUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const buffer = Buffer.from(dataUrlMatch[2], "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":   dataUrlMatch[1],
        "Content-Length": buffer.length.toString(),
        "Cache-Control":  "private, max-age=3600",
      },
    });
  }

  /* Plain URL — redirect to it */
  return NextResponse.redirect(vehicle.photoUrl);
}
