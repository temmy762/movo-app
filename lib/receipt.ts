/**
 * One receipt for a paid booking — used by the downloadable receipt page, the
 * "email me this receipt" action and the receipt emails, so they always match.
 */
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { serviceLabel } from "@/lib/tierLabels";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export type ReceiptItem = { label: string; amount: number };

export type Receipt = {
  bookingId: string;
  bookingNumber: string | null;
  receiptNumber: string | null;
  service: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerEmail: string | null;
  pickup: string;
  dropoff: string;
  stops: string[];
  chauffeur: string | null;
  vehicle: string | null;
  bookedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  items: ReceiptItem[];
  total: number;
  card: string;
};

/** Itemised charges — same lines as the receipt email at trip completion */
export function receiptItems(b: {
  bookingType: string; fare: number; serviceFee: number; gst: number | null;
  additionalStopFee: number | null; airportFee: number | null; waitingFee: number | null;
}): ReceiptItem[] {
  if (b.bookingType === "CARE") {
    return [
      { label: "Safe Ride fare", amount: b.fare },
      ...(b.waitingFee ? [{ label: "Waiting time", amount: b.waitingFee }] : []),
      ...(b.gst ? [{ label: "GST", amount: b.gst }] : []),
    ];
  }
  return [
    { label: "Ride fare", amount: b.fare },
    ...(b.additionalStopFee ? [{ label: "Additional stops", amount: b.additionalStopFee }] : []),
    ...(b.airportFee ? [{ label: "Airport pickup fee", amount: b.airportFee }] : []),
    ...(b.waitingFee ? [{ label: "Waiting time", amount: b.waitingFee }] : []),
    ...(b.serviceFee ? [{ label: "Service fee", amount: b.serviceFee }] : []),
    ...(b.gst ? [{ label: "GST", amount: b.gst }] : []),
  ];
}

/** "Visa •••• 4242" from the checkout payment, or "Card" */
async function cardLabel(intentId: string | null): Promise<string> {
  if (!intentId) return "Card";
  try {
    const pi = await stripe.paymentIntents.retrieve(intentId, { expand: ["payment_method"] });
    const pm = typeof pi.payment_method === "object" ? pi.payment_method : null;
    if (pm?.card) {
      const brand = pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1);
      return `${brand} •••• ${pm.card.last4}`;
    }
  } catch { /* fall back */ }
  return "Card";
}

const winnipeg = (d: Date | null) =>
  d ? d.toLocaleString("en-CA", { timeZone: "America/Winnipeg", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

/** The receipt for a booking, or null if it doesn't exist / was never paid */
export async function buildReceipt(bookingId: string): Promise<Receipt | null> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      driver: { select: { firstName: true, lastName: true, vehicle: { select: { make: true, model: true, plate: true } } } },
      careAssignments: {
        where: { role: "PRIMARY", status: { in: ["ACCEPTED", "ARRIVED", "STARTED", "AWAITING_RETURN", "COMPLETED"] } },
        select: { driver: { select: { firstName: true, lastName: true } } },
        take: 1,
      },
    },
  });
  if (!b || !["PAID", "REFUNDED"].includes(b.paymentStatus)) return null;

  const chauffeurRow = b.driver ?? b.careAssignments[0]?.driver ?? null;
  const careVehicle = (b.careVehicle ?? null) as { make?: string; model?: string; plate?: string; colour?: string } | null;
  const vehicle = b.bookingType === "CARE"
    ? (careVehicle ? `${[careVehicle.colour, careVehicle.make, careVehicle.model].filter(Boolean).join(" ")}${careVehicle.plate ? ` (${careVehicle.plate})` : ""}` : null)
    : (b.driver?.vehicle ? `${b.driver.vehicle.make} ${b.driver.vehicle.model}${b.driver.vehicle.plate ? ` (${b.driver.vehicle.plate})` : ""}` : null);

  return {
    bookingId: b.id,
    bookingNumber: b.bookingNumber,
    receiptNumber: b.receiptNumber,
    service: serviceLabel(b.carTier, b.bookingType),
    status: b.status,
    paymentStatus: b.paymentStatus,
    customerName: [b.user?.firstName, b.user?.lastName].map((x) => (x ?? "").trim()).filter(Boolean).join(" ") || b.clientName,
    customerEmail: b.user?.email ?? null,
    pickup: b.pickup,
    dropoff: b.dropoff,
    stops: Array.isArray(b.stops) ? (b.stops as string[]) : [],
    chauffeur: chauffeurRow ? [chauffeurRow.firstName, chauffeurRow.lastName].map((x) => (x ?? "").trim()).filter(Boolean).join(" ") : null,
    vehicle,
    bookedAt: winnipeg(b.createdAt)!,
    startedAt: winnipeg(b.startedAt),
    completedAt: winnipeg(b.completedAt),
    items: receiptItems(b),
    total: b.total,
    card: await cardLabel(b.stripePaymentIntentId),
  };
}
