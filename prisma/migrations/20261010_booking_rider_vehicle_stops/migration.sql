-- Safe Ride booking flow (vehicle + authorization), book for another rider,
-- passengers, pickup instructions and stop addresses. Idempotent.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "riderPhone"         TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "passengers"         INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "pickupInstructions" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "stops"              JSONB;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "careVehicle"        JSONB;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "careConsentAt"      TIMESTAMP(3);
