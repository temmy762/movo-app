-- Fixed fares can be limited to a pickup time (± window). Idempotent.
ALTER TABLE "CustomerFixedFare" ADD COLUMN IF NOT EXISTS "pickupTime" TEXT;
ALTER TABLE "CustomerFixedFare" ADD COLUMN IF NOT EXISTS "timeWindowMin" INTEGER NOT NULL DEFAULT 30;
