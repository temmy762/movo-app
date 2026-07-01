/**
 * GET  /api/admin/care        — paginated list of all CARE bookings
 * PATCH /api/admin/care       — admin force-action on a booking
 *   body: { bookingId, action: "force_complete" | "cancel" | "replace_driver" | "create_assignment" }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pushToDriver } from "@/lib/webpush";
import { dispatchCareBookingClosed, dispatchCareAssignmentStatus, dispatchCarePrimaryDispatched, dispatchCareSupportDispatched } from "@/lib/socket/dispatcher";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit  = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const status = searchParams.get("status");

    const where = {
      bookingType: "CARE" as const,
      ...(status ? { status: status as never } : {}),
    };

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          careAssignments: {
            include: {
              driver: {
                select: {
                  id: true, firstName: true, lastName: true, phone: true, photoUrl: true,
                  vehicle: { select: { make: true, model: true, plate: true, tier: true } },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      bookings,
    });
  } catch (e) {
    console.error("[admin care GET]", e);
    return NextResponse.json({ error: "Failed to fetch Care bookings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      bookingId: string;
      action: "force_complete" | "cancel" | "replace_driver" | "create_assignment";
      assignmentId?: string;
      newDriverId?: string;
      role?: "PRIMARY" | "SUPPORT";
    };

    const { bookingId, action } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { careAssignments: true },
    });
    if (!booking || booking.bookingType !== "CARE") {
      return NextResponse.json({ error: "Care booking not found" }, { status: 404 });
    }

    if (action === "force_complete") {
      await prisma.$transaction([
        prisma.careAssignment.updateMany({
          where: { bookingId, status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"] } },
          data:  { status: "COMPLETED", completedAt: new Date() },
        }),
        prisma.booking.update({
          where: { id: bookingId },
          data:  { status: "COMPLETED", completedAt: new Date() },
        }),
      ]);
      dispatchCareBookingClosed({ bookingId, userId: booking.userId });
      return NextResponse.json({ ok: true });
    }

    if (action === "cancel") {
      await prisma.$transaction([
        prisma.careAssignment.updateMany({
          where: { bookingId, status: { in: ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"] } },
          data:  { status: "CANCELLED", cancelledAt: new Date() },
        }),
        prisma.booking.update({
          where: { id: bookingId },
          data:  { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: "admin" },
        }),
      ]);
      dispatchCareBookingClosed({ bookingId, userId: booking.userId });
      return NextResponse.json({ ok: true });
    }

    if (action === "replace_driver") {
      const { assignmentId, newDriverId } = body;
      if (!assignmentId || !newDriverId) {
        return NextResponse.json({ error: "assignmentId and newDriverId required" }, { status: 400 });
      }
      const assignment = await prisma.careAssignment.findUnique({ where: { id: assignmentId } });
      if (!assignment || assignment.bookingId !== bookingId) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }

      const oppositeRole = assignment.role === "PRIMARY" ? "SUPPORT" : "PRIMARY";
      const conflicting = booking.careAssignments.find(
        (a) => a.role === oppositeRole && a.driverId === newDriverId &&
          ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"].includes(a.status),
      );
      if (conflicting) {
        return NextResponse.json({ error: `This driver is already assigned as ${oppositeRole} on this booking` }, { status: 409 });
      }

      await prisma.careAssignment.update({
        where: { id: assignmentId },
        data:  { driverId: newDriverId, status: "PENDING", dispatchedAt: new Date(), acceptedAt: null },
      });

      /* Notify the new driver via push + socket */
      await pushToDriver(newDriverId, {
        title: assignment.role === "PRIMARY" ? "🌟 Movo Care Ride — Primary Chauffeur" : "🔄 Care Ride — Support Chauffeur",
        body:  `You have been assigned to a Care Ride. Tap to view details.`,
        tag:   `care-${assignment.role.toLowerCase()}-${bookingId}`,
        data:  { type: assignment.role === "PRIMARY" ? "care_primary" : "care_support", bookingId, assignmentId, requireInteraction: "true" },
      }).catch(() => {});

      dispatchCareAssignmentStatus({
        bookingId, assignmentId,
        role:   assignment.role,
        status: "PENDING",
        driverId: newDriverId,
        userId:   booking.userId,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "create_assignment") {
      const { newDriverId, role } = body;
      if (!newDriverId || !role) {
        return NextResponse.json({ error: "newDriverId and role required" }, { status: 400 });
      }
      if (role !== "PRIMARY" && role !== "SUPPORT") {
        return NextResponse.json({ error: "role must be PRIMARY or SUPPORT" }, { status: 400 });
      }

      const oppositeRole = role === "PRIMARY" ? "SUPPORT" : "PRIMARY";
      const conflicting = booking.careAssignments.find(
        (a) => a.role === oppositeRole && a.driverId === newDriverId &&
          ["PENDING", "ACCEPTED", "ARRIVED", "STARTED"].includes(a.status),
      );
      if (conflicting) {
        return NextResponse.json({ error: `This driver is already assigned as ${oppositeRole} on this booking` }, { status: 409 });
      }

      /* Cancel any existing PENDING assignments for that role before creating new one */
      await prisma.careAssignment.updateMany({
        where: { bookingId, role, status: "PENDING" },
        data:  { status: "CANCELLED", cancelledAt: new Date() },
      });

      const assignment = await prisma.careAssignment.create({
        data: {
          bookingId,
          driverId:    newDriverId,
          role,
          status:      "PENDING",
          dispatchedAt: new Date(),
        },
      });

      /* Notify the assigned driver via push + socket */
      await pushToDriver(newDriverId, {
        title: role === "PRIMARY" ? "🌟 Movo Care Ride — Primary Chauffeur" : "🔄 Care Ride — Support Chauffeur",
        body:  `Admin has manually assigned you to a Care Ride. Tap to view.`,
        tag:   `care-${role.toLowerCase()}-${bookingId}`,
        data:  { type: role === "PRIMARY" ? "care_primary" : "care_support", bookingId, assignmentId: assignment.id, requireInteraction: "true" },
      }).catch(() => {});

      if (role === "PRIMARY") {
        dispatchCarePrimaryDispatched({ bookingId, assignmentId: assignment.id, driverId: newDriverId, userId: booking.userId });
      } else {
        dispatchCareSupportDispatched({ bookingId, driverIds: [newDriverId], userId: booking.userId });
      }

      return NextResponse.json({ ok: true, assignmentId: assignment.id });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[admin care PATCH]", e);
    return NextResponse.json({ error: "Failed to perform admin action" }, { status: 500 });
  }
}
