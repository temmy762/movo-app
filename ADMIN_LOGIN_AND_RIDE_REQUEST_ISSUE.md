# ADMIN LOGIN & RIDE REQUEST ISSUE
## Credentials and Troubleshooting Guide

**Date:** June 4, 2026, 5:26 AM UTC+01:00  
**Status:** Issue identified and explained

---

# PART 1: ADMIN LOGIN DETAILS

## Admin Login Credentials

Admin login uses **phone number and password**.

### Login URL
```
https://movoprive.com/admin/login
```

### Required Fields
- **Phone Number:** Your admin phone number (e.g., +1234567890)
- **Password:** Your admin password

### How to Get Admin Credentials

Since there are no default credentials in the system, you need to:

1. **Check your database** for existing admin users:
   ```bash
   # SSH to VPS
   ssh root@srv1691570
   
   # Connect to PostgreSQL
   psql -U your_db_user -d your_db_name
   
   # Query admin users
   SELECT id, phone, firstName, lastName, role FROM "User" WHERE role = 'ADMIN';
   ```

2. **Create a new admin user** if none exist:
   ```bash
   # In PostgreSQL
   INSERT INTO "User" (id, phone, firstName, lastName, email, role, password, createdAt, updatedAt)
   VALUES (
     'admin_id_123',
     '+1234567890',
     'Admin',
     'User',
     'admin@movoprive.com',
     'ADMIN',
     '$2a$10$...',  -- bcrypt hashed password
     NOW(),
     NOW()
   );
   ```

3. **Or use the Prisma CLI** to create an admin:
   ```bash
   npx prisma studio
   # Then manually create a User with role='ADMIN'
   ```

---

# PART 2: RIDE REQUEST NOT APPEARING FOR DRIVER

## The Problem

Driver doesn't see ride requests even though:
- ✅ User placed a booking
- ✅ Driver is online
- ❌ Driver sees no ride request

## Root Cause: Car Tier Mismatch

**The issue is in the booking matching logic** (`app/api/bookings/route.ts` Lines 13-30):

```typescript
/* ── Driver requesting PENDING bookings → tier-match + unassigned only ── */
if (session?.driverId && status === "PENDING") {
  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { vehicle: { select: { tier: true } } },
  });
  const tier = driver?.vehicle?.tier ?? null;

  const bookings = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      driverId: null,
      ...(tier ? { carTier: tier } : {}),  // ← TIER MUST MATCH!
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(bookings);
}
```

### How It Works

1. **Driver requests pending bookings** → System fetches driver's vehicle tier
2. **System filters bookings** → Only shows bookings matching driver's tier
3. **If tiers don't match** → Driver sees NO bookings

### Example Scenario

| Component | Value | Match? |
|-----------|-------|--------|
| **Booking carTier** | "First Class" | ❌ |
| **Driver vehicle tier** | "Economy" | ❌ |
| **Result** | No ride request shown | ❌ |

---

## How to Fix This

### Option 1: Assign the Correct Vehicle to Driver (Recommended)

**The driver needs a vehicle assigned with the matching tier.**

```bash
# SSH to VPS
ssh root@srv1691570

# Connect to database
psql -U your_db_user -d your_db_name

# Check driver's current vehicle
SELECT id, driverId, tier FROM "Vehicle" WHERE driverId = 'driver_id';

# Check available vehicles
SELECT id, tier, driverId FROM "Vehicle" WHERE driverId IS NULL;

# Assign a vehicle with matching tier to driver
UPDATE "Vehicle" 
SET driverId = 'driver_id' 
WHERE id = 'vehicle_id' AND tier = 'First Class';
```

### Option 2: Create a Vehicle with Matching Tier

If no vehicle exists with the required tier:

```bash
# In PostgreSQL
INSERT INTO "Vehicle" (id, driverId, make, model, year, licensePlate, vin, tier, createdAt, updatedAt)
VALUES (
  'vehicle_id_123',
  'driver_id',
  'Mercedes-Benz',
  'S-Class',
  2024,
  'ABC123',
  'VIN123456789',
  'First Class',  -- Match the booking tier
  NOW(),
  NOW()
);
```

### Option 3: Change Booking Tier to Match Driver's Vehicle

If the driver's vehicle is correct but booking tier is wrong:

```bash
# In PostgreSQL
UPDATE "Booking"
SET carTier = 'Economy'  -- Match driver's vehicle tier
WHERE id = 'booking_id';
```

---

## Verification Steps

### Step 1: Check Driver's Vehicle Assignment

```bash
# SSH to VPS
ssh root@srv1691570

# Connect to database
psql -U your_db_user -d your_db_name

# Query driver's vehicle
SELECT d.id, d.firstName, v.id as vehicleId, v.tier 
FROM "Driver" d
LEFT JOIN "Vehicle" v ON d.id = v.driverId
WHERE d.id = 'your_driver_id';
```

**Expected Output:**
```
id          | firstName | vehicleId | tier
------------|-----------|-----------|----------
driver_123  | John      | vehicle_1 | First Class
```

### Step 2: Check Booking Details

```bash
# Query the booking
SELECT id, carTier, status, driverId 
FROM "Booking" 
WHERE id = 'booking_id';
```

**Expected Output:**
```
id          | carTier     | status  | driverId
------------|-------------|---------|----------
booking_123 | First Class | PENDING | NULL
```

### Step 3: Verify Tier Match

```bash
# Both should show the same tier
SELECT carTier FROM "Booking" WHERE id = 'booking_id';
SELECT tier FROM "Vehicle" WHERE driverId = 'driver_id';
```

**Both should return:** `First Class` (or whatever tier)

---

## Testing the Fix

### After Assigning Vehicle:

1. **Driver goes online** → Opens driver app
2. **User places booking** → Selects "First Class" car
3. **Driver should see** → Ride request appears immediately
4. **Driver accepts** → Booking assigned to driver

---

## Database Schema Reference

### Driver Table
```prisma
model Driver {
  id            String   @id @default(cuid())
  userId        String   @unique
  phone         String   @unique
  firstName     String
  lastName      String
  email         String   @unique
  status        DriverStatus @default(PENDING)
  vehicle       Vehicle?  // ← One vehicle per driver
  bookings      Booking[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Vehicle Table
```prisma
model Vehicle {
  id            String   @id @default(cuid())
  driverId      String?  @unique  // ← Can be null (unassigned)
  driver        Driver?  @relation(fields: [driverId], references: [id])
  make          String
  model         String
  year          Int
  licensePlate  String   @unique
  vin           String   @unique
  tier          String   // ← "First Class", "Economy", etc.
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Booking Table
```prisma
model Booking {
  id            String   @id @default(cuid())
  clientName    String
  pickup        String
  dropoff       String
  carTier       String   // ← Must match vehicle tier
  carName       String
  status        BookingStatus @default(PENDING)
  driverId      String?  // ← Null until driver accepts
  driver        Driver?  @relation(fields: [driverId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## Common Issues & Solutions

### Issue 1: Driver has no vehicle assigned
**Solution:** Assign a vehicle with `UPDATE "Vehicle" SET driverId = 'driver_id' WHERE id = 'vehicle_id';`

### Issue 2: Vehicle tier doesn't match booking tier
**Solution:** Either change booking tier or assign different vehicle

### Issue 3: Driver's vehicle is NULL
**Solution:** Check if vehicle exists: `SELECT * FROM "Vehicle" WHERE driverId = 'driver_id';`

### Issue 4: Multiple vehicles assigned to one driver
**Solution:** Remove extra assignments: `UPDATE "Vehicle" SET driverId = NULL WHERE driverId = 'driver_id' AND id != 'correct_vehicle_id';`

---

## Debugging Steps

### 1. Check if driver is online
```bash
# Check driver's last activity
SELECT id, firstName, updatedAt FROM "Driver" WHERE id = 'driver_id';
```

### 2. Check if booking was created
```bash
# Check booking exists
SELECT id, carTier, status FROM "Booking" WHERE id = 'booking_id';
```

### 3. Check tier matching
```bash
# Compare tiers
SELECT 
  (SELECT carTier FROM "Booking" WHERE id = 'booking_id') as booking_tier,
  (SELECT tier FROM "Vehicle" WHERE driverId = 'driver_id') as vehicle_tier;
```

### 4. Check driver's vehicle assignment
```bash
# Verify vehicle is assigned
SELECT driverId, tier FROM "Vehicle" WHERE driverId = 'driver_id';
```

### 5. Check API logs
```bash
# SSH to VPS
ssh root@srv1691570

# View logs
pm2 logs movo | grep -i "booking\|driver\|pending"
```

---

## Summary

| Issue | Cause | Solution |
|-------|-------|----------|
| Driver doesn't see ride request | Car tier mismatch | Assign vehicle with matching tier |
| No vehicle assigned to driver | Missing assignment | Create/assign vehicle to driver |
| Wrong vehicle tier | Incorrect setup | Change vehicle tier or booking tier |
| Driver offline | Not connected | Driver needs to go online |

---

**Status:** Issue identified and documented  
**Next Step:** Verify driver's vehicle assignment and tier matching

