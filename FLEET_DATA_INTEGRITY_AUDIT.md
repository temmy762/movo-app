# FLEET DATA INTEGRITY AUDIT & FINDINGS
**Date:** June 4, 2026, 1:43 PM UTC+01:00  
**Status:** CRITICAL ISSUES IDENTIFIED  
**Severity:** HIGH

---

# SECTION A: CURRENT ARCHITECTURE FINDINGS

## A1. Database Schema Analysis

### Vehicle Model
```prisma
model Vehicle {
  id        String   @id @default(cuid())
  driverId  String   @unique          // ← ONE-TO-ONE relationship
  driver    Driver   @relation(fields: [driverId], references: [id])
  make      String
  model     String
  year      Int
  plate     String   @unique
  tier      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Schema Analysis:**
- ✅ **Relationship Type:** ONE-TO-ONE (one vehicle per driver)
- ✅ **Required Field:** `driverId` is REQUIRED (not nullable)
- ✅ **Constraint:** `@unique` on `driverId` prevents multiple vehicles per driver
- ✅ **Integrity:** Foreign key constraint enforces driver must exist

### Driver Model
```prisma
model Driver {
  id        String       @id @default(cuid())
  firstName String
  lastName  String
  email     String       @unique
  phone     String?      @unique
  password  String
  country   String
  city      String
  status    DriverStatus @default(PENDING)
  lat       Float?
  lng       Float?
  isOnline  Boolean      @default(false)
  ...
  vehicle   Vehicle?     // ← Optional, one-to-one
  ...
}
```

**Schema Analysis:**
- ✅ **Relationship Type:** ONE-TO-ONE (optional on driver side)
- ✅ **Status Field:** Enum with PENDING, ACTIVE, SUSPENDED
- ✅ **Location Fields:** lat/lng for driver tracking
- ✅ **Online Status:** isOnline boolean for availability

---

# SECTION B: DEMO VEHICLE LOGIC IDENTIFIED

## B1. Customer Booking Page - HARDCODED VEHICLES

**File:** `@/app/home/pickup/available-cars/page.tsx:11-15`

```typescript
const CAR_CONFIGS = [
  { tier: "classic", name: "Movo Classic",     specs: "Automatic | 4 seats | Octane", img: "/images/movo classic.png" },
  { tier: "premium", name: "Movo Premium",     specs: "Automatic | 4 seats | Octane", img: "/images/movo premium.png" },
  { tier: "black",   name: "Movo Privé Black", specs: "Automatic | 4 seats | Octane", img: "/images/prive black.png" },
];
```

**Issue:** 
- ❌ HARDCODED demo vehicle configurations
- ❌ Always shows 3 vehicles regardless of database content
- ❌ Shows vehicles even if none exist in database
- ❌ Tier names are hardcoded, not from database

**How It Works:**
1. Page fetches drivers from `/api/drivers/nearby`
2. For each hardcoded tier ("classic", "premium", "black"), it filters drivers
3. If no drivers exist for a tier, it still shows the tier with "No drivers nearby"
4. Vehicle names, specs, images are all hardcoded

**Evidence:**
```typescript
// Line 67-68: Always iterates through hardcoded tiers
const tiersToShow = tier === "all" ? ["classic", "premium", "black"] : [tier];

// Line 83-84: Uses hardcoded CAR_CONFIGS
for (const t of tiersToShow) {
  const config = CAR_CONFIGS.find((c) => c.tier === t)!;
```

---

## B2. Cars Available API - PARTIAL HARDCODING

**File:** `@/app/api/cars/available/route.ts:16-26`

```typescript
const TIER_NAMES: Record<string, string> = {
  classic: "Movo Classic",
  premium: "Movo Premium",
  black: "Movo Privé Black",
};

const TIER_IMAGES: Record<string, string> = {
  classic: "/images/movo classic.png",
  premium: "/images/movo premium.png",
  black: "/images/prive black.png",
};
```

**Issue:**
- ❌ Tier names are hardcoded
- ❌ Tier images are hardcoded
- ❌ Only 3 tiers supported
- ❌ Cannot add new vehicle types without code changes

**Positive:**
- ✅ Fetches real drivers from database
- ✅ Filters by actual vehicle tier
- ✅ Calculates real distances

---

## B3. Admin Units Page - MOCK DATA

**File:** `@/app/admin/(panel)/units/page.tsx:9-14`

```typescript
type Unit = {
  id: string; brand: string; model: string;
  transmission: "Automatic" | "Manual";
  seats: number; status: UnitStatus; units: number;
  price: number; image: string;
};
```

**Issue:**
- ❌ Page shows mock/demo units
- ❌ No connection to actual Vehicle database model
- ❌ "units" field (count) doesn't match database schema
- ❌ "price" field doesn't exist in Vehicle model
- ❌ "transmission" field doesn't exist in Vehicle model

**Evidence:**
- No API call to fetch vehicles
- No database queries visible
- UI is hardcoded with demo data

---

# SECTION C: DRIVER ↔ VEHICLE SCHEMA ANALYSIS

## C1. Relationship Type

**Answer:** ONE-TO-ONE (one vehicle per driver)

**Evidence:**
```prisma
model Vehicle {
  driverId  String   @unique    // ← @unique makes it one-to-one
  driver    Driver   @relation(...)
}

model Driver {
  vehicle   Vehicle?   // ← Optional on driver side
}
```

## C2. Is Required?

**Answer:** YES, Vehicle requires a driverId

**Evidence:**
```prisma
driverId  String   @unique    // ← NOT nullable, NOT optional
```

## C3. Is Optional?

**Answer:** YES, Driver can exist without a Vehicle

**Evidence:**
```prisma
vehicle   Vehicle?   // ← Optional (nullable)
```

## C4. Constraint Enforcement

**Answer:** Database enforces one-to-one via @unique

**Evidence:**
- `@unique` on `driverId` prevents duplicate assignments
- Foreign key constraint requires driver to exist
- Cannot create vehicle without valid driverId

---

# SECTION D: REQUIRED CODE CHANGES

## D1. Replace Hardcoded Vehicles with Database Query

**Current Problem:**
- Customers always see 3 demo vehicles
- Database vehicles are ignored

**Solution:**
1. Fetch vehicles from database instead of hardcoded array
2. Build vehicle list from actual Vehicle records
3. Show only vehicles that exist in database
4. Show empty state if no vehicles exist

**Files to Change:**
- `app/home/pickup/available-cars/page.tsx` - Remove CAR_CONFIGS
- `app/api/cars/available/route.ts` - Return actual vehicles
- `app/api/drivers/nearby/route.ts` - Include vehicle details

## D2. Fix Admin Units Page

**Current Problem:**
- Shows mock data
- No connection to database
- Fields don't match schema

**Solution:**
1. Fetch vehicles from database
2. Display actual vehicle data
3. Add driver assignment UI
4. Show driver name with vehicle

**Files to Change:**
- `app/admin/(panel)/units/page.tsx` - Connect to database
- Create API endpoint: `app/api/admin/units/route.ts`

## D3. Implement Driver Assignment UI

**Current Problem:**
- No way to assign vehicles to drivers in admin
- Admin Vehicles API requires driverId but no UI to select

**Solution:**
1. Add driver selector to vehicle creation form
2. Show assigned driver on vehicle list
3. Allow changing driver assignment
4. Prevent duplicate assignments

**Files to Change:**
- `app/admin/(panel)/units/page.tsx` - Add driver selector
- `app/admin/(panel)/units/[id]/page.tsx` - Edit vehicle with driver

## D4. Update Drivers Page

**Current Problem:**
- No vehicle information shown
- No assignment management

**Solution:**
1. Show assigned vehicle on driver list
2. Add "Assign Vehicle" button
3. Allow reassignment
4. Show vehicle status

**Files to Change:**
- `app/admin/(panel)/drivers/page.tsx` - Add vehicle column
- `app/admin/(panel)/drivers/[id]/page.tsx` - Add assignment UI

---

# SECTION E: IMPLEMENTATION PLAN

## E1. Phase 1: Fix Customer Booking (CRITICAL)

### Step 1: Create Database-Driven Vehicle API
**File:** `app/api/vehicles/list/route.ts` (NEW)

```typescript
export async function GET(req: NextRequest) {
  const vehicles = await prisma.vehicle.findMany({
    include: { driver: { select: { id: true, status: true, isOnline: true } } },
  });
  
  return NextResponse.json(vehicles);
}
```

### Step 2: Update Available Cars Page
**File:** `app/home/pickup/available-cars/page.tsx`

Remove CAR_CONFIGS and fetch from database instead.

### Step 3: Update Cars Available API
**File:** `app/api/cars/available/route.ts`

Fetch vehicles from database, not hardcoded tiers.

## E2. Phase 2: Fix Admin Units Page

### Step 1: Create Units API
**File:** `app/api/admin/units/route.ts` (NEW)

```typescript
export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    include: { driver: true },
  });
  return NextResponse.json(vehicles);
}
```

### Step 2: Update Units Page
**File:** `app/admin/(panel)/units/page.tsx`

Connect to database, show real vehicles.

## E3: Phase 3: Add Driver Assignment

### Step 1: Update Vehicle Creation API
**File:** `app/api/admin/vehicles/route.ts`

Already supports driverId - good!

### Step 2: Add Driver Selector UI
**File:** `app/admin/(panel)/units/page.tsx`

Add dropdown to select driver when creating/editing vehicle.

### Step 3: Update Drivers Page
**File:** `app/admin/(panel)/drivers/page.tsx`

Show assigned vehicle, add assignment button.

---

# SECTION F: DATABASE MIGRATION REQUIREMENTS

## F1. Current State
- ✅ Vehicle model exists
- ✅ Driver-Vehicle relationship exists
- ✅ One-to-one constraint exists
- ✅ No migration needed

## F2. Data Cleanup
```sql
-- Check for orphaned vehicles (shouldn't exist due to FK constraint)
SELECT * FROM "Vehicle" WHERE "driverId" NOT IN (SELECT id FROM "Driver");

-- Check drivers without vehicles
SELECT * FROM "Driver" WHERE id NOT IN (SELECT DISTINCT "driverId" FROM "Vehicle");

-- Count vehicles by tier
SELECT tier, COUNT(*) FROM "Vehicle" GROUP BY tier;
```

---

# SECTION G: VERIFICATION RESULTS

## G1. Current Issues Summary

| Issue | Severity | Status |
|-------|----------|--------|
| Hardcoded demo vehicles in booking | CRITICAL | ❌ NOT FIXED |
| Admin units page disconnected | HIGH | ❌ NOT FIXED |
| No driver assignment UI | HIGH | ❌ NOT FIXED |
| Tier names hardcoded | MEDIUM | ❌ NOT FIXED |
| Vehicle images hardcoded | MEDIUM | ❌ NOT FIXED |

## G2. What's Working

| Feature | Status |
|---------|--------|
| Database schema | ✅ CORRECT |
| Driver-Vehicle relationship | ✅ CORRECT |
| One-to-one constraint | ✅ CORRECT |
| Vehicle creation API | ✅ WORKS |
| Driver nearby API | ✅ WORKS |
| Onboarding approval creates vehicle | ✅ WORKS |

---

# SECTION H: CRITICAL QUESTIONS ANSWERED

## Q1: Can customers only see real vehicles?

**Answer:** ❌ NO - BROKEN

**Evidence:**
- Customers always see 3 hardcoded vehicles
- Even if database has 0 vehicles, they see "Movo Classic", "Movo Premium", "Movo Privé Black"
- Hardcoded in `app/home/pickup/available-cars/page.tsx:11-15`

**Code Proof:**
```typescript
const CAR_CONFIGS = [
  { tier: "classic", name: "Movo Classic", ... },
  { tier: "premium", name: "Movo Premium", ... },
  { tier: "black", name: "Movo Privé Black", ... },
];
// Always shown, regardless of database
```

---

## Q2: Can admins assign vehicles to drivers?

**Answer:** ⚠️ PARTIALLY - API exists but no UI

**Evidence:**
- API accepts driverId: `app/api/admin/vehicles/route.ts:15`
- API validates driver exists: `app/api/admin/vehicles/route.ts:42-52`
- API prevents duplicate assignments: `app/api/admin/vehicles/route.ts:54-65`
- **BUT:** No UI to select driver when creating vehicle

**Code Proof:**
```typescript
// API accepts driverId
const { clientName, carMake, carModel, carType, carPlate, driverId } = body;

// API validates
if (driverId) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return error;
  
  // Prevents duplicate
  const existingVehicle = await prisma.vehicle.findUnique({ where: { driverId } });
  if (existingVehicle) return error;
}
```

---

## Q3: Can admins see vehicle assignments?

**Answer:** ❌ NO - Admin units page is disconnected

**Evidence:**
- Admin units page shows mock data: `app/admin/(panel)/units/page.tsx:9-14`
- No database query visible
- No driver information shown
- Fields don't match Vehicle schema

**Code Proof:**
```typescript
// Mock data type definition
type Unit = {
  id: string; brand: string; model: string;
  transmission: "Automatic" | "Manual";  // ← NOT in Vehicle model
  seats: number; status: UnitStatus; units: number;  // ← NOT in Vehicle model
  price: number; image: string;  // ← NOT in Vehicle model
};
// No API call to fetch real data
```

---

## Q4: Does fleet partner approval automatically create the correct assignment?

**Answer:** ✅ YES - Works correctly

**Evidence:**
- Onboarding approval creates vehicle: `app/api/admin/onboarding/approve/route.ts:60-75`
- Vehicle is assigned to driver: `app/api/admin/onboarding/approve/route.ts:65`
- Uses onboarding data: `app/api/admin/onboarding/approve/route.ts:62-70`

**Code Proof:**
```typescript
// When fleet partner approved:
if (onboarding.type === "FLEET") {
  if (onboarding.firstVehicleBrand && onboarding.firstVehicleModel && onboarding.firstVehiclePlate) {
    await prisma.vehicle.create({
      data: {
        driverId: driver.id,  // ← Assigned to driver
        make: onboarding.firstVehicleBrand,
        model: onboarding.firstVehicleModel,
        year: parseInt(onboarding.firstVehicleYear || ...),
        plate: onboarding.firstVehiclePlate,
        tier: onboarding.firstVehicleClass || "ECONOMY",
      },
    });
  }
}
```

---

## Q5: Is booking data now fully linked to real fleet data?

**Answer:** ⚠️ PARTIALLY - Schema is correct but customer UI is broken

**Evidence:**
- Booking model has driverId: `prisma/schema.prisma:227-228`
- Driver-Vehicle relationship exists: `prisma/schema.prisma:164`
- **BUT:** Customers see hardcoded vehicles, not real ones

**Code Proof:**
```prisma
model Booking {
  ...
  driverId String?
  driver   Driver? @relation(fields: [driverId], references: [id])
}

model Driver {
  ...
  vehicle  Vehicle?
}
```

**Problem:** Customer selects "Movo Classic" (hardcoded), but booking needs to link to actual vehicle.

---

# CRITICAL ISSUES SUMMARY

## 🔴 ISSUE 1: Customers See Demo Vehicles
- **File:** `app/home/pickup/available-cars/page.tsx`
- **Problem:** Hardcoded CAR_CONFIGS always shown
- **Impact:** Customers can't see real vehicles
- **Fix:** Fetch from database

## 🔴 ISSUE 2: Admin Units Disconnected
- **File:** `app/admin/(panel)/units/page.tsx`
- **Problem:** Shows mock data, no database connection
- **Impact:** Admins can't manage real vehicles
- **Fix:** Connect to database

## 🔴 ISSUE 3: No Driver Assignment UI
- **File:** `app/admin/(panel)/units/page.tsx`
- **Problem:** API supports it but no UI
- **Impact:** Admins can't assign vehicles to drivers
- **Fix:** Add driver selector dropdown

## 🟡 ISSUE 4: Hardcoded Tier Names
- **File:** `app/api/cars/available/route.ts`
- **Problem:** Only 3 tiers supported
- **Impact:** Can't add new vehicle types
- **Fix:** Fetch tier names from database

## 🟡 ISSUE 5: Hardcoded Vehicle Images
- **File:** `app/api/cars/available/route.ts`
- **Problem:** Images hardcoded
- **Impact:** Can't customize vehicle images
- **Fix:** Store image URLs in database

---

# NEXT STEPS

1. **Immediate:** Fix customer booking page to show real vehicles
2. **High Priority:** Fix admin units page
3. **High Priority:** Add driver assignment UI
4. **Medium Priority:** Move tier names to database
5. **Medium Priority:** Move vehicle images to database

---

**Audit Completed:** June 4, 2026, 1:43 PM UTC+01:00

