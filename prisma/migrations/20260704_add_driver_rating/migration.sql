-- Chauffeur ratings of the rider were previously written into the same
-- rating/review columns the rider uses to rate the chauffeur, clobbering each
-- other. Give the chauffeur side its own columns; driverFeedback is required
-- by the app when the chauffeur rates 3 stars or lower.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "driverRating" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "driverFeedback" TEXT;
