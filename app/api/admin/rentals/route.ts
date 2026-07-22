import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/admin/rentals?status=REQUESTED|APPROVED|...
 * List rental agreements for the admin Rentals panel (requests queue, active
 * rentals, and history all read from here with a status filter).
 */
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const rentals = await prisma.vehicleRental.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, renterType: true, plan: true, amount: true, status: true,
      startDate: true, endDate: true, approvedAt: true, declinedAt: true, returnedAt: true,
      adminNote: true, returnCharge: true, returnChargeNote: true,
      paymentStatus: true, stripePaymentIntentId: true, createdAt: true,
      driver: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      vehicle: { select: { id: true, make: true, model: true, year: true, plate: true, color: true, tier: true } },
    },
  });

  return NextResponse.json(rentals);
}
