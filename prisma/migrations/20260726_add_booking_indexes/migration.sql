-- Booking had no indexes at all. The admin tracking board filters on status and
-- sorts by createdAt, and driver/user lookups are common across the app.
-- CONCURRENTLY is deliberately not used so this runs inside Prisma's migration
-- transaction; the table is small enough that the brief lock is not a concern.

CREATE INDEX IF NOT EXISTS "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_driverId_idx" ON "Booking"("driverId");
CREATE INDEX IF NOT EXISTS "Booking_userId_idx" ON "Booking"("userId");
