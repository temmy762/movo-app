-- Safe Ride return-leg handoff location + chauffeur onboarding rent-vs-own choice

ALTER TABLE "Booking" ADD COLUMN "primaryReadyLat" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "primaryReadyLng" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "primaryReadyAt" TIMESTAMP(3);

CREATE TYPE "VehicleOption" AS ENUM ('OWN', 'RENT');

ALTER TABLE "DriverOnboarding" ADD COLUMN "vehicleOption" "VehicleOption";
