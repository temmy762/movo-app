/**
 * GET  /api/bookings/[id]/receipt  → the ride's receipt (customer or admin)
 * POST /api/bookings/[id]/receipt  → email it to the customer's account email
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildReceipt } from "@/lib/receipt";
import { sendNotification } from "@/lib/notifications";

/* "Email me this receipt" — at most once a minute per booking */
const lastEmailed = new Map<string, number>();

async function authorise(req: NextRequest, id: string) {
  const session = await getSession(req);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const b = await prisma.booking.findUnique({ where: { id }, select: { userId: true } });
  if (!b) return { error: NextResponse.json({ error: "Booking not found" }, { status: 404 }) };
  if (session.role !== "ADMIN" && b.userId !== session.userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authorise(req, id);
    if (auth.error) return auth.error;
    const receipt = await buildReceipt(id);
    if (!receipt) return NextResponse.json({ error: "No receipt — this ride wasn't paid" }, { status: 404 });
    return NextResponse.json(receipt, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[receipt GET]", e);
    return NextResponse.json({ error: "Failed to load receipt" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authorise(req, id);
    if (auth.error) return auth.error;
    const r = await buildReceipt(id);
    if (!r) return NextResponse.json({ error: "No receipt — this ride wasn't paid" }, { status: 404 });
    if (!r.customerEmail) return NextResponse.json({ error: "There's no email address on this account" }, { status: 400 });

    const last = lastEmailed.get(id) ?? 0;
    if (Date.now() - last < 60_000) {
      return NextResponse.json({ error: "Receipt just sent — please check your inbox (and spam) in a minute." }, { status: 429 });
    }
    lastEmailed.set(id, Date.now());

    const userId = (await prisma.booking.findUnique({ where: { id }, select: { userId: true } }))?.userId ?? "";
    const result = await sendNotification({
      eventType: "RIDER_PAYMENT_RECEIPT",
      channels: ["EMAIL"],
      recipient: { type: "user", id: userId, email: r.customerEmail, firstName: r.customerName.split(" ")[0] || "there" },
      data: {
        bookingId: r.bookingId,
        paymentId: r.receiptNumber ?? r.bookingId,
        receiptNumber: r.receiptNumber,
        bookingNumber: r.bookingNumber,
        serviceLabel: r.service,
        amount: r.total,
        method: r.card,
        date: r.completedAt ?? r.bookedAt,
        items: r.items,
      },
    });
    if (!result.success) {
      lastEmailed.delete(id);
      return NextResponse.json({ error: "We couldn't send the email right now. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sentTo: r.customerEmail });
  } catch (e) {
    console.error("[receipt POST]", e);
    return NextResponse.json({ error: "Failed to send receipt" }, { status: 500 });
  }
}
