import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function mapPaymentStatus(ps: string): "Completed" | "Awaiting" | "Overdue" {
  if (ps === "PAID")    return "Completed";
  if (ps === "FAILED" || ps === "REFUNDED") return "Overdue";
  return "Awaiting";
}

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      where:  { status: { not: "CANCELLED" as never } },
      select: {
        id: true, clientName: true, carName: true, carTier: true,
        fare: true, total: true, paymentStatus: true, createdAt: true,
      },
    });

    const payments = bookings.map(b => ({
      id:        `INV-${b.id.slice(-6).toUpperCase()}`,
      bookingId: b.id,
      client:     b.clientName,
      car:        b.carName,
      ratePerDay: Math.round(b.fare * 100) / 100,
      rentalDays: 1,
      amount:     Math.round(b.total * 100) / 100,
      dueDate:    new Date(b.createdAt).toISOString().split("T")[0],
      status:     mapPaymentStatus(b.paymentStatus),
    }));

    return NextResponse.json(payments);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { client, car, ratePerDay, rentalDays, amount, dueDate, status } = await req.json();
    if (!client || !car) return NextResponse.json({ error: "client and car required" }, { status: 400 });

    const psMap: Record<string, string> = { Completed: "PAID", Awaiting: "UNPAID", Overdue: "FAILED" };
    const booking = await prisma.booking.create({
      data: {
        clientName: client, carName: car, carTier: "STANDARD",
        pickup: "N/A", dropoff: "N/A",
        fare: Number(ratePerDay) || 0, serviceFee: 0,
        total: Number(amount) || (Number(ratePerDay) * Number(rentalDays)),
        status: "CONFIRMED" as never,
        paymentStatus: (psMap[status] ?? "UNPAID") as never,
      },
    });
    return NextResponse.json({
      id:        `INV-${booking.id.slice(-6).toUpperCase()}`,
      bookingId: booking.id,
      dueDate:   dueDate ?? new Date().toISOString().split("T")[0],
      rentalDays: Number(rentalDays) || 1,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { bookingId, paymentStatus } = await req.json();
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const dbStatus = paymentStatus === "Completed" ? "PAID" : paymentStatus === "Overdue" ? "FAILED" : "UNPAID";
    await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: dbStatus as never } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
