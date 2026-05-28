import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};

    if (body.status !== undefined) {
      const map: Record<string, string> = { Completed: "PAID", Awaiting: "UNPAID", Overdue: "FAILED" };
      data.paymentStatus = map[body.status] ?? "UNPAID";
    }
    if (body.client    !== undefined) data.clientName = body.client;
    if (body.car       !== undefined) data.carName    = body.car;
    if (body.ratePerDay !== undefined) data.fare      = Number(body.ratePerDay);
    if (body.amount    !== undefined) data.total      = Number(body.amount);

    await prisma.booking.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
