import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") return false;
  return true;
}

function mapPaymentStatus(ps: string): "Completed" | "Awaiting" | "Overdue" | "Refunded" {
  if (ps === "PAID")     return "Completed";
  if (ps === "REFUNDED") return "Refunded";
  if (ps === "FAILED")   return "Overdue";
  return "Awaiting";
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, clientName: true, carName: true, carTier: true,
        fare: true, serviceFee: true, total: true, paymentStatus: true,
        status: true, stripePaymentIntentId: true, refundId: true, createdAt: true,
      },
    });

    const payments = bookings.map(b => ({
      id:          `INV-${b.id.slice(-6).toUpperCase()}`,
      bookingId:   b.id,
      client:      b.clientName,
      car:         b.carName,
      ratePerDay:  Math.round(b.fare * 100) / 100,
      serviceFee:  Math.round(b.serviceFee * 100) / 100,
      rentalDays:  1,
      amount:      Math.round(b.total * 100) / 100,
      dueDate:     new Date(b.createdAt).toISOString().split("T")[0],
      status:      mapPaymentStatus(b.paymentStatus),
      bookingStatus: b.status,
      hasStripe:   !!b.stripePaymentIntentId,
      refundId:    b.refundId ?? null,
    }));

    return NextResponse.json(payments);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { bookingId, paymentStatus } = await req.json();
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const psMap: Record<string, string> = {
      Completed: "PAID", Overdue: "FAILED", Awaiting: "UNPAID", Refunded: "REFUNDED",
    };
    const dbStatus = psMap[paymentStatus] ?? "UNPAID";
    await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: dbStatus as never } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
