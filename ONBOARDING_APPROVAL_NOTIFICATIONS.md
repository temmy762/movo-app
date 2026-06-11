# Onboarding Approval & Rejection Notifications

## 🐛 Issue Fixed

**Problem:** When admin approved or rejected an onboarding application, **no email notification was sent to the driver**.

**Root Cause:** The approval endpoint (`app/api/admin/onboarding/[id]/route.ts`) was missing notification logic.

---

## ✅ Solution Implemented

### What Was Added

1. **Import notification service**
   ```typescript
   import { sendNotification } from "@/lib/notifications";
   ```

2. **Send approval email**
   - When `adminStatus === "APPROVED"`
   - Event type: `CHAUFFEUR_ONBOARDING_APPROVED`
   - Includes driver name and onboarding type

3. **Send rejection email**
   - When `adminStatus === "REJECTED"`
   - Event type: `CHAUFFEUR_ONBOARDING_REJECTED`
   - Includes rejection reason (admin note)

### Email Templates

The system uses the existing notification templates:
- **Approval:** `CHAUFFEUR_ONBOARDING_APPROVED` → Email + In-app notification
- **Rejection:** `CHAUFFEUR_ONBOARDING_REJECTED` → Email + In-app notification

---

## 📊 Complete Approval Flow (Now Fixed)

```
ADMIN APPROVES APPLICATION
         ↓
Driver status set to ACTIVE
Vehicle created with photo
         ↓
✅ APPROVAL EMAIL SENT
   - Subject: "Your Movo Privé Application Approved"
   - Includes: Next steps, login link, vehicle details
         ↓
✅ IN-APP NOTIFICATION CREATED
   - Driver sees notification in app
         ↓
Driver receives email + in-app notification ✓

---

ADMIN REJECTS APPLICATION
         ↓
Onboarding status set to REJECTED
         ↓
✅ REJECTION EMAIL SENT
   - Subject: "Your Movo Privé Application Status"
   - Includes: Rejection reason (admin note)
         ↓
✅ IN-APP NOTIFICATION CREATED
   - Driver sees notification in app
         ↓
Driver receives email + in-app notification ✓
```

---

## 🔧 Implementation Details

### File Modified
- `app/api/admin/onboarding/[id]/route.ts`

### Changes Made

**Added import:**
```typescript
import { sendNotification } from "@/lib/notifications";
```

**Added notification logic after approval:**
```typescript
// Send approval/rejection notification to driver
if (adminStatus === "APPROVED") {
  try {
    await sendNotification({
      eventType: "CHAUFFEUR_ONBOARDING_APPROVED",
      driverId: onboarding.driverId,
      data: {
        driverName: onboarding.driver.firstName,
        onboardingType: onboarding.type,
      },
    });
  } catch (notifErr) {
    console.error("Failed to send approval notification:", notifErr);
    // Don't fail the approval if notification fails
  }
} else if (adminStatus === "REJECTED") {
  try {
    await sendNotification({
      eventType: "CHAUFFEUR_ONBOARDING_REJECTED",
      driverId: onboarding.driverId,
      data: {
        driverName: onboarding.driver.firstName,
        reason: adminNote || "Your application did not meet our requirements",
      },
    });
  } catch (notifErr) {
    console.error("Failed to send rejection notification:", notifErr);
    // Don't fail the rejection if notification fails
  }
}
```

---

## 📧 Email Configuration

### Prerequisites

Ensure these environment variables are set:
```
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Email Templates

The notification system uses email templates from:
- `lib/notifications/templates/`

Templates are automatically selected based on event type:
- `CHAUFFEUR_ONBOARDING_APPROVED` → Approval template
- `CHAUFFEUR_ONBOARDING_REJECTED` → Rejection template

---

## 🚀 Testing

### Test Approval Email

1. Go to Admin Panel → Onboarding
2. Find a pending application
3. Click "Approve"
4. Check driver's email inbox
5. Verify email received with:
   - Approval message
   - Next steps
   - Login link

### Test Rejection Email

1. Go to Admin Panel → Onboarding
2. Find a pending application
3. Click "Reject"
4. Add rejection reason in admin note
5. Check driver's email inbox
6. Verify email received with:
   - Rejection message
   - Reason provided

### Test In-App Notification

1. After approval/rejection
2. Driver logs in
3. Check notification bell
4. Verify notification appears

---

## 🔍 Troubleshooting

### Email Not Received

**Check:**
1. Is `RESEND_API_KEY` configured?
2. Check server logs for notification errors
3. Verify driver email is correct in database
4. Check spam/junk folder

**Debug:**
```bash
# Check notification logs
tail -f logs/notifications.log

# Verify email configuration
echo $RESEND_API_KEY
```

### In-App Notification Not Showing

1. Verify driver is logged in
2. Check notification bell icon
3. Refresh page
4. Check browser console for errors

---

## 📋 Notification Event Types

| Event | Channels | When Sent |
|-------|----------|-----------|
| `CHAUFFEUR_ONBOARDING_APPROVED` | EMAIL + IN_APP | Admin approves application |
| `CHAUFFEUR_ONBOARDING_REJECTED` | EMAIL + IN_APP | Admin rejects application |

---

## ✨ Summary

**Issue:** Approval/rejection emails not being sent

**Fix:** Added notification logic to approval endpoint

**Result:**
- ✅ Drivers receive approval email when approved
- ✅ Drivers receive rejection email with reason when rejected
- ✅ In-app notifications also created
- ✅ Notifications don't block approval process (fail gracefully)

**Deploy:** Push to VPS and test with a new approval

---

## 📝 Related Files

- `lib/notifications/index.ts` - Notification service
- `lib/notifications/channels/email.ts` - Email sending logic
- `lib/notifications/templates/` - Email templates
- `app/api/admin/onboarding/[id]/route.ts` - Approval endpoint (MODIFIED)
