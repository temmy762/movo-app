-- CreateEnum
CREATE TYPE "CareRole" AS ENUM ('PRIMARY', 'SUPPORT');

-- CreateEnum
CREATE TYPE "CareAssignmentStatus" AS ENUM ('SEARCHING', 'PENDING', 'ACCEPTED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "CareAssignment" (
    "id"           TEXT NOT NULL,
    "bookingId"    TEXT NOT NULL,
    "driverId"     TEXT,
    "role"         "CareRole" NOT NULL,
    "status"       "CareAssignmentStatus" NOT NULL DEFAULT 'SEARCHING',
    "dispatchedAt" TIMESTAMP(3),
    "acceptedAt"   TIMESTAMP(3),
    "arrivedAt"    TIMESTAMP(3),
    "startedAt"    TIMESTAMP(3),
    "completedAt"  TIMESTAMP(3),
    "cancelledAt"  TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CareAssignment_bookingId_idx" ON "CareAssignment"("bookingId");
CREATE INDEX IF NOT EXISTS "CareAssignment_driverId_idx"  ON "CareAssignment"("driverId");

-- AddForeignKey
ALTER TABLE "CareAssignment" ADD CONSTRAINT "CareAssignment_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CareAssignment" ADD CONSTRAINT "CareAssignment_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
