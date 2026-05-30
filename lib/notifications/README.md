# MOVO Notification System

A scalable, multi-channel notification system supporting Email, In-App, SMS, and Push notifications.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Triggers                           │
│  (User registration, Booking created, Incident reported)   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Notification Service (index.ts)                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Email     │ │  In-App     │ │    SMS      │ │  Push   │
│  │  (Resend)   │ │  (Prisma)   │ │ (Twilio)    │ │ (FCM)   │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Email Templates (React Email)               │
│  - Rider: welcome, booking-confirmed, driver-assigned       │
│  - Chauffeur: welcome, booking-assigned, payout           │
│  - Admin: new-driver, new-incident, emergency               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Environment Setup

Add to `.env.local`:

```env
# Resend Email Configuration
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=noreply@movoprive.com
FROM_NAME=MOVO

# App Configuration
NEXT_PUBLIC_APP_NAME=MOVO
NEXT_PUBLIC_BASE_URL=https://movoprive.com
SUPPORT_EMAIL=support@movoprive.com
LOGO_URL=https://movoprive.com/logo.png

# Future SMS/Push (optional)
SMS_ENABLED=false
PUSH_ENABLED=false
```

### 2. Database Migration

Run Prisma migration to add Notification model:

```bash
npx prisma migrate dev --name add_notifications
npx prisma generate
```

### 3. Send a Notification

```typescript
import { sendNotification, notificationEvents } from "@/lib/notifications";

// Using convenience method
await notificationEvents.riderWelcome(userId, email, firstName);

// Using raw sendNotification
await sendNotification({
  eventType: "RIDER_BOOKING_CONFIRMED",
  recipient: {
    type: "user",
    id: userId,
    email: "user@example.com",
    firstName: "John",
  },
  data: {
    bookingId: "abc123",
    pickup: "123 Main St",
    dropoff: "456 Oak Ave",
    total: 45.50,
  },
});
```

## Supported Event Types

### Rider Events
- `RIDER_WELCOME` - Welcome email after registration
- `RIDER_EMAIL_VERIFICATION` - Email verification code/link
- `RIDER_PASSWORD_RESET` - Password reset link
- `RIDER_BOOKING_CONFIRMED` - Booking confirmation
- `RIDER_BOOKING_UPDATED` - Booking details changed
- `RIDER_DRIVER_ASSIGNED` - Driver assigned notification
- `RIDER_RIDE_COMPLETED` - Ride completion + rating request
- `RIDER_PAYMENT_RECEIPT` - Payment receipt
- `RIDER_INCIDENT_SUBMITTED` - Incident report acknowledgment
- `RIDER_INCIDENT_RESOLVED` - Incident resolution

### Chauffeur Events
- `CHAUFFEUR_WELCOME` - Welcome to chauffeur network
- `CHAUFFEUR_ONBOARDING_SUBMITTED` - Application received
- `CHAUFFEUR_ONBOARDING_APPROVED` - Application approved
- `CHAUFFEUR_ONBOARDING_REJECTED` - Application rejected
- `CHAUFFEUR_BOOKING_ASSIGNED` - New booking available
- `CHAUFFEUR_BOOKING_CANCELLED` - Booking cancelled
- `CHAUFFEUR_PAYOUT_NOTIFICATION` - Payout processed

### Admin Events
- `ADMIN_NEW_DRIVER_APPLICATION` - New driver to review
- `ADMIN_NEW_INCIDENT_REPORT` - New incident report
- `ADMIN_EMERGENCY_INCIDENT` - High-priority incident
- `ADMIN_NEW_FLEET_APPLICATION` - New fleet application

### Support Events
- `SUPPORT_TICKET_CREATED` - New support ticket
- `SUPPORT_TICKET_UPDATED` - Ticket updated
- `SUPPORT_TICKET_RESOLVED` - Ticket resolved

## API Endpoints

### Get Notifications
```http
GET /api/notifications?page=1&limit=20&unreadOnly=false
Authorization: Bearer <token>
```

Response:
```json
{
  "notifications": [...],
  "pagination": { "page": 1, "limit": 20, "totalCount": 50, "totalPages": 3 },
  "unreadCount": 5
}
```

### Mark as Read
```http
POST /api/notifications
Authorization: Bearer <token>

// Mark specific notification
{ "notificationId": "abc123" }

// Mark all as read
{ "all": true }
```

## Adding New Templates

1. Create template file in `templates/emails/<actor>/<template>.tsx`:

```tsx
import { EmailLayout } from "../base";
import type { EmailTemplateContext, EmailTemplateResult } from "../../types";
import { render } from "@react-email/render";

export function myNewTemplate(context: EmailTemplateContext): EmailTemplateResult {
  const { recipient, data, settings } = context;
  
  const preview = "Preview text for email clients";
  
  const html = render(
    <EmailLayout context={context} preview={preview}>
      {/* Your email content */}
    </EmailLayout>
  );
  
  const text = `Plain text version`;
  
  return { subject: "Email Subject", html, text };
}
```

2. Register in `templates/emails/index.ts`:

```typescript
import { myNewTemplate } from "./rider/my-new-template";

const TEMPLATES = {
  // ... existing templates
  MY_NEW_EVENT: myNewTemplate,
};
```

3. Add to Prisma schema (if new event type):

```prisma
enum NotificationEventType {
  // ... existing
  MY_NEW_EVENT
}
```

4. Create convenience method:

```typescript
export const notificationEvents = {
  myNewEvent: (userId: string, email: string, firstName: string, data: any) =>
    sendNotification({
      eventType: "MY_NEW_EVENT",
      recipient: { type: "user", id: userId, email, firstName },
      data,
    }),
};
```

## Customizing Default Channels

Override default channels per notification:

```typescript
await sendNotification({
  eventType: "RIDER_BOOKING_CONFIRMED",
  recipient: { type: "user", id: userId, email, firstName },
  channels: ["EMAIL", "SMS", "IN_APP"], // Override defaults
});
```

## Database Schema

### Notification Model
- Stores all notification history
- Tracks read/unread status for in-app
- Links to related entities (booking, incident, etc.)
- Supports polymorphic recipients (user/driver/admin)

### AdminNotification Model
- Tracks admin broadcast notifications
- Stores which admins have read each notification

## Future Extensions

### SMS Integration
1. Set `SMS_ENABLED=true` in env
2. Add Twilio credentials
3. Implement in `channels/sms.ts`

### Push Notifications
1. Set `PUSH_ENABLED=true` in env
2. Add Firebase Admin SDK
3. Store device tokens in User/Driver model
4. Implement in `channels/push.ts`

### Webhook Support
- Add webhook URL to Notification model
- POST notification data to external systems

### Analytics
- Track open rates, click rates
- Store in Notification model
- Dashboard for admin review

## Testing

### Test Email Template
```typescript
import { riderWelcomeTemplate } from "@/lib/notifications/templates/emails/rider/welcome";

const result = riderWelcomeTemplate({
  recipient: { firstName: "Test", email: "test@example.com" },
  data: {},
  settings: {
    appName: "MOVO",
    supportEmail: "support@movoprive.com",
    logoUrl: "https://movoprive.com/logo.png",
    baseUrl: "https://movoprive.com",
  },
});

console.log(result.html); // Preview HTML
```

### Send Test Notification
```typescript
// In dev mode, emails are logged to console
await notificationEvents.riderWelcome(
  "test-user-id",
  "your-email@example.com",
  "Test"
);
```

## Troubleshooting

### Emails not sending
- Check `RESEND_API_KEY` is set
- Verify `FROM_EMAIL` is verified in Resend dashboard
- Check console for error messages

### Database errors
- Run `npx prisma migrate dev`
- Run `npx prisma generate`
- Check DATABASE_URL

### Template errors
- Ensure all required template props are passed
- Check `data` object has correct structure
- Validate enum values match Prisma schema
