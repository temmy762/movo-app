-- Milestones 2–3: Safe Ride pricing engine + manual Uber return.
-- Idempotent (IF NOT EXISTS) so it is safe to apply directly with
-- `prisma db execute` on the VPS.

-- Notification event types the code already sends but the enum never had
-- (their in-app notifications failed silently), plus the new Uber events.
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'RIDER_BOOKING_CANCELLED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'RIDER_RIDE_UNAVAILABLE_REFUNDED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'CHAUFFEUR_TOPUP_NOTIFICATION';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'CHAUFFEUR_RENTAL_APPROVED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'CHAUFFEUR_RENTAL_DECLINED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'CHAUFFEUR_CARE_PICKUP_READY';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'CHAUFFEUR_CARE_SUPPORT_EN_ROUTE';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'CHAUFFEUR_UBER_RETURN_BOOKED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'ADMIN_CARE_DISPATCH_FAILED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'ADMIN_CARE_SUPPORT_STRANDED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'ADMIN_RIDE_DISPATCH_FAILED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'ADMIN_RENTAL_REQUEST';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'ADMIN_RENTAL_RETURN_REQUESTED';
ALTER TYPE "NotificationEventType" ADD VALUE IF NOT EXISTS 'ADMIN_SAFE_RIDE_BOOK_UBER';

-- Safe Ride price breakdown, locked chauffeur payout, return leg tracking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "careServicePortion"  DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "careReturnAllowance" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "chauffeurPayout"     DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "pricingSnapshot"     JSONB;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "returnMode"          TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "uberReturnRef"       TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "uberReturnCost"      DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "uberReturnBookedAt"  TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "SafeRideConfig" (
  "id"                  TEXT NOT NULL,
  "returnBaseFare"      DOUBLE PRECISION NOT NULL DEFAULT 3.50,
  "returnPerKm"         DOUBLE PRECISION NOT NULL DEFAULT 0.90,
  "returnPerMin"        DOUBLE PRECISION NOT NULL DEFAULT 0.30,
  "returnBookingFee"    DOUBLE PRECISION NOT NULL DEFAULT 2.50,
  "returnMinimum"       DOUBLE PRECISION NOT NULL DEFAULT 10.00,
  "returnBufferRate"    DOUBLE PRECISION NOT NULL DEFAULT 0.15,
  "lateNightBufferRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
  "lateNightStartHour"  INTEGER NOT NULL DEFAULT 22,
  "lateNightEndHour"    INTEGER NOT NULL DEFAULT 6,
  "demandMultiplier"    DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "chauffeurPayoutRate" DOUBLE PRECISION NOT NULL DEFAULT 0.70,
  "supportPayout"       DOUBLE PRECISION NOT NULL DEFAULT 40.00,
  "freeWaitingMinutes"  INTEGER NOT NULL DEFAULT 3,
  "waitingRatePerMin"   DOUBLE PRECISION NOT NULL DEFAULT 1.00,
  "defaultReturnMode"   TEXT NOT NULL DEFAULT 'UBER',
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafeRideConfig_pkey" PRIMARY KEY ("id")
);
