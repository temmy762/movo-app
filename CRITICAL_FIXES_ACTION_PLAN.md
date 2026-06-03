# CRITICAL FIXES ACTION PLAN
## Fleet Partner Onboarding - Security & Data Integrity

**Status:** 🔴 BLOCKING PRODUCTION DEPLOYMENT  
**Priority:** CRITICAL  
**Estimated Time:** 2-3 hours

---

# CRITICAL ISSUES TO FIX

## 1. 🔴 AUTHORIZATION VULNERABILITY - PATCH Endpoint

**File:** `app/api/admin/onboarding/[id]/route.ts`  
**Severity:** CRITICAL - SECURITY  
**Risk:** Any authenticated user can approve/reject onboardings

### Current Code (VULNERABLE)
```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { adminStatus, adminNote, activateDriver } = body;

  if (!adminStatus) {
    return NextResponse.json({ error: "adminStatus required" }, { status: 400 });
  }
  // NO AUTHORIZATION CHECK - VULNERABLE!
```

### Fixed Code
```typescript
import { getSession } from "@/lib/session";  // Add import

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ADD THIS BLOCK
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { adminStatus, adminNote, activateDriver } = body;

  if (!adminStatus) {
    return NextResponse.json({ error: "adminStatus required" }, { status: 400 });
  }
  // ... rest of code
```

### Testing
```bash
# Test 1: Non-admin user tries to approve
curl -X PATCH http://localhost:3000/api/admin/onboarding/[id] \
  -H "Authorization: Bearer [driver-token]" \
  -H "Content-Type: application/json" \
  -d '{"adminStatus":"APPROVED"}'
# Expected: 403 Unauthorized

# Test 2: Admin user approves
curl -X PATCH http://localhost:3000/api/admin/onboarding/[id] \
  -H "Authorization: Bearer [admin-token]" \
  -H "Content-Type: application/json" \
  -d '{"adminStatus":"APPROVED"}'
# Expected: 200 Success
```

---

## 2. 🔴 AUTHORIZATION VULNERABILITY - GET Endpoint

**File:** `app/api/admin/onboarding/route.ts`  
**Severity:** CRITICAL - SECURITY  
**Risk:** Any user can view all onboarding applications (sensitive data exposure)

### Current Code (VULNERABLE)
```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const type   = searchParams.get("type")   ?? undefined;

  const onboardings = await prisma.driverOnboarding.findMany({
    // ... query
  });

  return NextResponse.json(onboardings);
  // NO AUTHORIZATION CHECK - VULNERABLE!
}
```

### Fixed Code
```typescript
import { getSession } from "@/lib/session";  // Add import

export async function GET(req: NextRequest) {
  // ADD THIS BLOCK
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const type   = searchParams.get("type")   ?? undefined;

  const onboardings = await prisma.driverOnboarding.findMany({
    // ... rest of code
  });

  return NextResponse.json(onboardings);
}
```

### Testing
```bash
# Test 1: Non-admin user tries to list
curl http://localhost:3000/api/admin/onboarding \
  -H "Authorization: Bearer [driver-token]"
# Expected: 403 Unauthorized

# Test 2: Admin user lists
curl http://localhost:3000/api/admin/onboarding \
  -H "Authorization: Bearer [admin-token]"
# Expected: 200 Success with data
```

---

## 3. 🔴 DATA INTEGRITY - Nullable Required Fields

**File:** `prisma/schema.prisma` (Lines 288-313)  
**Severity:** CRITICAL - DATA INTEGRITY  
**Risk:** Database allows NULL for required fields

### Current Schema (VULNERABLE)
```prisma
model DriverOnboarding {
  companyName       String?  // Should be non-nullable
  legalForm         String?  // Should be non-nullable
  country           String?  // Should be non-nullable
  city              String?  // Should be non-nullable
  street            String?  // Should be non-nullable
  postalCode        String?  // Should be non-nullable
  taxId             String?  // Should be non-nullable
  vatId             String?  // Should be non-nullable
  registrationNumber String? // Should be non-nullable
  fleetSize         String?  // Should be non-nullable
  vehicleDescriptions String? // Should be non-nullable
  
  firstVehicleYear  String?  // Should be non-nullable
  firstVehicleBrand String?  // Should be non-nullable
  firstVehicleModel String?  // Should be non-nullable
  firstVehicleClass String?  // Should be non-nullable
  firstVehicleColor String?  // Should be non-nullable
  firstVehiclePlate String?  // Should be non-nullable
  firstVehicleVin   String?  // Should be non-nullable
  
  firstChauffeurFirstName String? // Should be non-nullable
  firstChauffeurLastName  String? // Should be non-nullable
  firstChauffeurEmail     String? // Should be non-nullable
  firstChauffeurPhone     String? // Should be non-nullable
}
```

### Fixed Schema
```prisma
model DriverOnboarding {
  companyName       String  // Remove ?
  legalForm         String  // Remove ?
  country           String  // Remove ?
  city              String  // Remove ?
  street            String  // Remove ?
  postalCode        String  // Remove ?
  taxId             String  // Remove ?
  vatId             String  // Remove ?
  registrationNumber String // Remove ?
  fleetSize         String  // Remove ?
  vehicleDescriptions String // Remove ?
  
  firstVehicleYear  String  // Remove ?
  firstVehicleBrand String  // Remove ?
  firstVehicleModel String  // Remove ?
  firstVehicleClass String  // Remove ?
  firstVehicleColor String  // Remove ?
  firstVehiclePlate String  // Remove ?
  firstVehicleVin   String  // Remove ?
  
  firstChauffeurFirstName String // Remove ?
  firstChauffeurLastName  String // Remove ?
  firstChauffeurEmail     String // Remove ?
  firstChauffeurPhone     String // Remove ?
}
```

### Migration Steps
```bash
# 1. Create migration
npx prisma migrate dev --name make_fleet_fields_required

# 2. Review generated migration file
# 3. Deploy to VPS
npx prisma migrate deploy
```

---

## 4. 🔴 TRANSACTION SAFETY - Vehicle Creation Failure

**File:** `app/api/admin/onboarding/[id]/route.ts` (Lines 25-50)  
**Severity:** CRITICAL - BUSINESS LOGIC  
**Risk:** Driver becomes ACTIVE but vehicle creation fails silently

### Current Code (VULNERABLE)
```typescript
if (adminStatus === "APPROVED" || activateDriver) {
  await prisma.driver.update({
    where: { id: onboarding.driverId },
    data:  { status: "ACTIVE" },
  });

  if (onboarding.type === "FLEET" && onboarding.firstVehicleBrand && ...) {
    try {
      await prisma.vehicle.create({
        data: {
          driverId: onboarding.driverId,
          make: onboarding.firstVehicleBrand,
          model: onboarding.firstVehicleModel,
          year: parseInt(onboarding.firstVehicleYear || new Date().getFullYear().toString()),
          plate: onboarding.firstVehiclePlate,
          tier: onboarding.firstVehicleClass || "ECONOMY",
        },
      });
    } catch (err) {
      console.error("Failed to create vehicle for fleet partner:", err);
      // SILENT FAILURE - NO ROLLBACK!
    }
  }
}
```

### Fixed Code (With Transaction)
```typescript
if (adminStatus === "APPROVED" || activateDriver) {
  try {
    // Use transaction to ensure both operations succeed or both fail
    await prisma.$transaction(async (tx) => {
      // Update driver
      await tx.driver.update({
        where: { id: onboarding.driverId },
        data:  { status: "ACTIVE" },
      });

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
    });
  } catch (err) {
    console.error("Approval transaction failed:", err);
    return NextResponse.json(
      { error: "Failed to complete approval. Please try again." },
      { status: 500 }
    );
  }
}
```

### Testing
```bash
# Test 1: Approve fleet partner with valid vehicle data
# Expected: Driver ACTIVE + Vehicle created

# Test 2: Approve fleet partner with duplicate plate
# Expected: 500 error, driver NOT activated, vehicle NOT created

# Test 3: Approve individual driver
# Expected: Driver ACTIVE, no vehicle created
```

---

## 5. ⚠️ DOUBLE APPROVAL PREVENTION

**File:** `app/api/admin/onboarding/[id]/route.ts` (Lines 15-23)  
**Severity:** HIGH - BUSINESS LOGIC  
**Risk:** Clicking approve twice creates duplicate vehicle attempt

### Current Code (VULNERABLE)
```typescript
const onboarding = await prisma.driverOnboarding.update({
  where: { id: params.id },
  data: {
    adminStatus,
    adminNote: adminNote ?? null,
    reviewedAt: new Date(),
  },
});

// No check if already approved!
if (adminStatus === "APPROVED" || activateDriver) {
  // ... approval logic
}
```

### Fixed Code
```typescript
// Check if already approved
if (onboarding.adminStatus === "APPROVED") {
  return NextResponse.json(
    { error: "Application already approved" },
    { status: 400 }
  );
}

const onboarding = await prisma.driverOnboarding.update({
  where: { id: params.id },
  data: {
    adminStatus,
    adminNote: adminNote ?? null,
    reviewedAt: new Date(),
  },
});

if (adminStatus === "APPROVED" || activateDriver) {
  // ... approval logic with transaction
}
```

---

## 6. ⚠️ PLATE UNIQUENESS CONSTRAINT

**File:** `prisma/schema.prisma` (Lines 171-182)  
**Severity:** HIGH - DATA INTEGRITY  
**Risk:** Two drivers could have same license plate

### Current Schema (VULNERABLE)
```prisma
model Vehicle {
  plate     String  // No @unique constraint!
}
```

### Fixed Schema
```prisma
model Vehicle {
  plate     String   @unique  // Add this
}
```

### Migration Steps
```bash
# 1. Create migration
npx prisma migrate dev --name add_unique_plate_constraint

# 2. Review generated migration
# 3. Deploy to VPS
npx prisma migrate deploy
```

---

# IMPLEMENTATION CHECKLIST

## Phase 1: Authorization Fixes (30 minutes)
- [ ] Add authorization check to `PATCH /api/admin/onboarding/[id]`
- [ ] Add authorization check to `GET /api/admin/onboarding`
- [ ] Test both endpoints with non-admin user (should get 403)
- [ ] Test both endpoints with admin user (should work)
- [ ] Commit changes

## Phase 2: Database Schema Fixes (50 minutes)
- [ ] Update DriverOnboarding fields to non-nullable
- [ ] Add @unique constraint to Vehicle.plate
- [ ] Create migrations
- [ ] Test migrations locally
- [ ] Deploy to VPS with `npx prisma migrate deploy`
- [ ] Verify migrations applied

## Phase 3: Transaction Implementation (40 minutes)
- [ ] Update approval endpoint to use $transaction
- [ ] Add double-approval prevention check
- [ ] Test approval with valid data (should succeed)
- [ ] Test approval with invalid data (should fail and rollback)
- [ ] Test double approval (should fail on second attempt)
- [ ] Commit changes

## Phase 4: Testing & Verification (30 minutes)
- [ ] End-to-end test: Submit → Review → Approve
- [ ] Verify driver becomes ACTIVE
- [ ] Verify vehicle is created
- [ ] Verify vehicle appears on Units page
- [ ] Test authorization on all endpoints
- [ ] Check logs for errors

## Phase 5: Deployment (15 minutes)
- [ ] Push to GitHub
- [ ] Deploy to VPS
- [ ] Run migrations on VPS
- [ ] Verify PM2 process healthy
- [ ] Monitor logs for errors

---

# TESTING COMMANDS

```bash
# Test authorization
curl -X PATCH http://localhost:3000/api/admin/onboarding/[id] \
  -H "Authorization: Bearer [non-admin-token]" \
  -H "Content-Type: application/json" \
  -d '{"adminStatus":"APPROVED"}' \
  # Expected: 403

# Test transaction rollback
curl -X PATCH http://localhost:3000/api/admin/onboarding/[id] \
  -H "Authorization: Bearer [admin-token]" \
  -H "Content-Type: application/json" \
  -d '{"adminStatus":"APPROVED"}' \
  # Expected: 200 with vehicle created

# Verify database
psql -U postgres -d movo_db -c "SELECT id, status FROM drivers WHERE id = '[driver-id]';"
psql -U postgres -d movo_db -c "SELECT id, driverId, plate FROM vehicles WHERE driverId = '[driver-id]';"
```

---

# ROLLBACK PLAN

If issues occur:
```bash
# Revert last commit
git revert HEAD
git push origin master

# Revert migrations on VPS
npx prisma migrate resolve --rolled-back [migration-name]

# Restart application
pm2 restart movo
```

---

# SIGN-OFF

**Status:** 🔴 BLOCKING PRODUCTION  
**Fixes Required:** 6 critical/high priority items  
**Estimated Time:** 2-3 hours  
**Next Step:** Implement Phase 1 (Authorization Fixes)

**Do not deploy to production until all critical issues are fixed.**

---

**Created:** June 3, 2026  
**Priority:** CRITICAL  
**Owner:** Development Team
