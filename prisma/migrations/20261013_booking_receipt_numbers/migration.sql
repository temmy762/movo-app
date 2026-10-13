-- Unique, permanent Movo references: MOVO-B-000001 (booking) and
-- MOVO-R-000001 (receipt). Existing bookings are numbered in creation order,
-- and new ones carry on from there. Idempotent.

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingNumber" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingNumber_key" ON "Booking"("bookingNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_receiptNumber_key" ON "Booking"("receiptNumber");

CREATE SEQUENCE IF NOT EXISTS booking_number_seq;
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq;

-- Number existing bookings oldest-first
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM "Booking" WHERE "bookingNumber" IS NULL ORDER BY "createdAt", id LOOP
    UPDATE "Booking"
       SET "bookingNumber" = 'MOVO-B-' || lpad(nextval('booking_number_seq')::text, 6, '0')
     WHERE id = r.id;
  END LOOP;
  -- Receipts only where a payment was actually recorded
  FOR r IN SELECT id FROM "Booking"
            WHERE "receiptNumber" IS NULL AND "paymentStatus" IN ('PAID', 'REFUNDED')
            ORDER BY "createdAt", id LOOP
    UPDATE "Booking"
       SET "receiptNumber" = 'MOVO-R-' || lpad(nextval('receipt_number_seq')::text, 6, '0')
     WHERE id = r.id;
  END LOOP;
END $$;

-- Faster "My rides" lists for riders and chauffeurs
CREATE INDEX IF NOT EXISTS "Booking_userId_status_createdAt_idx"   ON "Booking"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_driverId_status_createdAt_idx" ON "Booking"("driverId", "status", "createdAt");
