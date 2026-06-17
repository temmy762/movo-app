-- Add Stripe customer ID to User (for payment intents)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- Add Stripe Connect fields to Driver (for payouts)
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "stripeAccountStatus" TEXT;
