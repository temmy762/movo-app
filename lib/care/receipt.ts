import { prisma } from "@/lib/prisma";
import { ensureReceiptNumber } from "@/lib/references";
import { sendNotification } from "@/lib/notifications";

/* Itemised receipt for a completed Safe Ride: one fare (stops included),
   waiting time, GST — with the booking and receipt numbers */
export async function sendSafeRideReceipt(bookingId: string) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });
  if (!b?.user?.email || b.paymentStatus !== "PAID") return;
  const receiptNumber = b.receiptNumber ?? await ensureReceiptNumber(b.id);
  await sendNotification({
    eventType: "RIDER_PAYMENT_RECEIPT",
    recipient: { type: "user", id: b.user.id, email: b.user.email, firstName: b.user.firstName, lastName: b.user.lastName ?? undefined },
    data: {
      bookingId: b.id,
      paymentId: b.stripePaymentIntentId ?? b.id,
      receiptNumber,
      bookingNumber: b.bookingNumber,
      serviceLabel: "Safe Ride",
      amount: b.total,
      method: "Card",
      date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Winnipeg", year: "numeric", month: "long", day: "numeric" }),
      items: [
        { label: "Safe Ride fare", amount: b.fare },
        ...(b.waitingFee ? [{ label: "Waiting time", amount: b.waitingFee }] : []),
        ...(b.gst ? [{ label: "GST", amount: b.gst }] : []),
      ],
    },
  });
}

