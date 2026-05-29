-- CreateEnum
CREATE TYPE "OnboardingType" AS ENUM ('INDIVIDUAL', 'FLEET');

-- CreateEnum
CREATE TYPE "OnboardingAdminStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DRIVERS_LICENSE', 'BACKGROUND_CHECK', 'DRIVERS_ABSTRACT', 'VEHICLE_REGISTRATION', 'VEHICLE_INSURANCE', 'VEHICLE_PHOTO', 'PROFILE_PHOTO', 'WORK_ELIGIBILITY', 'BANKING_INFO', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "onboardingType" "OnboardingType";

-- CreateTable
CREATE TABLE "DriverOnboarding" (
    "id" TEXT NOT NULL,
    "type" "OnboardingType" NOT NULL DEFAULT 'INDIVIDUAL',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "completedSteps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "profilePhotoUrl" TEXT,
    "dob" TEXT,
    "licenseNumber" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" TEXT,
    "vehiclePlate" TEXT,
    "vehicleTier" TEXT,
    "vehicleColor" TEXT,
    "bankAccountName" TEXT,
    "bankInstitution" TEXT,
    "bankAccountNumber" TEXT,
    "bankRoutingNumber" TEXT,
    "signature" TEXT,
    "gpsConsentAt" TIMESTAMP(3),
    "privacyPolicyAt" TIMESTAMP(3),
    "legalNoticeAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "contractSignedAt" TIMESTAMP(3),
    "adminStatus" "OnboardingAdminStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "driverId" TEXT NOT NULL,

    CONSTRAINT "DriverOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingDocument" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboardingId" TEXT NOT NULL,

    CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverOnboarding_driverId_key" ON "DriverOnboarding"("driverId");

-- CreateIndex
CREATE INDEX "DriverOnboarding_adminStatus_idx" ON "DriverOnboarding"("adminStatus");

-- CreateIndex
CREATE INDEX "OnboardingDocument_onboardingId_idx" ON "OnboardingDocument"("onboardingId");

-- AddForeignKey
ALTER TABLE "DriverOnboarding" ADD CONSTRAINT "DriverOnboarding_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "DriverOnboarding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
