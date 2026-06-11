-- Add deletedAt column to Driver table
ALTER TABLE "Driver" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Add photoUrl column to Vehicle table
ALTER TABLE "Vehicle" ADD COLUMN "photoUrl" TEXT;
