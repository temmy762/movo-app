-- Compliance wave: consent records, complaints, lost & found, audit logs,
-- and incident-report expansion (photos, GPS, additional categories).

-- IncidentReport: photos, GPS location, additional categories
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'CUSTOMER_MISCONDUCT';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'MEDICAL_EMERGENCY';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'SAFETY_CONCERN';

ALTER TABLE "IncidentReport" ADD COLUMN IF NOT EXISTS "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "IncidentReport" ADD COLUMN IF NOT EXISTS "gpsLat" DOUBLE PRECISION;
ALTER TABLE "IncidentReport" ADD COLUMN IF NOT EXISTS "gpsLng" DOUBLE PRECISION;

-- ConsentRecord
CREATE TABLE IF NOT EXISTS "ConsentRecord" (
    "id"           TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "version"      TEXT NOT NULL,
    "acceptedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress"    TEXT,
    "userId"       TEXT,
    "driverId"     TEXT,
    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");
CREATE INDEX IF NOT EXISTS "ConsentRecord_driverId_idx" ON "ConsentRecord"("driverId");
DO $$ BEGIN
  ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Complaint
DO $$ BEGIN
  CREATE TYPE "ComplaintCategory" AS ENUM ('CHAUFFEUR', 'VEHICLE', 'BILLING', 'SAFETY', 'LOST_PROPERTY', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Complaint" (
    "id"            TEXT NOT NULL,
    "category"      "ComplaintCategory" NOT NULL,
    "status"        "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "description"   TEXT NOT NULL,
    "photoUrls"     TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNotes" TEXT,
    "resolution"    TEXT,
    "bookingId"     TEXT,
    "userId"        TEXT,
    "driverId"      TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Complaint_status_idx" ON "Complaint"("status");
DO $$ BEGIN
  ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- LostFoundItem
DO $$ BEGIN
  CREATE TYPE "LostFoundStatus" AS ENUM ('REPORTED', 'MATCHED', 'RETURNED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LostFoundItem" (
    "id"              TEXT NOT NULL,
    "status"          "LostFoundStatus" NOT NULL DEFAULT 'REPORTED',
    "itemDescription" TEXT NOT NULL,
    "reportedBy"      TEXT NOT NULL,
    "contactInfo"     TEXT,
    "collectionNotes" TEXT,
    "returnedAt"      TIMESTAMP(3),
    "bookingId"       TEXT,
    "userId"          TEXT,
    "driverId"        TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LostFoundItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LostFoundItem_status_idx" ON "LostFoundItem"("status");
DO $$ BEGIN
  ALTER TABLE "LostFoundItem" ADD CONSTRAINT "LostFoundItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LostFoundItem" ADD CONSTRAINT "LostFoundItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LostFoundItem" ADD CONSTRAINT "LostFoundItem_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id"         TEXT NOT NULL,
    "action"     TEXT NOT NULL,
    "entityType" TEXT,
    "entityId"   TEXT,
    "actorType"  TEXT NOT NULL,
    "actorId"    TEXT,
    "detail"     JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
