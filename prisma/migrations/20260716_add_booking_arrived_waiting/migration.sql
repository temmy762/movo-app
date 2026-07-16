-- Wait-time billing: when the chauffeur arrived, and the accrued waiting fee
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "arrivedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "waitingFee" DOUBLE PRECISION;
