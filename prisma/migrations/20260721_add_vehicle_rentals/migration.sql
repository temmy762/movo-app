-- Chauffeur Vehicle Rental feature

CREATE TYPE "RentalVehicleStatus" AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE');
CREATE TYPE "RentalPlan" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "RentalStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DECLINED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RenterType" AS ENUM ('DRIVER', 'USER');

CREATE TABLE "RentalVehicle" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "plate" TEXT NOT NULL,
    "color" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'classic',
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dailyRate" DOUBLE PRECISION NOT NULL DEFAULT 89,
    "weeklyRate" DOUBLE PRECISION NOT NULL DEFAULT 575,
    "monthlyRate" DOUBLE PRECISION NOT NULL DEFAULT 2150,
    "status" "RentalVehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RentalVehicle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentalVehicle_status_idx" ON "RentalVehicle"("status");

CREATE TABLE "VehicleRental" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "renterType" "RenterType" NOT NULL DEFAULT 'DRIVER',
    "driverId" TEXT,
    "userId" TEXT,
    "plan" "RentalPlan" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'REQUESTED',
    "stripePaymentIntentId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "refundId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "returnCharge" DOUBLE PRECISION,
    "returnChargeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VehicleRental_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VehicleRental_driverId_idx" ON "VehicleRental"("driverId");
CREATE INDEX "VehicleRental_vehicleId_idx" ON "VehicleRental"("vehicleId");
CREATE INDEX "VehicleRental_status_idx" ON "VehicleRental"("status");

ALTER TABLE "VehicleRental" ADD CONSTRAINT "VehicleRental_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "RentalVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleRental" ADD CONSTRAINT "VehicleRental_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "rentalVehicleId" TEXT;
