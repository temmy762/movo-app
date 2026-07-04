import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifyAdmins } from "@/lib/notifications";

const VALID_CATEGORIES = ["CHAUFFEUR", "VEHICLE", "BILLING", "SAFETY", "LOST_PROPERTY", "GENERAL"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB per photo, matches other upload limits in the app

/**
 * POST /api/complaints — "Report an Issue" (customer, after a completed ride)
 * GET  /api/complaints — admin list, filterable by status/category
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId && !session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, category, description, photos } = body as {
      bookingId?: string; category: string; description: string; photos?: string[];
    };

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid complaint category" }, { status: 400 });
    }
    if (!description || description.trim().length < 5) {
      return NextResponse.json({ error: "Please describe the issue (at least 5 characters)" }, { status: 400 });
    }

    let driverId: string | null = null;
    if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true, driverId: true } });
      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      const isOwner = session.userId === booking.userId || session.driverId === booking.driverId;
      if (!isOwner && session.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      driverId = booking.driverId;
    }

    const validPhotos = Array.isArray(photos)
      ? photos.filter(p => typeof p === "string" && p.startsWith("data:") && p.length < MAX_PHOTO_SIZE * 1.4).slice(0, 5)
      : [];

    const complaint = await prisma.complaint.create({
      data: {
        category: category as never,
        description: description.trim(),
        photoUrls: validPhotos,
        bookingId: bookingId ?? null,
        userId: session.userId ?? null,
        driverId: session.driverId ?? driverId,
      },
    });

    notifyAdmins(
      "ADMIN_NEW_INCIDENT_REPORT",
      {
        title: "New complaint submitted",
        message: `Category: ${category}. ${description.trim().slice(0, 140)}`,
        complaintId: complaint.id,
      },
      ["EMAIL", "IN_APP"],
    ).catch(() => {});

    return NextResponse.json({ success: true, complaintId: complaint.id }, { status: 201 });
  } catch (e) {
    console.error("[complaints] POST error:", e);
    return NextResponse.json({ error: "Failed to submit complaint" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const complaints = await prisma.complaint.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(category ? { category: category as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        user:   { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        driver: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        booking:{ select: { id: true, pickup: true, dropoff: true, createdAt: true } },
      },
    });

    return NextResponse.json(complaints);
  } catch (e) {
    console.error("[complaints] GET error:", e);
    return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
  }
}
