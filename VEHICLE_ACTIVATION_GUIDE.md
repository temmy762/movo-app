# Vehicle Activation Guide - Complete Explanation

## 🚗 Overview

There are **THREE ways** vehicles are created and activated in the Movo Privé system:

1. **Individual Chauffeur Onboarding** - Chauffeur registers with vehicle info
2. **Fleet Partner Onboarding** - Fleet registers with first vehicle info
3. **Admin Manual Entry** - Admin adds vehicle to existing driver

---

## 1️⃣ Individual Chauffeur Onboarding

### How It Works

**During Registration:**
- Chauffeur completes 9-step onboarding
- **Step 3-4:** Enters vehicle information:
  - Make (Toyota, Honda, etc.)
  - Model (Prius, Civic, etc.)
  - Year (2022, 2023, etc.)
  - License Plate (ABC-123)
  - Tier/Class (Economy, Premium, etc.)

**On Submission:**
- Chauffeur submits application
- Data stored in `DriverOnboarding` table
- Vehicle info stored in onboarding record

**On Admin Approval:**
```
Admin clicks "APPROVE" on application
         ↓
Backend executes approval transaction:
  1. Sets driver.status = "ACTIVE"
  2. Checks if type === "INDIVIDUAL"
  3. If INDIVIDUAL: Does NOT create vehicle
     (because individual chauffeurs don't have vehicle info in onboarding)
  4. If FLEET: Creates vehicle from firstVehicle* fields
```

### ⚠️ THE PROBLEM

**Individual chauffeurs submit vehicle info during onboarding, BUT:**
- The approval process does NOT create a Vehicle record for individuals
- Only Fleet partners get automatic vehicle creation
- **Individual chauffeurs' vehicles are never created in the database**
- Therefore, they don't appear for riders!

### 🔧 Solution for Individual Chauffeurs

**After approving an individual chauffeur:**

1. Go to `/admin/units`
2. Click "Add New Vehicle" button
3. Fill in vehicle details:
   - Make, Model, Year, Plate, Tier
   - **Select the approved chauffeur from driver dropdown**
4. Click "Create Vehicle"

**OR** (Better Solution - Automatic):
- Modify the approval logic to create vehicles for INDIVIDUAL chauffeurs too
- Extract vehicle info from onboarding record
- Create Vehicle record automatically on approval

---

## 2️⃣ Fleet Partner Onboarding

### How It Works

**During Registration:**
- Fleet partner completes onboarding
- **Provides first vehicle information:**
  - `firstVehicleBrand` (Make)
  - `firstVehicleModel` (Model)
  - `firstVehicleYear` (Year)
  - `firstVehicleClass` (Tier)
  - `firstVehiclePlate` (License Plate)
  - `firstVehicleVin` (VIN)

**On Admin Approval:**
```
Admin clicks "APPROVE" on fleet application
         ↓
Backend executes approval transaction:
  1. Sets driver.status = "ACTIVE"
  2. Checks if type === "FLEET"
  3. If FLEET: Creates Vehicle record with:
     - make: firstVehicleBrand
     - model: firstVehicleModel
     - year: firstVehicleYear
     - plate: firstVehiclePlate
     - tier: firstVehicleClass
     - driverId: fleet's driver ID
```

### ✅ Status: WORKING

Fleet partners' first vehicle is **automatically created** on approval.

### ⚠️ Multiple Vehicles

If a fleet has multiple vehicles:
- Only the **first vehicle** is created automatically
- Additional vehicles must be added manually via `/admin/units`

---

## 3️⃣ Admin Manual Vehicle Entry

### How It Works

**Admin goes to:** `/admin/units`

**Clicks:** "Add New Vehicle" button

**Fills in:**
- Make, Model, Year, Plate, Tier
- **Selects driver from dropdown**

**Creates:** Vehicle linked to driver

### ✅ Status: WORKING

Vehicles created this way appear immediately for riders (if driver is online).

---

## 📊 Comparison Table

| Method | Type | Auto-Created | Appears for Riders | Notes |
|--------|------|--------------|-------------------|-------|
| Onboarding | Individual | ❌ NO | ❌ NO | **BUG: Must add manually** |
| Onboarding | Fleet | ✅ YES | ✅ YES | First vehicle only |
| Admin Entry | Both | ✅ YES | ✅ YES | Manual process |

---

## 🐛 The Bug

### Individual Chauffeurs

**Current Behavior:**
```
Chauffeur registers with vehicle info
         ↓
Submits application
         ↓
Admin approves
         ↓
Driver.status = "ACTIVE" ✓
Vehicle created? ❌ NO
         ↓
Rider sees 0 cars ❌
```

**Expected Behavior:**
```
Chauffeur registers with vehicle info
         ↓
Submits application
         ↓
Admin approves
         ↓
Driver.status = "ACTIVE" ✓
Vehicle created? ✅ YES (from onboarding data)
         ↓
Rider sees available car ✓
```

---

## 🔧 How to Fix the Bug

### Option 1: Quick Fix (Manual)
After approving individual chauffeurs:
1. Go to `/admin/units`
2. Click "Add New Vehicle"
3. Fill in details from their onboarding
4. Select the driver
5. Click "Create Vehicle"

### Option 2: Permanent Fix (Code Change)

**File:** `app/api/admin/onboarding/[id]/route.ts`

**Current Code (lines 60-72):**
```typescript
// Create vehicle if fleet partner
if (onboarding.type === "FLEET" && onboarding.firstVehicleBrand && onboarding.firstVehicleModel && onboarding.firstVehiclePlate) {
  await tx.vehicle.create({
    data: {
      driverId: onboarding.driverId,
      make: onboarding.firstVehicleBrand,
      model: onboarding.firstVehicleModel,
      year: parseInt(onboarding.firstVehicleYear || new Date().getFullYear().toString()),
      plate: onboarding.firstVehiclePlate,
      tier: onboarding.firstVehicleClass || "ECONOMY",
    },
  });
}
```

**Should Be Changed To:**
```typescript
// Create vehicle for both INDIVIDUAL and FLEET partners
if (onboarding.vehicleMake && onboarding.vehicleModel && onboarding.vehiclePlate) {
  await tx.vehicle.create({
    data: {
      driverId: onboarding.driverId,
      make: onboarding.vehicleMake,
      model: onboarding.vehicleModel,
      year: parseInt(onboarding.vehicleYear || new Date().getFullYear().toString()),
      plate: onboarding.vehiclePlate,
      tier: onboarding.vehicleTier || "ECONOMY",
    },
  });
}
```

This way:
- Individual chauffeurs' vehicles are created from their onboarding data
- Fleet partners' vehicles are created from their first vehicle data
- Both types appear for riders automatically

---

## 📋 Current Status

### Individual Chauffeurs
- ❌ Vehicles NOT auto-created on approval
- ❌ Must be added manually by admin
- ❌ Don't appear for riders until vehicle is created

### Fleet Partners
- ✅ First vehicle auto-created on approval
- ✅ Appears for riders immediately
- ⚠️ Additional vehicles must be added manually

### Admin Manual Entry
- ✅ Works perfectly
- ✅ Vehicles appear immediately

---

## 🚀 Recommended Actions

### Immediate (For Current Applications)

1. **For approved individual chauffeurs:**
   - Go to `/admin/units`
   - Click "Add New Vehicle"
   - Add their vehicle manually
   - They'll appear for riders

2. **For approved fleet partners:**
   - Check if their vehicle appears
   - If not, add manually via `/admin/units`

### Long-term (Code Fix)

Modify the approval logic to auto-create vehicles for individual chauffeurs too.

---

## 📞 Summary

**Question:** Why don't chauffeurs who registered their cars see them for riders?

**Answer:** 
- **Individual Chauffeurs:** Vehicle info is collected but NOT converted to a Vehicle record on approval
- **Fleet Partners:** First vehicle IS automatically created on approval
- **Both:** Can be manually added via Admin Units page

**Fix:**
- Modify approval logic to create vehicles for individuals
- OR manually add vehicles via `/admin/units` for each approved individual chauffeur
