-- Per-customer agreed fares for regular routes. Idempotent.
CREATE TABLE IF NOT EXISTS "CustomerFixedFare" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "label"      TEXT NOT NULL,
  "pickup"     TEXT NOT NULL,
  "pickupLat"  DOUBLE PRECISION NOT NULL,
  "pickupLng"  DOUBLE PRECISION NOT NULL,
  "dropoff"    TEXT NOT NULL,
  "dropoffLat" DOUBLE PRECISION NOT NULL,
  "dropoffLng" DOUBLE PRECISION NOT NULL,
  "tier"       TEXT NOT NULL DEFAULT 'classic',
  "fare"       DOUBLE PRECISION NOT NULL,
  "weekdays"   INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
  "active"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerFixedFare_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CustomerFixedFare_userId_idx" ON "CustomerFixedFare"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerFixedFare_userId_fkey') THEN
    ALTER TABLE "CustomerFixedFare" ADD CONSTRAINT "CustomerFixedFare_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Same lock-down as every other table (Supabase public API gets nothing)
ALTER TABLE "CustomerFixedFare" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "CustomerFixedFare" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "CustomerFixedFare" FROM authenticated;
  END IF;
END $$;
