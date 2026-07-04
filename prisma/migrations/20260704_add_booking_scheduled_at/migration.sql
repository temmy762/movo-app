-- Scheduled rides: date/time chosen in the booking widget previously died as
-- URL params and every booking was dispatched as "now". scheduledAt persists
-- the requested pickup time so dispatch and the no-driver timeout can anchor
-- to it.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
