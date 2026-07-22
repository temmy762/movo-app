import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/auditLog";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { make, model, year, plate, color, tier, dailyRate, weeklyRate, monthlyRate, notes, photos, status } = body;

    /* A vehicle currently RENTED can't be silently marked AVAILABLE/OUT_OF_SERVICE
       from here — that transition only happens through the rental return flow,
       so the assigned Vehicle row and the rental record never drift apart. */
    if (status) {
      const current = await prisma.rentalVehicle.findUnique({ where: { id }, select: { status: true } });
      if (current?.status === "RENTED" && status !== "RENTED") {
        return NextResponse.json(
          { error: "Return the active rental first (Rentals → Active) before changing this vehicle's status." },
          { status: 409 }
        );
      }
    }

    const vehicle = await prisma.rentalVehicle.update({
      where: { id },
      data: {
        ...(make !== undefined ? { make } : {}),
        ...(model !== undefined ? { model } : {}),
        ...(year !== undefined ? { year: parseInt(year, 10) } : {}),
        ...(plate !== undefined ? { plate } : {}),
        ...(color !== undefined ? { color: color || null } : {}),
        ...(tier !== undefined ? { tier } : {}),
        ...(dailyRate !== undefined ? { dailyRate: parseFloat(dailyRate) } : {}),
        ...(weeklyRate !== undefined ? { weeklyRate: parseFloat(weeklyRate) } : {}),
        ...(monthlyRate !== undefined ? { monthlyRate: parseFloat(monthlyRate) } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(Array.isArray(photos) ? { photos: photos.slice(0, 6) } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    logAudit({
      action: "rental_vehicle.updated", entityType: "RentalVehicle", entityId: id,
      actorType: "ADMIN", actorId: session.userId ?? null, detail: { status },
    }).catch(() => {});

    return NextResponse.json({ ...vehicle, photoCount: vehicle.photos.length, photos: undefined });
  } catch (e) {
    console.error("[admin/rentals/vehicles PATCH]", e);
    return NextResponse.json({ error: "Failed to update rental vehicle" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const openRental = await prisma.vehicleRental.findFirst({
      where: { vehicleId: id, status: { in: ["REQUESTED", "APPROVED"] } },
      select: { id: true },
    });
    if (openRental) {
      return NextResponse.json(
        { error: "This vehicle has an open request or active rental — resolve it first." },
        { status: 409 }
      );
    }

    await prisma.rentalVehicle.delete({ where: { id } });
    logAudit({
      action: "rental_vehicle.deleted", entityType: "RentalVehicle", entityId: id,
      actorType: "ADMIN", actorId: session.userId ?? null,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/rentals/vehicles DELETE]", e);
    return NextResponse.json({ error: "Failed to delete rental vehicle" }, { status: 500 });
  }
}
