import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/rentals/vehicles/[id]/photo?i=N
 * Streams one rental-vehicle photo (stored as a base64 data URI) as binary.
 * Keeps every list endpoint fast — the lesson from the units/onboarding pages.
 * Accessible to chauffeurs (browsing) and admins (fleet management).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.driverId && session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const i = Math.max(0, parseInt(new URL(req.url).searchParams.get("i") ?? "0", 10) || 0);

  const vehicle = await prisma.rentalVehicle.findUnique({
    where: { id },
    select: { photos: true },
  });
  const photo = vehicle?.photos?.[i];
  if (!photo) return NextResponse.json({ error: "No photo" }, { status: 404 });

  const dataUrlMatch = photo.match(/^data:([^;]+);base64,(.+)$/);
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
  return NextResponse.redirect(photo);
}
