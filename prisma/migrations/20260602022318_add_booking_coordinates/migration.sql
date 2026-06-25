-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'IN_APP', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('RIDER', 'CHAUFFEUR', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('RIDER_WELCOME', 'RIDER_EMAIL_VERIFICATION', 'RIDER_PASSWORD_RESET', 'RIDER_BOOKING_CONFIRMED', 'RIDER_BOOKING_UPDATED', 'RIDER_DRIVER_ASSIGNED', 'RIDER_RIDE_COMPLETED', 'RIDER_PAYMENT_RECEIPT', 'RIDER_INCIDENT_SUBMITTED', 'RIDER_INCIDENT_RESOLVED', 'CHAUFFEUR_WELCOME', 'CHAUFFEUR_ONBOARDING_SUBMITTED', 'CHAUFFEUR_ONBOARDING_APPROVED', 'CHAUFFEUR_ONBOARDING_REJECTED', 'CHAUFFEUR_BOOKING_ASSIGNED', 'CHAUFFEUR_BOOKING_CANCELLED', 'CHAUFFEUR_PAYOUT_NOTIFICATION', 'ADMIN_NEW_DRIVER_APPLICATION', 'ADMIN_NEW_INCIDENT_REPORT', 'ADMIN_EMERGENCY_INCIDENT', 'ADMIN_NEW_FLEET_APPLICATION', 'SUPPORT_TICKET_CREATED', 'SUPPORT_TICKET_UPDATED', 'SUPPORT_TICKET_RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "driverId" TEXT,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "eventType" "NotificationEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "emailSubject" TEXT,
    "emailTemplate" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "emailError" TEXT,
    "readAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookingId" TEXT,
    "incidentId" TEXT,
    "onboardingId" TEXT,
    "ticketId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminUserId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_driverId_status_createdAt_idx" ON "Notification"("driverId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_eventType_createdAt_idx" ON "Notification"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_bookingId_idx" ON "Notification"("bookingId");

-- CreateIndex
CREATE INDEX "Notification_incidentId_idx" ON "Notification"("incidentId");

-- CreateIndex
CREATE INDEX "AdminNotification_notificationId_idx" ON "AdminNotification"("notificationId");

-- CreateIndex
CREATE INDEX "AdminNotification_adminEmail_readAt_idx" ON "AdminNotification"("adminEmail", "readAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
