-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "pickupLat" DOUBLE PRECISION,
ADD COLUMN "pickupLng" DOUBLE PRECISION,
ADD COLUMN "dropoffLat" DOUBLE PRECISION,
ADD COLUMN "dropoffLng" DOUBLE PRECISION;
 
-- CreateTable
CREATE TABLE "VehicleTierConfig" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "VehicleTierConfig_pkey" PRIMARY KEY ("id")
);
 
-- CreateIndex
CREATE UNIQUE INDEX "VehicleTierConfig_tier_key" ON "VehicleTierConfig"("tier");
