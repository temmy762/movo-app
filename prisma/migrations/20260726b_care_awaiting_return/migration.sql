-- Safe Ride: the customer-facing trip now completes when PRIMARY delivers the
-- customer, but PRIMARY's own assignment stays open until SUPPORT returns them
-- to their parked vehicle. AWAITING_RETURN represents that window.
--
-- Postgres requires ADD VALUE to run outside a transaction block when the new
-- value is used in the same transaction; it is only declared here, so this is
-- safe. IF NOT EXISTS keeps the migration idempotent.

ALTER TYPE "CareAssignmentStatus" ADD VALUE IF NOT EXISTS 'AWAITING_RETURN' AFTER 'STARTED';

-- Records where PRIMARY's own vehicle is parked, so SUPPORT can navigate the
-- return leg. Pickup coords are the fallback, but the chauffeur may have parked
-- slightly away from the customer's pin.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "primaryParkedLat" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "primaryParkedLng" DOUBLE PRECISION;
