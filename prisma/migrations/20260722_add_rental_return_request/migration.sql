-- Chauffeur-initiated return request timestamp (admin still finalizes the
-- actual return + any refuel/cleaning charge, but this lets the chauffeur
-- signal "I'm bringing it back" and shows up on the admin Active tab).
ALTER TABLE "VehicleRental" ADD COLUMN IF NOT EXISTS "returnRequestedAt" TIMESTAMP(3);
