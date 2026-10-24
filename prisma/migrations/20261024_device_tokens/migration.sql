-- Mobile app push tokens (Expo push service). Idempotent.
CREATE TABLE IF NOT EXISTS "DeviceToken" (
  "id"        TEXT NOT NULL,
  "token"     TEXT NOT NULL,
  "platform"  TEXT NOT NULL,
  "app"       TEXT NOT NULL,
  "userId"    TEXT,
  "driverId"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE INDEX IF NOT EXISTS "DeviceToken_userId_idx" ON "DeviceToken"("userId");
CREATE INDEX IF NOT EXISTS "DeviceToken_driverId_idx" ON "DeviceToken"("driverId");

-- Same lock-down as every other table (Supabase public API gets nothing)
ALTER TABLE "DeviceToken" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "DeviceToken" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "DeviceToken" FROM authenticated;
  END IF;
END $$;
