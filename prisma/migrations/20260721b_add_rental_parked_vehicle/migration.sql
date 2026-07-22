-- Snapshot of the chauffeur's vehicle (their own car, or a prior rental's
-- vehicle) at the moment a rental is approved, so it can be restored when
-- the rental is returned instead of being silently lost.
ALTER TABLE "VehicleRental" ADD COLUMN IF NOT EXISTS "parkedVehicle" JSONB;
