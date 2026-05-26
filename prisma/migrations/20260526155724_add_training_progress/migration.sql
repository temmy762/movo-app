-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "trainingCompleted" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
