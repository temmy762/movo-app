/**
 * GET /api/admin/tracking/[bookingId]/photo
 *
 * Serves the vehicle photo for one booking as real image bytes.
 *
 * Vehicle photos are stored in Postgres as base64 data URIs — 12MB across 6
 * rows, the largest a single 5MB JPEG. Inlining that into the tracking roster
 * JSON made the request transfer megabytes (~12s for a 0.04ms query), and it
 * could not be cached because it was embedded in a dynamic payload.
 *
 * Decoding to binary here cuts ~33% of the base64 overhead and lets the browser
 * cache the image, so it is fetched at most once per vehicle rather than on
 * every roster load.
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { bookingId } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { driverId: true },
    });
    if (!booking?.driverId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { driverId: booking.driverId },
      select: { photoUrl: true, updatedAt: true },
    });
    if (!vehicle?.photoUrl) {
      return NextResponse.json({ error: "No photo" }, { status: 404 });
    }

    const raw = vehicle.photoUrl;

    /* Already a real URL (e.g. once photos move to object storage) → redirect. */
    if (/^https?:\/\//i.test(raw)) {
      return NextResponse.redirect(raw);
    }

    const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(raw);
    if (!match) {
      /* Unrecognised format — hand it back as-is rather than guessing. */
      return new NextResponse(raw, {
        headers: { "Content-Type": "text/plain", "Cache-Control": "private, max-age=300" },
      });
    }

    const [, mime, b64] = match;
    const bytes = Buffer.from(b64, "base64");

    /* Weak ETag off the row's updatedAt so a replaced photo busts the cache. */
    const etag = `W/"${bookingId}-${vehicle.updatedAt.getTime()}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=86400",
        ETag: etag,
      },
    });
  } catch (e) {
    console.error("[admin-tracking photo]", e);
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 });
  }
}
