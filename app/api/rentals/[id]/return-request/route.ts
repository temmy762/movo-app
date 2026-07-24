import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifyAdmins } from "@/lib/notifications";
import { logAudit } from "@/lib/auditLog";

/**
 * PATCH /api/rentals/[id]/return-request
 * Chauffeur signals "I'm bringing this vehicle back." This does NOT complete
 * the rental or unassign the vehicle — admin still needs to physically
 * inspect it (fuel level, cleanliness, damage) and finalize via the existing
 * admin "return" action, which handles any refuel/cleaning charge. This just
 * timestamps the request and alerts admins so it's easy to prioritize.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session?.driverId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const rental = await prisma.vehicleRental.findUnique({
      where: { id },
      select: {
        id: true, driverId: true, status: true, returnRequestedAt: true,
        driver: { select: { firstName: true, lastName: true } },
        vehicle: { select: { make: true, model: true, year: true } },
      },
    });
    if (!rental || rental.driverId !== session.driverId) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }
    if (rental.status !== "APPROVED") {
      return NextResponse.json({ error: `Cannot return a rental in status ${rental.status}` }, { status: 409 });
    }

    /* Idempotent — a second tap just confirms, doesn't re-notify */
    if (!rental.returnRequestedAt) {
      await prisma.vehicleRental.update({
        where: { id },
        data: { returnRequestedAt: new Date() },
      });

      notifyAdmins(
        "ADMIN_RENTAL_RETURN_REQUESTED",
        {
          rentalId: id,
          driverName: rental.driver ? `${rental.driver.firstName} ${rental.driver.lastName}` : "A chauffeur",
          vehicle: `${rental.vehicle.make} ${rental.vehicle.model} ${rental.vehicle.year}`,
        },
        ["IN_APP"],
      ).catch(() => {});

      logAudit({
        action: "rental.return_requested", entityType: "VehicleRental", entityId: id,
        actorType: "DRIVER", actorId: session.driverId,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[rentals/return-request]", e);
    return NextResponse.json({ error: "Failed to request return" }, { status: 500 });
  }
}
