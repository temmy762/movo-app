# Movo Privé Driver Dashboard - Features & UI Guide

## 🏠 Dashboard Overview

Once a chauffeur is **approved and logged in**, they access the main driver dashboard at `/driver/home`.

---

## 📱 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    DRIVER DASHBOARD                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [ONLINE/OFFLINE TOGGLE]  [STATS: $X Earned | Y Booked]   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │         ACTIVE BOOKING (if any)                    │   │
│  │                                                     │   │
│  │  Client: John Smith                                │   │
│  │  Pickup: 123 Main St, Winnipeg                     │   │
│  │  Dropoff: 456 Oak Ave, Winnipeg                    │   │
│  │  Vehicle: Toyota Prius (ABC-123)                   │   │
│  │  Fare: $45.00 | Status: CONFIRMED                 │   │
│  │                                                     │   │
│  │  [ACCEPT] [DECLINE] [START RIDE] [COMPLETE]       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MAP BACKGROUND (Service Area)                      │   │
│  │  - Shows Stonehenge area (UK service region)        │   │
│  │  - Visual representation of coverage               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  NAVIGATION MENU (Bottom/Sidebar)                          │
│  [Home] [Planned] [Offers] [Finish] [News] [Wallet]       │
│  [Profile] [Report Incident]                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Features

### 1. **Online/Offline Toggle**

**Purpose:** Control whether driver receives ride requests

**Visual:**
```
┌──────────────────────────┐
│   🟢 GO ONLINE           │  ← When offline
│                          │
│   Large, prominent button│
│   Gradient background    │
└──────────────────────────┘

OR

┌──────────────────────────┐
│   🔴 GO OFFLINE          │  ← When online
│                          │
│   Large, prominent button│
│   Red background         │
└──────────────────────────┘
```

**Behavior:**
- When **ONLINE**: Driver receives ride requests in real-time
- When **OFFLINE**: No ride requests are sent
- Status is persistent across sessions

---

### 2. **Statistics Display**

**Shows:**
- **Total Earned:** All-time earnings from completed rides
- **Pre-Booked:** Number of upcoming scheduled rides

**Example:**
```
Total Earned: $2,450.50
Pre-Booked: 3 rides
```

---

### 3. **Active Booking Card**

**Displays When:** Driver has an active or pending ride

**Information Shown:**
```
┌─────────────────────────────────────┐
│ CLIENT NAME: John Smith             │
│                                     │
│ 📍 PICKUP                           │
│    123 Main Street, Winnipeg, MB    │
│                                     │
│ 📍 DROPOFF                          │
│    456 Oak Avenue, Winnipeg, MB     │
│                                     │
│ 🚗 VEHICLE: Toyota Prius            │
│    Plate: ABC-123                   │
│                                     │
│ 💰 FARE: $45.00                     │
│ 📊 STATUS: CONFIRMED                │
│                                     │
│ ⏱️  TIME: 12:30 PM                  │
└─────────────────────────────────────┘
```

---

### 4. **Ride Actions**

#### **ACCEPT RIDE**
- Driver confirms they will take the ride
- Ride status changes to "CONFIRMED"
- GPS tracking begins
- Client receives driver info

#### **DECLINE RIDE**
- Opens modal to select reason
- Ride is offered to next available driver
- Driver can continue accepting other rides

#### **START RIDE**
- Driver confirms passenger is in vehicle
- Trip timer starts
- Real-time location tracking active
- Passenger can see live location

#### **COMPLETE RIDE**
- Trip ends
- Opens rating modal
- Driver rates passenger (1-5 stars)
- Earnings are calculated

---

### 5. **Real-time Location Tracking**

**How It Works:**
```
When ride is ACTIVE:
  ↓
Every 5 seconds:
  ↓
Get GPS coordinates (latitude, longitude, heading, speed)
  ↓
Send to /api/trips/location
  ↓
Update in database
  ↓
Passenger sees live location on their map
```

**Data Sent:**
- Latitude & Longitude
- Heading (direction)
- Speed
- Timestamp

---

### 6. **Navigation Menu**

#### **Home** 🏠
- Main dashboard
- Active booking display
- Online/offline toggle

#### **Planned** 📅
- Upcoming scheduled rides
- Pre-booked trips
- Scheduled pickups

#### **Offers** 🎁
- Available ride requests
- Nearby pickup locations
- Estimated fares
- Accept/decline options

#### **Finish** ✅
- Completed trips
- Trip history
- Earnings breakdown
- Passenger ratings

#### **News** 📰
- Platform announcements
- Updates and alerts
- Promotions
- Safety notices

#### **Wallet** 💳
- Total earnings
- Payout history
- Transaction details
- Payment methods
- Withdrawal requests

#### **Profile** 👤
- Personal information
- Vehicle details
- Documents
- License verification
- Banking information
- Settings

#### **Report Incident** 🚨
- Safety reporting
- Accident reports
- Harassment reports
- Vehicle issues
- Route deviations
- Other concerns

---

## 🎨 Visual Design

### Color Scheme
```
Primary Gradient: #2D0A53 (Purple) → #8B7500 (Gold)
Background: #1a1e3c (Dark Blue)
Text: White/Gray
Accents: Green (online), Red (offline)
```

### Map Background
```
Service area visualization with:
- Road network (SVG lines)
- Landmarks (Stonehenge area)
- Location markers
- Coverage zones
```

---

## 📊 Ride Lifecycle

```
1. IDLE
   └─→ Driver goes ONLINE
       └─→ Waits for ride request

2. SEARCHING
   └─→ System finds matching ride
       └─→ Sends to driver

3. REQUESTING
   └─→ Driver sees ride offer
       └─→ 30-second countdown timer
       └─→ [ACCEPT] or [DECLINE]

4. ACCEPTED
   └─→ Ride confirmed
       └─→ Driver heads to pickup
       └─→ GPS tracking starts
       └─→ [START RIDE] button appears

5. STARTED
   └─→ Passenger in vehicle
       └─→ Trip in progress
       └─→ Real-time location tracking
       └─→ [COMPLETE RIDE] button appears

6. COMPLETED
   └─→ Destination reached
       └─→ Rating modal appears
       └─→ Driver rates passenger
       └─→ Earnings added to wallet
       └─→ Return to IDLE state
```

---

## 💰 Earnings System

### How Earnings Work

**Per Ride:**
```
Base Fare: $X.XX
Distance Multiplier: × 1.0 - 2.0
Time Multiplier: × 1.0 - 1.5
Surge Pricing: × 1.0 - 3.0 (during peak hours)
─────────────────────────
Total Fare: $X.XX
```

**Movo Commission:** Deducted from fare
**Driver Payout:** Remaining amount

### Wallet Features

**View:**
- Total lifetime earnings
- Weekly earnings
- Daily breakdown
- Per-trip details

**Payouts:**
- Automatic weekly payouts
- Manual withdrawal requests
- Bank account management
- Transaction history

---

## 🔔 Notifications

### In-App Notifications
- New ride request
- Ride accepted/declined
- Passenger arriving
- Trip completed
- Payment received
- Payout processed

### Email Notifications
- Daily earnings summary
- Weekly payout confirmation
- Account alerts
- System updates

---

## ⚙️ Settings & Profile

### Profile Management
- Edit personal information
- Update phone number
- Change password
- Profile photo

### Vehicle Management
- Add/edit vehicle details
- Upload vehicle documents
- Insurance verification
- Registration details

### Payment Settings
- Bank account information
- Preferred payout method
- Tax information
- W-9 forms (if applicable)

### Preferences
- Notification settings
- Language preference
- Privacy settings
- Data sharing options

---

## 🚨 Safety Features

### Incident Reporting
- Report unsafe driving
- Report passenger harassment
- Report vehicle issues
- Report route deviations
- Report accidents

### Safety Monitoring
- Real-time GPS tracking
- Trip recording capability
- Emergency contact button
- Support hotline access

### Driver Verification
- Background check status
- License verification
- Insurance verification
- Vehicle inspection

---

## 📈 Performance Metrics

### Driver Rating
- Passenger ratings (1-5 stars)
- Acceptance rate
- Cancellation rate
- On-time percentage
- Safety score

### Displayed on Profile
- Average rating
- Total trips completed
- Member since date
- Badges/achievements

---

## 🔐 Security & Privacy

### Session Management
- Secure login token
- Auto-logout after inactivity
- Device verification
- Two-factor authentication (optional)

### Data Protection
- Encrypted personal data
- Secure payment processing
- GDPR compliant
- Privacy policy enforcement

---

## 📱 Responsive Design

### Mobile Optimization
- Touch-friendly buttons
- Optimized for small screens
- Swipe navigation
- Landscape/portrait support

### Desktop Support
- Full feature access
- Keyboard shortcuts
- Multi-monitor support
- High-resolution graphics

---

## 🎯 User Experience Flow

```
LOGIN
  ↓
CHECK APPROVAL STATUS
  ↓
IF APPROVED:
  ├─→ DASHBOARD (/driver/home)
  │   ├─→ Go ONLINE
  │   ├─→ Receive ride request
  │   ├─→ ACCEPT/DECLINE
  │   ├─→ START ride
  │   ├─→ COMPLETE ride
  │   ├─→ RATE passenger
  │   └─→ Earnings added
  │
  ├─→ NAVIGATION
  │   ├─→ Planned trips
  │   ├─→ Available offers
  │   ├─→ Completed trips
  │   ├─→ Earnings/Wallet
  │   ├─→ Profile settings
  │   └─→ Report incidents
  │
  └─→ REPEAT
      └─→ Accept more rides

IF PENDING/UNDER_REVIEW:
  └─→ WAITING PAGE (/driver/onboarding/pending)
      └─→ "Your application is under review"
      └─→ Check back later

IF REJECTED:
  └─→ REJECTION PAGE (/driver/onboarding/rejected)
      └─→ Show rejection reason
      └─→ Contact support option
```

---

## 📞 Support Integration

### In-App Support
- Chat with support team
- FAQ section
- Video tutorials
- Knowledge base

### Contact Options
- Email: support@movoprive.com
- Phone: +1 (XXX) XXX-XXXX
- In-app messaging
- Emergency hotline

---

## 🎓 Training & Resources

### Available to Drivers
- Onboarding tutorial
- Safety guidelines
- Best practices
- Customer service tips
- Navigation help

### Accessible from Dashboard
- Help icon (?)
- Support menu
- Video tutorials
- FAQ section
- Contact support

---

## Summary

The Movo Privé driver dashboard is a **comprehensive platform** that enables approved chauffeurs to:

✅ **Manage Availability** - Go online/offline
✅ **Accept Rides** - Real-time ride requests
✅ **Track Earnings** - View all income
✅ **Complete Trips** - Full trip management
✅ **Manage Profile** - Update information
✅ **Report Issues** - Safety and support
✅ **Get Paid** - Automatic payouts

All within a **user-friendly, mobile-optimized interface** with **real-time GPS tracking** and **secure payment processing**.
