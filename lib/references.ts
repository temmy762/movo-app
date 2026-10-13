import { prisma } from "@/lib/prisma";

/**
 * Permanent Movo references (see migration 20261013_booking_receipt_numbers):
 *   MOVO-B-000001 — issued when the booking is confirmed (paid)
 *   MOVO-R-000001 — issued when the payment is recorded
 * Numbers come from Postgres sequences, so they're unique and never reused.
 */

async function next(sequence: "booking_number_seq" | "receipt_number_seq", prefix: string): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT nextval('${sequence}') AS n`);
  return `${prefix}${String(rows[0].n).padStart(6, "0")}`;
}

export const nextBookingNumber = () => next("booking_number_seq", "MOVO-B-");
export const nextReceiptNumber = () => next("receipt_number_seq", "MOVO-R-");

/** Give a paid booking its receipt number if it doesn't have one yet (idempotent). */
export async function ensureReceiptNumber(bookingId: string): Promise<string | null> {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { receiptNumber: true, paymentStatus: true } });
  if (!b || b.paymentStatus !== "PAID") return b?.receiptNumber ?? null;
  if (b.receiptNumber) return b.receiptNumber;
  const receiptNumber = await nextReceiptNumber();
  /* Conditional write: if another request assigned one first, keep theirs */
  const res = await prisma.booking.updateMany({ where: { id: bookingId, receiptNumber: null }, data: { receiptNumber } });
  if (res.count) return receiptNumber;
  return (await prisma.booking.findUnique({ where: { id: bookingId }, select: { receiptNumber: true } }))?.receiptNumber ?? null;
}
