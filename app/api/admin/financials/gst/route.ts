/**
 * GET /api/admin/financials/gst?group=day|week|month&days=30
 *
 * GST collected from customers, kept apart from Movo's revenue, grouped over
 * time (Winnipeg dates) for tracking and filing. Paid rides only — refunded
 * rides are excluded (their GST was returned to the customer).
 *   charged       = what customers paid (incl. GST and extras)
 *   gst           = GST collected
 *   revenueExGst  = charged − GST
 *   chauffeurPay  = chauffeur earnings credited for those rides
 *   movoShare     = revenueExGst − chauffeurPay
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const TZ = "America/Winnipeg";
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/* Period key + label for a Winnipeg date */
function bucket(d: Date, group: string): { key: string; label: string } {
  const day = ymd(d); // YYYY-MM-DD
  if (group === "month") {
    const key = day.slice(0, 7);
    const label = new Date(`${key}-15T12:00:00Z`).toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" });
    return { key, label };
  }
  if (group === "week") {
    /* Week starting Monday */
    const [y, m, dd] = day.split("-").map(Number);
    const utc = new Date(Date.UTC(y, m - 1, dd));
    const monday = new Date(utc.getTime() - ((utc.getUTCDay() + 6) % 7) * 86_400_000);
    const key = monday.toISOString().slice(0, 10);
    return { key, label: `Week of ${monday.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}` };
  }
  return { key: day, label: new Date(`${day}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sp = req.nextUrl.searchParams;
    const group = ["day", "week", "month"].includes(sp.get("group") ?? "") ? sp.get("group")! : "day";
    const days = Math.min(Math.max(Number(sp.get("days")) || 30, 1), 3650);
    const since = new Date(Date.now() - days * 86_400_000);

    const bookings = await prisma.booking.findMany({
      where: { paymentStatus: "PAID", createdAt: { gte: since } },
      select: { id: true, createdAt: true, total: true, gst: true, bookingType: true },
      orderBy: { createdAt: "asc" },
    });

    /* Chauffeur earnings credited for these rides (wallet notes carry the booking id) */
    const earnings = bookings.length
      ? await prisma.walletTransaction.findMany({
          where: { type: "EARNING", status: "COMPLETED", OR: bookings.map((b) => ({ note: { contains: b.id } })) },
          select: { amount: true, note: true },
        })
      : [];
    const payByBooking = new Map<string, number>();
    for (const e of earnings) {
      const id = e.note?.match(/booking (c[a-z0-9]{20,})/i)?.[1];
      if (id) payByBooking.set(id, (payByBooking.get(id) ?? 0) + e.amount);
    }

    type Row = { key: string; label: string; rides: number; charged: number; gst: number; revenueExGst: number; chauffeurPay: number; movoShare: number };
    const rows = new Map<string, Row>();
    for (const b of bookings) {
      const { key, label } = bucket(b.createdAt, group);
      const row = rows.get(key) ?? { key, label, rides: 0, charged: 0, gst: 0, revenueExGst: 0, chauffeurPay: 0, movoShare: 0 };
      const gst = b.gst ?? 0;
      const pay = payByBooking.get(b.id) ?? 0;
      row.rides += 1;
      row.charged += b.total;
      row.gst += gst;
      row.revenueExGst += b.total - gst;
      row.chauffeurPay += pay;
      row.movoShare += b.total - gst - pay;
      rows.set(key, row);
    }
    const list = [...rows.values()]
      .map((r) => ({ ...r, charged: r2(r.charged), gst: r2(r.gst), revenueExGst: r2(r.revenueExGst), chauffeurPay: r2(r.chauffeurPay), movoShare: r2(r.movoShare) }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));

    const totals = list.reduce(
      (t, r) => ({
        rides: t.rides + r.rides, charged: r2(t.charged + r.charged), gst: r2(t.gst + r.gst),
        revenueExGst: r2(t.revenueExGst + r.revenueExGst), chauffeurPay: r2(t.chauffeurPay + r.chauffeurPay), movoShare: r2(t.movoShare + r.movoShare),
      }),
      { rides: 0, charged: 0, gst: 0, revenueExGst: 0, chauffeurPay: 0, movoShare: 0 },
    );

    return NextResponse.json({ group, days, rows: list, totals }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin gst]", e);
    return NextResponse.json({ error: "Failed to load GST report" }, { status: 500 });
  }
}
