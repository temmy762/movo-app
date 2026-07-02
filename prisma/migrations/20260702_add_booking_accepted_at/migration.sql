-- Track when a driver actively accepted a booking, as opposed to being
-- pre-assigned at creation (rider picked a specific driver). Needed to detect
-- pre-assigned drivers who never respond so the dispatch timeout can release
-- or refund those bookings.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
