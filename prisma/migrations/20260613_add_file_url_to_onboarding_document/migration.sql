-- Add fileUrl column to OnboardingDocument table
ALTER TABLE "OnboardingDocument" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
