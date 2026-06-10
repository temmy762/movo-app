# Movo Privé Chauffeur Onboarding Flow - Complete Guide

## 📋 Overview
This document explains the complete chauffeur onboarding process from application to approval and how approved drivers access their dashboard.

---

## 🚀 Phase 1: Chauffeur Registration & Onboarding

### Step 1: Initial Registration
**URL:** `/driver/onboarding/register`

**What Happens:**
- Chauffeur enters basic information
- **Location is fixed:** Canada → Winnipeg (read-only)
- Chauffeur clicks "Next" to proceed

**Data Collected:**
- Country: Canada (fixed)
- City: Winnipeg (fixed)

---

### Step 2-8: Onboarding Steps
**URLs:** `/driver/onboarding/register/step2` through `step8`

**What Happens:**
The chauffeur completes a multi-step onboarding form collecting:

**Individual Chauffeur Information:**
- Personal details (name, email, phone)
- Date of birth
- Driver's license number
- Vehicle information (make, model, year, plate, tier)
- Banking details (account name, institution)
- Document uploads (license, background check, vehicle registration, insurance, etc.)

**Fleet Partner Information:**
- Company details (name, legal form, tax ID, VAT ID)
- Registration number and fleet size
- First vehicle details
- First chauffeur details
- Banking information

**Consents & Agreements:**
- GPS tracking consent ✓
- Privacy policy acceptance ✓
- Legal notice acceptance ✓
- Terms & conditions acceptance ✓
- Contract signature ✓

---

### Step 9: Review & Submit
**URL:** `/driver/onboarding/register/success`

**What Happens:**
1. Chauffeur reviews all submitted information
2. Clicks "Submit Application"
3. API Endpoint: `POST /api/driver/onboarding/submit`

**Backend Actions:**
```
1. Validates all required fields
2. Creates/Updates DriverOnboarding record with:
   - adminStatus: "PENDING"
   - submittedAt: current timestamp
   - type: "INDIVIDUAL" or "FLEET"
   - All collected data
3. Sends confirmation email to chauffeur
4. Returns success message
```

**Chauffeur Sees:**
- ✅ "Application submitted successfully"
- Message: "Awaiting admin review"
- Confirmation email sent to their inbox

---

## 👨‍💼 Phase 2: Admin Review & Approval

### Admin Dashboard
**URL:** `https://movoprive.com/admin/onboarding`

**Admin Can:**
1. **View Applications** - Filter by:
   - Status: Pending, Under Review, Approved, Rejected
   - Type: Individual, Fleet

2. **Review Details:**
   - Driver information
   - Documents (with approval/rejection status)
   - Consents and agreements
   - Vehicle details (for fleet)

3. **Take Action:**
   - **Approve** - Activates driver account
   - **Reject** - Sends rejection notification
   - **Under Review** - Marks as being reviewed
   - **Add Notes** - Admin can add review notes

### Approval Process
**Admin clicks "Approve"**

**Backend Actions (Automatic):**
```
1. Updates DriverOnboarding:
   - adminStatus: "APPROVED"
   - reviewedAt: current timestamp
   
2. Activates Driver Account:
   - driver.status: "PENDING" → "ACTIVE"
   
3. For Fleet Partners:
   - Creates Vehicle record with:
     - Make, Model, Year, Plate
     - Tier (vehicle class)
```

**System Sends:**
- ✅ Approval email to chauffeur
- ✅ Notification in admin dashboard

---

## 🔐 Phase 3: Driver Login After Approval

### Login Flow
**URL:** `/driver/onboarding/login`

**What Driver Does:**
1. Enters email address
2. Enters password
3. Clicks "Log In"

**Backend Validation:**
```
1. Checks credentials against Driver record
2. If invalid: Returns error message
3. If valid: Creates session token
4. Checks onboarding status via /api/driver/onboarding/status
```

**Routing Based on Status:**
```
IF adminStatus === "APPROVED"
  → Redirect to /driver/onboarding/approved
  
ELSE IF adminStatus === "PENDING" or "UNDER_REVIEW"
  → Redirect to /driver/onboarding/pending
  
ELSE IF adminStatus === "REJECTED"
  → Redirect to /driver/onboarding/rejected
  
ELSE (no onboarding record)
  → Redirect to /driver/home
```

---

## ✅ Phase 4: Approved Driver Experience

### Approval Confirmation Page
**URL:** `/driver/onboarding/approved`

**What Driver Sees:**
```
┌─────────────────────────────────────────┐
│         🎉 Congratulations! 🎉          │
│                                         │
│  Your Movo Privé application has been  │
│  APPROVED and is ready to use!         │
│                                         │
│  You can now:                          │
│  ✓ Go online & accept ride requests    │
│  ✓ View earnings & trip history        │
│  ✓ Access Partner Portal for support   │
│  ✓ Manage profile & vehicle info       │
│                                         │
│  [Go to Dashboard]  [Back to Home]     │
└─────────────────────────────────────────┘
```

**Approval Details:**
- Shows approval date
- Displays onboarding type (Individual/Fleet)

---

## 🏠 Phase 5: Driver Dashboard

### Dashboard URL
**URL:** `/driver/home`

### Dashboard Features

#### 1. **Online Status Toggle**
- Large button to go "Online" or "Offline"
- When online: Driver receives ride requests
- When offline: No requests sent

#### 2. **Active Booking Display**
Shows current ride with:
- Client name
- Pickup location
- Dropoff location
- Vehicle assigned
- Total fare
- Payment status

#### 3. **Ride Actions**
- **Accept Ride** - Confirms booking
- **Decline Ride** - Rejects with reason
- **Start Ride** - Begins trip
- **Complete Ride** - Ends trip and collects rating

#### 4. **Real-time Location Tracking**
- GPS tracking enabled during active rides
- Updates location every 5 seconds
- Sends to `/api/trips/location`

#### 5. **Statistics**
- Total earned (all-time)
- Pre-booked rides (upcoming)

#### 6. **Navigation Menu**
- **Home** - Main dashboard
- **Planned** - Upcoming bookings
- **Offers** - Available ride requests
- **Finish** - Completed trips
- **News** - Updates and announcements
- **Wallet** - Earnings and payouts
- **Profile** - Account settings
- **Report Incident** - Safety reporting

#### 7. **Trip Management**
- View trip details
- Rate passengers
- Report incidents
- Track earnings

#### 8. **Visual Elements**
- Map background showing service area
- Real-time booking notifications
- Countdown timer for ride acceptance
- Trip completion modal with rating

---

## 📊 Status Summary Table

| Status | Driver Can Login | Can Accept Rides | Dashboard Access | Notes |
|--------|-----------------|-----------------|-----------------|-------|
| PENDING | ❌ No | ❌ No | ❌ No | Awaiting admin review |
| UNDER_REVIEW | ❌ No | ❌ No | ❌ No | Admin is reviewing |
| APPROVED | ✅ Yes | ✅ Yes | ✅ Full | Active and ready |
| REJECTED | ✅ Yes | ❌ No | ⚠️ Limited | Can see rejection reason |

---

## 🔄 Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    CHAUFFEUR JOURNEY                        │
└─────────────────────────────────────────────────────────────┘

1. REGISTRATION
   └─→ /driver/onboarding/register
       └─→ Enters location (Canada, Winnipeg)

2. ONBOARDING STEPS
   └─→ /driver/onboarding/register/step2-8
       └─→ Collects all required information
       └─→ Uploads documents
       └─→ Accepts consents

3. SUBMISSION
   └─→ /driver/onboarding/register/success
       └─→ Reviews information
       └─→ Submits application
       └─→ Receives confirmation email

4. ADMIN REVIEW (Parallel)
   └─→ Admin Dashboard: /admin/onboarding
       └─→ Reviews application
       └─→ Approves or Rejects

5. DRIVER LOGIN
   └─→ /driver/onboarding/login
       └─→ Enters credentials
       └─→ System checks onboarding status

6. APPROVAL CONFIRMATION
   └─→ /driver/onboarding/approved
       └─→ Shows success message
       └─→ Explains next steps

7. ACTIVE DASHBOARD
   └─→ /driver/home
       └─→ Go online
       └─→ Accept ride requests
       └─→ Complete trips
       └─→ Earn money
```

---

## 🔑 Key Technical Details

### Database Records Created

**Driver Record:**
```
- id: unique identifier
- firstName, lastName
- email, phone
- password (hashed)
- status: "PENDING" → "ACTIVE" (on approval)
- onboardingType: "INDIVIDUAL" or "FLEET"
- createdAt, updatedAt
```

**DriverOnboarding Record:**
```
- id: unique identifier
- driverId: reference to Driver
- type: "INDIVIDUAL" or "FLEET"
- adminStatus: "PENDING" → "APPROVED" (on approval)
- submittedAt: timestamp of submission
- reviewedAt: timestamp of admin review
- adminNote: optional admin notes
- All collected form data
- Documents: array of uploaded files
```

**Vehicle Record (Fleet Only):**
```
- Created automatically on approval
- driverId: reference to Driver
- make, model, year, plate
- tier: vehicle class
```

### API Endpoints

**Driver Endpoints:**
- `POST /api/auth/driver/login` - Login
- `GET /api/driver/onboarding/status` - Check status
- `POST /api/driver/onboarding/submit` - Submit application
- `GET /api/driver/stats` - Get earnings stats
- `POST /api/trips/location` - Send location update

**Admin Endpoints:**
- `GET /api/admin/onboarding` - List applications
- `PATCH /api/admin/onboarding/[id]` - Approve/Reject
- `GET /api/admin/stats` - Dashboard statistics

---

## ⚠️ Important Notes

1. **Location Restriction:** Individual chauffeurs can only register from Winnipeg, Canada
2. **Approval Required:** Drivers cannot go online until approved
3. **Email Notifications:** Both drivers and admins receive email updates
4. **Document Verification:** Admin can approve/reject individual documents
5. **Fleet Vehicles:** Vehicle is created automatically from first vehicle info
6. **Session Management:** Login creates secure session token
7. **Real-time Tracking:** GPS tracking is enabled during active rides

---

## 📞 Support & Troubleshooting

**If Chauffeur Cannot Login After Approval:**
1. Check driver.status is "ACTIVE"
2. Verify onboarding.adminStatus is "APPROVED"
3. Clear browser cache and try again
4. Check email for any notifications

**If Application Not Appearing in Admin Dashboard:**
1. Verify onboarding.submittedAt is set
2. Check filter status is set to "PENDING"
3. Verify driver record exists
4. Check database for DriverOnboarding record

**If Approval Not Working:**
1. Check admin has ADMIN role
2. Verify onboarding ID is correct
3. Check database transaction logs
4. Ensure driver.status update succeeds

---

## 🎯 Summary

The Movo Privé onboarding system is a **two-phase approval process**:

1. **Chauffeur Phase:** Registration → Onboarding → Submission
2. **Admin Phase:** Review → Approval → Driver Activation
3. **Driver Phase:** Login → Approval Confirmation → Dashboard Access

Once approved, drivers can immediately:
- ✅ Log in with their credentials
- ✅ Go online to accept rides
- ✅ View earnings and trip history
- ✅ Manage their profile and vehicle
- ✅ Report incidents and get support

The system ensures quality control through admin review while providing a seamless experience for approved drivers.
