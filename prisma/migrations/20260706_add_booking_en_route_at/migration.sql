-- Distinguishes a reserved (accepted, future scheduled) ride from an active one.
-- Set when the chauffeur taps "I'm heading to pickup" on the scheduled date;
-- until then the booking lives in Reserved Rides, not the active-ride flow.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "enRouteAt" TIMESTAMP(3);
